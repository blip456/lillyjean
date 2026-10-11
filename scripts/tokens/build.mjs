#!/usr/bin/env node
// `pnpm tokens:build`: design/tokens/*.tokens.json -> src/app/tokens.css (+ the prototype preview).
//
// 1. Syncs DTCG colour `components` from `hex` in the token files (hex is what people edit).
// 2. Resolves the light and dark contexts of design/tokens/lillyjean.resolver.json.
// 3. Writes src/app/tokens.css (formatted with the repo's Prettier config) and the light tokens
//    into the Lillyjean design of docs/design-system/prototype/index.html.
// 4. Reports contrast pairs from design/tokens/contrast-pairs.json that drop below WCAG AA.
//
// Tests (scripts/tokens/tokens.test.ts) fail when the generated files drift from the JSON.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import * as prettier from "prettier";

import {
  buildCss,
  buildPrototypeCss,
  checkContrast,
  embedInPrototype,
  loadTokens,
  resolveContext,
  syncColorComponents,
} from "./tokens.mjs";

export const ROOT = path.resolve(import.meta.dirname, "../..");
export const PATHS = {
  resolver: path.join(ROOT, "design/tokens/lillyjean.resolver.json"),
  pairs: path.join(ROOT, "design/tokens/contrast-pairs.json"),
  css: path.join(ROOT, "src/app/tokens.css"),
  prototype: path.join(ROOT, "docs/design-system/prototype/index.html"),
};

async function format(file, text) {
  const options = (await prettier.resolveConfig(file)) ?? {};
  return prettier.format(text, { ...options, filepath: file });
}

/** Loads and resolves the tokens. With `sync`, colour components are fixed up in memory first. */
export function readTokens({ sync = true } = {}) {
  const loaded = loadTokens(PATHS.resolver);
  const synced = [];
  if (sync) {
    for (const [file, doc] of loaded.files) {
      const changed = syncColorComponents(doc);
      if (changed.length) synced.push({ file, changed });
    }
  }
  const themes = {
    light: resolveContext(loaded.contexts.light),
    dark: resolveContext(loaded.contexts.dark),
  };
  return { ...loaded, themes, synced };
}

export function readPairs() {
  return JSON.parse(fs.readFileSync(PATHS.pairs, "utf8")).pairs;
}

/** Everything the build would write, without writing it. */
export async function generate() {
  const tokens = readTokens();
  const css = await format(PATHS.css, buildCss(tokens.themes));
  const prototype = embedInPrototype(
    fs.readFileSync(PATHS.prototype, "utf8"),
    buildPrototypeCss(tokens.themes.light),
  );
  const files = await Promise.all(
    tokens.synced.map(async ({ file }) => ({
      file,
      text: await format(file, JSON.stringify(tokens.files.get(file), null, 2)),
    })),
  );
  const contrast = Object.entries(tokens.themes).flatMap(([name, ctx]) =>
    checkContrast(ctx, readPairs(), name),
  );
  return { tokens, css, prototype, files, contrast };
}

async function main() {
  const out = await generate();
  const rel = (p) => path.relative(ROOT, p);
  const write = (file, text) => {
    const before = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
    if (before !== text) fs.writeFileSync(file, text);
    process.stdout.write(
      `${before === text ? "unchanged" : "wrote    "} ${rel(file)}\n`,
    );
  };
  for (const { file, text } of out.files) write(file, text);
  for (const s of out.tokens.synced) {
    process.stdout.write(
      `  synced colour components from hex: ${s.changed.join(", ")}\n`,
    );
  }
  write(PATHS.css, out.css);
  write(PATHS.prototype, out.prototype);

  const failing = out.contrast.filter((c) => !c.pass);
  process.stdout.write(
    `contrast: ${out.contrast.length - failing.length}/${out.contrast.length} pairs meet AA\n`,
  );
  if (failing.length) {
    for (const c of failing)
      console.error(
        `  FAIL ${c.theme}: ${c.fg} on ${c.bg} = ${c.ratio}:1 (needs ${c.min}:1)`,
      );
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
