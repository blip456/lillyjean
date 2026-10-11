// Lillyjean design tokens: read W3C DTCG 2025.10 token files through a resolver document,
// resolve aliases per theme, and turn them into CSS for Tailwind v4 and shadcn/ui.
// Dependency-free: only node:fs and node:path. The CLI lives in build.mjs.

import fs from "node:fs";
import path from "node:path";

/** Vendor key for the few things DTCG cannot express (gradient geometry). */
export const VENDOR = "org.lillyjean.css";

/** Token groups the generator knows how to emit. Anything else is an error, so additions are deliberate. */
const FOUNDATION_GROUPS = [
  "color",
  "font",
  "typography",
  "radius",
  "spacing",
  "blur",
  "duration",
  "easing",
  "gradient",
];
const THEME_GROUPS = ["color", "shadow"];

const FONT_WEIGHTS = {
  thin: 100,
  hairline: 100,
  "extra-light": 200,
  "ultra-light": 200,
  light: 300,
  normal: 400,
  regular: 400,
  book: 400,
  medium: 500,
  "semi-bold": 600,
  "demi-bold": 600,
  bold: 700,
  "extra-bold": 800,
  "ultra-bold": 800,
  black: 900,
  heavy: 900,
  "extra-black": 950,
  "ultra-black": 950,
};

const REF = /^\{([^{}]+)\}$/;

// ---------------------------------------------------------------------------
// Loading: resolver document -> list of token sources per theme context
// ---------------------------------------------------------------------------

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`Cannot read ${file}: ${error.message}`);
  }
}

/**
 * Reads a resolver document and every token file it references.
 * Returns the parsed files (so they can be synced and written back) and, per context of the
 * `theme` modifier, the ordered list of sources with their origin ("foundation" or "theme").
 */
export function loadTokens(resolverPath) {
  const dir = path.dirname(resolverPath);
  const resolver = readJson(resolverPath);
  if (resolver.version !== "2025.10")
    throw new Error(`${resolverPath}: version must be "2025.10"`);
  /** @type {Map<string, any>} */
  const files = new Map();

  const source = (entry, origin) => {
    if (entry && typeof entry.$ref === "string") {
      if (entry.$ref.startsWith("#/sets/")) {
        const set = resolver.sets?.[entry.$ref.slice(7)];
        if (!set) throw new Error(`${resolverPath}: unknown set ${entry.$ref}`);
        return set.sources.flatMap((s) => source(s, origin));
      }
      const file = path.resolve(dir, entry.$ref);
      if (!files.has(file)) files.set(file, readJson(file));
      return [{ file, doc: files.get(file), origin }];
    }
    return [{ file: resolverPath, doc: entry, origin }];
  };

  const theme = resolver.modifiers?.theme;
  if (!theme?.contexts || !theme.contexts.light || !theme.contexts.dark) {
    throw new Error(
      `${resolverPath}: a "theme" modifier with "light" and "dark" contexts is required`,
    );
  }
  /** @type {Record<string, {file: string, doc: any, origin: string}[]>} */
  const contexts = {};
  for (const name of Object.keys(theme.contexts)) {
    contexts[name] = resolver.resolutionOrder.flatMap((entry) => {
      if (entry.$ref === "#/modifiers/theme")
        return theme.contexts[name].flatMap((s) => source(s, "theme"));
      if (entry.$ref?.startsWith("#/sets/")) return source(entry, "foundation");
      throw new Error(
        `${resolverPath}: unsupported resolutionOrder entry ${JSON.stringify(entry)}`,
      );
    });
  }
  return {
    resolver,
    files,
    contexts,
    defaultContext: theme.default ?? "light",
  };
}

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------

const round = (n, dp = 4) => Math.round(n * 10 ** dp) / 10 ** dp;
const HEX = /^#[0-9a-f]{6}$/i;

/** sRGB components (0–1, 4 decimals) of a #rrggbb string. */
export function componentsFromHex(hex) {
  return [1, 3, 5].map((i) => round(parseInt(hex.slice(i, i + 2), 16) / 255));
}

/**
 * `hex` is the value people edit; DTCG also requires `components`. Rewrites `components` from `hex`
 * wherever they disagree and returns the JSON paths that changed.
 */
export function syncColorComponents(node, at = []) {
  /** @type {string[]} */
  const changed = [];
  if (Array.isArray(node)) {
    node.forEach((child, i) =>
      changed.push(...syncColorComponents(child, [...at, i])),
    );
  } else if (node && typeof node === "object") {
    if (
      node.colorSpace === "srgb" &&
      typeof node.hex === "string" &&
      HEX.test(node.hex)
    ) {
      const want = componentsFromHex(node.hex);
      const have = node.components;
      if (
        !Array.isArray(have) ||
        have.length !== 3 ||
        have.some((c, i) => Math.abs(c - want[i]) > 0.00006)
      ) {
        node.components = want;
        changed.push(at.join("."));
      }
    }
    for (const [key, child] of Object.entries(node))
      changed.push(...syncColorComponents(child, [...at, key]));
  }
  return changed;
}

function rgb(color) {
  const [r, g, b] = [1, 3, 5].map((i) =>
    parseInt(color.hex.slice(i, i + 2), 16),
  );
  return { r, g, b, a: color.alpha ?? 1 };
}

/** Composites a (possibly translucent) colour over an opaque one. */
export function composite(top, bottom) {
  const t = rgb(top);
  const b = rgb(bottom);
  const mix = (x, y) => Math.round(x * t.a + y * (1 - t.a));
  const hex = `#${[mix(t.r, b.r), mix(t.g, b.g), mix(t.b, b.b)].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
  return { colorSpace: "srgb", components: componentsFromHex(hex), hex };
}

function luminance(color) {
  const { r, g, b } = rgb(color);
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG 2.x contrast ratio of two opaque colours. */
export function contrastRatio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Hue (0–360) and HSL saturation (0–1) of a colour, for palette guards. */
export function hueSaturation(color) {
  const { r, g, b } = rgb(color);
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { hue: 0, saturation: 0 };
  const saturation = d / (1 - Math.abs(2 * l - 1));
  let hue;
  if (max === R) hue = ((G - B) / d) % 6;
  else if (max === G) hue = (B - R) / d + 2;
  else hue = (R - G) / d + 4;
  return { hue: (hue * 60 + 360) % 360, saturation };
}

// ---------------------------------------------------------------------------
// Flatten, validate and resolve
// ---------------------------------------------------------------------------

function flatten(node, origin, file, tokens, groups, at = [], inheritedType) {
  const type = node.$type ?? inheritedType;
  if (at.length)
    groups.set(at.join("."), {
      description: node.$description,
      extensions: node.$extensions,
    });
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith("$") || !child || typeof child !== "object") continue;
    if (/[{}.]/.test(key))
      throw new Error(`${file}: invalid token name "${key}"`);
    const p = [...at, key];
    if ("$value" in child) {
      const name = p.join(".");
      const t = child.$type ?? type;
      if (!t) throw new Error(`${file}: ${name} has no $type`);
      tokens.set(name, {
        name,
        type: t,
        raw: child.$value,
        description: child.$description,
        extensions: child.$extensions,
        origin,
        file,
      });
    } else {
      flatten(child, origin, file, tokens, groups, p, type);
    }
  }
}

function fail(token, message) {
  throw new Error(`${path.basename(token.file)}: ${token.name}: ${message}`);
}

const isDimension = (v) =>
  v && typeof v.value === "number" && (v.unit === "px" || v.unit === "rem");

function validate(token, value) {
  const bad = (what) =>
    fail(
      token,
      `invalid ${token.type} value (${what}): ${JSON.stringify(value)}`,
    );
  switch (token.type) {
    case "color":
      if (value?.colorSpace !== "srgb")
        bad('only colorSpace "srgb" is supported');
      if (!HEX.test(value.hex ?? "")) bad("needs a #rrggbb hex");
      if (!Array.isArray(value.components) || value.components.length !== 3)
        bad("needs 3 components");
      if (value.alpha !== undefined && !(value.alpha >= 0 && value.alpha <= 1))
        bad("alpha must be 0–1");
      break;
    case "dimension":
      if (!isDimension(value)) bad("needs {value, unit: px|rem}");
      break;
    case "fontFamily":
      if (!(
        typeof value === "string" ||
        (Array.isArray(value) && value.every((f) => typeof f === "string"))
      ))
        bad("needs a string or string[]");
      break;
    case "fontWeight":
      if (
        !(typeof value === "number"
          ? value >= 1 && value <= 1000
          : value in FONT_WEIGHTS)
      )
        bad("1–1000 or keyword");
      break;
    case "duration":
      if (!(
        typeof value?.value === "number" &&
        (value.unit === "ms" || value.unit === "s")
      ))
        bad("{value, unit: ms|s}");
      break;
    case "cubicBezier":
      if (!(
        Array.isArray(value) &&
        value.length === 4 &&
        value.every((n) => typeof n === "number")
      ))
        bad("4 numbers");
      break;
    case "number":
      if (typeof value !== "number") bad("number");
      break;
    case "shadow":
      for (const s of [value].flat()) {
        if (
          !s?.color ||
          !isDimension(s.offsetX) ||
          !isDimension(s.offsetY) ||
          !isDimension(s.blur) ||
          !isDimension(s.spread)
        )
          bad("shadow needs color, offsetX, offsetY, blur, spread");
      }
      break;
    case "gradient":
      if (
        !Array.isArray(value) ||
        value.some((s) => !s?.color || typeof s.position !== "number")
      )
        bad("stops");
      break;
    case "typography":
      for (const k of [
        "fontFamily",
        "fontSize",
        "fontWeight",
        "letterSpacing",
        "lineHeight",
      ]) {
        if (value?.[k] === undefined) bad(`missing ${k}`);
      }
      if (
        !isDimension(value.fontSize) ||
        !isDimension(value.letterSpacing) ||
        typeof value.lineHeight !== "number"
      )
        bad("fontSize/letterSpacing are dimensions, lineHeight a number");
      break;
    default:
      fail(token, `unsupported $type "${token.type}"`);
  }
}

/**
 * Merges the sources of one context (later wins) and resolves every alias.
 * @returns {{tokens: Map<string, any>, groups: Map<string, any>}}
 */
export function resolveContext(sources) {
  const tokens = new Map();
  const groups = new Map();
  for (const { doc, origin, file } of sources)
    flatten(doc, origin, file, tokens, groups);

  const resolving = new Set();
  const resolveToken = (token) => {
    if ("value" in token) return token.value;
    if (resolving.has(token.name))
      fail(token, `circular reference (${[...resolving].join(" → ")})`);
    resolving.add(token.name);
    const deep = (v) => {
      if (typeof v === "string") {
        const m = v.match(REF);
        if (!m) return v;
        const target = tokens.get(m[1]);
        if (!target) fail(token, `unresolved reference ${v}`);
        return resolveToken(target);
      }
      if (Array.isArray(v)) return v.map(deep);
      if (v && typeof v === "object")
        return Object.fromEntries(
          Object.entries(v).map(([k, x]) => [k, deep(x)]),
        );
      return v;
    };
    const value = deep(token.raw);
    validate(token, value);
    const m = typeof token.raw === "string" && token.raw.match(REF);
    token.aliasOf = m ? m[1] : undefined;
    token.value = value;
    resolving.delete(token.name);
    return value;
  };
  for (const token of tokens.values()) resolveToken(token);

  // Group-level extension values may reference tokens too (e.g. the base colour of a layered gradient).
  for (const group of groups.values()) {
    const base = group.extensions?.[VENDOR]?.base;
    if (typeof base === "string" && REF.test(base)) {
      const target = tokens.get(base.match(REF)[1]);
      if (!target)
        throw new Error(`unresolved reference ${base} in a group $extensions`);
      group.base = target.value;
    }
  }

  for (const token of tokens.values()) {
    const [group, ...rest] = token.name.split(".");
    const allowed = token.origin === "theme" ? THEME_GROUPS : FOUNDATION_GROUPS;
    if (!allowed.includes(group)) {
      fail(
        token,
        `group "${group}" is not allowed in ${token.origin} files; add a mapping in scripts/tokens/tokens.mjs`,
      );
    }
    if (token.origin === "theme" && rest.length !== 1)
      fail(token, "theme tokens must be one level deep (color.<name>)");
  }
  return { tokens, groups };
}

// ---------------------------------------------------------------------------
// CSS output
// ---------------------------------------------------------------------------

const num = (n) => String(round(n));
const dim = (d) => (d.value === 0 ? "0" : `${num(d.value)}${d.unit}`);

export function colorToCss(color) {
  const alpha = color.alpha ?? 1;
  if (alpha >= 1) return color.hex.toLowerCase();
  const { r, g, b } = rgb(color);
  if (alpha === 0 && r + g + b === 0) return "transparent";
  return `rgb(${r} ${g} ${b} / ${num(alpha * 100)}%)`;
}

const fontFamilyToCss = (v) =>
  [v]
    .flat()
    .map((f) => (/[^a-zA-Z0-9-]/.test(f) ? `"${f}"` : f))
    .join(", ");

const shadowToCss = (v) =>
  [v]
    .flat()
    .map(
      (s) =>
        `${s.inset ? "inset " : ""}${dim(s.offsetX)} ${dim(s.offsetY)} ${dim(s.blur)} ${dim(s.spread)} ${colorToCss(s.color)}`,
    )
    .join(", ");

function gradientLayer(token) {
  const css = token.extensions?.[VENDOR];
  if (!css?.function)
    fail(
      token,
      `gradients need $extensions["${VENDOR}"].function (and optional geometry)`,
    );
  const stops = token.value.map(
    (s) =>
      `${colorToCss(s.color)} ${num(Math.min(1, Math.max(0, s.position)) * 100)}%`,
  );
  return `${css.function}(${[css.geometry, ...stops].filter(Boolean).join(", ")})`;
}

/** `--gradient-<name>` values: single gradient tokens, or groups of layers over a base colour. */
function gradients(ctx) {
  const out = [];
  for (const [name, group] of ctx.groups) {
    const [top, gname, ...rest] = name.split(".");
    if (
      top !== "gradient" ||
      !gname ||
      rest.length ||
      !group.extensions?.[VENDOR]?.layers
    )
      continue;
    const layers = [...ctx.tokens.values()]
      .filter((t) => t.name.startsWith(`${name}.`))
      .map(gradientLayer);
    if (group.base) layers.push(colorToCss(group.base));
    out.push({
      name: gname,
      css: layers.join(", "),
      description: group.description,
    });
  }
  for (const t of ctx.tokens.values()) {
    const [top, gname, ...rest] = t.name.split(".");
    if (top === "gradient" && !rest.length)
      out.push({
        name: gname,
        css: gradientLayer(t),
        description: t.description,
      });
  }
  return out;
}

const byGroup = (ctx, group, origin) =>
  [...ctx.tokens.values()].filter(
    (t) => t.name.split(".")[0] === group && (!origin || t.origin === origin),
  );
const leaf = (t) => t.name.split(".").slice(1).join("-");
const comment = (text) =>
  text ? ` /* ${text.replace(/\*\//g, "* /")} */` : "";

/** Foundation declarations that become Tailwind theme variables (and utilities). */
function themeDeclarations(ctx) {
  const lines = [];
  for (const t of byGroup(ctx, "font"))
    lines.push(`--font-${leaf(t)}: ${fontFamilyToCss(t.value)};`);
  for (const t of byGroup(ctx, "typography")) {
    const v = t.value;
    const px =
      v.fontSize.unit === "px" ? v.fontSize.value : v.fontSize.value * 16;
    const tracking =
      v.letterSpacing.unit === "px"
        ? v.letterSpacing.value
        : v.letterSpacing.value * 16;
    const weight =
      typeof v.fontWeight === "number"
        ? v.fontWeight
        : FONT_WEIGHTS[v.fontWeight];
    const n = leaf(t);
    lines.push(
      `--text-${n}: ${num(px / 16)}rem;`,
      `--text-${n}--line-height: ${num(v.lineHeight)};`,
      `--text-${n}--letter-spacing: ${tracking === 0 ? "0" : `${num(tracking / px)}em`};`,
      `--text-${n}--font-weight: ${weight};`,
    );
  }
  for (const t of byGroup(ctx, "radius"))
    lines.push(`--radius-${leaf(t)}: ${dim(t.value)};`);
  for (const t of byGroup(ctx, "spacing"))
    lines.push(`--spacing-${leaf(t)}: ${dim(t.value)};`);
  for (const t of byGroup(ctx, "blur"))
    lines.push(`--blur-${leaf(t)}: ${dim(t.value)};`);
  for (const t of byGroup(ctx, "easing"))
    lines.push(
      `--ease-${leaf(t)}: cubic-bezier(${t.value.map(num).join(", ")});`,
    );
  return lines;
}

/** Foundation declarations that are plain custom properties on :root. */
function rootFoundationDeclarations(ctx) {
  const lines = [];
  const base = ctx.tokens.get("radius.lg");
  if (base)
    lines.push(
      `--radius: ${dim(base.value)}; /* radius.lg, the shadcn base radius */`,
    );
  for (const t of byGroup(ctx, "duration"))
    lines.push(`--duration-${leaf(t)}: ${num(t.value.value)}${t.value.unit};`);
  return lines;
}

/** Theme-dependent declarations: semantic colours, shadows, gradients. */
function themedDeclarations(ctx, { descriptions }) {
  const lines = [];
  for (const t of byGroup(ctx, "color", "theme")) {
    if (descriptions && t.description)
      lines.push(`/* ${t.description.replace(/\*\//g, "* /")} */`);
    lines.push(`--${leaf(t)}: ${colorToCss(t.value)};${comment(t.aliasOf)}`);
  }
  for (const t of byGroup(ctx, "shadow", "theme"))
    lines.push(`--${leaf(t)}-shadow: ${shadowToCss(t.value)};`);
  for (const g of gradients(ctx)) lines.push(`--gradient-${g.name}: ${g.css};`);
  return lines;
}

const block = (selector, lines) =>
  `${selector} {\n${lines.map((l) => `  ${l}`).join("\n")}\n}\n`;

function themedNames(ctx) {
  return [
    ...byGroup(ctx, "color", "theme").map((t) => `color:${leaf(t)}`),
    ...byGroup(ctx, "shadow", "theme").map((t) => `shadow:${leaf(t)}`),
  ];
}

export const GENERATED_HEADER = `/*
 * Lillyjean design tokens. GENERATED FILE: do not edit by hand.
 * Source: design/tokens/*.tokens.json (W3C DTCG 2025.10) via design/tokens/lillyjean.resolver.json.
 * Change a token there, then run \`pnpm tokens:build\`. See DESIGN.md.
 */
`;

/**
 * Builds the app stylesheet (src/app/tokens.css): Tailwind theme variables, :root (light),
 * [data-theme="dark"], the @theme inline mapping to utilities, and gradient utilities.
 * Pure: same input, same output.
 * @param {{light: ReturnType<typeof resolveContext>, dark: ReturnType<typeof resolveContext>}} themes
 */
export function buildCss({ light, dark }) {
  const a = themedNames(light).join();
  const b = themedNames(dark).join();
  if (a !== b) {
    const only = (x, y) =>
      x.split(",").filter((n) => !y.split(",").includes(n));
    throw new Error(
      `light and dark must define the same tokens in the same order. Only in light: ${only(a, b).join(", ") || "-"}; only in dark: ${only(b, a).join(", ") || "-"}`,
    );
  }

  const colors = byGroup(light, "color", "theme").map(leaf);
  const shadows = byGroup(light, "shadow", "theme").map(leaf);
  const grads = gradients(light);

  return [
    GENERATED_HEADER,
    "/* Theme variables: fonts, type ramp, radii, spacing, blur and easing (text-title, rounded-cover, min-h-tap, …).",
    "   The default Tailwind palette is removed so only the colour tokens below exist as utilities. */",
    block("@theme", ["--color-*: initial;", ...themeDeclarations(light)]),
    "/* Light theme: the designed default. */",
    block(":root", [
      "color-scheme: light;",
      ...rootFoundationDeclarations(light),
      ...themedDeclarations(light, { descriptions: true }),
    ]),
    '/* Dark theme: opt-in with data-theme="dark" on <html>. Not applied from prefers-color-scheme yet. */',
    block('[data-theme="dark"]', [
      "color-scheme: dark;",
      ...themedDeclarations(dark, { descriptions: false }),
    ]),
    "/* Utilities: bg-primary, text-muted-foreground, border-border, shadow-cover, … (names match shadcn/ui). */",
    block("@theme inline", [
      ...colors.map((n) => `--color-${n}: var(--${n});`),
      ...shadows.map((n) => `--shadow-${n}: var(--${n}-shadow);`),
    ]),
    ...grads.map((g) =>
      block(`@utility bg-${g.name}-gradient`, [
        `background: var(--gradient-${g.name});`,
      ]),
    ),
  ].join("\n");
}

export const PROTOTYPE_BEGIN = "/* @tokens:begin";
export const PROTOTYPE_END = "/* @tokens:end */";

/** The light tokens as plain custom properties scoped to the prototype's Lillyjean design. */
export function buildPrototypeCss(
  light,
  selector = "[data-design='lj'] .phone,\n[data-notes='lj']",
) {
  return [
    `${PROTOTYPE_BEGIN} · generated by \`pnpm tokens:build\` from design/tokens (light theme). Do not edit. */`,
    block(selector, [
      ...themeDeclarations(light),
      ...rootFoundationDeclarations(light),
      ...themedDeclarations(light, { descriptions: false }),
    ]).trimEnd(),
    PROTOTYPE_END,
  ].join("\n");
}

/** Replaces the generated block in the prototype HTML. Throws if the markers are missing. */
export function embedInPrototype(html, css) {
  const start = html.indexOf(PROTOTYPE_BEGIN);
  const end = html.indexOf(PROTOTYPE_END);
  if (start < 0 || end < start)
    throw new Error(
      `prototype: markers "${PROTOTYPE_BEGIN}" … "${PROTOTYPE_END}" not found`,
    );
  return html.slice(0, start) + css + html.slice(end + PROTOTYPE_END.length);
}

// ---------------------------------------------------------------------------
// Contrast
// ---------------------------------------------------------------------------

/**
 * Checks declared contrast pairs in one theme. Translucent colours are composited over `over`
 * (default: background).
 */
export function checkContrast(ctx, pairs, theme) {
  const color = (name) => {
    const t = ctx.tokens.get(`color.${name}`);
    if (!t || t.type !== "color")
      throw new Error(`contrast pair: unknown colour token "${name}"`);
    return t.value;
  };
  const page = color("background");
  return pairs.map((pair) => {
    const base = pair.over ? composite(color(pair.over), page) : page;
    const bg = composite(color(pair.bg), base);
    const fg = composite(color(pair.fg), bg);
    const ratio = contrastRatio(fg, bg);
    return { theme, ...pair, ratio: round(ratio, 2), pass: ratio >= pair.min };
  });
}
