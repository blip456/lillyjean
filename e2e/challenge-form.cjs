// End-to-end check of creating and editing a challenge (Sprint 5: E6 Create challenge, E8 Edit
// challenge before and after the start, "New challenge" in the + menu N2). Needs the app with a
// local Supabase and BOOKS_API=fixtures; see e2e/README.md. Prints PASS/FAIL per check.
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
const VIEWPORT = { width: 390, height: 844 };
const CHALLENGE_URL = /\/challenges\/([0-9a-f-]{36})$/;

const { check, finish } = reporter();
const errors = [];

const sql = (text) => text.replace(/\s+/g, " ").replace(/"/g, '\\"');

/** A manual book on the reader's shelf, straight in the database; returns its id. */
function seedBook(reader, title) {
  return psql(
    sql(`with b as (insert into public.books (source, title, authors, created_by, details_checked)
       values ('manual', '${title}', array['Ada Author'], '${reader.id}', true) returning id),
     u as (insert into public.user_books (user_id, book_id, status) select '${reader.id}', id, 'want_to_read' from b)
     select id from b`),
  );
}

/** A readlist with these books (in this order, newest last), made in the database. */
function seedReadlist(reader, name, bookIds) {
  const id = psql(
    sql(`with r as (insert into public.readlists (owner_id, name) values ('${reader.id}', '${name}') returning id)
       select id from r`),
  );
  bookIds.forEach((bookId, index) =>
    psql(
      sql(`insert into public.readlist_books (readlist_id, book_id, added_by, added_at)
         values ('${id}', '${bookId}', '${reader.id}', now() - interval '${10 - index} minutes')`),
    ),
  );
  return id;
}

/** YYYY-MM-DD, `days` from today in Brussels (the app's "today"). */
function day(days = 0) {
  return psql(
    `select ((now() at time zone 'Europe/Brussels')::date + ${days})::text`,
  );
}

const bookId = (title) =>
  psql(
    sql(
      `select id from public.books where title = '${title}' order by created_at limit 1`,
    ),
  );

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
  });
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  const shot = (name, fullPage = true) =>
    page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage });
  const nav = page.getByRole("navigation", { name: "Main" });

  try {
    const reader = await createReader("chall", { pledge: 12 });
    const [hamlet, iliad, ulysses] = ["Hamlet", "The Iliad", "Ulysses"].map(
      (title) => seedBook(reader, title),
    );
    await logIn(page, reader);

    // 1. + menu (N2): New challenge between Mark as read and New readlist
    await nav.getByRole("button", { name: "Create", exact: true }).click();
    const menu = page.getByRole("dialog", { name: "Create" });
    const menuLinks = await menu
      .getByRole("link")
      .evaluateAll((links) =>
        links.map((link) => [
          link.querySelector(".font-semibold")?.textContent,
          link.getAttribute("href"),
        ]),
      );
    check(
      "N2: + menu lists Add book · Mark as read · New challenge · New readlist",
      JSON.stringify(menuLinks.map(([name]) => name)) ===
        JSON.stringify([
          "Add book",
          "Mark as read",
          "New challenge",
          "New readlist",
        ]) &&
        menuLinks[2][1] === "/challenges/new" &&
        (await visible(menu.getByText("Read one book that fits a theme"))),
      JSON.stringify(menuLinks),
    );
    await shot("80-create-menu-new-challenge", false);
    await menu.getByRole("link", { name: /^New challenge/ }).click();
    await page.waitForURL(`${BASE}/challenges/new`);

    // 2. E6 empty form
    const create = page.getByRole("button", { name: "Create challenge" });
    const counter = page.getByText(/^\d+ \/ 5$/).first();
    check(
      "E6: title, fields with visible labels, today as start date, no placeholders",
      (await visible(page.getByRole("heading", { name: "New challenge" }))) &&
        (await page.getByLabel("Title").inputValue()) === "" &&
        (await visible(
          page.getByText("What a book needs to fit this challenge"),
        )) &&
        (await page.getByLabel("Start date").inputValue()) === day(0) &&
        (await page.getByLabel("End date").inputValue()) === "" &&
        (await page.locator("[placeholder]").count()) === 0,
    );
    check(
      "E6: the tab bar is hidden in the form",
      (await nav.count()) === 0 || !(await nav.isVisible()),
    );
    check(
      "E6: 0 / 5 and Create disabled without books",
      (await counter.textContent()) === "0 / 5" &&
        (await create.isDisabled()) &&
        (await visible(
          page.getByText("Add at least 5 books that fit the theme"),
        )),
    );
    await shot("81-new-challenge-empty");

    // × goes back to where the form was opened from (Home)
    await page.getByRole("link", { name: "Close" }).click();
    await page.waitForURL(`${BASE}/`);
    check("× goes back to Home", page.url() === `${BASE}/`);
    await page.goto(`${BASE}/challenges/new`);

    // 3. + Add books: the search sheet
    await page.getByRole("button", { name: "+ Add books" }).click();
    const search = page.getByRole("dialog", { name: "Add books" });
    await search.getByLabel("Search books").fill("austen");
    const result = (title) =>
      search.getByRole("button", { name: new RegExp(`^${title}`) });
    await result("Emma").waitFor({ timeout: 15000 });
    for (const title of ["Emma", "Persuasion", "Pride and Prejudice"])
      await result(title).click();
    check(
      "search: tapped results show as added, the sheet counts 3 / 5",
      (await result("Emma").getAttribute("aria-pressed")) === "true" &&
        (await result("Persuasion").getAttribute("aria-pressed")) === "true" &&
        (await visible(search.getByText("3 / 5"))),
    );
    await result("Persuasion").click();
    const persuasionOff =
      (await result("Persuasion").getAttribute("aria-pressed")) === "false" &&
      (await visible(search.getByText("2 / 5")));
    await result("Persuasion").click();
    check("search: a second tap takes a book off again", persuasionOff);
    await shot("82-add-books-sheet", false);
    await search.getByRole("button", { name: "Done" }).click();
    const candidates = page.getByRole("list", { name: "Candidate books" });
    check(
      "the chosen books are listed, Create still disabled under 5",
      (await candidates.getByRole("listitem").count()) === 3 &&
        (await counter.textContent()) === "3 / 5" &&
        (await create.isDisabled()),
    );

    // 4. Import from a readlist: all its books in one go, duplicates skipped
    seedReadlist(reader, "Summer list", [
      hamlet,
      iliad,
      ulysses,
      bookId("Emma"),
    ]);
    seedReadlist(reader, "Empty list", []);
    await page.getByRole("button", { name: "Import from a readlist" }).click();
    const importSheet = page.getByRole("dialog", {
      name: "Import from a readlist",
    });
    const summer = importSheet.getByRole("button", { name: /^Summer list/ });
    await summer.waitFor();
    check(
      "import: lists my readlists with their counts; an empty one cannot be chosen",
      (await visible(importSheet.getByText("4 books"))) &&
        (await importSheet
          .getByRole("button", { name: /^Empty list/ })
          .isDisabled()),
    );
    await shot("83-import-readlist-sheet", false);
    await summer.click();
    await importSheet.waitFor({ state: "hidden" });
    check(
      "import: 3 new books added, the duplicate skipped (6 / 5)",
      (await candidates.getByRole("listitem").count()) === 6 &&
        (await counter.textContent()) === "6 / 5" &&
        (await page
          .getByRole("status")
          .filter({ hasText: "3 books added from Summer list" })
          .filter({ hasText: "1 was already on the list" })
          .count()) === 1,
    );

    // 5. Remove a book
    await page.getByRole("button", { name: "Remove Ulysses" }).click();
    check(
      "× removes a book (5 / 5) and Create is enabled",
      (await candidates.getByText("Ulysses").count()) === 0 &&
        (await counter.textContent()) === "5 / 5" &&
        (await create.isEnabled()),
    );

    // 6. Server errors for empty fields; the candidates stay
    await page.getByLabel("Start date").fill("");
    await create.click();
    check(
      "empty title and start date show field errors",
      (await visible(page.getByText("Give your challenge a title."))) &&
        (await visible(page.getByText("Choose a start date."))) &&
        page.url() === `${BASE}/challenges/new` &&
        (await candidates.getByRole("listitem").count()) === 5,
    );
    await shot("84-new-challenge-errors");
    await page.getByLabel("Title").fill("Austen and friends");
    await page.getByLabel("Start date").fill(day(0));
    await page.getByLabel("End date").fill(day(-1));
    await create.click();
    check(
      "an end date before the start shows an error",
      await visible(
        page.getByText("The end date can't be before the start date."),
      ),
    );

    // 7. Create → the new challenge
    await page.getByLabel("Theme").fill("Classics written before 1900");
    await page.getByLabel("End date").fill(day(30));
    await shot("85-new-challenge-filled");
    await create.click();
    await page.waitForURL(CHALLENGE_URL, { timeout: 15000 });
    const id = page.url().match(CHALLENGE_URL)[1];
    const row = psql(
      `select title || '|' || theme || '|' || starts_on || '|' || ends_on || '|' || owner_id from public.challenges where id = '${id}'`,
    );
    const candidateTitles = psql(
      `select string_agg(b.title, ',' order by b.title) from public.challenge_candidates c join public.books b on b.id = c.book_id where c.challenge_id = '${id}'`,
    );
    check(
      "Create lands on /challenges/<id> with the challenge, 5 candidates and me as member",
      row ===
        `Austen and friends|Classics written before 1900|${day(0)}|${day(30)}|${reader.id}` &&
        candidateTitles ===
          "Emma,Hamlet,Persuasion,Pride and Prejudice,The Iliad" &&
        psql(
          `select count(*) from public.challenge_members where challenge_id = '${id}' and user_id = '${reader.id}'`,
        ) === "1",
      `${row} / ${candidateTitles}`,
    );

    // 8. E8 before the start: the E6 form, prefilled
    psql(
      `update public.challenges set starts_on = '${day(10)}', ends_on = '${day(40)}' where id = '${id}'`,
    );
    await page.goto(`${BASE}/challenges/${id}/edit`);
    const save = page.getByRole("button", { name: "Save changes" });
    check(
      "E8 before the start: prefilled, everything editable, Save changes",
      (await visible(page.getByRole("heading", { name: "Edit challenge" }))) &&
        (await page.getByLabel("Title").inputValue()) ===
          "Austen and friends" &&
        (await page.getByLabel("Theme").inputValue()) ===
          "Classics written before 1900" &&
        (await page.getByLabel("Start date").inputValue()) === day(10) &&
        (await page.getByText("Locked").count()) === 0 &&
        (await candidates.getByRole("listitem").count()) === 5 &&
        (await save.isEnabled()),
    );
    await shot("86-edit-before-start");
    await page.getByLabel("Title").fill("Austen and her friends");
    await save.click();
    await page.waitForURL(`${BASE}/challenges/${id}`, { timeout: 15000 });
    check(
      "a title change before the start is saved",
      psql(`select title from public.challenges where id = '${id}'`) ===
        "Austen and her friends",
    );

    // 9. E8 after the start: title and theme locked, dates and candidates editable
    const emma = bookId("Emma");
    psql(
      `update public.challenges set starts_on = '${day(-5)}', ends_on = '${day(40)}' where id = '${id}'`,
    );
    psql(
      `update public.challenge_members set book_id = '${emma}', picked_at = now() where challenge_id = '${id}'`,
    );
    await page.goto(`${BASE}/challenges/${id}/edit`);
    check(
      "E8 after the start: note, title and theme shown as Locked",
      (await visible(
        page.getByText(
          "This challenge has started. You can change the dates and the candidate books.",
        ),
      )) &&
        (await page.getByText("Locked", { exact: true }).count()) === 2 &&
        (await page.getByRole("textbox", { name: "Title" }).count()) === 0 &&
        (await page.getByRole("textbox", { name: "Theme" }).count()) === 0 &&
        (await visible(page.getByText("Austen and her friends"))) &&
        (await visible(
          page.getByText(
            "Removed books stay valid for people who already picked them.",
          ),
        )),
    );
    await page.getByRole("button", { name: "Remove Emma" }).click();
    const undo = page.getByRole("button", { name: "Undo removing Emma" });
    check(
      "removing my pick shows Removed · stays your pick with Undo; 4 / 5 disables Save",
      (await visible(page.getByText("Removed · stays your pick"))) &&
        (await visible(undo)) &&
        (await counter.textContent()) === "4 / 5" &&
        (await save.isDisabled()),
    );
    await shot("87-edit-after-start-removed-pick");
    await undo.click();
    check(
      "Undo puts my pick back",
      (await page.getByText("Removed · stays your pick").count()) === 0 &&
        (await counter.textContent()) === "5 / 5",
    );
    await page.getByRole("button", { name: "Remove Emma" }).click();
    await page.getByRole("button", { name: "+ Add books" }).click();
    await search.getByLabel("Search books").fill("middlemarch");
    await result("Middlemarch").click();
    await search.getByRole("button", { name: "Done" }).click();
    await page.getByLabel("End date").fill(day(60));
    check(
      "after adding Middlemarch the list has 5 again",
      (await counter.textContent()) === "5 / 5" && (await save.isEnabled()),
    );
    await shot("88-edit-after-start");
    await save.click();
    await page.waitForURL(`${BASE}/challenges/${id}`, { timeout: 15000 });
    const afterTitles = psql(
      `select string_agg(b.title, ',' order by b.title) from public.challenge_candidates c join public.books b on b.id = c.book_id where c.challenge_id = '${id}'`,
    );
    check(
      "after the start: end date and candidates saved, title unchanged, removed pick stays my pick",
      psql(
        `select title || '|' || ends_on from public.challenges where id = '${id}'`,
      ) === `Austen and her friends|${day(60)}` &&
        afterTitles ===
          "Hamlet,Middlemarch,Persuasion,Pride and Prejudice,The Iliad" &&
        psql(
          `select book_id from public.challenge_members where challenge_id = '${id}'`,
        ) === emma,
      afterTitles,
    );

    // 10. Minimum of 5 on edit
    await page.goto(`${BASE}/challenges/${id}/edit`);
    await page.getByRole("button", { name: "Remove Hamlet" }).click();
    check(
      "edit: Save is disabled under 5 candidates",
      (await counter.textContent()) === "4 / 5" && (await save.isDisabled()),
    );

    // 11. Someone else, or an unknown id → 404
    const strangerContext = await browser.newContext({ viewport: VIEWPORT });
    const strangerPage = await strangerContext.newPage();
    strangerPage.on("pageerror", (error) => errors.push(error.message));
    await logIn(strangerPage, await createReader("stranger"));
    for (const path of [
      `/challenges/${id}/edit`,
      "/challenges/not-a-challenge/edit",
      "/challenges/00000000-0000-4000-8000-000000000000/edit",
    ]) {
      const response = await strangerPage.goto(`${BASE}${path}`);
      check(
        `${path.replace(id, "<someone else's>")} is not found`,
        response.status() === 404 &&
          (await visible(
            strangerPage.getByRole("heading", { name: "Challenge not found" }),
          )) &&
          (await strangerPage.getByText("Austen and her friends").count()) ===
            0,
        String(response.status()),
      );
    }
    await strangerPage.screenshot({
      path: `${SHOTS}/89-challenge-edit-not-found.png`,
      fullPage: true,
    });
    await strangerContext.close();
  } catch (error) {
    check("unexpected error", false, error.message.split("\n")[0]);
    await shot("zz-challenge-form-error").catch(() => {});
  }

  check("no client-side errors", errors.length === 0, errors.join(" | "));
  await browser.close();
  finish();
})();
