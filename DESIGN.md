# Lillyjean design system

The entry point for any UI work: screens, components, styling. Read it before you write markup or CSS.
Decisions behind it: T11, T16 and D8 in [`docs/decisions.md`](docs/decisions.md). Background research and
the visual prototype: [`docs/design-system/`](docs/design-system/README.md).

## 1. Purpose and principles

Lillyjean is a social reading tracker for iPhone users (installed PWA). The chosen direction is
**"Media layout, iOS Glass palette"**: the structure and component language of the _Media dark_
exploration (Letterboxd / Spotify for books) in **light mode**, on the user's palette and the soft
pink-to-mint page gradient of _iOS Glass_. See it rendered with the real tokens in the prototype:
[`docs/design-system/prototype/index.html#lj`](docs/design-system/prototype/index.html) (design 1).

- **Covers first.** Books are shown as covers in horizontal shelves; text supports the cover.
- **Dense and bold.** Dense rows with hairlines, heavy tight headings, uppercase labels, small chrome.
- **Social as activity.** Friends appear with a ring on their avatar and the cover they are reading.
- **One accent.** Blue Greeny (`primary`) is the only fill colour for actions; pink is a highlight,
  never a second button colour. No indigo or purple anywhere (a test enforces it).
- **Accessible by default.** WCAG 2.2 AA contrast for every declared pair (tested), tap targets of at
  least 44 px, visible labels, no information by colour alone.
- **Native-feeling, not native-copying.** System font, iOS safe areas and gestures; flat surfaces, glass
  only where iOS uses it (sheets, sticky top bar).

## 2. Where the tokens live and how to change a colour

```
design/tokens/
  lillyjean.resolver.json   how the files combine (DTCG resolver: foundation + theme light|dark)
  primitives.tokens.json    raw palette ramps: teal, mint, pink, rose, neutral, charcoal, red, amber, …
  foundation.tokens.json    fonts, type ramp, radius, spacing, blur, durations, easing, gradients
  light.tokens.json         semantic colours + shadows, light theme (the default)
  dark.tokens.json          the same names, dark theme
  contrast-pairs.json       foreground/background pairs that must meet AA in both themes
scripts/tokens/             generator (build.mjs, tokens.mjs) and its tests
src/app/tokens.css          GENERATED: never edit by hand
```

The files use the W3C Design Tokens format 2025.10 (DTCG): `$value`, `$type`, `$description`, aliases
like `{color.teal.500}`. Every semantic token has a `$description` that says where it is used.

**To change a colour:**

1. Decide the level.
   - Change a **role** (for example a different accent): edit the alias in `light.tokens.json` (and
     `dark.tokens.json`), e.g. `"primary": { "$value": "{color.teal.600}" }`. One value per theme.
   - Change a **shade** everywhere it is used: edit the `hex` of the primitive in
     `primitives.tokens.json`, e.g. `color.teal.500`. Only edit `hex`; the build rewrites
     `components` (which DTCG requires) from it.
2. Run `pnpm tokens:build`. It writes `src/app/tokens.css`, refreshes the Lillyjean design in the
   prototype and prints any contrast pair that drops below AA.
3. Run `pnpm test`. It fails if the generated CSS or the prototype drift from the JSON, if an alias does
   not resolve, if a declared pair fails AA, or if a purple/indigo colour sneaks in.
4. Commit the JSON and the generated files together. If you add a foreground token, add its pair to
   `contrast-pairs.json`.

Light and dark must define the same semantic names (the build fails otherwise).

## 3. Naming and the one rule

**Never use raw hex, `rgb()`, named colours or arbitrary colour values (`bg-[#…]`) in components. Use
token utilities only.** The default Tailwind palette is removed in `tokens.css`, so `bg-indigo-500`,
`text-white` or `bg-black/50` produce nothing. If you need a colour that does not exist, add a semantic
token (section 2) instead of a one-off value.

Semantic colour names follow shadcn/ui, so `shadcn init` and copied components map 1:1:

| Utility examples                                                                      | Token                                                                                           |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `bg-background`, `text-foreground`                                                    | page base colour and default text (the page itself shows the gradient, see below)               |
| `bg-card`, `text-card-foreground`, `bg-popover`                                       | cards, row groups, menus                                                                        |
| `bg-primary`, `text-primary-foreground`                                               | the accent fill and the ink on it (buttons, + key, selected segment)                            |
| `bg-secondary`, `bg-muted`, `text-muted-foreground`                                   | secondary buttons/chips, quiet fills, secondary text                                            |
| `bg-accent`, `text-accent-foreground`                                                 | hover/pressed background of ghost buttons and menu items (shadcn meaning, not the brand accent) |
| `text-destructive`, `bg-destructive`                                                  | destructive actions and errors                                                                  |
| `border-border`, `border-input`, `ring-ring`                                          | hairlines, control boundaries (3:1), focus ring (3:1)                                           |
| `bg-chart-1` … `bg-chart-5`, `bg-sidebar*`                                            | charts and stats; the desktop sidebar (X1)                                                      |
| `text-link`                                                                           | inline links and text buttons                                                                   |
| `bg-highlight`, `text-highlight-foreground`                                           | pink highlight: "new" badges, recommendations                                                   |
| `bg-status-{want,reading,read}` + `-foreground`                                       | the three reading statuses                                                                      |
| `text-challenge`, `bg-challenge-badge`                                                | challenge indicator; the badge on a cover                                                       |
| `bg-challenge-{personal,shared,official}`                                             | challenge type stripe                                                                           |
| `bg-tab-bar`, `text-tab-bar-{foreground,active}`                                      | the tab bar                                                                                     |
| `bg-plus-key`, `text-plus-key-foreground`                                             | the + key                                                                                       |
| `bg-avatar-1` … `-5`, `text-avatar-foreground`                                        | initials avatars                                                                                |
| `bg-progress`, `bg-progress-track`                                                    | progress bars and rings (always with a number)                                                  |
| `text-rating`, `text-rating-empty`                                                    | stars (always with the number)                                                                  |
| `bg-surface-glass`, `bg-scrim`                                                        | glass fill (use the `glass` utility), sheet backdrop                                            |
| `shadow-cover`, `shadow-card`, `shadow-sheet`                                         | elevation                                                                                       |
| `bg-page-gradient`, `bg-avatar-ring-gradient`                                         | the page gradient (already on `<body>`), the "reading now" ring                                 |
| `rounded-cover` (3), `-md` (8), `-lg` (10), `-xl` (12), `-sheet` (16), `rounded-full` | radii: covers, cards and inputs, tiles, + key and library card, sheets, pills and buttons       |
| `min-h-tap`, `min-w-tap`, `min-h-row`, `px-gutter`                                    | 44 px targets, 52 px rows, 16 px screen padding                                                 |
| `w-cover-shelf` (112), `w-cover-row` (40), `w-cover-mini` (30)                        | cover widths; height is 1.5 × width (`aspect-[2/3]`)                                            |
| `backdrop-blur-glass`, `ease-standard`, `ease-sheet`, `duration-(--duration-sheet)`   | glass blur, easing, durations (`fast`, `base`, `sheet`)                                         |
| `glass`, `pt-safe`, `pb-safe`, `pl-safe`, `pr-safe`                                   | utilities in `globals.css`: glass surface with fallbacks, safe-area padding                     |

## 4. Colour roles and contrast

Palette: Blue Greeny `#5CBDB9` (`teal.500`, accent fill), ink on teal `#0B3533` (`teal.900`), teal text
and links `#19706C` (`teal.700`), Pinky `#FBE3E8` (`pink.100`), Teeny Greeny `#EBF6F5` (`mint.100`),
iOS Glass neutrals (label `#0C1716`, secondary label `#56615F`, grouped background `#F3F8F7`), rose
`#8C2F48` for text on pink.

- **White text never goes on Blue Greeny** (2.2:1). Teal fills carry ink (`primary-foreground`, 6:1).
- **Teal as text** uses `link` (`teal.700`, 5.5:1), never `primary`. Large numbers in teal too.
- **Pink is a surface**: Read status, highlights and the warm side of the gradient. Text on pink is rose.
- **Status colours:** Want to read = neutral, Reading = teal tint, Read = Pinky with rose text.
- The **page gradient** has three stops (`gradient-from` pink, `gradient-via` teal glow, `gradient-to`
  mint) over `background`; text contrast is tested against each stop. Cards are solid white on top.
- Declared pairs live in `design/tokens/contrast-pairs.json` (4.5:1 for text, 3:1 for focus ring, input
  boundaries and progress fills). Translucent colours are composited before measuring.

## 5. Typography

System sans only (`font-sans`: SF Pro on iPhone through `system-ui` / `-apple-system`); no downloaded
fonts. The ramp comes from Media dark: heavy and tight on top, dense 15 px body. Use the `text-<name>`
utility; it sets size, line height, weight and tracking together. Sizes are rem, so a later Dynamic Type
opt-in (research §7) scales everything.

| Utility          | Size/line · weight  | Use                                                   |
| ---------------- | ------------------- | ----------------------------------------------------- |
| `text-wordmark`  | 26/26 · 900         | the "lillyjean" wordmark (Home, welcome)              |
| `text-display`   | 30/33 · 900         | welcome and onboarding headlines                      |
| `text-title`     | 30/32 · 900         | screen titles, readlist and challenge names           |
| `text-headline`  | 22/26 · 900         | sheet titles, book title on the book detail           |
| `text-section`   | 19/24 · 800         | section headers above shelves and lists               |
| `text-stat`      | 48/48 · 900         | big numbers (books read, challenges completed)        |
| `text-row-title` | 15/20 · 700         | book titles in rows and shelves, names, card titles   |
| `text-body`      | 15/20 · 400         | default body (set on `<body>`)                        |
| `text-subtitle`  | 13/18 · 400         | authors, meta lines, helper text                      |
| `text-caption`   | 12/16 · 400         | under-cover captions, percentages, fine print         |
| `text-label`     | 11/14 · 700 +0.12em | kickers; always add `uppercase`                       |
| `text-button`    | 15/20 · 800         | buttons, segmented controls                           |
| `text-tab`       | 10/12 · 700         | tab bar labels                                        |
| `text-field`     | 16/22 · 400         | text inside inputs (16 px stops iOS zooming on focus) |

Tailwind's default sizes (`text-sm`, …) still exist for shadcn components; prefer the ramp in our own
screens.

## 6. Layout patterns (from Media dark) by wireframe screen

Screen IDs refer to [`docs/wireframes/v2`](docs/wireframes/v2/README.md); see each one in the prototype.

- **Screen frame.** Page gradient behind everything, `px-gutter` content, a top bar with `pt-safe`
  (title left, `text-title` large title on top-level tabs), the tab bar with `pb-safe`.
- **Home header (B1).** Wordmark left, search and avatar right, a muted "Good evening, **@name**" line,
  the dismissible "What's new" banner (card, `text-link` link).
- **Stat tile (B1, G1).** White card with a soft pink glow in one corner: `text-label` kicker, a
  `text-stat` number, a progress bar and a meta line; a second `text-stat` number in `text-link`.
- **Shelves (B1 Currently reading, C1, G1 readlists).** Horizontal scroll-snap rows of covers
  (`w-cover-shelf`, gap 12 px), title under the cover in `text-row-title` (2 lines max), then progress or
  "No percentage set". The challenge badge sits on the cover's bottom-right corner.
- **Fanned readlist covers (C1, C2, G1).** Up to four covers overlapping left to right with a shadow
  between them, replacing a 2×2 mosaic; title and meta under it.
- **Dense rows (D1, C2, D2 ratings, E4 candidates, G1 counts).** 52 px minimum, 40 px cover or 40 px
  avatar lead, `text-row-title` + `text-subtitle`, trailing pill or action, hairline separators
  (`border-border`) inset by the gutter. Rows sit on the page, not in cards.
- **Friend rows (F1, F3, E4).** Avatar with the teal-to-pink ring (`bg-avatar-ring-gradient`, 2 px gap in
  `background`) when the friend is reading; the cover they are reading (`w-cover-mini`, slightly
  rotated) at the end of the row.
- **Challenge cards (B1, E1, D2).** White cards with a 4 px type stripe on the left
  (`challenge-personal|shared|official`), `text-label` kicker, `text-row-title` name, your pick row.
  Upcoming challenges are outlined instead of filled.
- **Status pills (D1, C2, E4, B1).** Pill (`rounded-full`, 26 px, 12 px bold) in the status colours; the
  Read pill has a check icon. As a control (B3, D2) the three statuses become outlined pill segments
  with the selected one filled in `primary`.
- **Challenge indicator (P25: D1, B1, D2).** Flag icon + text in `text-challenge` in rows and on the book
  detail; on covers a round `bg-challenge-badge` badge with the flag in `challenge-badge-foreground`.
- **Tab bar (N1).** Flat `bg-tab-bar` bar with a top hairline (`tab-bar-border`): Home · Readlists · **+**
  · Challenges · Friends. Icons 25 px with 10 px labels; the active tab in `tab-bar-active` (filled
  icon). The **+ key** is a 52×44 `rounded-xl` `bg-plus-key` button that opens the + menu (N2). No glass.
- **Bottom sheets (N2, B3, C4, D4, F4).** `glass` surface with `rounded-t-sheet`, `shadow-sheet`, a grab
  handle, `text-headline` title, over a `bg-scrim` backdrop; actions at the bottom (text button left,
  primary pill right). The + menu lists four actions with tinted icon tiles, the first one filled.
- **Book detail (D2).** Backdrop from the cover colours fading into `background`; poster left, title,
  author and challenge indicator right; then ratings rows, the status control, progress, actions.
- **Library card (A9, G1).** Teal pass (`primary` to `status-reading` with a pink glow) with ink text,
  barcode and counts.
- **Buttons.** Pills, 48 px high (44 px small), `text-button`: primary (`bg-primary`), secondary
  (`bg-secondary`), outline (`border-input`), text (`text-link`).

## 7. Components (planned, not installed)

T11: shadcn/ui is added together with the first approved screens. **The base is still open**: Base UI
(shadcn default, gesture Drawer and long-press ContextMenu built in), Radix (Drawer on unmaintained Vaul)
or React Aria (research §3, §8). Until then, build nothing here; when you do, map components like this:

| Component                                               | Screens               | Intended primitive                                      |
| ------------------------------------------------------- | --------------------- | ------------------------------------------------------- |
| Button (primary, secondary, outline, text, destructive) | everywhere            | shadcn `Button`                                         |
| Bottom sheet                                            | N2, B3, C4, D4, F4    | shadcn `Drawer` (Base UI Drawer: snap points, swipe)    |
| Long-press menu                                         | B5                    | shadcn `ContextMenu` (opens on long press in Base UI)   |
| Swipe row (change status)                               | B4                    | custom (pointer events, `touch-action: pan-y`)          |
| Status control                                          | B3, D2                | shadcn `ToggleGroup` / `RadioGroup`                     |
| Status pill, "new" badge                                | D1, C2, E4, F1        | shadcn `Badge` with status variants                     |
| Challenge indicator / cover badge                       | D1, B1, D2            | custom (icon + text)                                    |
| Book cover                                              | everywhere            | custom `BookCover` (`next/image`, fallback art)         |
| Shelf                                                   | B1, C1, G1            | custom (CSS scroll-snap; `ScrollArea` optional)         |
| Fanned readlist covers                                  | C1, C2, G1            | custom                                                  |
| Dense row / list                                        | D1, C2, D2, E4, G1    | custom `ListRow` (or shadcn `Item`)                     |
| Avatar with activity ring                               | F1, F3, E4, header    | shadcn `Avatar` + custom ring                           |
| Tab bar with + key                                      | N1                    | custom (`nav` + `Link`)                                 |
| Underlined tabs                                         | E1–E3                 | shadcn `Tabs`                                           |
| Inputs, labels, helper text                             | A3–A9, C3, D3, E6, G5 | shadcn `Field`, `Label`, `Input`, `Textarea`            |
| Progress bar / ring                                     | B1, B3, G1, E1        | shadcn `Progress`; ring is custom SVG                   |
| Percentage slider                                       | B3                    | shadcn `Slider`                                         |
| Half-star rating                                        | D2, D4                | custom (radio-group semantics)                          |
| Cards, stat tile, banner                                | B1, E1, F1            | shadcn `Card`, `Alert`                                  |
| Menus, confirmations, toasts                            | C2, G2, G4            | `DropdownMenu`, `AlertDialog`, `Sonner` / Base UI Toast |

When adding shadcn: keep our `tokens.css` (do not let `shadcn init` replace it), check that its
`globals.css` changes do not reintroduce `:root` colours or `.dark`, and replace any `bg-black/50`,
`text-white`, `bg-white` in copied components with tokens (`bg-scrim`, `text-primary-foreground`,
`bg-card`).

## 8. iOS PWA notes

Facts from [research §4 and §7](docs/design-system/research.md):

- **Safe areas.** `viewportFit: "cover"` is set; the gradient draws under the status bar. Pad top bars
  with `pt-safe` and the tab bar with `pb-safe`; `<body>` already pads left/right for landscape. A
  WebKit bug (301994) reported `env(safe-area-inset-top)` = 0 in standalone mode after iOS 26.1: test
  on a device.
- **Tap targets.** At least 44×44 px (`min-h-tap min-w-tap`) for tabs, rows, icon buttons and sheet
  actions; pills that are only labels may be smaller, but if they are tappable wrap them in a 44 px area.
- **Glass is blur only.** `backdrop-filter` blur and saturation (`glass` utility); refraction does not
  render in Safari. Only on sheets and a sticky top bar, never on list items (GPU cost while scrolling).
  The utility falls back to a solid `card` surface without `backdrop-filter` support and with
  `prefers-contrast: more`. Safari does not support `prefers-reduced-transparency`; an in-app "Reduce
  transparency" setting is an open idea.
- **Motion.** Durations are tokens and drop to 0 with `prefers-reduced-motion` (in `globals.css`).
  Use `ease-sheet` for sheets. Haptics are a bonus, never the only feedback.
- **Inputs.** 16 px text (`text-field`) or larger, or iOS zooms in on focus.
- **Gestures.** Leave a gap from the screen edge for swipe rows (iOS back swipe); every screen needs a
  visible back control (standalone PWAs have no browser back).
- **Status bar / theme colour.** Safari 26 ignores `theme-color` in the browser; in standalone mode the
  status bar is set with `appleWebApp.statusBarStyle` (`black-translucent` once screens exist).

## 9. Dark mode

A full dark token set exists (`dark.tokens.json`): Media dark's charcoal, the same teal accent with
`teal.950` ink, `teal.400` links and `pink.300` highlights, a faint rose/teal page gradient. It passes
the same contrast pairs. It is **not polished and not applied automatically**: it only turns on with
`data-theme="dark"` on `<html>` (`viewport.colorScheme` is `"light"`). Making it a user setting later
means: store the choice in a cookie (like the locale, T8), set the attribute on the server to avoid a
flash, and decide whether to follow `prefers-color-scheme`.

## 10. Links

- Prototype, chosen design: [`docs/design-system/prototype/index.html#lj`](docs/design-system/prototype/index.html)
  (key 1; notes show the token swatches and type ramp) and its [README](docs/design-system/prototype/README.md)
- Research: [`docs/design-system/research.md`](docs/design-system/research.md)
- Index: [`docs/design-system/README.md`](docs/design-system/README.md)
- Tokens: [`design/tokens/`](design/tokens/) · generator: [`scripts/tokens/`](scripts/tokens/) · output:
  [`src/app/tokens.css`](src/app/tokens.css) · base styles: [`src/app/globals.css`](src/app/globals.css)
