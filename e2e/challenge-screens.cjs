// End-to-end check of the challenge screens (Sprint 5): the Challenges tab (N1), Active (E1),
// Past (E3), the challenge page (E4: pick, replace, completion on pick, ⋯ Edit / Delete) and
// Submit my own pick (E5: search and manual entry). Challenges are made through the database
// functions as the reader. Needs BOOKS_API=fixtures; see e2e/README.md.
const { chromium } = require(process.env.PW ?? "playwright");

const {
  BASE,
  createReader,
  logIn,
  psql,
  reporter,
  visible,
} = require("./helpers.cjs");

const SHOTS = process.env.SHOTS ?? "e2e/screenshots";
require("node:fs").mkdirSync(SHOTS, { recursive: true });

const { check, finish } = reporter();
const errors = [];

const sql = (text) => text.replace(/\s+/g, " ").replace(/"/g, '\\"');

/** Runs `statement` as the signed-in reader (row level security and auth.uid() apply). */
function asReader(reader, statement) {
  const claims = JSON.stringify({ sub: reader.id, role: "authenticated" });
  const lines = psql(
    sql(`begin; set local role authenticated;
      select set_config('request.jwt.claims', '${claims}', true) is not null;
      ${statement}; commit;`),
  ).split("\n");
  // BEGIN, SET, t, <result>, COMMIT
  return lines[lines.length - 2];
}

/** A book in the database (not on anyone's shelf); returns its id. */
function seedBook(reader, title) {
  return psql(
    sql(`with b as (insert into public.books (source, title, authors, created_by, details_checked)
       values ('manual', '${title}', array['Cara Candidate'], '${reader.id}', true) returning id)
     select id from b`),
  );
}

/** A line with dates ("{d}" = "7 October" or "October 7"), as an exact pattern. */
const dated = (text) =>
  new RegExp(`^${text.replaceAll("{d}", "(?:\\d+ \\w+|\\w+ \\d+)")}$`);

const day = (offset) =>
  `current_date ${offset < 0 ? "-" : "+"} ${Math.abs(offset)}`;

/** A personal challenge made with create_challenge as the reader; returns its id. */
function seedChallenge(reader, title, theme, starts, ends, bookIds) {
  return asReader(
    reader,
    `select public.create_challenge('${title}', '${theme}', ${day(starts)}, ${
      ends === null ? "null" : day(ends)
    }, array['${bookIds.join("','")}']::uuid[])`,
  );
}

const pickOf = (challengeId) =>
  psql(
    `select coalesce((select b.title from public.challenge_members m join public.books b on b.id = m.book_id where m.challenge_id = '${challengeId}'), '')`,
  );
const completedOn = (challengeId) =>
  psql(
    `select coalesce((select completed_on::text from public.challenge_progress where challenge_id = '${challengeId}'), '')`,
  );

/** Waits until `read()` returns the expected value (server actions are asynchronous). */
async function eventually(read, expected, timeout = 8000) {
  const end = Date.now() + timeout;
  let value;
  while (Date.now() < end) {
    value = read();
    if (typeof expected === "function" ? expected(value) : value === expected)
      return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log(`  expected ${expected}, got ${value}`);
  return false;
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
  });
  const newPage = async () => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    return page;
  };
  const page = await newPage();
  const shot = (name, fullPage = true) =>
    page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage });
  const nav = page.getByRole("navigation", { name: "Main" });
  const cardTitles = (list) =>
    list
      .getByRole("listitem")
      .evaluateAll((items) =>
        items.map(
          (item) =>
            item.querySelector("a > span.font-serif")?.textContent.trim() ?? "",
        ),
      );

  try {
    // Seed: 7 books, running / upcoming / completed / missed challenges.
    const reader = await createReader("stamps");
    const books = [1, 2, 3, 4, 5, 6, 7].map((n) =>
      seedBook(reader, `Candidate ${n}`),
    );
    const [, , , , , b6, b7] = books;
    const autumn = seedChallenge(
      reader,
      "Autumn classics",
      "A classic with a red cover",
      -10,
      20,
      books.slice(0, 6),
    );
    const sprint = seedChallenge(
      reader,
      "Short sprint",
      "",
      -3,
      3,
      books.slice(0, 5),
    );
    const noEnd = seedChallenge(
      reader,
      "Open ended",
      "Anything by a woman writer",
      -5,
      null,
      books.slice(0, 5),
    );
    const winter = seedChallenge(
      reader,
      "Winter warmers",
      "Cosy books",
      5,
      60,
      books.slice(1, 6),
    );
    const summer = seedChallenge(
      reader,
      "Summer done",
      "",
      -60,
      30,
      books.slice(2, 7),
    );
    asReader(reader, `select public.pick_challenge_book('${summer}', '${b7}')`);
    asReader(reader, `select public.mark_book_read('${b7}', ${day(-40)})`);
    const missed = seedChallenge(
      reader,
      "Missed one",
      "",
      -60,
      -20,
      books.slice(0, 5),
    );
    // Candidate 6 was read two days ago: after the start of Autumn classics (P51).
    asReader(reader, `select public.mark_book_read('${b6}', ${day(-2)})`);
    check(
      "seed: Summer done is completed, Missed one is not",
      completedOn(summer) !== "" && completedOn(missed) === "",
    );

    await logIn(page, reader);

    // 1. Tab bar (N1)
    const tabNames = await nav
      .getByRole("link")
      .evaluateAll((links) => links.map((link) => link.textContent.trim()));
    check(
      "N1: tab bar shows Home, Readlists and Challenges; Friends is still absent",
      JSON.stringify(tabNames) ===
        JSON.stringify(["Home", "Readlists", "Challenges"]) &&
        (await nav.getByText("Friends").count()) === 0,
      tabNames.join(","),
    );
    const challengesTab = nav.getByRole("link", { name: "Challenges" });
    const plusBox = await nav
      .getByRole("button", { name: "Create", exact: true })
      .boundingBox();
    const tabBox = await challengesTab.boundingBox();
    check(
      "N1: Challenges sits in slot 4, right of the +",
      tabBox.x > plusBox.x + plusBox.width &&
        tabBox.x + tabBox.width < (390 * 4) / 5 + 2,
    );
    await challengesTab.click();
    await page.waitForURL(`${BASE}/challenges`);
    check(
      "N1: Challenges is the current tab on /challenges",
      (await challengesTab.getAttribute("aria-current")) === "page",
    );

    // 2. E1 Active
    check(
      "E1: header with title, + to New challenge and the avatar",
      (await visible(page.getByRole("heading", { name: "Challenges" }))) &&
        (await page
          .getByRole("link", { name: "New challenge" })
          .getAttribute("href")) === "/challenges/new" &&
        (await page
          .getByRole("link", { name: "Open your profile" })
          .getAttribute("href")) === "/profile",
    );
    const views = page.getByRole("navigation", { name: "Challenge lists" });
    check(
      "E1: Active · Past switch with Active current; no Discover",
      JSON.stringify(
        await views
          .getByRole("link")
          .evaluateAll((links) => links.map((l) => l.textContent.trim())),
      ) === JSON.stringify(["Active", "Past"]) &&
        (await views
          .getByRole("link", { name: "Active" })
          .getAttribute("aria-current")) === "page" &&
        (await page.getByText("Discover").count()) === 0,
    );
    check(
      "E1: counter is a plain number: 1 challenge completed",
      (await visible(
        page.getByText("1 challenge completed", { exact: true }),
      )) && (await page.getByText(/↑|↗|→/).count()) === 0,
    );
    const running = await cardTitles(
      page.getByRole("list", { name: "Running challenges" }),
    );
    check(
      "E1: running challenges, ending soonest first (no end date last)",
      JSON.stringify(running) ===
        JSON.stringify(["Short sprint", "Autumn classics", "Open ended"]),
      running.join(","),
    );
    const upcomingSection = page.getByRole("region", { name: "Upcoming" });
    check(
      "E1: Upcoming heading with the upcoming challenge after the running ones",
      JSON.stringify(await cardTitles(upcomingSection)) ===
        JSON.stringify(["Winter warmers"]) &&
        (await visible(upcomingSection.getByText("Starts in 5 days"))),
    );
    check(
      "E1: completed and missed challenges are not on Active",
      (await page.getByText("Summer done").count()) === 0 &&
        (await page.getByText("Missed one").count()) === 0,
    );
    check(
      "E1: a card shows kind, time left and Choose a book",
      await visible(
        page
          .getByRole("link", { name: /Autumn classics/ })
          .getByText("Ends in 20 days"),
      ),
    );
    await shot("challenges-01-active");

    // 3. E3 Past
    await views.getByRole("link", { name: "Past" }).click();
    await page.waitForURL(`${BASE}/challenges/past`);
    const past = await cardTitles(
      page.getByRole("list", { name: "Completed challenges" }),
    );
    check(
      "E3: Past lists only the completed challenge (missed ones disappear)",
      JSON.stringify(past) === JSON.stringify(["Summer done"]) &&
        (await page.getByText("Missed one").count()) === 0,
      past.join(","),
    );
    check(
      "E3: card shows Completed date, You read and DONE; note line; tab still current",
      (await visible(page.getByText(dated("Completed {d}")))) &&
        (await visible(page.getByText("You read Candidate 7"))) &&
        (await visible(page.getByText("DONE", { exact: true }))) &&
        (await visible(
          page.getByText("Only completed challenges are listed here"),
        )) &&
        (await challengesTab.getAttribute("aria-current")) === "page" &&
        (await visible(page.getByText("1 challenge completed"))),
    );
    await shot("challenges-02-past");

    // 4. E4 detail (running, no pick)
    await views.getByRole("link", { name: "Active" }).click();
    await page.waitForURL(`${BASE}/challenges`);
    await page.getByRole("link", { name: /Autumn classics/ }).click();
    await page.waitForURL(`${BASE}/challenges/${autumn}`);
    check(
      "E4: Challenges tab stays current on a challenge",
      (await challengesTab.getAttribute("aria-current")) === "page",
    );
    check(
      "E4: kind, title, dates, theme and the rule in plain words",
      (await visible(page.getByText("Personal", { exact: true }))) &&
        (await visible(
          page.getByRole("heading", { level: 1, name: "Autumn classics" }),
        )) &&
        (await visible(page.getByText(dated("Starts {d} · Ends {d}")))) &&
        (await visible(page.getByText("A classic with a red cover"))) &&
        (await visible(
          page.getByText("Only books finished after the start date count"),
        )),
    );
    const candidates = page.getByRole("region", { name: /Candidate books/ });
    const addButtons = candidates.getByRole("button", {
      name: /^Add .* as your pick$/,
    });
    check(
      "E4: No book picked yet; Candidate books (6) shows 4 and + 2 more · Show all",
      (await visible(page.getByText("No book picked yet"))) &&
        (await visible(
          page.getByRole("heading", { name: "Candidate books (6)" }),
        )) &&
        (await candidates.getByRole("listitem").count()) === 4 &&
        (await visible(
          candidates.getByRole("button", { name: "+ 2 more · Show all" }),
        )) &&
        (await addButtons.count()) === 4,
    );
    check(
      "E4: ⋯ has Edit (to the edit form) and Delete",
      await (async () => {
        await page
          .getByRole("button", { name: "More actions for this challenge" })
          .click();
        const sheet = page.getByRole("dialog", { name: "Autumn classics" });
        const ok =
          (await sheet
            .getByRole("link", { name: "Edit" })
            .getAttribute("href")) === `/challenges/${autumn}/edit` &&
          (await sheet.getByRole("button", { name: "Delete" }).count()) === 1;
        await page.keyboard.press("Escape");
        return ok;
      })(),
    );
    await shot("challenges-03-detail");

    // 5. Show all, Add this book, replace confirmation
    await candidates
      .getByRole("button", { name: "+ 2 more · Show all" })
      .click();
    check(
      "E4: Show all lists all 6 candidates",
      (await candidates.getByRole("listitem").count()) === 6 &&
        (await addButtons.count()) === 6,
    );
    await candidates
      .getByRole("button", { name: "Add Candidate 1 as your pick" })
      .click();
    check(
      "E4: Add this book makes it my pick (DB) and says so",
      (await eventually(() => pickOf(autumn), "Candidate 1")) &&
        (await visible(page.getByText("“Candidate 1” is your pick"))),
    );
    const pickBlock = page.getByRole("region", { name: "Your pick" });
    check(
      "E4: Your pick block shows the book and Change; the row says Your pick",
      (await visible(
        pickBlock.getByText("Candidate 1", { exact: true }).first(),
      )) &&
        (await visible(pickBlock.getByRole("button", { name: "Change" }))) &&
        (await visible(
          candidates
            .getByRole("listitem")
            .filter({ hasText: "Candidate 1" })
            .getByText("Your pick"),
        )),
    );
    await candidates
      .getByRole("button", { name: "Add Candidate 2 as your pick" })
      .click();
    const replaceSheet = page.getByRole("dialog", {
      name: "Replace your pick?",
    });
    check(
      "E4: replacing a pick asks first",
      (await visible(replaceSheet)) &&
        (await visible(
          replaceSheet.getByText(
            "“Candidate 2” becomes your pick instead of “Candidate 1”.",
          ),
        )),
    );
    await shot("challenges-04-replace", false);
    await replaceSheet.getByRole("button", { name: "Keep my pick" }).click();
    check(
      "E4: Keep my pick changes nothing",
      (await replaceSheet.isHidden()) && pickOf(autumn) === "Candidate 1",
    );
    await candidates
      .getByRole("button", { name: "Add Candidate 2 as your pick" })
      .click();
    await replaceSheet.getByRole("button", { name: "Replace my pick" }).click();
    check(
      "E4: Replace my pick saves the new pick (DB)",
      await eventually(() => pickOf(autumn), "Candidate 2"),
    );

    // 6. Change opens all candidates; picking a book read after the start completes it (P51)
    await page.reload();
    check(
      "E4: after a reload the list is collapsed again with my pick first",
      (await candidates.getByRole("listitem").count()) === 4 &&
        (await candidates
          .getByRole("listitem")
          .first()
          .getByText("Your pick")
          .isVisible()),
    );
    await pickBlock.getByRole("button", { name: "Change" }).click();
    check(
      "E4: Change shows all 6 candidates and moves focus to them",
      (await candidates.getByRole("listitem").count()) === 6 &&
        (await page
          .getByRole("heading", { name: "Candidate books (6)" })
          .evaluate((el) => el === document.activeElement)),
    );
    await candidates
      .getByRole("button", { name: "Add Candidate 6 as your pick" })
      .click();
    await replaceSheet.getByRole("button", { name: "Replace my pick" }).click();
    check(
      "P51: picking a book read after the start completes the challenge (DB completed_on)",
      await eventually(
        () => completedOn(autumn),
        (v) => v !== "",
      ),
    );
    check(
      "P51: the completion shows (celebration hook + snackbar fallback)",
      await visible(
        page.getByText("Challenge completed! You read Candidate 6"),
      ),
    );
    check(
      "E4: the completed challenge is read-only: Completed · You read, no pick controls, no ⋯",
      (await visible(
        page.getByText(dated("Completed {d} · You read Candidate 6")),
      )) &&
        (await addButtons.count()) === 0 &&
        (await page.getByRole("button", { name: "Change" }).count()) === 0 &&
        (await page
          .getByRole("link", { name: "Submit my own pick" })
          .count()) === 0 &&
        (await page
          .getByRole("button", { name: "More actions for this challenge" })
          .count()) === 0,
    );
    await shot("challenges-05-completed-on-pick");
    await page.goto(`${BASE}/challenges`);
    check(
      "E1: counter goes up to 2 and Autumn classics left Active",
      (await visible(page.getByText("2 challenges completed"))) &&
        (await page.getByText("Autumn classics").count()) === 0,
    );

    // 7. ← goes back to where the challenge was opened
    await page.getByRole("link", { name: /Open ended/ }).click();
    await page.waitForURL(`${BASE}/challenges/${noEnd}`);
    await page.getByRole("link", { name: "Back", exact: true }).click();
    check(
      "E4: ← goes back to the Challenges tab",
      await page.waitForURL(`${BASE}/challenges`, { timeout: 5000 }).then(
        () => true,
        () => false,
      ),
    );

    // 8. E5 own pick via the search
    await page.getByRole("link", { name: /Open ended/ }).click();
    await page.waitForURL(`${BASE}/challenges/${noEnd}`);
    check(
      "E4: no end date reads Starts … · No end date",
      await visible(page.getByText(dated("Starts {d} · No end date"))),
    );
    await page.getByRole("link", { name: "Submit my own pick" }).click();
    await page.waitForURL(`${BASE}/challenges/${noEnd}/pick?from=challenge`);
    const searchField = page.getByLabel("Search books");
    const usePick = page.getByRole("button", { name: "Use as my pick" });
    check(
      "E5: challenge title, Submit your own pick, theme reminder, note, labelled search without placeholder",
      (await visible(page.getByText("Open ended", { exact: true }))) &&
        (await visible(
          page.getByRole("heading", { name: "Submit your own pick" }),
        )) &&
        (await visible(page.getByText("Anything by a woman writer"))) &&
        (await visible(page.getByText("Your pick is accepted right away."))) &&
        (await searchField.getAttribute("placeholder")) === null &&
        (await usePick.isDisabled()),
    );
    await searchField.fill("austen");
    const choices = page.getByRole("list", { name: "Books to choose from" });
    await choices.getByRole("button", { name: /Persuasion/ }).waitFor();
    check(
      "E5: the search finds the fixture books",
      (await visible(page.getByText("3 books found"))) &&
        (await choices.getByRole("button").count()) === 3,
    );
    await choices.getByRole("button", { name: /Persuasion/ }).click();
    check(
      "E5: choosing a result selects it and enables Use as my pick",
      (await choices
        .getByRole("button", { name: /Persuasion/ })
        .getAttribute("aria-pressed")) === "true" &&
        (await usePick.isEnabled()),
    );
    await shot("challenges-06-own-pick");
    await usePick.click();
    await page.waitForURL(`${BASE}/challenges/${noEnd}`);
    check(
      "E5: Use as my pick saves it (DB) and goes back to the challenge, marked Own pick",
      (await eventually(() => pickOf(noEnd), "Persuasion")) &&
        (await visible(
          pickBlock.getByText("Persuasion", { exact: true }).first(),
        )) &&
        (await visible(pickBlock.getByText("Own pick"))),
    );

    // 9. E5 own pick via manual entry, opened directly (no previous screen to go back to)
    await page.goto(`${BASE}/challenges/${sprint}/pick`);
    await page.getByLabel("Search books").fill("Hidden gem");
    const manual = page.getByRole("link", { name: "Add it manually" });
    check(
      "E5: Add it manually passes the title and a way back",
      decodeURIComponent((await manual.getAttribute("href")) ?? "").includes(
        `returnTo=/challenges/${sprint}/pick`,
      ),
    );
    await manual.click();
    await page.waitForURL(/\/books\/new/);
    check(
      "D3: the title comes from the search",
      (await page.getByLabel("Title").inputValue()) === "Hidden gem",
    );
    await page.getByLabel("Author").fill("Nora Nobody");
    await page.getByRole("button", { name: "Add book" }).click();
    await page.waitForURL(new RegExp(`/challenges/${sprint}/pick\\?added=`));
    const added = page
      .getByRole("list", { name: "Books to choose from" })
      .getByRole("button", { name: /Hidden gem/ });
    check(
      "E5: back from manual entry, the new book is listed first and chosen",
      (await visible(added)) &&
        (await added.getAttribute("aria-pressed")) === "true" &&
        (await visible(page.getByText("Just added"))),
    );
    await page.getByRole("button", { name: "Use as my pick" }).click();
    await page.waitForURL(`${BASE}/challenges/${sprint}`);
    check(
      "E5: the added book becomes the pick (DB) and shows on the challenge",
      (await eventually(() => pickOf(sprint), "Hidden gem")) &&
        (await visible(
          pickBlock.getByText("Hidden gem", { exact: true }).first(),
        )),
    );

    // 10. Upcoming: picking allowed; ⋯ Delete with confirmation
    await page.goto(`${BASE}/challenges/${winter}`);
    check(
      "E4: an upcoming challenge can be picked for",
      (await addButtons.count()) === 4 &&
        (await visible(page.getByRole("link", { name: "Submit my own pick" }))),
    );
    const more = page.getByRole("button", {
      name: "More actions for this challenge",
    });
    await more.click();
    await page
      .getByRole("dialog", { name: "Winter warmers" })
      .getByRole("button", { name: "Delete" })
      .click();
    const confirm = page.getByRole("dialog", {
      name: "Delete this challenge?",
    });
    check(
      "⋯ Delete asks first, with focus on Keep it",
      (await visible(
        confirm.getByRole("button", { name: "Delete challenge" }),
      )) &&
        (await confirm
          .getByRole("button", { name: "Keep it" })
          .evaluate((el) => el === document.activeElement)),
    );
    await shot("challenges-07-delete", false);
    await confirm.getByRole("button", { name: "Keep it" }).click();
    check(
      "Keep it keeps the challenge",
      (await confirm.isHidden()) &&
        psql(
          `select count(*) from public.challenges where id = '${winter}'`,
        ) === "1",
    );
    await more.click();
    await page
      .getByRole("dialog", { name: "Winter warmers" })
      .getByRole("button", { name: "Delete" })
      .click();
    await confirm.getByRole("button", { name: "Delete challenge" }).click();
    await page.waitForURL(`${BASE}/challenges`);
    check(
      "Delete challenge deletes it (DB) and lands on the Challenges tab",
      (await eventually(
        () =>
          psql(`select count(*) from public.challenges where id = '${winter}'`),
        "0",
      )) && (await page.getByText("Winter warmers").count()) === 0,
    );

    // 11. Completed challenge: no Delete, no pick controls
    await page.goto(`${BASE}/challenges/${summer}`);
    check(
      "E4: a completed challenge has no Delete and no pick controls",
      (await visible(
        page.getByText(dated("Completed {d} · You read Candidate 7")),
      )) &&
        (await more.count()) === 0 &&
        (await addButtons.count()) === 0 &&
        (await page
          .getByRole("link", { name: "Submit my own pick" })
          .count()) === 0,
    );
    await shot("challenges-08-completed");
    await page.goto(`${BASE}/challenges/${summer}/pick`);
    check(
      "E5 on a completed challenge goes back to the challenge",
      page.url() === `${BASE}/challenges/${summer}`,
    );

    // 12. Not found: missed, invalid, someone else's
    const missedResponse = await page.goto(`${BASE}/challenges/${missed}`);
    check(
      "a missed challenge is gone (404)",
      missedResponse.status() === 404 &&
        (await visible(page.getByText("Challenge not found"))),
    );
    const invalid = await page.goto(`${BASE}/challenges/not-a-challenge`);
    check("an invalid id gives 404", invalid.status() === 404);

    const stranger = await createReader("nostamps");
    const other = await newPage();
    await logIn(other, stranger);
    const strangerResponse = await other.goto(`${BASE}/challenges/${noEnd}`);
    check(
      "a stranger gets 404 for someone else's challenge and its pick page",
      strangerResponse.status() === 404 &&
        (await visible(other.getByText("Challenge not found"))) &&
        (await other.goto(`${BASE}/challenges/${noEnd}/pick`)).status() === 404,
    );

    // 13. Empty states
    await other.goto(`${BASE}/challenges`);
    check(
      "E1 empty: No challenges yet with New challenge; counter says none yet",
      (await visible(other.getByText("No challenges yet"))) &&
        (await other
          .getByRole("link", { name: "New challenge" })
          .last()
          .getAttribute("href")) === "/challenges/new" &&
        (await visible(other.getByText("No challenges completed yet"))),
    );
    await other.screenshot({
      path: `${SHOTS}/challenges-09-empty-active.png`,
      fullPage: true,
    });
    await other.goto(`${BASE}/challenges/past`);
    check(
      "E3 empty: No completed challenges yet and the note",
      (await visible(other.getByText("No completed challenges yet"))) &&
        (await visible(
          other.getByText("Only completed challenges are listed here"),
        )),
    );
  } catch (error) {
    check("run without exceptions", false, error.message);
    await shot("challenges-error").catch(() => {});
  } finally {
    await browser.close();
    finish(errors);
  }
})();
