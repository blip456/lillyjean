# Lillyjean wireframes v2 (low-fidelity)

Open `index.html` in any browser. It is a single self-contained file (no network needed).

Version 2 is updated after the first review round (Product Owner, Jean, Lilly; see `../v1/feedback-*.md`). It follows the decisions in [`docs/decisions.md`](../../decisions.md) (P7–P34, A1–A11, D1–D6) and the sprint plan in [`docs/backlog.md`](../../backlog.md).

- Every screen has a stable **ID**, a **sprint tag** (`S2`…`S9`) and, where relevant, a **"Changed in v2"** or **"New in v2"** badge with the decision ID.
- Dashed sprint tags inside a screen mark parts that arrive in a later sprint (for example the readlists row on Home, S4).
- Numbered pins match the notes under each screen. Inputs are drawn empty with a visible label and helper text; sample content is neutral.
- Feedback works like v1: a box under every screen, open questions per section, and a "Send your feedback" section (email to yoranbroodcooren@gmail.com, subject "Lillyjean wireframes v2 - feedback", or Copy). Notes are kept in the browser under `lillyjean-wireframes-v2-feedback` (separate from v1).

## What changed since v1

| Screen | Change                                                                                                                                                                                       | Decision           |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| N1     | One navigation style: classic tab bar Home · Readlists · + · Challenges · Friends; profile behind the avatar (initials)                                                                      | P21, P7, P30       |
| N2     | New: + menu as a bottom sheet, in the order Add book · Mark as read · New challenge · New readlist (ID reused; v1 N2 was the shelf navigation)                                               | P22                |
| A1     | Unboxing animation on the very first open only; plain fast start afterwards                                                                                                                  | A11                |
| A2     | Invite-link hint removed; tagline about friends                                                                                                                                              | P8                 |
| A3     | Strength meter removed; simple "at least 12 characters" helper                                                                                                                               | A5                 |
| A4     | Neutral wording for addresses that already have an account                                                                                                                                   | A7                 |
| A9     | Username rules as helper text; initials avatar on the card; "friends find you" copy                                                                                                          | A6, P30            |
| A10    | Annotated as search results (not recommendations); several books can be Reading                                                                                                              | P16                |
| A11    | Books only, adjustable later, "No goal, just reading" option                                                                                                                                 | P29                |
| B1     | Fixed order stats → currently reading → ongoing challenges → readlists; no streak, no pages, no activity feed; challenge indicator; optional %; "What's new" banner; per-section sprint tags | P23, P25, P16, P31 |
| B3     | Progress sheet replaced by a status sheet (3 statuses + optional %); no pages, minutes or notes                                                                                              | P16, P18           |
| B4     | New: swipe to change status as the primary interaction, with web performance notes                                                                                                           | P24                |
| B5     | New: long-press menu (add to readlist, change status, recommend, open book)                                                                                                                  | P24                |
| C1     | Filter bar All / Mine / Shared with me; "Shared with me" group with access level                                                                                                             | P19                |
| C2     | Automatic mosaic; Share and Recommend (S8); "added by" in shared lists                                                                                                                       | P19, P20           |
| C3     | Name + optional description only; no visibility or cover options                                                                                                                             | P19                |
| C5     | Share with friends with View only / Can edit (ID reused; recommending moved to F4)                                                                                                           | P19                |
| D1     | Challenge indicator on results; no scan button; "Add it manually"                                                                                                                            | P25, P26, P27      |
| D2     | Google rating, friends' average, my half-star rating; page tracking and details section removed; "Add this book" for challenges                                                              | P16, P17, P25      |
| D3     | New: manual book entry form (ID reused; v1 D3 was the scanner)                                                                                                                               | P27                |
| D4     | Finish date, optional half-star rating, "This completes 2 challenges" preview, re-read note                                                                                                  | P10, P17, P28      |
| E1     | Counter "n challenges completed" without arrow; friend and official cards                                                                                                                    | P14                |
| E2     | Official (S6) + "Shared by friends" (S8) with New / Join again                                                                                                                               | P14                |
| E3     | Past shows completed challenges only                                                                                                                                                         | P13                |
| E4     | ≥5 candidates with "Add this book"; own picks accepted automatically; participants with pick + status; official: count only; "Kicked out of the library"                                     | P11, P12, P14, A9  |
| E5     | No approval step                                                                                                                                                                             | P11                |
| E6     | At least 5 candidates with counter; share with Just me / Friends (auto-enrolled, can leave); cover and own-pick toggle removed                                                               | P12, P14           |
| E7     | Counter without arrow; social sharing removed; several challenges at once                                                                                                                    | P10, P33           |
| E8     | New: edit dates and candidates after the start, removed candidates stay valid (ID reused; spin the wheel dropped)                                                                            | P13, P33           |
| F1–F5  | New Friends section: tab, find friends, friend profile, recommend sheet, "Recommended to you" (IDs reused from the v1 F section)                                                             | P7, P8, P9, P20    |
| G1     | Initials; "Challenges" instead of "Stamps"; readlists count                                                                                                                                  | P30                |
| G2     | Notifications and "sign out everywhere" removed; Send feedback; Admin entry; email change with verification                                                                                  | A8, A10, P32, P33  |
| G4     | Soft delete, permanent after 14 days, "Kicked out of the library"                                                                                                                            | A9                 |
| G5     | New: in-app feedback form                                                                                                                                                                    | P32                |
| G6     | New: change username (rules, 30-day cooldown)                                                                                                                                                | A6                 |
| H1–H4  | New admin area: feedback list (sort newest/oldest), official challenges list and form                                                                                                        | P15, P32           |
| X1     | One desktop sketch (Friends in the sidebar, new Home order)                                                                                                                                  | P21, P23           |

Unchanged apart from small copy edits: A5–A8, B2, C4, G3.

### Removed

| v1 screen  | What                                                                                    | Decision |
| ---------- | --------------------------------------------------------------------------------------- | -------- |
| v1 N2, N3  | Shelf spines + quick log / radial menu                                                  | P21      |
| v1 A12–A14 | Invite landing screens                                                                  | P8       |
| v1 D3      | Scan ISBN                                                                               | P26      |
| v1 E8      | Spin the wheel                                                                          | P33      |
| v1 F1–F4   | Previous social model (replaced by Friends)                                             | P7       |
| v1 I1, I2  | Interaction ideas: swipe/long press became B4/B5; pick-my-next-read deck moved to Later | P24, P33 |
| v1 X2–X4   | Extra desktop sketches                                                                  | —        |

**ID reuse:** N2, C5, D3, E8 and F1–F4 keep their v1 IDs but show different screens (marked "New in v2" or noted under the screen). Feedback on v1 IDs refers to the v1 file.

## Screen inventory (51 screens)

### N · Navigation

| ID  | Screen                | Sprint        | v2            |
| --- | --------------------- | ------------- | ------------- |
| N1  | Classic tab bar       | S2            | Changed · P21 |
| N2  | + menu (bottom sheet) | S3 (+ S4, S5) | New · P22     |

### A · Accounts & onboarding

| ID  | Screen                           | Sprint                   | v2                |
| --- | -------------------------------- | ------------------------ | ----------------- |
| A1  | Splash                           | S2 (animation polish S9) | Changed · A11     |
| A2  | Welcome                          | S2                       | Changed · P8      |
| A3  | Sign up                          | S2                       | Changed · A5      |
| A4  | Check your mailbox (verify code) | S2                       | Changed · A7      |
| A5  | Log in                           | S2                       |                   |
| A6  | Forgot password · email          | S2                       |                   |
| A7  | Forgot password · code           | S2                       |                   |
| A8  | Forgot password · new password   | S2                       |                   |
| A9  | Onboarding 1 · Library card      | S2                       | Changed · A6, P30 |
| A10 | Onboarding 2 · Currently reading | S3                       | Changed · P16     |
| A11 | Onboarding 3 · Reading pledge    | S2                       | Changed · P29     |

### B · Home & tracking

| ID  | Screen                   | Sprint                        | v2                      |
| --- | ------------------------ | ----------------------------- | ----------------------- |
| B1  | Home                     | S3 (sections added in S4, S5) | Changed · P23, P25, P31 |
| B2  | Home · first run / empty | S3                            |                         |
| B3  | Status sheet             | S3                            | Changed · P16           |
| B4  | Swipe to change status   | S3                            | New · P24               |
| B5  | Long-press menu          | S4 (Recommend in S8)          | New · P24               |

### C · Readlists

| ID  | Screen                      | Sprint                      | v2            |
| --- | --------------------------- | --------------------------- | ------------- |
| C1  | Readlists overview          | S4 ("Shared with me" in S8) | Changed · P19 |
| C2  | Readlist detail             | S4 (sharing in S8)          | Changed · P19 |
| C3  | Create / edit readlist      | S4                          | Changed · P19 |
| C4  | Add-to-readlist sheet       | S4                          |               |
| C5  | Share readlist with friends | S8                          | Changed · P19 |

### D · Books

| ID  | Screen              | Sprint                                       | v2                      |
| --- | ------------------- | -------------------------------------------- | ----------------------- |
| D1  | Book search         | S3 (challenge indicator in S5)               | Changed · P25, P26, P27 |
| D2  | Book detail         | S3 (readlists S4, challenges S5, ratings S8) | Changed · P16, P17, P25 |
| D3  | Add a book manually | S3                                           | New · P27               |
| D4  | Mark as read sheet  | S3 (challenges S5, rating S8)                | Changed · P10, P28      |

### E · Challenges

| ID  | Screen                         | Sprint                            | v2                      |
| --- | ------------------------------ | --------------------------------- | ----------------------- |
| E1  | Challenges · Active            | S5 (friends S8, official S6)      | Changed · P14           |
| E2  | Challenges · Discover          | S6 ("Shared by friends" in S8)    | Changed · P14           |
| E3  | Challenges · Past              | S5                                | Changed · P13           |
| E4  | Challenge detail               | S5 (participants S8, official S6) | Changed · P11, P12, P14 |
| E5  | Submit my own pick             | S5                                | Changed · P11           |
| E6  | Create challenge               | S5 ("Share with friends" in S8)   | Changed · P12, P14      |
| E7  | Completion celebration         | S5                                | Changed · P10, P33      |
| E8  | Edit challenge after the start | S5                                | New · P13               |

### F · Friends

| ID  | Screen             | Sprint                          | v2        |
| --- | ------------------ | ------------------------------- | --------- |
| F1  | Friends tab        | S7 ("Recommended to you" in S8) | New · P7  |
| F2  | Find friends       | S7                              | New · P8  |
| F3  | Friend profile     | S7 (ratings S8)                 | New · P9  |
| F4  | Recommend sheet    | S8                              | New · P20 |
| F5  | Recommended to you | S8                              | New · P20 |

### G · Profile & settings

| ID  | Screen                 | Sprint                          | v2                     |
| --- | ---------------------- | ------------------------------- | ---------------------- |
| G1  | Profile (library card) | S2 (sections added S3–S5)       | Changed · P30          |
| G2  | Settings               | S2                              | Changed · A8, A10, P32 |
| G3  | What’s new (changelog) | S2                              |                        |
| G4  | Delete account         | S2 ("Kicked out" display in S8) | Changed · A9           |
| G5  | Send feedback          | S2                              | New · P32              |
| G6  | Change username        | S2                              | New · A6               |

### H · Admin

| ID  | Screen                           | Sprint                         | v2        |
| --- | -------------------------------- | ------------------------------ | --------- |
| H1  | Admin home                       | S2 (official challenges in S6) | New · P15 |
| H2  | Feedback list                    | S2                             | New · P32 |
| H3  | Official challenges              | S6                             | New · P15 |
| H4  | Create / edit official challenge | S6                             | New · P15 |

### X · Desktop

| ID  | Screen         | Sprint             | v2                 |
| --- | -------------- | ------------------ | ------------------ |
| X1  | Desktop · Home | S3 (refined in S9) | Changed · P21, P23 |

## Open questions

Same IDs as on the page. **PO** = for product owners, **U** = for possible end users.

### N · Navigation

- **N-PO1** Is "Friends" the right label for the fifth tab?
- **N-U1** Is the order of the + menu right for how you use the app?

### A · Accounts & onboarding

- **A-PO1** To keep sign-up short (an end user said sign-up and verification could make her stop): keep the optional "Currently reading" step, or drop it?
- **A-U1** Is the sign-up now short enough?

### B · Home & tracking

- **B-PO1** Show the optional percentage on Home, or only on the book itself?
- **B-PO2** Anything else in the stats strip besides books this year vs pledge and challenges completed?
- **B-U1** Would you discover the swipe without a hint? Should we show a one-time hint?

### C · Readlists

- **C-PO1** Can a friend with edit rights remove books that others added?
- **C-PO2** Do readlists shared with you appear under "Shared with me" in your Readlists tab (as drawn)?
- **C-U1** Would you share readlists with friends as view-only or let them edit?

### D · Books

- **D-PO1** When marking as read, ask for the finish date (default today) — needed for the "finished after start" rule — or always use today?
- **D-PO2** Manual entry: which fields are required (title + author?)
- **D-PO3** Ask for a rating when marking as read, or only on the book page?
- **D-U1** Is "Add this book" clear for adding a book to a challenge?

### E · Challenges

- **E-PO1** Without notifications, how do auto-enrolled friends notice a new shared challenge (e.g. "New" badge on the Challenges tab)?
- **E-PO2** Can the creator remove a participant? Can participants re-share a challenge?
- **E-PO3** Who can edit a shared challenge: only the creator?
- **E-U1** Is picking at least 5 candidate books too much work when creating a challenge?

### F · Friends

- **F-PO1** Where does "Recommended to you" live: Friends tab (as drawn), Home, or both? And how do you notice a new one (badge)?
- **F-PO2** Show a mini library card in friend search results, or only the username?
- **F-PO3** Any maximum number of friends?
- **F-U1** Would you find your friends by searching their username?

### G · Profile & settings

- **G-PO1** When an account is deleted, what happens to readlists they shared with edit rights: stay for the others, or disappear?
- **G-PO2** During the 14 days before permanent deletion, can the person undo it by logging in again?
- **G-U1** Anything missing in Settings?

### H · Admin

- **H-PO1** Should feedback items get a status (new / read / done)?
- **H-PO2** Can the admin end an official challenge early?
- **H-PO3** Cover image for official challenges?

### X · Desktop

- **X-PO1** Is one desktop sketch enough for now (testers use phones), with the desktop layout refined in the polish sprint?
- **X-U1** Would you ever use Lillyjean on a computer?

## Later

- Bookclubs (P7): they come after friends and will build on them; not drawn in v2.
