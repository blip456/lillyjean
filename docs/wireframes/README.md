# Wireframes: social reading tracker (low-fidelity, v0.1)

Open `index.html` in any browser. It is a single self-contained file (no network needed).

- Every screen has a stable **ID** (`A1`, `E4`, ...). Numbered **pins** on a screen match the annotations under it.
  Please give feedback as `E4 pin 3: ...`.
- Phones are drawn at 375×760. Screens with a dashed **fold** line show the full scroll length.
- All main screens use navigation **Alt 1** by default. The **Navigation preview** switch in the left column
  re-renders every main screen and the desktop sidebars with **Alt 2**.
- Input fields are drawn empty on purpose (label above, helper text below). Sample content is neutral
  ("Book title", "@username"); numbers are illustrative only.
- Grayscale only: hatched box = image, gray bar = text, dark button = primary, dashed = reserved / later,
  `IDEA` box = optional original interaction.

---

## Navigation model

Information architecture (same for both alternatives):

| Level                  | Items                                                                                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Top-level destinations | Home, Readlists, Challenges, Bookclubs                                                                                                             |
| Global create entry    | `+` (Alt 1) or Quick-log bookmark (Alt 2): log progress, add a book, mark as read, new readlist, new challenge, new bookclub                       |
| Profile                | Avatar top-right on every main screen → G1 Profile → G2 Settings                                                                                   |
| Deep links             | `/invite/:token` (A12–A14), book, readlist, challenge and club detail pages are linkable                                                           |
| Detail screens         | Push on top of the current tab, back arrow top-left; tab bar stays visible on list/detail screens, hidden in forms, sheets and full-screen moments |

### Alt 1: Classic tab bar + center action (N1, X1)

- Mobile: `Home · Readlists · [+] · Challenges · Clubs`; `+` opens a Quick actions sheet.
- Desktop: left sidebar with the same four items, a **New** split button on top, the user's clubs listed below, library card + settings at the bottom.
- Strengths: instantly understood, accessible, cheap to build. Risk: generic look.

### Alt 2: Bookshelf spines + Quick-log bookmark (N2, N3, X2)

- Mobile: the tab bar is drawn as book spines on a shelf (`Desk · Readlists · Challenges · Clubs`); the active spine is pulled out. A hanging bookmark is the single **Quick log** entry; it fans out a radial menu (press-and-drag or tap) with a 1-tap "update page" card on top. Home becomes a swipeable **Reading desk** (Now reading, pinned challenges, club table).
- Desktop: spines lie flat as a stack on a plank in the sidebar (horizontal labels); the bookmark hangs from the top of the content area, keyboard shortcut `L`.
- Strengths: memorable, one obvious place to log reading. Risks: vertical labels less scannable, custom gestures need user testing, more effort.

**Hybrid option:** Alt 1 structure with spine styling and the bookmark as the center action.

### Other interaction ideas (annotated in the file)

- Swipe a book row to change status; long-press any book for a quick menu (Add to readlist, Change status, ...) (I1).
- **Spin the wheel** to randomly pick a challenge candidate or the next read from a readlist (E8).
- **Stamp moment**: completing a challenge stamps your library card; stamps collect on the back of the card (E7, G1).
- **Pick my next read** card deck from the Want-to-read shelf (I2).
- **Use as challenge candidates**: create a challenge from a readlist in one tap (C2).
- **Scan ISBN** with the camera (D3).

### Desktop breakpoints (proposal)

`< 768 px` mobile tab bar · `768–1100 px` collapsed icon sidebar · `> 1100 px` full sidebar. Desktop sketches: X1 Home (Alt 1), X2 Home (Alt 2), X3 Readlist detail, X4 Challenge detail.

---

## Screen inventory

### N · Navigation alternatives

| ID  | Name                           | Purpose                    | Key elements                                                                                                    |
| --- | ------------------------------ | -------------------------- | --------------------------------------------------------------------------------------------------------------- |
| N1  | Alt 1: tab bar + center action | Classic navigation option  | 4 tabs + raised `+`, Quick actions sheet (6 tiles), avatar → profile                                            |
| N2  | Alt 2: bookshelf + Quick log   | Original navigation option | Spine tab bar, Reading desk home (swipe stack, pinned challenge notes), bookmark button                         |
| N3  | Alt 2: Quick log opened        | Fast logging from anywhere | "Continue where you left off" page stepper, radial menu (Add a book, New readlist, New challenge, Mark as read) |

### A · Splash, authentication & onboarding

| ID  | Name                            | Purpose                                 | Key elements                                                                                      |
| --- | ------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------- |
| A1  | Splash                          | Cold open + session check               | Logo, short bookmark-drop animation, routes to B1 / A2 / invite                                   |
| A2  | Welcome                         | Entry for signed-out users              | Illustration, value line, Create account, Log in, dashed Google "coming later"                    |
| A3  | Sign up                         | Create account                          | Email, password with show/hide + strength meter + guidance, terms text, no confirm field          |
| A4  | Check your mailbox              | Verify email (also used for code login) | 6-digit code boxes, auto-submit, resend with cooldown, edit email, open mail app                  |
| A5  | Log in                          | Returning users                         | Email, password, Forgot password, "Email me a code instead", Google reserved                      |
| A6  | Forgot password: email          | Start reset                             | Email, Send code (neutral response)                                                               |
| A7  | Forgot password: code           | Verify reset                            | Reuses A4 component                                                                               |
| A8  | Forgot password: new password   | Set new password                        | Password + strength, "Sign me out on other devices"                                               |
| A9  | Onboarding 1: Library card      | Choose username (required)              | Live card preview "Member since …", prefilled suggestion, live availability, alternatives, 1 of 3 |
| A10 | Onboarding 2: Currently reading | Optional first books                    | Book search, Add buttons, Skip, 2 of 3                                                            |
| A11 | Onboarding 3: Reading pledge    | Optional yearly goal                    | Two equal cards: goal stepper / "No goal, just reading", 3 of 3                                   |
| A12 | Invite landing: signed out      | Convert invitees                        | Club preview, inviter, Join club → sign up, "Log in to join"                                      |
| A13 | Invite landing: signed in       | Accept or decline                       | Club preview, Accept / Decline, "Signed in as …"                                                  |
| A14 | Invite landing: expired         | Dead-end recovery                       | Expired / revoked message, ask inviter, Go to home                                                |

### B · Home

| ID  | Name                  | Purpose            | Key elements                                                                                                                                               |
| --- | --------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Home                  | Daily landing      | Stats strip (pledge ring, challenges completed, streak, pages), Currently reading, Ongoing challenges with progress, Readlists quick access, Club activity |
| B2  | Home: first run       | Activate new users | Zero stats, join an Official challenge, add a book, create/join a club, gesture tip                                                                        |
| B3  | Update progress sheet | Log reading        | Page / percent toggle, stepper, optional private note, "I finished it", Save                                                                               |

### C · Readlists

| ID  | Name                    | Purpose                | Key elements                                                                                                                    |
| --- | ----------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Readlists overview      | Browse lists           | Status counters (Want to read / Reading / Read), filters Mine / Shared with me / From my clubs, mosaic grid                     |
| C2  | Readlist detail         | View and manage a list | Cover mosaic, owner, description, Share with club, Recommend, "Use as challenge candidates", book rows with my status + reorder |
| C3  | Create / edit readlist  | Make a list            | Auto mosaic or upload, Name, Description, visibility, Add books, Delete (edit)                                                  |
| C4  | Add-to-readlist sheet   | Put a book in lists    | "+ New readlist" inline, multi-select checkboxes, Done                                                                          |
| C5  | Share / recommend sheet | Distribute a list      | Club checkboxes, Username or email, Message, Copy link, Share                                                                   |

### D · Books

| ID  | Name               | Purpose                 | Key elements                                                                                                                                                                            |
| --- | ------------------ | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Book search        | Find a book             | Search field + Scan button, filter chips, results with rating + status split button, API attribution, manual add fallback                                                               |
| D2  | Book detail        | Everything about a book | Cover, title, author, community rating, status segmented control, progress, Add to readlist, View on Goodreads ↗, description, metadata, fitting challenges, my readlists, club members |
| D3  | Scan ISBN (idea)   | Faster adding           | Camera viewfinder, barcode frame, "Type the ISBN instead"                                                                                                                               |
| D4  | Mark as read sheet | Finish a book           | Date finished, optional rating, "This completes a challenge" checkbox                                                                                                                   |

### E · Challenges

| ID  | Name                     | Purpose                 | Key elements                                                                                                                                                                       |
| --- | ------------------------ | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | Challenges: Active       | My running challenges   | Completed counter (stamp), tabs, cards with badge (Official / Club / Personal), end date, my state                                                                                 |
| E2  | Challenges: Discover     | Find challenges to join | Filter All / Official / From my clubs, Official hero card with badge, club challenge card, Join                                                                                    |
| E3  | Challenges: Past         | History                 | Big completed counter, filters, ended/completed rows with Done / Not completed                                                                                                     |
| E4  | Challenge detail         | Do the challenge        | Theme, start/end dates, my progress (Joined → Picked → Read), candidate books, Spin the wheel, members' own picks, member progress, sticky "Mark my pick as read"                  |
| E5  | Submit my own pick sheet | Bring your own book     | Book search, selected book, "Why does it fit?" optional, Submit                                                                                                                    |
| E6  | Create challenge         | Make a challenge        | Title, Theme, Start date (required), End date (optional) + open-ended toggle, cover, candidate books (+ import readlist), own-pick toggle, Share with: Just me / bookclubs (multi) |
| E7  | Completion celebration   | Reward                  | Stamp on library card, counter 7 → 8, Share with my club, Done, Find a new challenge                                                                                               |
| E8  | Spin the wheel (idea)    | Random pick             | Wheel of candidates, result, Spin again / Pick this book                                                                                                                           |

### F · Bookclubs

| ID  | Name               | Purpose                                   | Key elements                                                                                                               |
| --- | ------------------ | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| F1  | Bookclubs overview | My clubs                                  | Pending invite card (Accept / Decline), club cards with members, counts, latest activity                                   |
| F2  | Bookclub detail    | Club hub (flat: everyone sees everything) | Cover, members, Invite, tabs, ongoing club challenges, member × challenge progress matrix, shared readlists, activity feed |
| F3  | Create bookclub    | Start a club                              | Cover, Club name, Description, flat-hierarchy notice, Next: invite                                                         |
| F4  | Invite members     | Grow the club                             | Username or email field (multi), chips, Send, invite link with expiry, pending invites (Resend / Revoke), members          |

### G · Profile, settings & about

| ID  | Name                   | Purpose                   | Key elements                                                                                                                                     |
| --- | ---------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| G1  | Profile (library card) | Identity + lifetime stats | Library card (username, member since, stats, barcode, flip), pledge bar, shelves, stamps, Past challenges                                        |
| G2  | Settings + About       | Account management        | Username, Email, Password, pledge, notifications, About "vX.Y.Z" (one shared version), What's new, Sign out, Sign out everywhere, Delete account |
| G3  | What's new             | Changelog                 | Grouped by version, Features / Bug fixes from conventional commits, "current" tag                                                                |
| G4  | Delete account         | Safe destructive action   | Consequences, sole-member club warning, type username to confirm, Cancel as primary                                                              |

### I · Interaction ideas

| ID  | Name              | Purpose               | Key elements                                             |
| --- | ----------------- | --------------------- | -------------------------------------------------------- |
| I1  | Book gestures     | Faster list actions   | Swipe row for status actions, long-press quick menu      |
| I2  | Pick my next read | Beat choice paralysis | Card deck of Want-to-read books, Not now / Start reading |

### X · Desktop sketches (~1200 px)

| ID  | Name                       | Purpose              | Key elements                                                                 |
| --- | -------------------------- | -------------------- | ---------------------------------------------------------------------------- |
| X1  | Home (Alt 1 sidebar)       | Nav transform, Alt 1 | Sidebar + New split button + clubs, two-column home, header search           |
| X2  | Home (Alt 2 shelf sidebar) | Nav transform, Alt 2 | Flat spine stack, hanging Log bookmark (key L), three-zone desk              |
| X3  | Readlist detail            | Wide list management | Fixed left info column, sortable table, inline status dropdowns, bulk select |
| X4  | Challenge detail           | Wide challenge view  | Content left, sticky right rail with my progress + CTA + member progress     |

---

## Open questions for the product owner

### Navigation

1. Alt 1 (classic tab bar), Alt 2 (bookshelf + Quick log) or the hybrid?
2. Profile behind the avatar (as drawn) or as its own tab (dropping the center action)?
3. Which actions belong in the global `+` / Quick log, and in which order?
4. Do we need a notifications inbox (bell) in v1, or are push/email notifications plus the activity feed enough?

### A · Auth & onboarding

1. Password policy: minimum length (12 drawn), and do we check against known breached passwords?
2. Code validity (10 min drawn), resend cooldown (60 s drawn) and max wrong attempts?
3. Sign-up with an email that already exists: reveal it ("already registered, log in?") or stay neutral to avoid account discovery?
4. Username rules: length, allowed characters, case-sensitive, changeable later (and how often)?
5. Can an unverified account do anything, and how long until unverified sign-ups are cleaned up?
6. Splash: minimum duration, and show the animation on every cold open or only the first?
7. Invites: expiry duration (7 days drawn), single-use or multi-use links, and is the inviter notified on decline?
8. Invite sent to email X but the person signs in with account Y: allow, warn, or block?
9. Reading pledge: books only, or also pages/minutes? Can it be changed mid-year, and what happens to past years?

### B · Home

1. Streak definition: daily or weekly, and what counts (any progress update, a finished book)? Or replace it with another stat?
2. Do we track page/percent progress at all in v1, or only the three statuses?
3. Section order on Home; should users be able to hide or reorder sections?
4. Which club activity events show on Home vs only inside the club?

### C · Readlists

1. Visibility options: Only me / Shared with clubs / Anyone with the link: is that the right set? Public profiles later?
2. Readlists shared with a club: view-only or collaborative (members can add books)?
3. "Recommend to a friend": there is no friends graph yet. Recommend to any username/email, or only to people in shared clubs?
4. Custom manual ordering in v1, or sort options only? Custom cover upload or auto-mosaic only?
5. Should the three statuses appear as system lists next to readlists (as drawn in C1) or only in the profile?
6. Add-to-readlist sheet: save on Done only, or also on dismiss?

### D · Books

1. ~~Primary data source~~ — decided: Open Library primary, Google Books fallback (docs/decisions.md T3). Open: show Google's average rating where available?
2. Track at "work" level or specific edition (page counts differ per edition)?
3. Manual book entry when the API has no result: in v1?
4. ISBN scanning: v1 or later?
5. Goodreads link: search by ISBN is acceptable (there is no official API)?
6. Re-reads: can a book be read more than once and count twice towards the pledge?
7. Personal ratings: do we show our own users' average next to the API rating?

### E · Challenges

1. Must the book be finished after the challenge start date, or do books already read count?
2. Can one finished book complete several challenges at the same time?
3. Own picks: auto-accepted, or approved by the challenge creator? Can others adopt someone's own pick?
4. Club challenges: are members auto-enrolled or do they join explicitly?
5. After the end date: can you still complete late? Does "Past" include challenges you joined but did not complete?
6. Minimum number of candidate books (0 = theme only)?
7. Can the creator edit dates/candidates after the start? What happens to existing picks?
8. Who creates Official challenges, and is an admin tool in scope for v1?
9. Member progress visibility on Official challenges: count only (as drawn) or nothing?
10. Should the completion celebration be shareable outside the app (image/link)?

### F · Bookclubs

1. Flat hierarchy: can every member invite, remove members, edit the club and create challenges? Who can delete the club, and what if the creator leaves?
2. Maximum club size?
3. Activity feed: which events, and do we need reactions/comments in v1?
4. Visibility of a member's private data in a club: do club members see all of my statuses, or only club-related activity?
5. Reminder emails for unanswered invites? Can a pending email invite be converted when that person signs up with another address?

### G · Profile, settings & about

1. What can other club members see on my profile (card front only as drawn)?
2. Changing username and email: allowed, and with which verification?
3. Delete account: immediate or grace period (e.g. 14 days)? What happens to my picks, activity and shared readlists in clubs (remove or anonymise)?
4. Sign out everywhere: require a fresh email code or password?
5. Changelog: hide everything except `feat`/`fix` (current setup)? Show a one-time "What's new" sheet after updates?
6. Profile photo upload in v1, or initials avatar only?

### X · Desktop

1. Are the proposed breakpoints OK, and is a tablet layout (collapsed sidebar) needed for v1?
2. Keyboard shortcuts (e.g. `L` for Quick log, `/` for search): in scope?
