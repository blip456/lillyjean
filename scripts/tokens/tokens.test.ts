import fs from "node:fs";
import path from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import { generate, PATHS, readPairs, readTokens } from "./build.mjs";
import { hueSaturation, loadTokens, syncColorComponents } from "./tokens.mjs";

const REBUILD = "run `pnpm tokens:build` and commit the result";

// Variable names shadcn/ui's CSS expects (https://ui.shadcn.com/docs/theming). Keep them so
// `shadcn init` and copied-in components map 1:1 onto our tokens.
const SHADCN = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "border",
  "input",
  "ring",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
];

let generated: Awaited<ReturnType<typeof generate>>;
beforeAll(async () => {
  generated = await generate();
});

describe("design tokens", () => {
  it("resolves every alias in both themes", () => {
    // readTokens throws on unresolved or circular references and invalid values.
    const { themes } = readTokens({ sync: false });
    for (const ctx of Object.values(themes)) {
      for (const token of ctx.tokens.values()) {
        expect(JSON.stringify(token.value), token.name).not.toMatch(
          /"\{[^"]*\}"/,
        );
      }
    }
  });

  it("keeps DTCG colour components in sync with hex", () => {
    const { files } = loadTokens(PATHS.resolver);
    const stale = [...files].flatMap(([file, doc]) =>
      syncColorComponents(doc).map((p) => `${path.basename(file)}: ${p}`),
    );
    expect(stale, `components differ from hex; ${REBUILD}`).toEqual([]);
  });

  it("generates src/app/tokens.css from the JSON (no drift)", () => {
    const current = fs.readFileSync(PATHS.css, "utf8");
    expect(
      current === generated.css,
      `src/app/tokens.css is out of date; ${REBUILD}`,
    ).toBe(true);
  });

  it("embeds the current light tokens in the prototype (no drift)", () => {
    const current = fs.readFileSync(PATHS.prototype, "utf8");
    expect(
      current === generated.prototype,
      `the token block in docs/design-system/prototype/index.html is out of date; ${REBUILD}`,
    ).toBe(true);
  });

  it("defines every shadcn/ui variable in light and dark", () => {
    for (const name of SHADCN) {
      expect(generated.css, name).toMatch(new RegExp(`--${name}: `));
      expect(generated.css, name).toMatch(
        new RegExp(`--color-${name}: var\\(--${name}\\);`),
      );
    }
    expect(generated.css).toMatch(/:root \{[^}]*--radius: /);
  });

  it("meets WCAG AA for every declared contrast pair in both themes", () => {
    const failing = generated.contrast
      .filter((c) => !c.pass)
      .map(
        (c) =>
          `${c.theme}: ${c.fg} on ${c.bg} is ${c.ratio}:1, needs ${c.min}:1`,
      );
    expect(failing).toEqual([]);
    expect(generated.contrast.length).toBe(readPairs().length * 2);
  });

  it("has no indigo or purple in the palette", () => {
    const { themes } = readTokens({ sync: false });
    const purple = [
      ...themes.light.tokens.values(),
      ...themes.dark.tokens.values(),
    ]
      .filter((t) => t.type === "color")
      .filter((t) => {
        const { hue, saturation } = hueSaturation(t.value);
        return saturation > 0.15 && hue >= 230 && hue <= 330;
      })
      .map((t) => `${t.name} ${t.value.hex}`);
    expect([...new Set(purple)]).toEqual([]);
  });
});
