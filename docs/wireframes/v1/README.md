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

## Open questions

Each section of `index.html` ends with these questions and an answer box. Answers are sent along with the
screen feedback in the feedback email. **PO** = product owner, **U** = possible end users (readers).

### N · Navigation

**For product owners**

1. `N-PO1` Alt 1 (classic tab bar), Alt 2 (bookshelf spines + Quick log) or a hybrid of both?
2. `N-PO2` Profile behind the avatar (as drawn) or as its own tab (dropping the center action)?
3. `N-PO3` Which actions belong in the global + / Quick log menu, and in which order?
4. `N-PO4` Do we need a notifications inbox (bell) in v1, or are email/push notifications plus the activity feed enough?

**For possible end users**

1. `N-U1` Which navigation style feels more natural to you, and why?
2. `N-U2` When you open the app, what is the first thing you would want to do?
3. `N-U3` Which actions would you use so often that they should always be one tap away?

### A · Splash, authentication & onboarding

**For product owners**

1. `A-PO1` Do we check new passwords against known breached passwords (Supabase Pro feature)?
2. `A-PO2` Code validity (10 min drawn), resend cooldown (60 s drawn) and maximum wrong attempts: OK?
3. `A-PO3` Sign-up with an email that already exists: say so ("already registered, log in?") or stay neutral to avoid account discovery?
4. `A-PO4` Username rules: length, allowed characters, can it be changed later (and how often)?
5. `A-PO5` Splash: show the animation on every cold open or only the first time?
6. `A-PO6` Invites: how long is an invite link valid (7 days drawn), single-use or reusable, and is the inviter told when someone declines?
7. `A-PO7` Invite sent to one email address, but the person signs in with another account: allow, warn or block?
8. `A-PO8` Reading pledge: books only, or also pages/minutes? Can it be changed mid-year, and what happens to past years?

**For possible end users**

1. `A-U1` How would you prefer to sign in: email + password, a code sent to your email, or a Google account?
2. `A-U2` Would you rather choose your username right away, or only when you need it (for example when joining a bookclub)?
3. `A-U3` Does a yearly reading goal motivate you, or does it feel like pressure?
4. `A-U4` Is there anything in the sign-up steps that would make you stop and close the app?

### B · Home

**For product owners**

1. `B-PO1` Streak: daily or weekly, and what counts (any progress update, a finished book)? Or replace it with another stat?
2. `B-PO2` Do we track page/percentage progress in v1, or only the three statuses (want to read / reading / read)?
3. `B-PO3` Section order on Home: fixed, or can users hide and reorder sections?
4. `B-PO4` Which club activity events show on Home, and which only inside the club?

**For possible end users**

1. `B-U1` What do you want to see first when you open the app?
2. `B-U2` Do you keep track of where you are in a book today (page number, percentage)? How?
3. `B-U3` Which numbers about your reading would you actually look at?

### C · Readlists

**For product owners**

1. `C-PO1` Visibility options Only me / Shared with clubs / Anyone with the link: right set? Public profiles later?
2. `C-PO2` Readlists shared with a club: view-only, or can members add books too?
3. `C-PO3` "Recommend to a friend" without a friends list: recommend to any username/email, or only to people in shared clubs?
4. `C-PO4` Manual ordering of books in v1, or sort options only? Custom cover upload, or automatic cover mosaic only?
5. `C-PO5` Show the three statuses as system lists next to readlists (as drawn in C1), or only on the profile?

**For possible end users**

1. `C-U1` What kinds of readlists would you create? Think of two or three you would make in your first week.
2. `C-U2` Would you share readlists with your bookclub, and should others be able to add books to them?
3. `C-U3` How do you recommend books to friends today?

### D · Books: search & detail

**For product owners**

1. `D-PO1` Track books at "work" level or per specific edition (page counts differ per edition)?
2. `D-PO2` Manual book entry when the book database has no result: in v1?
3. `D-PO3` ISBN barcode scanning: v1 or later?
4. `D-PO4` Re-reads: can a book be read more than once and count again towards the pledge?
5. `D-PO5` Show our own members' average rating next to the public rating, and should the public (Google Books) rating be shown at all?

**For possible end users**

1. `D-U1` Where do you look up a book today before deciding to read it?
2. `D-U2` Would you scan a book's barcode to add it, or rather type the title?
3. `D-U3` Do you re-read books? Should a re-read count again?
4. `D-U4` Would you like to give ratings or short reviews that your bookclub can see?

### E · Challenges

**For product owners**

1. `E-PO1` Must the book be finished after the challenge start date, or do books already read count?
2. `E-PO2` Can one finished book complete several challenges at the same time?
3. `E-PO3` Own picks: accepted automatically, or approved by the challenge creator? Can others adopt someone's own pick?
4. `E-PO4` Club challenges: are members enrolled automatically, or do they join themselves?
5. `E-PO5` After the end date: can you still complete it late? Does "Past" include challenges you joined but did not complete?
6. `E-PO6` Minimum number of candidate books (0 = theme only)?
7. `E-PO7` Can the creator change dates or candidate books after the start? What happens to picks already made?
8. `E-PO8` Official challenges: is an admin screen in scope for v1, or are they added directly in the database at first?
9. `E-PO9` Member progress on Official challenges: show a count only (as drawn) or nothing?

**For possible end users**

1. `E-U1` How often would you like a new challenge: monthly, per season, or whenever someone creates one?
2. `E-U2` Would you rather pick from the suggested books, or choose your own book that fits the theme?
3. `E-U3` What should happen when you do not finish a challenge before its end date?
4. `E-U4` Would you want to share a completed challenge outside the app (for example on social media)?

### F · Bookclubs

**For product owners**

1. `F-PO1` Flat hierarchy: can every member invite and remove members, edit the club and create challenges? Who can delete the club, and what happens when the creator leaves?
2. `F-PO2` Maximum club size?
3. `F-PO3` Activity feed: which events, and do we need reactions or comments in v1?
4. `F-PO4` Do club members see all of a member's reading statuses, or only club-related activity?
5. `F-PO5` Reminder emails for unanswered invites?

**For possible end users**

1. `F-U1` How many people are in your bookclub(s), and how do you keep in touch today?
2. `F-U2` Is it OK that everyone in your club can see your reading progress? Is there anything you would want to keep private?
3. `F-U3` How would you like to hear about club activity: email, phone notification, or only when you open the app?

### G · Profile, settings & about

**For product owners**

1. `G-PO1` What can other club members see on someone's profile (the card front only, as drawn)?
2. `G-PO2` Changing username and email: allowed, and with which verification?
3. `G-PO3` Delete account: immediate or after a grace period (e.g. 14 days)? What happens to picks, activity and shared readlists in clubs (remove or anonymise)?
4. `G-PO4` "Sign out everywhere": ask for the password or an email code first?
5. `G-PO5` Changelog: show only new features and fixes (current setup)? Show a one-time "What's new" message after an update?
6. `G-PO6` Profile photo upload in v1, or initials only?

**For possible end users**

1. `G-U1` What would you like other people to see on your profile?
2. `G-U2` Would you upload a profile photo?
3. `G-U3` Would you read a "What's new" overview after the app updates?

### I · Other interaction ideas

**For product owners**

1. `I-PO1` Which of these interaction ideas (swipe, long-press, pick-my-next-read deck, spin the wheel) are worth building in v1?

**For possible end users**

1. `I-U1` Would you use swipe and long-press gestures, or do you prefer visible buttons?
2. `I-U2` Would a "pick my next read" or "spin the wheel" feature help you decide what to read next?

### X · Desktop layout

**For product owners**

1. `X-PO1` Are the proposed screen-size breakpoints OK, and is a tablet layout (collapsed sidebar) needed for v1?
2. `X-PO2` Keyboard shortcuts (e.g. L for Quick log, / for search): in scope?

**For possible end users**

1. `X-U1` Would you use the app on a phone, a computer, or both?
2. `X-U2` On a computer, what would you mainly use it for?
