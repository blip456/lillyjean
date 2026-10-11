# Design system research

Research for choosing Lillyjean's design system and UI kit. Written 2026-10-11 on the `design-system`
branch. Inputs are decisions T1, T8, T11, D5 and A3 in [`docs/decisions.md`](../decisions.md) and the
51 screens in [`docs/wireframes/v2`](../wireframes/v2/README.md). Versions come from the npm registry on
2026-10-11. Claims based only on secondary sources are marked _(unverified)_. This document does not
change any decision. It is input for a new decision entry.

## 1. Summary

Four stacks are realistic. **shadcn/ui on Base UI** with our own tokens is the closest match to T11. It
now ships a gesture-driven bottom sheet (Base UI Drawer) and a long-press context menu, which cover most
of the wireframe interactions. A **frosted "glass" layer** can be added on top of it in the polish sprint
(D5). Real Liquid Glass refraction does not render in iOS Safari, so on the web this is limited to
blur-based glass. **Konsta UI 5** has the most iOS-native look out of the box (iOS 26 styles, Tailwind
v4), but it is harder to give a bookish identity of our own, and it has no swipe gestures. The
**Material routes** (MUI v9, Material Web) look like Android on an iPhone and have weak M3 support on the
web. For any of these stacks, a root `DESIGN.md` (Google's alpha spec) can be the single source of truth
for tokens and rules, exported to Tailwind v4 `@theme` and mapped onto shadcn's CSS variables.

## 2. DESIGN.md and design tokens

### What DESIGN.md is

`DESIGN.md` describes a visual identity for coding agents. Google Stitch introduced it, and Google later
published it as an open spec at `google-labs-code/design.md` (Apache-2.0). The spec version is `alpha`.
The CLI `@google/design.md` is at 0.4.0 (2026-07-27), and the README warns that the format will change.
A file has two layers:

- **YAML front matter with tokens**: `name`, `colors`, `typography` (fontFamily, fontSize, fontWeight,
  lineHeight, letterSpacing…), `rounded`, `spacing`, and `components`. Components hold per-component
  sub-tokens (backgroundColor, textColor, typography, rounded, padding, size, height, width). They can use
  references such as `{colors.primary}`. Variants are separate keys, for example `button-primary-pressed`.
- **Markdown prose** in a fixed order of `##` sections: Overview, Colors, Typography, Layout, Elevation &
  Depth, Shapes, Components, Do's and Don'ts. Unknown sections are preserved, so project-specific
  sections are allowed.

The CLI has four commands:

- `lint` runs 11 rules, including broken references, a missing primary color, and WCAG AA contrast for
  component colour pairs.
- `diff` reports token-level regressions between two versions.
- `export` writes Tailwind v4 `@theme` CSS (`css-tailwind`), Tailwind v3 JSON, or W3C DTCG JSON.
- `spec` prints the spec so it can be injected into an agent prompt.

The spec has no notion of light/dark modes, motion tokens, or elevation tokens. Those stay in the prose,
or they need a naming convention such as `surface` / `surface-dark`.

Community collections, mainly VoltAgent/awesome-design-md (about 73 files, MIT) and its front end
getdesign.md, hold DESIGN.md files reverse-engineered from well-known product sites. They are useful as
style references and for comparing structure. They are not official design systems of those brands.

**How agents consume it.** No agent loads `DESIGN.md` automatically the way Claude Code loads
`CLAUDE.md` or other tools load `AGENTS.md`. There are three ways to wire it in:

- **`@DESIGN.md` import in `CLAUDE.md`.** This is how `CLAUDE.md` already imports `AGENTS.md`. It is
  always in context, but it costs tokens on backend work.
- **A conditional rule in `CLAUDE.md`** ("Read `DESIGN.md` before any UI, styling or component work").
  This is cheaper, but it relies on the agent following the rule.
- **A project skill** (`.claude/skills/ui/SKILL.md`) that points at `DESIGN.md` and the token pipeline.
  It loads only for UI tasks.

The conditional rule fits the existing style of `CLAUDE.md` ("Read `docs/decisions.md` before changing
architecture"). The shadcn project also publishes an agent skill (`npx skills add shadcn/ui`), and Next
16.4's bundled docs recommend a `vercel-react-view-transitions` skill. Both can sit next to it.

### Design tokens beyond DESIGN.md

- **W3C DTCG format 2025.10** is the first stable version (2025-10-28). It is a Community Group report,
  not a W3C Standard. It has three modules: Format, Color (including OKLCH and Display P3) and Resolver.
  Resolver is how themes and modes such as light/dark are expressed. It is the interchange format between
  Figma plugins, Style Dictionary and other tools.
- **Style Dictionary 5.6.1** (Apache-2.0, released 2026-10-10) reads DTCG (`$value`/`$type`) since v4
  and can emit any CSS format. Writing a custom format for Tailwind v4 `@theme` plus shadcn variables
  takes a few dozen lines. **Tokens Studio** (Figma plugin) with `@tokens-studio/sd-transforms` 2.0.3 is
  the usual Figma-to-Style-Dictionary bridge. That only matters if Lillyjean gets a Figma file. Today the
  wireframes are plain HTML.
- **Tailwind v4** (4.3.3) keeps tokens in CSS. `@theme { --color-paper: … }` creates both the CSS
  variable and the utilities (`bg-paper`). `@theme inline` maps utilities to other variables, which is
  how shadcn makes `.dark` overrides work. Namespaces are `--color-*`, `--font-*`, `--text-*`,
  `--radius-*`, `--spacing-*`, `--shadow-*`, `--ease-*` and `--animate-*`.
- **Figma Variables to code.** The official Figma MCP server's `get_variable_defs` returns the variables
  used in a selection, and Code Connect maps Figma components to repo components. This only works when the
  designer uses real Figma variables. Code Connect is limited to paid Figma plans _(check the current
  plan matrix)_. It becomes relevant only if a designer joins for the polish sprint.

### Proposed skeleton for `DESIGN.md` (repo root)

Section order follows the spec. The extra sections after "Do's and Don'ts" are allowed as unknown
sections.

```md
---
version: alpha
name: Lillyjean
description: Warm, bookish social reading tracker; iPhone-first installed PWA.
colors: # light-mode semantic roles (primary, background, surface, ink, muted, accent, destructive…)
typography: # display, title, body, label, caption (system UI + one book/serif face)
rounded: # sm, md, lg, sheet, pill
spacing: # 4-pt scale + safe-area aware gutters
components: # button-primary, tab-bar, sheet, book-card, status-chip, progress-ring…
---

## Overview — personality ("warm library, not a productivity tool"), audience, tone, iOS-first.

## Colors — role of each colour, dark-mode counterparts (spec has no modes), contrast rules.

## Typography — type scale, serif vs sans usage, Dynamic Type stance, line lengths.

## Layout — 4-pt grid, mobile-first widths, tab bar + safe areas, desktop sidebar (X1).

## Elevation & Depth — flat vs layered surfaces, glass/material rules, shadows, sheets.

## Shapes — corner radii per component, book-cover aspect ratio and mosaic rules.

## Components — tab bar, + menu sheet, status sheet, swipe row, long-press menu, cards, forms.

## Do's and Don'ts — e.g. no example values in placeholders, labels always visible, 44 pt targets.

## Motion & Haptics — durations/easings, view transitions, reduced motion, no reliance on haptics.

## Platform: iOS PWA — standalone mode, status bar, safe areas, gestures that conflict with iOS.

## Accessibility — WCAG 2.2 AA targets, contrast, focus, reduced transparency fallback.

## Content & Imagery — book covers, initials avatars, empty states, illustration style, icon set.

## Token pipeline — how this file maps to `src/app/globals.css` and how to regenerate it.
```

### How it would flow into Tailwind v4 and shadcn

1. **Author** the tokens in the `DESIGN.md` front matter, which is the single source of truth. Values are
   in OKLCH because shadcn's default theme is OKLCH and the DTCG Color module supports it.
2. **Validate** with `designmd lint DESIGN.md`. This runs in lefthook pre-commit or CI, next to
   `pnpm lint`, and catches broken references and AA contrast failures.
3. **Generate** `src/app/tokens.css`. There are two options:
   - Use `designmd export --format css-tailwind` as is. This gives a flat `@theme` block, with no dark
     mode and no shadcn naming.
   - Write a small script (about 50–80 lines) on the programmatic API
     (`import { lint } from '@google/design.md/linter'` returns the parsed design system). It writes
     shadcn's structure: `:root { --background, --foreground, --primary, … }`, `.dark { … }` built from
     `*-dark` tokens, and `@theme inline { --color-primary: var(--primary); … }`. It also writes extra
     Lillyjean tokens (`--color-paper`, `--color-ink`, `--radius-sheet`, `--ease-sheet`) in the way
     shadcn's theming docs recommend for new tokens.
4. **Import** `tokens.css` in `globals.css` after `@import "tailwindcss"`. shadcn components then pick up
   the theme with no edits, because they only use semantic utilities (`bg-primary`,
   `text-muted-foreground`).
5. **Check drift** with `designmd diff`, which shows token changes in PRs. A CI check that regenerates
   `tokens.css` and fails on a diff keeps the file honest.

**Alternative:** keep tokens in a DTCG `tokens.json` (the stable spec, which has modes through the
Resolver module) and build them with Style Dictionary. `DESIGN.md` would then hold only prose and
reference the JSON. This is more robust, but it means two files and more tooling. The DESIGN.md format
being alpha is the main risk of the single-file approach. The `export --format dtcg` command is the exit
path if the spec stalls.

## 3. Libraries and design systems compared

"Fit" scores how well a library fits Lillyjean: iPhone PWA, Next 16 App Router, Tailwind 4, T11's
copy-in approach, a bookish identity of its own, and the interactions in wireframes N2, B3–B5, C4, D4 and
F4. Maintenance is the latest npm release date.

| Name                               | Style                                        | iOS feel                              | Next 16 / React 19 / TW4 fit                                  | Bottom sheet / swipe                                                       | License                          | Maintenance                        | Fit   |
| ---------------------------------- | -------------------------------------------- | ------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------- | ---------------------------------- | ----- |
| shadcn/ui on Base UI               | Copy-in components, neutral, fully themeable | Neutral; can be tuned                 | Excellent (default for new projects since 2026-07-02)         | Base UI Drawer: swipe-to-dismiss, snap points, indent, nested; Toast swipe | MIT                              | CLI 4.21.4 (Oct 2026); Base UI 1.9 | ★★★★★ |
| shadcn/ui on Radix                 | Same as above                                | Neutral                               | Excellent                                                     | Drawer still on **Vaul** (repo marked unmaintained, last release Dec 2024) | MIT                              | radix-ui 1.7.0 (Oct 2026)          | ★★★★☆ |
| shadcn/ui on React Aria            | Same as above, React Aria behaviour          | Neutral; strong touch/press handling  | Excellent (base added 2026-07-17)                             | Drawer uses Base UI under the hood                                         | MIT / Apache-2.0                 | RAC 1.22.1 (Oct 2026)              | ★★★★☆ |
| Konsta UI 5                        | Pixel-close iOS 26 + Material "2025" themes  | **Highest** (iOS 26 look, Glass comp) | Good: Tailwind v4 `@theme`, React 19; client components       | Sheet/Actions/Popup without drag gestures; no swipe rows                   | MIT                              | 5.5.0 (2026-09-28)                 | ★★★★☆ |
| Framework7 React 9                 | Full iOS 26 / Material app framework         | Very high                             | Poor: own router and app shell, SPA model                     | Swipe-to-close sheets, swipeouts, swipe-back built in                      | MIT                              | 9.2.0 (2026-09-28)                 | ★★☆☆☆ |
| Ionic React 9                      | Web components, iOS/MD modes                 | High (pre-iOS 26 style)               | Poor: client-only, React Router-based navigation              | Sheet modal with breakpoints, item-sliding                                 | MIT                              | 9.0.7 (2026-10-07)                 | ★★☆☆☆ |
| HeroUI v3                          | Polished SaaS look, React Aria + TW4         | Medium                                | Good: peers React ≥19, Tailwind ≥4                            | Drawer (CSS animations); gesture support unclear                           | MIT (paid Pro tier)              | 3.2.6 (2026-09-17)                 | ★★★☆☆ |
| Mantine 9                          | Complete kit, own CSS (PostCSS/modules)      | Low–medium                            | Good with React 19.2+; parallel styling system next to TW     | Drawer without swipe gestures                                              | MIT                              | 9.7.2 (2026-10-11)                 | ★★★☆☆ |
| Untitled UI React                  | Copy-in, React Aria + TW4, SaaS aesthetic    | Low–medium                            | Good                                                          | No dedicated bottom sheet _(unverified)_                                   | MIT (open-source part; Pro paid) | Active (React 19.2, TW 4.3)        | ★★★☆☆ |
| Chakra UI v3                       | Styled system on Ark UI/Zag                  | Low–medium                            | Medium: Emotion runtime CSS-in-JS, client-only, duplicates TW | Ark Drawer                                                                 | MIT                              | 3.37.0 (2026-08-28)                | ★★☆☆☆ |
| Park UI / Ark UI                   | Ark primitives + Panda presets               | Low                                   | Medium: Tailwind variant stale since 2023                     | Ark/Zag Drawer with swipe                                                  | MIT                              | Ark 5.39 active; Park preset 2024  | ★★☆☆☆ |
| daisyUI 5                          | CSS-only class components, 30+ themes        | Low                                   | Good (Tailwind 4 plugin)                                      | `<dialog>` modal, `dock`; no gestures                                      | MIT                              | 5.7.47 (2026-09-30)                | ★★☆☆☆ |
| Radix Themes 3                     | Pre-styled Radix                             | Low                                   | Medium: own CSS, not Tailwind                                 | None                                                                       | MIT                              | 3.3.0 (2026-01-31)                 | ★★☆☆☆ |
| Base UI (direct)                   | Unstyled primitives                          | Whatever we build                     | Excellent                                                     | Drawer, ContextMenu (long press), Toast                                    | MIT                              | 1.9.0 (2026-10-09)                 | ★★★★☆ |
| MUI (Material UI) v9               | Material Design **2**                        | Low (Android look)                    | Medium: Emotion runtime                                       | SwipeableDrawer                                                            | MIT (MUI X Pro/Premium paid)     | 9.5.0 (2026-10-09)                 | ★★☆☆☆ |
| Material Web (`@material/web`)     | Material 3 web components (Lit)              | Low                                   | Weak: web components, SSR extra work                          | No bottom sheet                                                            | Apache-2.0                       | 2.5.0; maintenance mode            | ★☆☆☆☆ |
| Tamagui 3                          | Universal RN + web                           | Medium                                | Weak for a web-only app; RN-first                             | Sheet with gestures                                                        | MIT                              | 3.0.3 (2026-10-11)                 | ★☆☆☆☆ |
| IBM Carbon / Fluent 2 / Spectrum 2 | Enterprise/productivity systems              | Low                                   | Medium (Sass / Griffel / style macros)                        | Not mobile-sheet oriented                                                  | Apache-2.0 / MIT / Apache-2.0    | Active                             | ★☆☆☆☆ |

### Serious candidates in more detail

**shadcn/ui (T11).** shadcn/ui is still a copy-in model: the components live in `src/components/ui`, and
the CLI pulls them from a registry. The project has changed a lot since T11 was written:

- **Bases.** There are now three primitive bases: Base UI (the default since 2026-07-02), Radix (still
  supported, `-b radix`) and React Aria (`--base aria`, since 2026-07-17).
- **Styles and presets.** There are eight visual styles (Vega, Nova, Maia, Lyra, Mira, Luma, Rhea,
  Sera), and `shadcn/create` produces a preset for colours, radius, fonts and icons.
- **Drawer and toast.** In the Base UI variant, the Drawer moved off Vaul. Base UI's Drawer supports
  swipe direction, snap points (`'148px'`, fractions), an iOS-style "indent" background scale, nested
  drawers and iOS 26 viewport quirks. A new Base UI Toast (2026-07-23) adds swipe-dismiss and sits next
  to Sonner (2.0.8, maintained).

For Lillyjean this means the + menu (N2), status sheet (B3), mark-as-read sheet (D4), add-to-readlist
(C4) and recommend sheet (F4) all map to one primitive. The long-press menu (B5) maps to Base UI
`ContextMenu`, which opens on long press. That leaves swipe-to-change-status (B4) as the only custom
gesture. The weak points are the generic "shadcn look" until the polish sprint and the lack of any iOS
chrome (tab bar, large titles), which we design ourselves. The visual editor **tweakcn** (open source,
Tailwind v4/OKLCH output) and `shadcn/create` are the quickest ways to explore a warm theme. Their
output is plain CSS variables, so it can be pasted back into `DESIGN.md`.

**Konsta UI 5.** Konsta UI is made by the Framework7 author. It is a set of React/Vue/Svelte components
styled with Tailwind, and it has no router or app framework. v5 (2025-08) moved to Tailwind v4's
`@theme` and React 19, restyled almost everything to iOS 26, and added a `Glass` component. Glass is
built from `backdrop-blur` and translucent fills, not SVG refraction, so it works in Safari. Releases
have come monthly in 2026. It gives the most convincing iPhone look with the least work: navbar with
large title, tabbar, list groups, segmented controls, action sheets. The trade-offs:

- Its components are opinionated replicas of iOS. A distinct bookish identity means fighting the theme,
  or the app looks like a settings screen.
- Its `Sheet` has no drag-to-dismiss gesture, and there are no swipe rows. We would still need Base UI
  Drawer or custom gestures.
- Its accessibility story is less documented than Base UI's or React Aria's.
- Mixing it with shadcn means two component vocabularies.

A middle path is to borrow from Konsta (copy its iOS measurements, tab bar and list styles) without
depending on it.

**Framework7 and Ionic.** Both have the deepest native behaviour: swipe-back, swipeouts and sheet
breakpoints. Framework7 9 has iOS 26 styles. Ionic 9 (2026-08-19) rebuilt its React Router integration,
but its changelog lists no iOS 26 styles. Both want to own routing and the page stack (Framework7's
router; Ionic's `IonReactRouter`). That conflicts with the Next.js App Router, server components and
next-intl routing from T1/T8. They are a fit only if Lillyjean became a client-side SPA, which would
reopen T1.

**HeroUI v3, Untitled UI React and Mantine 9** are good, actively maintained kits. HeroUI and Untitled
UI are Tailwind v4 + React Aria, which makes them closest to T11 technically. Their aesthetic is
SaaS/dashboard, and neither adds iOS-specific mobile patterns. Mantine (a T11 alternative) is very
complete and active, but it brings its own styling system next to Tailwind and has no gesture sheets.

**Chakra v3, Park UI, daisyUI, Radix Themes, MUI, Tamagui, Carbon/Fluent/Spectrum** are listed for
completeness. Each conflicts with at least one constraint: runtime CSS-in-JS, a stale Tailwind path, no
behaviour layer, Android/enterprise styling, or React Native-first.

### Templates and theme tooling

- **shadcn/create and presets**: pick a base, style, colours, radius, fonts and icons, then
  `npx shadcn init` with that preset. This is the official way to start from a non-default look.
- **tweakcn**: a visual theme editor for shadcn (open source, Vercel OSS programme). It outputs
  Tailwind v4 OKLCH variables. It is good for trying "paper/ink/leather" palettes with real components.
- **shadcn blocks / registries**: mostly desktop dashboards and marketing sections. They are of limited
  use for a mobile PWA, but useful for the desktop sketch (X1) and admin screens (H1–H4).
- **coss ui (formerly Origin UI)**: Base UI-based particles, now under Cal.com. It has some useful form
  and input patterns. Origin UI itself gets limited maintenance.
- **Magic UI**: animated marketing components (MIT). It might inspire the challenge celebration (E7) or
  the first-run splash (A1). It is not an app UI kit.
- **Tailwind Plus / Catalyst**: paid ($149 for Catalyst, one-time) and built on Headless UI with desktop
  app layouts. One 2026 report says Tailwind Plus stopped selling new licences _(unverified)_. It is not
  a fit.

## 4. iOS and Liquid Glass on the web

**What Apple does.** iOS 26 (Sept 2025) introduced Liquid Glass, a translucent material that blurs and
refracts what is behind it, with specular highlights. Apple's guidance reserves it for the navigation
and controls layer floating above content: tab bars, toolbars, sheets. It is not meant for content
itself. Users can tone it down with Reduce Transparency, Increase Contrast and, since iOS 26.1, a
Clear/Tinted setting. Apple publishes no web components. SF Pro may not be shipped as a web font under
its licence, but `font-family: system-ui, -apple-system` renders SF on Apple devices.

**What the web can do on an iPhone.** Every iOS browser uses WebKit, and that is where most of the
difficulty comes from.

- **Blur glass works.** `backdrop-filter: blur() saturate()` (unprefixed since Safari 18) with
  translucent fills, an inner highlight (`inset` box-shadow or gradient border) and a soft drop shadow.
  This is what Konsta's `Glass` and iOS-style navbars do. It is good enough for tab bars, sheet headers
  and floating buttons.
- **Refraction does not work in Safari.** The "real" Liquid Glass demos combine `backdrop-filter` with
  SVG `feDisplacementMap` (`backdrop-filter: url(#filter)`). This is out of spec and only Chromium renders
  it. `liquid-glass-react` (1.1.1, no release since June 2025) states that Safari and Firefox only partly
  support the effect and show no displacement. A WebKit bug report from May 2026 shows Safari not rendering
  it. For an iPhone-only audience that means paying the cost and getting none of the effect.
- **Performance.** Every blurred layer is a GPU compositing pass, and it is re-rendered while content
  scrolls underneath. Keep blur to a few fixed surfaces (tab bar, top bar, open sheet). Never blur list
  items. Consider turning blur off while a sheet is being dragged (Base UI sets `data-swiping`). Test on
  the oldest iPhone the testers use.
- **Accessibility.** Text over glass changes contrast with whatever scrolls beneath it.
  `prefers-reduced-transparency` is **not supported in Safari** (caniuse, through 26.5), so the iOS
  Reduce Transparency setting is invisible to us. Two mitigations: honour `prefers-contrast: more` (Safari
  supports it) by switching to solid surfaces, and offer an in-app "Reduce transparency" toggle stored
  like the locale cookie (T8). Keep glass fills opaque enough (about 70–85 %) that AA contrast holds over
  a white page.
- **Safari 26 chrome.** In the browser, Safari 26 ignores `<meta name="theme-color">` and tints its
  floating bars from the page background or fixed elements (WebKit bugs, developer reports). In
  standalone mode there is no browser chrome. Only the status bar remains, controlled by
  `apple-mobile-web-app-status-bar-style`.

**Recommended building blocks** if we want glass:

- A `glass` utility defined once with `@utility` in `globals.css`. It holds the blur radius, saturation,
  fill, highlight and border, and reads tokens from `DESIGN.md` (Elevation & Depth).
- Solid fallbacks: `@supports not (backdrop-filter: blur(1px))`, `@media (prefers-contrast: more)` and
  the in-app toggle.
- Glass used only on N1 (tab bar), sheet surfaces (N2, B3, D4, C4, F4) and top bars, so content stays
  solid.
- Konsta's iOS measurements (tab bar height, list insets, navbar large-title behaviour) as a reference,
  with or without the dependency.

## 5. Material Design 3 on the web

- **Material Web (`@material/web`)** is Google's M3 web-component library (Lit, Apache-2.0). Its README
  says it is "in maintenance mode pending new maintainers". Patch releases continue (2.5.0, July 2026),
  but no new components are planned and there is no bottom sheet. Lit components work in React 19, but
  server rendering needs extra setup.
- **MUI v9** (stable 2026-04-07, now 9.5.0) **still implements Material Design 2**. M3 is tracked in
  GitHub issue #29345 and has not shipped. The v9 roadmap talks about dropping Emotion and better Tailwind
  integration in the next major, not about M3.
- **Material 3 Expressive** (May 2025) has shipped for Android/Compose and has community Flutter ports.
  No official web implementation was found.
- **Konsta UI and Framework7** have a "Material 2025" theme with vibrant and monochrome schemes. This is
  the most complete M3-like look available with Tailwind.
- **Material Theme Builder** (web and Figma plugin) and **`@material/material-color-utilities`** (0.4.0,
  Apache-2.0) generate M3 tonal palettes and dynamic schemes from a single seed colour. **This is useful
  even without Material components.** One "leather/cover" seed colour can produce a full, contrast-safe
  light and dark palette, which we would map to shadcn's roles in `DESIGN.md`. The Builder's web CSS
  export reportedly lags the newer surface roles, so the utilities library is more reliable.

**Caveat for Lillyjean:** testers use iPhones. M3 patterns (FAB, ripples, Android-style top app bar)
read as "an Android app on my iPhone". M3 is better used as a colour engine than as a visual language
here.

## 6. Option paths

### A. shadcn/ui (Base UI) + DESIGN.md tokens + our own mobile shell

This takes T11 as written and uses the Base UI base. Tokens live in `DESIGN.md` and are generated into
`tokens.css`. Base UI Drawer covers the sheets, Base UI ContextMenu covers long press, and Base UI
Toast or Sonner covers notifications. We build the tab bar, top bar and swipe row ourselves with pointer
events or Motion (14.x, MIT).

- **Pros:** No change to T1 or T11. One component vocabulary. Server-component friendly. Best
  accessibility baseline. Theme is fully ours, so it suits the bookish identity in the polish sprint.
  Agents know shadcn well, and there is an official shadcn skill.
- **Cons:** The iOS feel depends on our own care (spacing, tab bar, transitions). B4 swipe is custom
  work. Base UI Drawer's API differs from older shadcn/Vaul examples online.
- **Effort:** Low to start in Sprint 2. Medium for the custom shell and B4.
- **Impact on T11:** Confirms it. A short new entry would record the base choice (Base UI vs Radix) and
  that Vaul is no longer used.

### B. Path A + an iOS "glass layer" in the polish sprint

This is the same foundation, plus a small iOS-inspired material system: a `glass` utility, frosted tab
bar and sheets, large-title top bars, iOS spring easings, and view transitions with React 19.3
`<ViewTransition>`, which works in the Next 16.4 App Router with no config. Fallbacks are solid surfaces
and an in-app reduce-transparency switch.

- **Pros:** Gets close to iOS 26 in look and feel without a second kit, and keeps the identity ours.
  Fits D5 (clean first, polish later). It can be added gradually.
- **Cons:** Blur only, with no refraction. GPU cost on older iPhones. Accessibility fallbacks are
  extra work. Glass dates quickly if Apple revises it (BGR reports that iOS 27 changes Liquid Glass
  customisation again _(unverified)_).
- **Effort:** Medium, about one polish sprint for the material system and its fallbacks.
- **Impact on T11:** None. Add a visual-identity decision entry for the polish sprint (D-series).

### C. Konsta UI 5 (iOS theme) as the component kit

Konsta's React components with `theme="ios"` would be used for app chrome and lists, plus Base UI Drawer
(or a shadcn subset) for gesture sheets and form primitives.

- **Pros:** The most native iPhone look on day one, with iOS 26 styles and Glass. Tailwind v4 native.
  MIT. Released monthly.
- **Cons:** Its iOS-replica identity conflicts with "warm bookish". There are two component systems if
  combined with Base UI. No drag gestures. Client components everywhere. A smaller community, and less
  agent familiarity. Android or desktop users get either iOS styling or Konsta's Material theme, which
  means maintaining two looks.
- **Effort:** Low for the first screens. Medium to high to restyle it towards our own identity.
- **Impact on T11:** Replaces shadcn as the primary kit. Needs a new decision entry superseding T11.

### D. Material route (MUI v9, or Konsta/Framework7 Material theme)

- **Pros:** The most complete component sets (MUI), with good docs and data components for the admin
  area.
- **Cons:** MUI is M2-based and uses Emotion (runtime CSS-in-JS next to Tailwind). Material Web is in
  maintenance mode. Material styling looks wrong on iPhone. MUI's SwipeableDrawer is the only gesture
  sheet.
- **Effort:** Medium, with ongoing friction with Tailwind and next-intl styling.
- **Impact on T11:** Replaces it, and partly works against T1 (Tailwind as the styling system).
  Considered, but a weak fit.

Ionic and Framework7 are not offered as paths because they would reopen T1 (SPA with their own router).

## 7. Mobile PWA specifics (applies to every path)

- **Standalone mode and installing.** Since iOS 26, any site added to the Home Screen opens as a web app
  by default. Detect it with `matchMedia('(display-mode: standalone)')`, as the Next PWA guide does. The
  manifest `display: 'standalone'` and Next's `metadata.appleWebApp` (`capable`, `title`,
  `statusBarStyle`) still matter.
- **Status bar and safe areas.** Set `viewport.viewportFit = 'cover'` (supported by Next's `Viewport`
  type) and `statusBarStyle: 'black-translucent'` so content draws under the status bar. Pad with
  `env(safe-area-inset-top|bottom)`. Tailwind v4 has no built-in safe-area utilities, so define
  `@utility pt-safe` and similar ourselves. A WebKit bug report (301994) says
  `env(safe-area-inset-top)` returned 0 in standalone after iOS 26.1. Test on device and keep a fallback.
- **Tap targets.** Apple HIG asks for at least 44×44 pt, and WCAG 2.2 sets 24×24 CSS px at AA (2.5.8)
  and 44×44 at AAA (2.5.5). Use 44 px as the token-level minimum for the tab bar, list rows and sheet
  actions.
- **Dynamic Type.** Safari keeps `1rem = 16px` whatever the iOS text-size setting (WebKit bug 260880).
  The opt-in is `html { font: -apple-system-body }`, then override `font-family`. It scales rem-based
  type with Dynamic Type, but it changes the base size on macOS Safari (to 13 px), so scope it to touch
  devices. Use `rem` everywhere either way, so the choice stays a one-line switch.
- **Dark mode.** shadcn uses a `.dark` class. Default to `prefers-color-scheme`, store an override in a
  cookie (as T8 does for locale) to avoid a flash, and set `viewport.themeColor` per scheme.
  `next-themes` (0.4.6, last release March 2025) works but is quiet. A 20-line inline script is an
  alternative.
- **Motion.** Use React 19.3 `<ViewTransition>` for route and shared-element transitions. Safari
  supports the core API, but Next's docs warn that some animations differ in Safari. Respect
  `prefers-reduced-motion` (supported in Safari). Keep sheet and drawer easing in tokens, for example
  the `cubic-bezier(0.32, 0.72, 0, 1)` used in Base UI's Drawer demos.
- **Transparency.** Safari does not support `prefers-reduced-transparency`. Use `prefers-contrast` and an
  in-app setting instead (see §4).
- **Haptics.** Safari has no `navigator.vibrate()`. Native `<input type="checkbox" switch>` (Safari 17.4+)
  gives a system haptic when the user toggles it. Libraries trigger it from code through a hidden switch.
  One source says iOS 26.5 closed that trick _(unverified)_. Treat haptics as a bonus and never as the
  only feedback.
- **Gestures.** B4 swipe rows need `touch-action: pan-y` on rows and must leave a gap from the screen
  edge so they don't clash with the iOS back-swipe. Standalone PWAs have no browser back gesture, so
  every screen needs a visible back control. Base UI's `data-base-ui-swipe-ignore` keeps horizontal
  carousels inside sheets usable.

## 8. Suggested next steps and open questions

**Next steps**

1. Decide the direction (A, A+B, C or D). Then record a new decision entry, for example T16 "UI kit
   base", which either refines or supersedes T11.
2. Run a **1–2 day device spike** on a real iPhone in standalone mode: tab bar (N1), + menu sheet (N2),
   status sheet (B3) and one swipe row (B4). Build it with Path A, and optionally Konsta (Path C) for
   comparison. Judge the feel, not the colours.
3. Add `DESIGN.md` at the repo root with the skeleton above and a neutral token set (D5: clean default
   first). Add a conditional rule to `CLAUDE.md` ("Read `DESIGN.md` before UI work"), plus
   `designmd lint` in lefthook/CI.
4. Write the token generator script (DESIGN.md → `tokens.css` with `:root`, `.dark` and
   `@theme inline`), or choose the DTCG + Style Dictionary alternative.
5. Run `npx shadcn init` with the chosen base and preset when the first approved screens start (as T11
   already says). Add a `pt-safe`/`pb-safe` utility and the viewport/appleWebApp metadata at the same
   time.
6. In the polish sprint: palette from a seed colour (material-color-utilities or tweakcn), typography
   (a serif for book titles via `next/font`, which needs a licence check), a glass layer if chosen, and
   an accessibility pass.

**Open questions for you**

- How native should it feel: "indistinguishable from an iOS app" (pushes towards Konsta and glass) or
  "a warm app of its own that respects iOS conventions" (pushes towards A/B)?
- Is Android or desktop use expected among testers or later users? That decides whether an iOS-styled
  look is acceptable for everyone.
- Base UI (the shadcn default, with gesture drawer built in), Radix (the familiar base, but drawer on
  unmaintained Vaul), or React Aria (strongest touch/press semantics)?
- Should tokens live only in `DESIGN.md` (simple, alpha spec, no modes) or in DTCG JSON with DESIGN.md as
  prose (stable, more tooling)?
- Will there be a Figma file or a designer for the polish sprint? If not, skip the Figma Variables / MCP
  / Code Connect tooling.
- Glass: in scope for the polish sprint, and is an in-app "Reduce transparency" setting acceptable as a
  new settings item (G2)?

## 9. Sources

All accessed 2026-10-11. Versions and dates come from the npm registry (`registry.npmjs.org`) unless a
source is given.

**DESIGN.md and tokens**

- Google DESIGN.md spec and CLI: https://github.com/google-labs-code/design.md (README, `docs/spec.md`)
- `@google/design.md` on npm: https://www.npmjs.com/package/@google/design.md
- Stitch DESIGN.md overview: https://stitch.withgoogle.com/docs/design-md/overview/
- VoltAgent awesome-design-md: https://github.com/voltagent/awesome-design-md and https://getdesign.md
- The Decoder on Google open-sourcing DESIGN.md:
  https://the-decoder.com/googles-open-source-design-md-gives-ai-agents-a-prompt-ready-blueprint-for-brand-consistent-design/
- UX Planet, CLAUDE.md vs DESIGN.md:
  https://uxplanet.org/claude-md-vs-design-md-what-to-put-in-each-for-claude-code-53647d015bfd
- Claude Code memory and `@` imports: https://docs.anthropic.com/en/docs/claude-code/memory
- DTCG stable version announcement:
  https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/
- Design Tokens Format Module 2025.10: https://www.designtokens.org/tr/2025.10/
- Style Dictionary: https://styledictionary.com and https://www.npmjs.com/package/style-dictionary
- Tokens Studio transforms: https://www.npmjs.com/package/@tokens-studio/sd-transforms
- Figma MCP server overview (third party): https://atomize.tools/blog/figma-mcp/

**shadcn/ui, primitives and tooling**

- shadcn changelog, Base UI default:
  https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/changelog/2026-07-base-ui-default.mdx
- shadcn changelog, React Aria base:
  https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/changelog/2026-07-react-aria.mdx
- shadcn changelog, Toast:
  https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/changelog/2026-07-toast.mdx
- shadcn Drawer docs (base / radix):
  https://github.com/shadcn-ui/ui/tree/main/apps/v4/content/docs/components
- shadcn theming docs: https://ui.shadcn.com/docs/theming
- Base UI Drawer, ContextMenu and Toast: https://base-ui.com/react/components/drawer (also in the
  `@base-ui/react@1.9.0` package `docs/`)
- Vaul README (unmaintained notice): https://github.com/emilkowalski/vaul
- tweakcn: https://github.com/jnsahaj/tweakcn
- coss ui roadmap: https://coss.com/ui/docs/roadmap
- Tailwind Plus Catalyst: https://tailwindcss.com/plus/templates/catalyst
- Tailwind Plus sales report (unverified): https://devtoolpicks.com/blog/best-tailwind-plus-alternatives-indie-hackers-2026
- Tailwind CSS v4 theme variables: https://tailwindcss.com/docs/theme

**Other libraries**

- Konsta UI changelog: https://github.com/konstaui/konsta/blob/master/CHANGELOG.md and https://konstaui.com
- Framework7 changelog: https://github.com/framework7io/framework7/blob/master/CHANGELOG.md
- Ionic Framework 9 announcement: https://ionic.io/blog/announcing-ionic-framework-9
- Ionic changelog: https://github.com/ionic-team/ionic-framework/blob/main/CHANGELOG.md
- HeroUI v3 releases: https://heroui.com/docs/react/releases
- Untitled UI React: https://www.untitledui.com/react/docs/introduction
- Mantine: https://mantine.dev
- Chakra UI: https://chakra-ui.com
- Park UI changelog: https://park-ui.com/docs/tailwind/overview/changelog
- daisyUI dock: https://daisyui.com/components/dock
- Radix Themes: https://www.radix-ui.com/themes
- Tamagui: https://tamagui.dev

**Material**

- MUI overview ("supports Material Design 2"):
  https://github.com/mui/material-ui/blob/master/docs/data/material/getting-started/overview/overview.md
- MUI v9 announcement: https://mui.com/blog/introducing-mui-v9/
- MUI M3 tracking issue: https://github.com/mui/material-ui/issues/29345
- Material Web README and maintenance notice: https://github.com/material-components/material-web and
  https://github.com/material-components/material-web/discussions/5642
- Material Theme Builder: https://material-foundation.github.io/material-theme-builder/ and
  https://m3.material.io/blog/material-theme-builder
- Material Theme Builder CSS export limitation: https://github.com/difhel/material-theme-figma-to-css
- Material color utilities: https://github.com/material-foundation/material-color-utilities

**iOS, Liquid Glass and PWA**

- liquid-glass-react: https://github.com/rdev/liquid-glass-react
- WebKit bug on SVG displacement and backdrop-filter: https://bugs.webkit.org/show_bug.cgi?id=313914
- Liquid glass in CSS and SVG (ekino): https://medium.com/ekino-france/liquid-glass-in-css-and-svg-839985fcb88d
- `prefers-reduced-transparency` support: https://caniuse.com/wf-prefers-reduced-transparency
- Six Colors on Liquid Glass transparency and contrast:
  https://sixcolors.com/post/2025/11/soaping-up-liquid-glass-less-transparency-more-contrast/
- BGR on iOS 27 Liquid Glass changes: https://www.bgr.com/2191219/ios-27-liquid-glass-fix-customization/
- heise on iOS 26 Home Screen web apps: https://heise.de/-10749652
- Safari 26 theme-color tinting: https://benfrain.com/ios26-safari-theme-color-tab-tinting-with-fixed-position-elements/
  and https://bugs.webkit.org/show_bug.cgi?id=301756
- iOS 26.1 safe-area regression report: https://bugs.webkit.org/show_bug.cgi?id=301994
- Dynamic Type on the web: https://furbo.org/?p=2791 and https://bugs.webkit.org/show_bug.cgi?id=260880
- iOS Safari web haptics: https://azukiazusa.dev/en/blog/ios-safari-web-haptics and
  https://github.com/ionic-team/ionic-framework/issues/29942
- Next.js 16.4 bundled docs (`node_modules/next/dist/docs`): view-transitions guide, PWA guide,
  `generate-viewport`, `generate-metadata` (`appleWebApp`)
- WCAG 2.2 target size: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- Apple HIG, Materials: https://developer.apple.com/design/human-interface-guidelines/materials
