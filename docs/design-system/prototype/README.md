# Lillyjean design explorations (static prototype)

A non-clickable, high-fidelity static prototype that shows 14 screens of the approved wireframes v2 (`docs/wireframes/v2`) in five different visual design languages. It is meant to compare directions side by side, not to test flows: nothing inside the phone frames reacts to taps.

This is exploratory work. Following decision D5, the visual identity is set in the polish sprint once the main features work; none of these directions is a decision yet.

## How to open it

Open `index.html` in any browser. It is a single self-contained file (inline CSS and JavaScript, system fonts only, no network requests), so it also works offline and inside a sandboxed iframe.

- The toolbar switches between the five designs (buttons, or keys 1 to 5). The choice is remembered in the browser when storage is available.
- "All screens" shows every screen as a grid of iPhone frames (393 × 852). "One screen" shows a single large frame with a screen picker; the arrow keys go to the previous or next screen. Clicking a caption in the grid opens that screen.
- "Design notes" shows the intent, colour swatches with hex values, the type ramp and how we would build each design.
- Links such as `index.html#pp/D2` open a design and screen directly (design keys: `ios`, `m3`, `ed`, `sc`, `pp`).
- On a phone the "One screen" view fills the width of the screen, with the screen picker in a bar at the bottom.

## The five designs

**1. iOS native · Liquid Glass.** The primary target, because testers mostly use Lillyjean as a PWA on iPhone. It should feel like a first-party iOS 26 app: SF Pro through the system font, large titles, grouped inset lists, segmented controls and a floating glass tab bar and glass sheets (backdrop blur with saturation, a specular highlight and a light border) over colourful content such as gradient challenge cards and a book hero tinted by its cover. A readlist row shows the swipe actions for changing a status. We would build it with Konsta UI's iOS theme or shadcn/ui primitives, Tailwind tokens, a custom glass layer and Vaul sheets.

**2. Material 3.** Google's design language with a tonal palette from one seed colour (#006A60): a navigation bar with a pill indicator and a FAB in the centre slot for +, top app bars, filled and tonal buttons, filter chips, outlined text fields with floating labels, a multi-browse carousel for readlists, expressive shapes for challenge stamps and a modal bottom sheet with a drag handle. It is the natural choice if Android becomes as important as iPhone. We would build it with Material Web or MUI with tokens from Material Theme Builder.

**3. Bold editorial.** Lillyjean as a literary magazine: a masthead on Home, big serif headlines (Didot or Bodoni on iOS), black on white with one red accent, heavy and hairline rules, numbered sections and lists, square shapes and a text-only tab bar. It is the most distinctive direction and relies on typography rather than components. We would build it with shadcn/ui and Tailwind and a custom type scale.

**4. Minimal Scandinavian.** Calm and airy: off-white and oat with a single sage accent, thin lines, light type, small spaced capitals for section labels, status shown as a dot and a word, and a lot of space. It is the closest to the clean default theme planned in T11, so it would mostly be a matter of tokens on shadcn/ui and Tailwind with Vaul sheets.

**5. Warm bookish · paper.** A cosy bookshop: cream paper with a CSS-only texture, serif headings and italics, terracotta, forest green and ochre, index cards with ruled lines, a classic library card with a punched hole, rubber stamps for statuses and completed challenges, a cloth-bound tab bar and a wax-seal + button. We would build it with shadcn/ui and Tailwind with a paper theme and a few custom components (library card, stamps).

## Screens covered

A2 Welcome · A3 Sign up · A9 Onboarding 1 (Library card) · B1 Home · B3 Status sheet · N2 + menu · D1 Book search · D2 Book detail · C1 Readlists overview · C2 Readlist detail · E1 Challenges (Active) · E4 Challenge detail · F1 Friends tab · G1 Profile.

Content, structure and copy follow the wireframes and the product decisions (for example the tab bar Home · Readlists · + · Challenges · Friends with the profile behind the avatar, the three statuses with an optional percentage, half-star ratings with the Google rating and the friends' average, the challenge indicator on books, the Home order and the automatic readlist mosaics). Wireframe annotations (pins, sprint tags, feedback boxes) are left out. Sample content uses classics and invented titles; book covers are drawn with CSS.

## Limitations

- Screens are static and clipped at the frame height, like a scroll view at its top position.
- Fonts depend on the device: SF Pro, Didot, Bodoni, Iowan Old Style and Avenir Next show on Apple devices; elsewhere the stacks fall back to fonts such as Inter, Times or Palatino. Roboto is not bundled, so Material 3 uses Helvetica Neue on iPhone.
- Liquid Glass is approximated with `backdrop-filter`; the real iOS material also bends light at its edges.
- The prototype is a standalone file and does not use the app's components, next-intl messages or Tailwind tokens.
