// End-to-end check of challenges in the rest of the app (Sprint 5): the challenge indicator on
// search results and Home (P25), "Fits your challenges" on the book page (D2) with Add this book
// and the replace confirmation, the "This completes n challenges" preview in Mark as read (D4),
// the completion celebration (E7) from every Read path (book page, swipe on Home, + menu picker,
// a pick of a book already read, P51), one read completing two challenges (P10), Undo taking the
// completion back, the Home section and counter (B1) and the profile count (G1).
// Needs BOOKS_API=fixtures; see e2e/README.md. Prints PASS/FAIL per check.
const { execFileSync } = require("node:child_process");

const { chromium } = require(process.env.PW ?? "playwright");

const {
  BASE,
  createReader,
  logIn,
  reporter,
  visible,
} = require("./helpers.cjs");

const SHOTS = process.env.SHOTS ?? "e2e/screenshots";
require("node:fs").mkdirSync(SHOTS, { recursive: true });

/** psql as postgres without a shell, so the SQL can hold any quote. */
const sql = (query) =>
  execFileSync("docker", [
    "exec",
    "supabase_db_lillyjean",
    "psql",
    "-U",
    "postgres",
    "-qtAc",
    query,
  ])
    .toString()
    .trim();

/** A manual book, on the reader's shelf with `status` (or not on it); returns its id. */
function seedBook(reader, title, status) {
  const id = sql(
    `insert into public.books (source, title, authors, created_by, details_checked)
     values ('manual', '${title}', array['Ada Author'], '${reader.id}', true) returning id`,
  );
  if (status)
    sql(
      `insert into public.user_books (user_id, book_id, status) values ('${reader.id}', '${id}', '${status}')`,
    );
  return id;
}

/** A fixture book (BOOKS_API=fixtures) by its Open Library id; the search stores it. */
const fixtureBook = (sourceId) =>
  sql(
    `select id from public.books where source = 'openlibrary' and source_id = '${sourceId}'`,
  );

/** A personal challenge of the reader, as the database function would make it. */
function seedChallenge(reader, title, { start, end, candidates, pick }) {
  const endsOn = end === null ? "null" : `current_date + ${end}`;
  const pickId = pick ? `'${pick}'::uuid` : "null::uuid";
  return sql(
    `with c as (insert into public.challenges (owner_id, title, starts_on, ends_on)
       values ('${reader.id}', '${title}', current_date + ${start}, ${endsOn}) returning id),
     cc as (insert into public.challenge_candidates (challenge_id, book_id)
       select c.id, unnest(array['${candidates.join("','")}']::uuid[]) from c),
     m as (insert into public.challenge_members (challenge_id, user_id, book_id, picked_at)
       select c.id, '${reader.id}', ${pickId}, now() from c)
     select id from c`,
  );
}

const completed = (challengeId) =>
  sql(
    `select coalesce((select (completed_on is not null)::text from public.challenge_progress where challenge_id = '${challengeId}'), 'none')`,
  );
const pickOf = (challengeId) =>
  sql(
    `select coalesce(book_id::text, 'none') from public.challenge_members where challenge_id = '${challengeId}'`,
  );

/** Local YYYY-MM-DD, `days` ago (the date field uses the browser's calendar). */
function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Waits until the database shows the expected value (server actions are asynchronous). */
async function eventually(read, expected, timeout = 8000) {
  const end = Date.now() + timeout;
  let value;
  while (Date.now() < end) {
    value = read();
    if (value === expected) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log(`  expected ${expected}, got ${value}`);
  return false;
}

/** Drags a row to the left with the mouse, far enough to apply the next status (B4). */
async function longSwipe(page, row) {
  const box = await row.boundingBox();
  const x = box.x + box.width - 24;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 20; i++) {
    await page.mouse.move(x - (320 * i) / 20, y);
    await page.waitForTimeout(16);
  }
  await page.waitForTimeout(60);
  await page.mouse.up();
  await page.waitForTimeout(300);
}

(async () => {
  const { check, finish } = reporter();
  const errors = [];
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
  });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  const shot = (name, fullPage = true) =>
    page.screenshot({ path: `${SHOTS}/challenge-${name}.png`, fullPage });

  const run = Date.now().toString(36);
  const reader = await createReader("chint");
  const fresh = await createReader("chnone");

  const celebration = page.getByRole("dialog", {
    name: "Challenge completed!",
  });
  const markSheet = page.getByRole("dialog", { name: "Mark as read" });
  const snackbar = (text) => page.getByRole("status").filter({ hasText: text });
  const statusButton = (name) =>
    page
      .getByRole("group", { name: "My status" })
      .getByRole("button", { name, exact: true });
  const fits = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Fits your challenges" }),
  });
  const fitsCard = (title) =>
    fits.getByRole("listitem").filter({ hasText: title });

  try {
    // The fixture books are stored by a first search.
    await logIn(page, reader);
    await page.goto(`${BASE}/books/search?q=austen`);
    await page.getByText("3 results").waitFor();
    const emma = fixtureBook("OL900002W");
    const persuasion = fixtureBook("OL900003W");

    const titles = {
      m: [1, 2, 3, 4, 5, 6].map((n) => `Filler ${n} ${run}`),
      r1: `Night Reading ${run}`,
      r2: `Picker Reading ${run}`,
    };
    const m = titles.m.map((title, i) =>
      seedBook(reader, title, i === 5 ? "read" : null),
    );
    // Filler 6 was read two days ago: picking it completes a challenge at once (P51).
    sql(
      `insert into public.reads (user_id, book_id, finished_on) values ('${reader.id}', '${m[5]}', current_date - 2)`,
    );
    const r1 = seedBook(reader, titles.r1, "reading");
    const r2 = seedBook(reader, titles.r2, "reading");

    const names = {
      c1: `Autumn Classics ${run}`,
      c2: `Night Owls ${run}`,
      c3: `Short Reads ${run}`,
      c4: `Open Pick ${run}`,
      c5: `Swap Test ${run}`,
      c6: `Already Read ${run}`,
      c7: `Picker Path ${run}`,
      c8: `Coming Soon ${run}`,
    };
    const fillers = m.slice(0, 4);
    const c = {
      c1: seedChallenge(reader, names.c1, {
        start: -10,
        end: 20,
        candidates: [emma, persuasion, ...m.slice(0, 3)],
        pick: persuasion,
      }),
      c2: seedChallenge(reader, names.c2, {
        start: -10,
        end: null,
        candidates: [emma, ...fillers],
        pick: r1,
      }),
      c3: seedChallenge(reader, names.c3, {
        start: -5,
        end: 30,
        candidates: m.slice(0, 5),
        pick: r1,
      }),
      c4: seedChallenge(reader, names.c4, {
        start: -3,
        end: null,
        candidates: [emma, ...fillers],
        pick: null,
      }),
      c5: seedChallenge(reader, names.c5, {
        start: -3,
        end: 40,
        candidates: [emma, ...fillers],
        pick: m[4],
      }),
      c6: seedChallenge(reader, names.c6, {
        start: -10,
        end: null,
        candidates: [m[5], ...fillers],
        pick: null,
      }),
      c7: seedChallenge(reader, names.c7, {
        start: -10,
        end: null,
        candidates: [r2, ...fillers],
        pick: r2,
      }),
      c8: seedChallenge(reader, names.c8, {
        start: 5,
        end: 40,
        candidates: m.slice(0, 5),
        pick: null,
      }),
    };

    // 1. Home (B1): counter, indicator, Ongoing challenges.
    await page.goto(`${BASE}/`);
    const reading = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Currently reading" }),
    });
    const ongoing = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Ongoing challenges" }),
    });
    check(
      "B1: the stats strip shows 0 challenges completed",
      await visible(page.getByText("0 challenges completed", { exact: true })),
    );
    check(
      "B1: Currently reading shows 'Part of 2 challenges' on the book picked twice",
      (await visible(
        reading
          .getByRole("listitem")
          .filter({ hasText: titles.r1 })
          .getByText("Part of 2 challenges"),
      )) &&
        (await visible(
          reading
            .getByRole("listitem")
            .filter({ hasText: titles.r2 })
            .getByText("Part of 1 challenge", { exact: true }),
        )),
    );
    const allLink = ongoing.getByRole("link", { name: "All challenges (8)" });
    check(
      "B1: Ongoing challenges shows 3 cards (running, ending soonest first) and All (8) → /challenges",
      (await visible(allLink)) &&
        (await allLink.getAttribute("href")) === "/challenges" &&
        (await allLink.textContent()) === "All (8)" &&
        (await ongoing.getByRole("listitem").count()) === 3 &&
        (await ongoing.getByRole("listitem").first().textContent()).includes(
          names.c1,
        ),
    );
    const y = async (name) =>
      (await page.getByRole("heading", { name, exact: true }).boundingBox()).y;
    check(
      "B1: order is stats → currently reading → ongoing challenges → readlists (P23)",
      (await y("This year")) < (await y("Currently reading")) &&
        (await y("Currently reading")) < (await y("Ongoing challenges")) &&
        (await y("Ongoing challenges")) < (await y("Your readlists")),
    );
    await shot("01-home");

    // 2. Search results (D1).
    await page.goto(`${BASE}/books/search?q=austen`);
    const results = page.getByRole("list", { name: "Search results" });
    const result = (title) =>
      results.getByRole("listitem").filter({
        has: page.getByText(title, { exact: true }),
      });
    await result("Emma").waitFor();
    check(
      "D1: my pick says 'Part of 1 challenge'",
      await visible(
        result("Persuasion").getByText("Part of 1 challenge", { exact: true }),
      ),
    );
    check(
      "D1: a candidate says 'Candidate in 4 challenges'",
      await visible(result("Emma").getByText("Candidate in 4 challenges")),
    );
    check(
      "D1: a book in no challenge has no indicator",
      (await result("Pride and Prejudice")
        .locator("[data-challenge-indicator]")
        .count()) === 0,
    );
    await shot("02-search");

    // 3. Book page (D2): Fits your challenges, Add this book, replace confirmation.
    await page.goto(`${BASE}/books/${emma}`);
    check(
      "D2: 'Candidate in 4 challenges' under the author",
      await visible(page.getByText("Candidate in 4 challenges")),
    );
    check(
      "D2: Fits your challenges lists the 4 open challenges with kind and timing",
      (await fits.getByRole("listitem").count()) === 4 &&
        (await visible(fitsCard(names.c1).getByText("Ends in 20 days"))) &&
        (await visible(fitsCard(names.c1).getByText("Personal"))) &&
        (await visible(
          fitsCard(names.c1).getByText("Your pick: Persuasion"),
        )) &&
        (await visible(fitsCard(names.c4).getByText("No book picked yet"))) &&
        (await fitsCard(names.c1)
          .getByRole("link", { name: names.c1 })
          .getAttribute("href")) === `/challenges/${c.c1}`,
    );
    await shot("03-book-fits");
    await fitsCard(names.c4)
      .getByRole("button", { name: `Add this book to ${names.c4}` })
      .click();
    check(
      "D2: Add this book makes it my pick (DB) and says so",
      (await eventually(() => pickOf(c.c4), emma)) &&
        (await visible(snackbar("Emma is your pick now"))) &&
        (await visible(
          fitsCard(names.c4).getByText("Your pick", { exact: true }),
        )),
    );
    check(
      "D2: the indicator now says 'Part of 1 challenge'",
      await visible(page.getByText("Part of 1 challenge", { exact: true })),
    );
    const replaceButton = fitsCard(names.c5).getByRole("button", {
      name: `Add this book to ${names.c5}`,
    });
    await replaceButton.click();
    const confirm = page.getByRole("dialog", {
      name: `Replace your pick (${titles.m[4]})?`,
    });
    check(
      "D2: replacing another pick asks first",
      (await visible(confirm)) &&
        (await visible(
          confirm.getByText(`Emma becomes your pick for ${names.c5}.`),
        )),
    );
    await shot("04-replace-confirm", false);
    await confirm.getByRole("button", { name: "Cancel" }).click();
    check(
      "D2: Cancel keeps the old pick and returns focus",
      pickOf(c.c5) === m[4] &&
        (await replaceButton.evaluate((b) => b === document.activeElement)),
    );
    await replaceButton.click();
    await confirm.getByRole("button", { name: "Replace" }).click();
    check(
      "D2: Replace makes this book the pick (DB)",
      await eventually(() => pickOf(c.c5), emma),
    );

    // 4. Picking a book already read inside the window completes at once (P51).
    await page.goto(`${BASE}/books/${m[5]}`);
    await fitsCard(names.c6)
      .getByRole("button", { name: `Add this book to ${names.c6}` })
      .click();
    check(
      "P51: picking a book already read shows the celebration",
      (await visible(celebration)) &&
        (await visible(celebration.getByText(names.c6))) &&
        (await visible(celebration.getByText(`You read ${titles.m[5]}`))) &&
        (await visible(
          celebration.getByText("1 challenge completed", { exact: true }),
        )) &&
        (await eventually(() => completed(c.c6), "true")),
    );
    await celebration.getByRole("button", { name: "Done" }).click();

    // 5. Mark as read from the book page (D2 → D4 → E7), preview, focus, Undo, Escape.
    await page.goto(`${BASE}/books/${persuasion}`);
    check(
      "D2: my pick shows 'Part of 1 challenge' and 'Your pick'",
      (await visible(page.getByText("Part of 1 challenge", { exact: true }))) &&
        (await visible(
          fitsCard(names.c1).getByText("Your pick", { exact: true }),
        )),
    );
    await statusButton("Read").click();
    await markSheet.waitFor();
    const preview = markSheet.getByText("This completes 1 challenge");
    check(
      "D4: the preview names the challenge this read completes",
      (await visible(preview)) &&
        (await visible(
          markSheet.getByRole("listitem").filter({ hasText: names.c1 }),
        )),
    );
    await shot("05-mark-preview", false);
    const dateField = markSheet.getByLabel("Finished on");
    await dateField.fill(daysAgo(12));
    check(
      "D4: a date before the challenge start hides the preview",
      await preview.waitFor({ state: "detached", timeout: 5000 }).then(
        () => true,
        () => false,
      ),
    );
    await dateField.fill(daysAgo(0));
    check(
      "D4: back inside the window, the preview returns",
      await visible(preview),
    );
    await markSheet.getByRole("button", { name: "Mark as read" }).click();
    check(
      "E7: the celebration shows the stamp, title, book and the new count",
      (await visible(celebration)) &&
        (await visible(
          celebration.getByRole("heading", { name: "Challenge completed!" }),
        )) &&
        (await visible(celebration.getByText(names.c1))) &&
        (await visible(celebration.getByText("You read Persuasion"))) &&
        (await visible(
          celebration.getByText("2 challenges completed", { exact: true }),
        )) &&
        (await celebration.getByText("This book also completed").count()) === 0,
    );
    check(
      "E7: no share button (P33); Find a new challenge → /challenges/new",
      (await celebration.getByRole("button", { name: /share/i }).count()) ===
        0 &&
        (await celebration
          .getByRole("link", { name: "Find a new challenge" })
          .getAttribute("href")) === "/challenges/new",
    );
    check(
      "E7: focus starts on Done",
      await celebration
        .getByRole("button", { name: "Done" })
        .evaluate((b) => b === document.activeElement),
    );
    check(
      "E7: covers the tab bar (full screen)",
      await celebration.evaluate((d) => {
        const box = d.getBoundingClientRect();
        return box.top <= 0 && box.bottom >= window.innerHeight;
      }),
    );
    await shot("06-celebration", false);
    await celebration.getByRole("button", { name: "Done" }).click();
    check(
      "E7: Done closes and focus returns to where it was (Read)",
      (await celebration.count()) === 0 &&
        (await statusButton("Read").evaluate(
          (b) => b === document.activeElement,
        )),
    );
    check(
      "the read completed the challenge (DB)",
      await eventually(() => completed(c.c1), "true"),
    );
    await page.getByRole("button", { name: "Undo" }).click();
    check(
      "Undo after marking takes the completion back (DB)",
      await eventually(() => completed(c.c1), "false"),
    );
    await page.waitForTimeout(500);
    await statusButton("Read").click();
    await markSheet.waitFor();
    await markSheet.getByRole("button", { name: "Mark as read" }).click();
    await celebration.waitFor();
    await page.keyboard.press("Escape");
    check(
      "E7: Escape closes it as well",
      (await celebration.waitFor({ state: "detached", timeout: 3000 }).then(
        () => true,
        () => false,
      )) && (await eventually(() => completed(c.c1), "true")),
    );

    // 6. Swipe to Read on Home: one read completes two challenges (P10).
    await page.goto(`${BASE}/`);
    const r1Row = reading.getByRole("listitem").filter({ hasText: titles.r1 });
    await r1Row.waitFor();
    await longSwipe(page, r1Row);
    await markSheet.waitFor();
    check(
      "D4 from a swipe: 'This completes 2 challenges' with both titles",
      (await visible(markSheet.getByText("This completes 2 challenges"))) &&
        (await visible(markSheet.getByText(names.c2))) &&
        (await visible(markSheet.getByText(names.c3))),
    );
    await markSheet.getByRole("button", { name: "Mark as read" }).click();
    check(
      "E7 after a swipe: one read, two challenges (P10)",
      (await visible(celebration)) &&
        (await visible(
          celebration.getByText("This book also completed 1 other challenge"),
        )) &&
        (await visible(celebration.getByText(names.c2))) &&
        (await visible(celebration.getByText(names.c3))) &&
        (await visible(celebration.getByText(`You read ${titles.r1}`))) &&
        (await visible(
          celebration.getByText("4 challenges completed", { exact: true }),
        )),
    );
    await shot("07-celebration-two", false);
    check(
      "both challenges are completed (DB)",
      (await eventually(() => completed(c.c2), "true")) &&
        (await eventually(() => completed(c.c3), "true")),
    );
    await celebration.getByRole("button", { name: "Done" }).click();
    check(
      "Done after the row left the list: focus goes to the page title",
      (await celebration.count()) === 0 &&
        (await page.evaluate(() => document.activeElement?.tagName === "H1")),
    );

    // 7. + menu → Mark as read picker → D4 → Home with the celebration.
    const nav = page.getByRole("navigation", { name: "Main" });
    await nav.getByRole("button", { name: "Create", exact: true }).click();
    await page
      .getByRole("dialog", { name: "Create" })
      .getByRole("link", { name: /^Mark as read/ })
      .click();
    await page.waitForURL(/\/books\/mark-as-read/);
    await page
      .getByRole("region", { name: "Books you are reading" })
      .getByRole("button", { name: new RegExp(titles.r2) })
      .click();
    await markSheet.waitFor();
    await visible(markSheet.getByText("This completes 1 challenge"));
    await markSheet.getByRole("button", { name: "Mark as read" }).click();
    await page.waitForURL(`${BASE}/`);
    check(
      "+ menu picker: back on Home with the celebration",
      (await visible(celebration)) &&
        (await visible(celebration.getByText(names.c7))) &&
        (await visible(
          celebration.getByText("5 challenges completed", { exact: true }),
        )),
    );
    await celebration.getByRole("button", { name: "Done" }).click();
    check(
      "B1: the counter and the section follow (5 completed, 3 ongoing)",
      (await visible(
        page.getByText("5 challenges completed", { exact: true }),
      )) &&
        (await ongoing
          .getByRole("link", { name: "All challenges (3)" })
          .count()) === 1,
    );
    await shot("08-home-after");

    // 8. Profile (G1).
    await page.goto(`${BASE}/profile`);
    const card = page.getByRole("region", { name: "Library card" });
    check(
      "G1: the library card counts 5 challenges",
      await visible(card.getByText("5 challenges", { exact: true })),
    );
    check(
      "G1: a stamp per completed challenge and Past challenges → /challenges/past",
      (await page.getByRole("link", { name: /, completed$/ }).count()) === 5 &&
        (await page
          .getByRole("link", { name: "Past challenges" })
          .getAttribute("href")) === "/challenges/past",
    );
    await shot("09-profile");

    // 9. A reader without challenges: empty states.
    await ctx.clearCookies();
    await logIn(page, fresh);
    check(
      "B1 empty: No challenges yet with New challenge → /challenges/new, 0 completed",
      (await visible(ongoing.getByText("No challenges yet"))) &&
        (await ongoing
          .getByRole("link", { name: "New challenge" })
          .getAttribute("href")) === "/challenges/new" &&
        (await visible(
          page.getByText("0 challenges completed", { exact: true }),
        )),
    );
    await shot("10-home-empty");
    await page.goto(`${BASE}/profile`);
    check(
      "G1 empty: 0 challenges and the stamps hint",
      (await visible(card.getByText("0 challenges", { exact: true }))) &&
        (await visible(
          page.getByText("Every challenge you complete gets a stamp here."),
        )),
    );
  } catch (error) {
    check("run finished without an exception", false, error.message);
    await shot("99-failure").catch(() => {});
  } finally {
    await browser.close();
    finish(errors);
  }
})();
