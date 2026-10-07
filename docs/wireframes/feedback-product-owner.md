# Product Owner feedback

|                |                                                             |
| -------------- | ----------------------------------------------------------- |
| **Role**       | Product Owner                                               |
| **Reviewer**   | Yoran Broodcooren                                           |
| **Wireframes** | v1 (`docs/wireframes/index.html`)                           |
| **Received**   | 2026-10-07, via the feedback email from the wireframes page |
| **Status**     | Recorded. Processing waits until end-user feedback is in.   |

The feedback below is recorded verbatim. Screen IDs (e.g. `A1`) and question IDs (e.g. `N-PO1`) refer to
the wireframes page. Processing notes are kept separately at the bottom of this file.

## Screens

- **N1:** I prefer the tab based navigation
- **N2:** I do not like this type of navigation
- **N3:** I do not like this type of navigation
- **A1:** Good
- **A2:** will not use any book club invite links yet. Put this on the proudct backlog in docs/backlog.md as a 'later'
- **A3:** Good
- **A4:** Good
- **A5:** Good
- **A6:** Good
- **A7:** Good
- **A8:** Good
- **A9:** Love the library card option. makes it truely book nerdy, which is what we want to attract
- **A10:** Good - but what or how will it decide to recommend 3 books?
- **A12:** will not use any book club invite links yet. Put this on the proudct backlog in docs/backlog.md as a 'later'
- **A13:** will not use any book club invite links yet. Put this on the proudct backlog in docs/backlog.md as a 'later'
- **A14:** will not use any book club invite links yet. Put this on the proudct backlog in docs/backlog.md as a 'later'
- **B1:**
  - Not a fan of updating progress. I would just let a user mark a book as read instead. my end users are fast readers, they will not have time to update the number of pages or minutes read as it does not match their style
  - club activities is not a high prio.
  - put this also as a later on the backlog.md file
- **B3:** won't really track progress. you either way read a book or it remains pending. simplify this screen.
- **C1:** Perfect, love the simple filter bar
- **C2:** Great feature, sharing lists with clubs
- **C3:** good
- **C4:** great
- **C5:** great
- **D1:** incidate here also if a book is part of a challenge (no matter if you reading it, if it was read or if you will read it)
- **D2:**
  - remove the pages tracking
  - remove the details section - not sure if we can fetch all this data to begin with
  - for the "fits your challenges" section - instead of pick a book, it should say "add this book" so it is clear that you will add that book to that specific challenge when pressing the button
- **D3:** put this idea on the backlog markdown as a "later" feature
- **D4:** like the idea of ratings, especially within bok clubs
- **E1:** love that you can add personal challenges on top of what comes from your bookclub or even the official ones
- **E2:** good
- **E3:** good
- **E4:** good
- **E6:** great feature - will require quite some technical setup so make sure you understand this very well for the data model
- **E7:** No need for the arrow (7 -> 8) , just say number of challenges completed
- **E8:** Love the idea, end users seem in favor of this.
- **F1:** OK
- **F2:** OK
- **F3:** OK
- **F4:** OK, invite via link is not for v1
- **G1:** are stamps the challenges? if so, call it challenges
- **G2:**
  - i dont support notifications
  - signout everywhere, not needed
  - allow for a user feedback form.
- **G3:** OK
- **G4:** good
- **I1:**
  - swiping for the 3 statusses is perfect. just make sure it is correctly built on the webapp. sometimes this can be funky and laggy on non ios native webapps
  - long press is also good for other contextual info like you have now already
- **I2:** not needed - i wont have a recommendation algoritmh or antyhing. purely relying on book club and readlist info (community sourced recommendations for other people)

## Open questions

### N · Navigation

- **N-PO1** Alt 1 (classic tab bar), Alt 2 (bookshelf spines + Quick log) or a hybrid of both?
  > classic tab bar
- **N-PO2** Profile behind the avatar (as drawn) or as its own tab (dropping the center action)?
  > profile behind avatar
- **N-PO3** Which actions belong in the global + / Quick log menu, and in which order?
  > adding a new book to a readlist
- **N-PO4** Do we need a notifications inbox (bell) in v1, or are email/push notifications plus the activity feed enough?
  > No

### A · Splash, authentication & onboarding

- **A-PO1** Do we check new passwords against known breached passwords (Supabase Pro feature)?
  > No, not yet - but remember it and put it on the later backlog in docs/backlog.md as a 'later'
- **A-PO2** Code validity (10 min drawn), resend cooldown (60 s drawn) and maximum wrong attempts: OK?
  > OK
- **A-PO3** Sign-up with an email that already exists: say so ("already registered, log in?") or stay neutral to avoid account discovery?
  > stay neutral
- **A-PO4** Username rules: length, allowed characters, can it be changed later (and how often)?
  > yes, go with something standard and secure for now, but i might revise this in the future
- **A-PO5** Splash: show the animation on every cold open or only the first time?
  > just first time. it should almost feel like an apple unboxing experience
- **A-PO6** Invites: how long is an invite link valid (7 days drawn), single-use or reusable, and is the inviter told when someone declines?
  > will not use any book club invite links yet. Put this on the proudct backlog in docs/backlog.md as a 'later'
- **A-PO7** Invite sent to one email address, but the person signs in with another account: allow, warn or block?
  > will not use any book club invite links yet. Put this on the proudct backlog in docs/backlog.md as a 'later'
- **A-PO8** Reading pledge: books only, or also pages/minutes? Can it be changed mid-year, and what happens to past years?
  > Books only - tracking pages is cumbersome for a user. but they can update their goal (increase or decrease). past years should be in some sort of trophy cabin when going to your profile (this can also be a feature for alter)

### B · Home

- **B-PO1** Streak: daily or weekly, and what counts (any progress update, a finished book)? Or replace it with another stat?
  > monthly streak - only a finished book counts, we don't track page or percentage progress
- **B-PO2** Do we track page/percentage progress in v1, or only the three statuses (want to read / reading / read)?
  > No - the three statuses (want to read, reading, read) are perfect
- **B-PO3** Section order on Home: fixed, or can users hide and reorder sections?
  > fixed order
- **B-PO4** Which club activity events show on Home, and which only inside the club?
  > activity feed:
  >
  > - new person joining or leaving the club
  > - new challenge being added or started/ended
  > - if somebody from your club finished a book that falls inside that club's readlist => feature idea: when you join a club, you always have a readlist that is visible from that club. everyone can add or remove books and you can see your individual status (want to read, reading, read) but also the one from others; books you add on your personal readlist remain private or are not shared with the bookclub.

### C · Readlists

- **C-PO1** Visibility options Only me / Shared with clubs / Anyone with the link: right set? Public profiles later?
  > public later indeed
- **C-PO2** Readlists shared with a club: view-only, or can members add books too?
  > allow the user to chose how they want to share it
- **C-PO3** "Recommend to a friend" without a friends list: recommend to any username/email, or only to people in shared clubs?
  > no you have to be friends or in the same book club in order to share
- **C-PO4** Manual ordering of books in v1, or sort options only? Custom cover upload, or automatic cover mosaic only?
  > no manually ordering, but put the idea on the backlog.
- **C-PO5** Show the three statuses as system lists next to readlists (as drawn in C1), or only on the profile?
  > like C1

### D · Books

- **D-PO1** Track books at "work" level or per specific edition (page counts differ per edition)?
  > track at work level - aka: want to read, reading, read
- **D-PO2** Manual book entry when the book database has no result: in v1?
  > Yes for V1
- **D-PO3** ISBN barcode scanning: v1 or later?
  > later
- **D-PO4** Re-reads: can a book be read more than once and count again towards the pledge?
  > Yes
- **D-PO5** Show our own members' average rating next to the public rating, and should the public (Google Books) rating be shown at all?
  > yes to both member and google books rating.

### E · Challenges

- **E-PO1** Must the book be finished after the challenge start date, or do books already read count?
  > Yes, you cannot submit a book you have read already before the challenge start date.
- **E-PO2** Can one finished book complete several challenges at the same time?
  > yes, if you selected that unread book for multiple challenges
- **E-PO3** Own picks: accepted automatically, or approved by the challenge creator? Can others adopt someone's own pick?
  > own picks are approved/accepted automatically
- **E-PO4** Club challenges: are members enrolled automatically, or do they join themselves?
  > join themselves
- **E-PO5** After the end date: can you still complete it late? Does "Past" include challenges you joined but did not complete?
  > you cannot complete a challenge once the end date is filled. you can however still read the book and it will count as a read book, but not the challenge.
  >
  > You can start a challenge that is already in progress as long as you finish before the end date (if there is one)
- **E-PO6** Minimum number of candidate books (0 = theme only)?
  > not sure of the question here - please clarify
- **E-PO7** Can the creator change dates or candidate books after the start? What happens to picks already made?
  > yes you can update start dates and end dates, and also update picks
- **E-PO8** Official challenges: is an admin screen in scope for v1, or are they added directly in the database at first?
  > an admin screen should be created for this - so a role is also required for a user account
- **E-PO9** Member progress on Official challenges: show a count only (as drawn) or nothing?
  > count only

### F · Bookclubs

- **F-PO1** Flat hierarchy: can every member invite and remove members, edit the club and create challenges? Who can delete the club, and what happens when the creator leaves?
  > Yes, flat hieracrhy
- **F-PO2** Maximum club size?
  > 15 people
- **F-PO4** Do club members see all of a member's reading statuses, or only club-related activity?
  > all members see all of each others data. it is basically the same as being friends on the app
- **F-PO5** Reminder emails for unanswered invites?
  > No

### G · Profile, settings & about

- **G-PO1** What can other club members see on someone's profile (the card front only, as drawn)?
  > start with all information - but i might limit it in future
- **G-PO2** Changing username and email: allowed, and with which verification?
  > yes, email verification
- **G-PO3** Delete account: immediate or after a grace period (e.g. 14 days)? What happens to picks, activity and shared readlists in clubs (remove or anonymise)?
  > soft delete directly, hard deletae after 14 days.
  >
  > all of the contributions they made to books (eg ratings) or bookclubs + shared challenges will remain. However it should indicate that this is from a "past user". from a data law point of view we have to remove all personal data, however the shared stuff should not break - only that indication of "past user" => this can be a small easter eg: name that type of removed user "kicked out of the library" as a fun pun
- **G-PO4** "Sign out everywhere": ask for the password or an email code first?
  > do not built this feature
- **G-PO5** Changelog: show only new features and fixes (current setup)? Show a one-time "What's new" message after an update?
  > yes + when users open the app for the first time after changes. give them a small pop up to indicate the app changed., but second time opening app they should not get it anymore
- **G-PO6** Profile photo upload in v1, or initials only?
  > phot upload in v1, store as base64 encoded image in DB if possible + compress the image. only png or jpg allowed and nothing above 1000px or 5mb file

### I · Other interaction ideas

- **I-PO1** Which of these interaction ideas (swipe, long-press, pick-my-next-read deck, spin the wheel) are worth building in v1?
  > swipe + long press. ditch the pick my next read deck.
  >
  > spinwheel for challanges is awesome

## Not answered

`F-PO3` (activity feed events and reactions/comments; partly covered by `B-PO4`), `X-PO1` and `X-PO2`
(desktop breakpoints, keyboard shortcuts). No feedback on screens `A11`, `B2`, `E5`, `X1`–`X4`.

## Processing notes

Added by the development team. These do not change the feedback above.

### Moved to the backlog as "Later" (`docs/backlog.md`)

| Item                                                             | Source                                    |
| ---------------------------------------------------------------- | ----------------------------------------- |
| Bookclub invite links (expiry, single/multi-use, email mismatch) | `A2`, `A12`–`A14`, `A-PO6`, `A-PO7`, `F4` |
| Club activity on Home                                            | `B1`                                      |
| ISBN barcode scanning                                            | `D3`, `D-PO3`                             |
| Breached-password check (Supabase Pro)                           | `A-PO1`                                   |
| Trophy cabinet with past years' reading pledges on the profile   | `A-PO8`                                   |
| Manual ordering of books in a readlist                           | `C-PO4`                                   |
| Public profiles and public readlists                             | `C-PO1`                                   |

Removed from the planned scope: "Sign out everywhere" (`G2`, `G-PO4`), pick-my-next-read deck (`I2`).

### Clarifications for the next review round

1. **A10:** the three books on this screen are not recommendations. They are search results after the
   user types a title; there is no recommendation logic (in line with `I2`).
2. **E-PO6:** should a challenge always have at least one candidate book, or can a creator publish a
   theme-only challenge where every member submits their own pick?
3. **C-PO3 / F-PO4:** sharing requires being "friends or in the same book club". Is a separate friends
   feature wanted, or is sharing a bookclub the only way to be connected for now?
4. **B1 / B-PO4:** club activity is "not a high prio" and Home activity moved to Later, but `B-PO4` lists
   feed events. Is the activity feed inside the club (`F2`) still in v1?
5. **B-PO4 feature idea:** every club gets one shared club readlist (everyone can add/remove books and see
   each other's status). Is this v1, and does it replace sharing personal readlists with a club (`C2`)?
6. **E-PO5:** "once the end date is filled" is read as "once the end date has passed".
7. **G-PO6:** storing photos as base64 in the database works but makes every profile query heavier.
   Alternative: Supabase Storage with the same limits (PNG/JPG, max 1000 px, max 5 MB, compressed).
8. **G2:** a user feedback form is new scope. Where should submissions go (database table, email)?
9. **G1:** yes, stamps are completed challenges; the label will become "Challenges".
10. **F-PO1:** who can delete a club, and what happens when its creator leaves?
