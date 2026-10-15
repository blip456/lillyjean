// End-to-end check that the book search adds to the page it was opened from (P45): a shelf list
// gives its status ("+ Reading", "+ Read" asks for the date), a readlist puts books straight in
// that readlist, and "Add it manually" follows along. Needs BOOKS_API=fixtures; see e2e/README.md.
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

const SEARCH_LABEL = "Search by title, author or ISBN";

(async () => {
  const { check, finish } = reporter();
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
  });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const shot = (name) =>
    page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
  const results = page.getByRole("list", { name: "Search results" });
  const row = (title) =>
    results.getByRole("listitem").filter({
      has: page.getByText(title, { exact: true }),
    });
  const pill = (title, status) =>
    row(title).locator('button[aria-haspopup="dialog"]', { hasText: status });

  const reader = await createReader("context");
  /** My status of a fixture book by title ("" when it is not on my shelf). */
  const statusOf = (title) =>
    psql(
      `select coalesce((select ub.status::text from public.user_books ub join public.books b on b.id = ub.book_id where ub.user_id = '${reader.id}' and b.title = '${title}' limit 1), '')`,
    );
  /** Waits until `read()` returns the expected value (server actions are asynchronous). */
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
  const search = async (text) => {
    await page.getByLabel(SEARCH_LABEL).fill(text);
    await page.getByText("3 results").waitFor();
  };

  try {
    await logIn(page, reader);

    // 1. Home → Currently reading is empty → "Add a book" adds as Reading.
    await page.getByRole("link", { name: "Add a book" }).click();
    await page.waitForURL(/\/books\/search\?add=reading$/);
    check(
      "Home's empty Currently reading opens the search for Reading",
      (await visible(page.getByText("Books you add go to Reading."))) &&
        (await page
          .getByRole("link", { name: "Back" })
          .getAttribute("href")) === "/books/shelf/reading",
    );
    await search("austen");
    check(
      "the quick add says + Reading",
      (await row("Emma").getByRole("button", { name: "+ Reading" }).count()) ===
        1 &&
        (await page.getByRole("button", { name: "+ Want to read" }).count()) ===
          0,
    );
    await shot("context-01-search-reading");
    await row("Emma").getByRole("button", { name: "+ Reading" }).click();
    check(
      "+ Reading puts Emma on Reading",
      (await eventually(() => statusOf("Emma"), "reading")) &&
        (await visible(pill("Emma", "Reading"))),
    );

    // 2. Want to read shelf (empty) → Find a book → + Want to read.
    await page.goto(`${BASE}/books/shelf/want-to-read`);
    await page.getByRole("link", { name: "Find a book" }).click();
    await page.waitForURL(/\/books\/search\?add=want-to-read$/);
    await search("austen");
    await row("Persuasion")
      .getByRole("button", { name: "+ Want to read" })
      .click();
    check(
      "from Want to read, the quick add puts Persuasion on Want to read",
      await eventually(() => statusOf("Persuasion"), "want_to_read"),
    );

    // 3. Read shelf (empty) → Find a book → + Read asks for the date first.
    await page.goto(`${BASE}/books/shelf/read`);
    await page.getByRole("link", { name: "Find a book" }).click();
    await page.waitForURL(/\/books\/search\?add=read$/);
    await search("austen");
    await row("Pride and Prejudice")
      .getByRole("button", { name: "+ Read" })
      .click();
    const sheet = page.getByRole("dialog", { name: "Mark as read" });
    check(
      "from Read, the quick add opens Mark as read with the date",
      (await visible(sheet)) &&
        (await sheet.getByLabel("Finished on").isVisible()),
    );
    await shot("context-02-search-read");
    await sheet.getByRole("button", { name: "Mark as read" }).click();
    check(
      "Pride and Prejudice is marked as read, with a read recorded",
      (await eventually(() => statusOf("Pride and Prejudice"), "read")) &&
        Number(
          psql(
            `select count(*) from public.reads r join public.books b on b.id = r.book_id where r.user_id = '${reader.id}' and b.title = 'Pride and Prejudice'`,
          ),
        ) === 1,
    );

    // 4. + → Mark as read with nothing being read → the search marks books as read too.
    psql(
      `delete from public.user_books where user_id = '${reader.id}' and status = 'reading'`,
    );
    await page.goto(`${BASE}/books/mark-as-read`);
    await page.getByRole("link", { name: "Search for a book" }).click();
    await page.waitForURL(/\/books\/search\?add=read$/);
    check(
      "Mark as read's search link opens the search for Read",
      await visible(page.getByText("Books you add go to Read.")),
    );

    // 5. A readlist → Add a book → Add puts books straight in the readlist.
    const listId = psql(
      `with r as (insert into public.readlists (owner_id, name) values ('${reader.id}', 'Holiday') returning id) select id from r`,
    );
    const inList = () =>
      Number(
        psql(
          `select count(*) from public.readlist_books where readlist_id = '${listId}'`,
        ),
      );
    await page.goto(`${BASE}/readlists/${listId}`);
    await page.getByRole("link", { name: "Add a book" }).click();
    await page.waitForURL(new RegExp(`/books/search\\?readlist=${listId}$`));
    check(
      "a readlist opens the search for that readlist, with back to it",
      (await visible(page.getByText("Books you add go to Holiday."))) &&
        (await page
          .getByRole("link", { name: "Back" })
          .getAttribute("href")) === `/readlists/${listId}`,
    );
    await search("austen");
    const add = row("Emma").getByRole("button", { name: /^\+?\s*Add/ });
    check(
      "every result offers Add, also books already on my shelf",
      (await results.getByRole("button", { name: /^\+?\s*Add/ }).count()) ===
        3 && (await add.getAttribute("aria-pressed")) === "false",
    );
    await add.click();
    const added = row("Emma").getByRole("button", { name: /Added/ });
    check(
      "Add puts Emma in the readlist and shows Added",
      (await eventually(inList, 1)) &&
        (await visible(added)) &&
        (await added.getAttribute("aria-pressed")) === "true",
    );
    await shot("context-03-search-readlist");
    await added.click();
    check(
      "tapping Added takes Emma out again",
      (await eventually(inList, 0)) &&
        (await visible(
          row("Emma").getByRole("button", { name: /^\+?\s*Add/ }),
        )),
    );
    await row("Emma")
      .getByRole("button", { name: /^\+?\s*Add/ })
      .click();
    await eventually(inList, 1);
    await page.reload();
    check(
      "after a refresh Emma still shows Added",
      await visible(row("Emma").getByRole("button", { name: /Added/ })),
    );

    // 6. "Add it manually" from the readlist: the new book goes in the readlist too.
    await page.getByRole("link", { name: "Add it manually" }).click();
    await page.waitForURL(/\/books\/new\?/);
    await page.getByLabel("Title").fill("A Summer by the Sea");
    await page.getByLabel("Author").fill("Ada Author");
    await page.getByRole("button", { name: "Add book" }).click();
    await page.waitForURL(new RegExp(`/readlists/${listId}`));
    check(
      "a manual book from the readlist search lands in the readlist",
      (await eventually(inList, 2)) &&
        (await visible(
          page
            .getByRole("list", { name: "Books in this readlist" })
            .getByRole("listitem")
            .filter({ hasText: "A Summer by the Sea" }),
        )),
    );

    // 7. "Add it manually" from a shelf list starts with that status; × goes back to it.
    await page.goto(`${BASE}/books/search?q=dune&add=reading`);
    await page.getByRole("link", { name: "Add it manually" }).click();
    await page.waitForURL(/\/books\/new\?/);
    check(
      "manual entry from the Reading search starts on Reading",
      (await page.getByRole("radio", { name: "Reading" }).isChecked()) &&
        (await page
          .getByRole("link", { name: "Close" })
          .getAttribute("href")) === "/books/search?q=dune&add=reading",
    );

    // 8. A plain search still adds as Want to read.
    await page.goto(`${BASE}/books/search`);
    check(
      "a plain search has no target line and goes back Home",
      (await page.getByText(/Books you add go to/).count()) === 0 &&
        (await page
          .getByRole("link", { name: "Back" })
          .getAttribute("href")) === "/",
    );
  } catch (error) {
    check("unexpected error", false, error.message.split("\n")[0]);
    await shot("context-error").catch(() => {});
  }

  check("no client-side errors", errors.length === 0, errors.join(" | "));
  await browser.close();
  finish();
})();
