# Lillyjean design explorations (static prototype)

A non-clickable, high-fidelity static prototype that shows 14 screens of the approved wireframes v2 (`docs/wireframes/v2`) in six active visual design languages, plus four archived ones from the first round. It is meant to compare directions side by side, not to test flows: nothing inside the phone frames reacts to taps.

**Lillyjean** (design 1) is the chosen direction (decision D8 in `docs/decisions.md`): Media dark's layout with the iOS Glass palette, in light mode. It is styled only from the real design tokens, so it is the reference for building screens; see `DESIGN.md` at the repo root. The other five designs are the exploration it came from. Following D5, the polish sprint can still refine the identity.

## How to open it

Open `index.html` in any browser. It is a single self-contained file (inline CSS and JavaScript, system fonts only, no network requests), so it also works offline and inside a sandboxed iframe.

- The toolbar switches between the six active designs (buttons, or keys 1 to 6; the chosen one has a ★). The four archived designs are behind the "Archived" button next to them. The choice is remembered in the browser when storage is available; the default is Lillyjean.
- "All screens" shows every screen as a grid of iPhone frames (393 × 852). "One screen" shows a single large frame with a screen picker; the arrow keys go to the previous or next screen and G toggles the two views. Clicking a caption in the grid opens that screen.
- "Design notes" shows the intent, colour swatches with hex values, the type ramp and how we would build each design. For Lillyjean the swatches and the type ramp are read from the token variables, with their token names.
- Links such as `index.html#night/D2` open a design and screen directly. Design keys: `lj`, `ios`, `night`, `vivid`, `media`, `clay`, and for the archived designs `m3`, `ed`, `sc`, `pp` (links and stored choices from the first round keep working).
- On a phone the "One screen" view fills the width of the screen, with the screen picker in a bar at the bottom.

## The six active designs

**1. Lillyjean (chosen).** Media dark's structure and component language in light mode, on the iOS Glass palette: covers first in horizontal shelves, fanned readlist covers, dense rows with hairlines, a heavy system sans (SF Pro on iPhone), uppercase labels, friends with a teal-to-pink ring and the cover they are reading, pill badges for the three statuses, and a flat white tab bar with a teal + key. The page sits on the soft pink-to-mint gradient of iOS Glass; cards are white with a soft shadow, sheets are light glass. Blue Greeny `#5CBDB9` fills carry ink `#0B3533`; teal text and links use `#19706C`; Read and the challenge flag use rose on Pinky. Every colour, type style, radius and shadow comes from the generated token block (between `@tokens:begin` and `@tokens:end`, written by `pnpm tokens:build` from `design/tokens`); the CSS of this design contains no raw colours. Build: tokens → Tailwind v4 utilities with shadcn/ui names, shadcn/ui added with the first approved screens.

**2. iOS Glass.** The direction the user liked, recoloured to the user's palette. It feels like a first-party iOS 26 app: SF Pro through the system font, large titles, grouped inset lists, segmented controls, SF-Symbol-like icons and a floating glass tab bar and glass sheets (backdrop blur with saturation, a specular highlight and a light border). Blue Greeny fills the buttons, the + button, the active tab pill, progress and toggles, always with deep-ink text on top; Pinky and Teeny Greeny are the washes behind the glass and the tints of the challenge cards and the library card, so the glass still has colour to blur. There is no indigo or purple left. We would build it with shadcn/ui on Base UI, Tailwind tokens, a blur-based glass layer and Vaul sheets; Konsta UI's iOS theme is an alternative.

**3. iOS Night.** The same iOS structure in iOS 26 dark mode, for evening reading: true black with washes of deep teal ink, dark Liquid Glass (blur with a thin specular edge) for the bars, buttons and sheets, the palette adapted for dark with teal as the accent and pink as a soft highlight. Home opens on a "Continue reading" hero for the book on your nightstand, challenge cards are dark tinted glass, and the tab bar is split iOS 26 style: the tabs in one glass capsule and + in its own glass circle. Build: as iOS Glass, with a dark theme on the same token names.

**4. iOS Vibrant.** Apple Books and Apple Fitness energy with the same iOS components and glass, in a warm palette of coral, sunset and amber against deep teal. Cards are led by their covers and tinted by them (currently reading, readlists, the book detail, where the details sit on a raised sheet over the cover colour), pages are tinted by what is on them, Home has a big activity-style ring, "Your books" are bold colour tiles and titles are heavy SF Pro Rounded. Build: as iOS Glass, plus a dominant colour picked once per cover on the server and passed in as a CSS variable.

**5. Media dark.** A social media app for books in the spirit of Letterboxd and Spotify, not iOS-native: dark charcoal, covers first in horizontal shelves, dense rows with hairline rules, a heavy sans, uppercase labels and one vivid green accent. Readlists are fanned covers, the book detail has a backdrop from the cover with the poster on the left, and friends show up as activity: a ring on the avatar and the cover they are reading. Its bottom nav is a flat black bar with a green + key. We would build it with shadcn/ui on Base UI and Tailwind with a dark-only token set and a few custom components (shelves, cover fan, activity avatar).

**6. Soft & tactile.** Claymorphism, playful but grown-up: chunky rounded shapes with soft outer and inner shadows, peach, butter yellow and sage on warm cream, and a rounded typeface stack. Every list row is its own cushion, inputs and segmented controls are pressed-in wells, buttons have a thick soft underside and the nav is a floating pill where the active tab expands into a raised sage pill, with a butter-yellow + above it. We would build it with shadcn/ui on Base UI and Tailwind with a shadow scale (raised, small, well) as tokens; the shadows need testing on low-end Android.

## iOS palette

Lillyjean and the iOS designs use the user's palette: Pinky `#FBE3E8`, Blue Greeny `#5CBDB9` and Teeny Greeny `#EBF6F5`. White text on `#5CBDB9` is only 2.2:1, so teal fills carry deep-ink text `#0B3533` (6.0:1) and teal text and links on light backgrounds use the darker `#19706C` (5.9:1 on white). The "Read" status uses rose text `#8C2F48` on Pinky (6.6:1). In iOS Night the accent stays `#5CBDB9` with ink `#04201F` on fills, teal text becomes `#6FD0CB` and pink `#F4B6C4` is the highlight. iOS Vibrant deliberately uses its own warm palette (coral `#FF6A4D`, sunset `#FF9A3D`, amber `#FFB547`, deep teal `#0E4F55`).

## Archived

The first-round directions are kept in the "Archived" menu and still render fully. The user preferred the iOS direction, so they are no longer on the shortlist.

- **Material 3** (`m3`): Google's tonal palette from seed #006A60, navigation bar with a pill indicator and a FAB for +.
- **Bold editorial** (`ed`): a literary magazine with big serif headlines, black on white and one red accent.
- **Minimal Scandinavian** (`sc`): off-white and oat with a single sage accent, thin lines and a lot of space.
- **Warm bookish · paper** (`pp`): cream paper, serif type, library cards and rubber stamps.

## Screens covered

A2 Welcome · A3 Sign up · A9 Onboarding 1 (Library card) · B1 Home · B3 Status sheet · N2 + menu · D1 Book search · D2 Book detail · C1 Readlists overview · C2 Readlist detail · E1 Challenges (Active) · E4 Challenge detail · F1 Friends tab · G1 Profile.

Content, structure and copy follow the wireframes and the product decisions (for example the tab bar Home · Readlists · + · Challenges · Friends with the profile behind the avatar, the three statuses with an optional percentage, half-star ratings with the Google rating and the friends' average, the challenge indicator on books, the Home order and the automatic readlist mosaics). Wireframe annotations (pins, sprint tags, feedback boxes) are left out. Sample content uses classics and invented titles; book covers are drawn with CSS.

## Limitations

- Screens are static and clipped at the frame height, like a scroll view at its top position.
- Fonts depend on the device: SF Pro and SF Pro Rounded show on Apple devices; elsewhere the stacks fall back to fonts such as Inter, Helvetica Neue or Arial, and the rounded stack of Soft & tactile only looks rounded where Nunito, Quicksand, Varela Round or Arial Rounded is installed.
- Liquid Glass is approximated with `backdrop-filter`; the real iOS material also bends light at its edges. Cover tints in iOS Vibrant use the CSS covers' colours, not colours picked from real cover images.
- The prototype is a standalone file and does not use the app's components or next-intl messages. Only the Lillyjean design uses the design tokens (light theme, embedded by `pnpm tokens:build`; a test fails if the embedded block is stale). The Lillyjean CSS maps the prototype's own variable names (`--fg`, `--muted`, `--accent`, …) onto the tokens in one place at the top of its block.
