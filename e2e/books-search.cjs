// End-to-end check of book search (D1), the book page (D2) and adding a book manually (D3).
// Needs BOOKS_API=fixtures in .env.local (see e2e/README.md).
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

const SEARCH_LABEL = "Search by title, author or ISBN";
const LONG_DESCRIPTION =
  "A quiet novel about a librarian who keeps a list of every book returned late. " +
  "Each chapter follows one of the borrowers and the reason the book stayed with them. " +
  "Slowly the list turns into a map of the town: who moved away, who fell in love, who " +
  "finally finished the book they had been carrying around for years. ".repeat(
    2,
  );

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
  const shot = (name, fullPage = true) =>
    page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage });
  const results = page.getByRole("list", { name: "Search results" });
  const row = (title) =>
    results.getByRole("listitem").filter({
      has: page.getByText(title, { exact: true }),
    });
  const statusButton = (name) =>
    page.getByRole("group", { name: "My status" }).getByRole("button", {
      name,
      exact: true,
    });
  const pressed = async (name) =>
    (await statusButton(name).getAttribute("aria-pressed")) === "true";
  const waitPressed = (name) =>
    page
      .waitForFunction(
        (label) =>
          [...document.querySelectorAll('[role="group"] button')].some(
            (b) =>
              b.textContent.trim() === label &&
              b.getAttribute("aria-pressed") === "true",
          ),
        name,
        { timeout: 8000 },
      )
      .then(
        () => true,
        () => false,
      );

  try {
    const reader = await createReader("search");
    await logIn(page, reader);

    // D1: empty search screen
    await page.goto(`${BASE}/books/search`);
    const input = page.getByLabel(SEARCH_LABEL);
    check(
      "search screen has the title and a labelled search field",
      (await visible(page.getByRole("heading", { name: "Add book" }))) &&
        (await visible(input)),
    );
    check(
      "the search field has no placeholder",
      (await input.getAttribute("placeholder")) === null,
    );
    check("the list stays empty until you type", (await results.count()) === 0);
    const chip = page.getByRole("link", { name: "Title", exact: true });
    const chipBox = await chip.boundingBox();
    check(
      "filter chips are at least 44px high",
      chipBox && chipBox.height >= 44,
      chipBox ? `${chipBox.height}px` : "",
    );
    await shot("books-01-search-empty");

    // Live search while typing
    await input.click();
    await input.pressSequentially("austen", { delay: 60 });
    check(
      "typing shows live results (3 for austen)",
      await visible(page.getByText("3 results")),
    );
    check(
      "the search is kept in the URL",
      page.url().endsWith("/books/search?q=austen"),
      page.url(),
    );
    check(
      "the field keeps its text and focus while results load",
      (await input.inputValue()) === "austen" &&
        (await input.evaluate((el) => el === document.activeElement)),
    );
    check(
      "results show title, author and the quick add",
      (await visible(row("Pride and Prejudice"))) &&
        (await row("Emma").getByText("Jane Austen").isVisible()) &&
        (await row("Emma")
          .getByRole("button", { name: "+ Want to read" })
          .isVisible()),
    );
    check(
      "manual entry is offered at the end",
      await page.getByRole("link", { name: "Add it manually" }).isVisible(),
    );
    await shot("books-02-search-results");

    // Filters
    await chip.click();
    check(
      "filter Title: no title matches austen",
      await visible(page.getByText("No books found")),
    );
    check(
      "the filter is in the URL and marked as current",
      page.url().includes("field=title") &&
        (await chip.getAttribute("aria-current")) === "true",
      page.url(),
    );
    await shot("books-03-search-no-results");
    await page.getByRole("link", { name: "Author", exact: true }).click();
    check(
      "filter Author: 3 results",
      await visible(page.getByText("3 results")),
    );
    await page.reload();
    check(
      "refresh keeps the search and the filter",
      (await input.inputValue()) === "austen" &&
        (await visible(page.getByText("3 results"))) &&
        (await page
          .getByRole("link", { name: "Author", exact: true })
          .getAttribute("aria-current")) === "true",
    );

    // Quick add
    await row("Emma").getByRole("button", { name: "+ Want to read" }).click();
    check(
      "quick add puts Emma on Want to read",
      await visible(
        row("Emma").locator('button[aria-haspopup="dialog"]', {
          hasText: "Want to read",
        }),
      ),
    );

    // D2: book page
    await row("Pride and Prejudice")
      .getByRole("link", { name: /Pride and Prejudice/ })
      .click();
    await page.waitForURL(/\/books\/[0-9a-f-]{36}$/);
    check(
      "the book page shows title, author and year",
      (await visible(
        page.getByRole("heading", { level: 1, name: "Pride and Prejudice" }),
      )) &&
        // The first match is the author line; the status sheets repeat it while closed.
        (await page
          .getByText("Jane Austen", { exact: true })
          .first()
          .isVisible()) &&
        (await page.getByText("Published in 1813").isVisible()),
    );
    check(
      "the description is looked up on first open",
      await visible(page.getByText(/Elizabeth Bennet and Mr Darcy/)),
    );
    check(
      "the Google rating shows 4.3 with an accessible label",
      (await page.getByText("Google rating").isVisible()) &&
        (await page.getByText("4.3", { exact: true }).isVisible()) &&
        (await page.getByText("4.3 out of 5 stars").count()) === 1,
    );
    const goodreads = page.getByRole("link", { name: /View on Goodreads/ });
    // By ISBN when the book has one, otherwise a search for title + author (P5).
    const goodreadsHref = await goodreads.getAttribute("href");
    check(
      "View on Goodreads opens Goodreads in a new tab",
      [
        "https://www.goodreads.com/book/isbn/9780141439518",
        "https://www.goodreads.com/search?q=Pride+and+Prejudice+Jane+Austen",
      ].includes(goodreadsHref) &&
        (await goodreads.getAttribute("target")) === "_blank" &&
        (await goodreads.getAttribute("rel")) === "noopener noreferrer",
      goodreadsHref,
    );
    check(
      "no overflow menu for a book that is not on the shelf",
      (await page.getByRole("button", { name: "More options" }).count()) === 0,
    );
    await shot("books-04-detail");

    // Status: Reading, then Read with a past date
    await statusButton("Reading").click();
    check("status changes to Reading", await waitPressed("Reading"));
    await statusButton("Read").click();
    const markSheet = page.getByRole("dialog", { name: "Mark as read" });
    await markSheet.waitFor();
    await markSheet.getByLabel("Finished on").fill("2026-03-01");
    await markSheet.getByRole("button", { name: "Mark as read" }).click();
    check("mark as read with a past date", await waitPressed("Read"));
    check(
      "a snackbar confirms it",
      await visible(page.getByText("Marked as read")),
    );

    // Overflow menu: mark as read again
    await page.getByRole("button", { name: "More options" }).click();
    const menu = page.getByRole("dialog", { name: "Pride and Prejudice" });
    await menu.waitFor();
    await shot("books-05-detail-menu", false);
    await menu.getByRole("button", { name: "Mark as read again" }).click();
    const again = page.getByRole("dialog", { name: "Mark as read" });
    check(
      "mark as read again shows the re-read note",
      await visible(
        again.getByText(
          "You read this book before. It counts again towards your pledge.",
        ),
      ),
    );
    await shot("books-06-reread", false);
    await page.keyboard.press("Escape");
    await again.waitFor({ state: "hidden" });

    // Remove + Undo
    await page.getByRole("button", { name: "More options" }).click();
    await menu.getByRole("button", { name: "Remove from my books" }).click();
    check(
      "remove shows a snackbar with Undo",
      await visible(page.getByText("Removed from your books")),
    );
    await page
      .getByRole("button", { name: "More options" })
      .waitFor({ state: "detached", timeout: 8000 })
      .catch(() => {});
    check(
      "after removing, no status is selected",
      !(await pressed("Read")) &&
        !(await pressed("Reading")) &&
        !(await pressed("Want to read")),
    );
    await page.getByRole("button", { name: "Undo" }).click();
    check("Undo puts the book back as Read", await waitPressed("Read"));

    // Back goes to the search
    await page.getByRole("link", { name: "Back" }).click();
    await page.waitForURL(/\/books\/search/);
    check(
      "back from the book page returns to the search",
      page.url().endsWith("/books/search?q=austen&field=author") &&
        (await visible(page.getByText("3 results"))),
      page.url(),
    );
    check(
      "the results show the new statuses",
      // The status pill opens the status sheet; the swipe actions repeat the status names.
      (await visible(
        row("Pride and Prejudice").locator('button[aria-haspopup="dialog"]', {
          hasText: /^Read\b/,
        }),
      )) &&
        (await visible(
          row("Emma").locator('button[aria-haspopup="dialog"]', {
            hasText: /^Want to read\b/,
          }),
        )),
    );

    // D3: add a book manually
    await page.getByRole("link", { name: "Add it manually" }).click();
    await page.waitForURL(/\/books\/new\?title=austen/);
    const title = page.getByLabel("Title");
    check(
      "the search text is copied into Title",
      (await title.inputValue()) === "austen",
    );
    check(
      "the add form has labelled fields without placeholders",
      (await page
        .locator("input[placeholder], textarea[placeholder]")
        .count()) === 0 &&
        (await page.getByLabel("Author").isVisible()) &&
        (await page.getByLabel("ISBN (optional)").isVisible()) &&
        (await page.getByLabel("Description (optional)").isVisible()),
    );
    check(
      "Want to read is the default status",
      await page.getByRole("radio", { name: "Want to read" }).isChecked(),
    );
    check(
      "× goes back to the search",
      (await page.getByRole("link", { name: "Close" }).getAttribute("href")) ===
        "/books/search?q=austen",
    );
    await title.fill("");
    await page.getByRole("button", { name: "Add book" }).click();
    check(
      "title and author are required",
      (await visible(page.getByText("Enter the title."))) &&
        (await page.getByText("Enter the author.").isVisible()),
    );
    check(
      "errors are linked to the fields",
      (await title.getAttribute("aria-invalid")) === "true" &&
        (await title.getAttribute("aria-describedby")).includes("title-error"),
    );
    await title.fill("The Quiet Shelf");
    await page.getByLabel("Author").fill("Ada Reader");
    await page.getByLabel("ISBN (optional)").fill("1234567890");
    await page.getByRole("button", { name: "Add book" }).click();
    check(
      "an invalid ISBN is rejected",
      await visible(page.getByText(/This is not a valid ISBN/)),
    );
    check(
      "typed values are kept after an error",
      (await page.getByLabel("Author").inputValue()) === "Ada Reader",
    );
    await page.getByLabel("ISBN (optional)").fill("");
    await page.getByLabel("Description (optional)").fill(LONG_DESCRIPTION);
    await page.getByText("Reading", { exact: true }).click();
    await shot("books-07-add-manual");
    await page.getByRole("button", { name: "Add book" }).click();
    await page.waitForURL(/\/books\/[0-9a-f-]{36}$/);
    check(
      "the new book opens with its status",
      (await visible(
        page.getByRole("heading", { level: 1, name: "The Quiet Shelf" }),
      )) && (await waitPressed("Reading")),
    );
    check(
      "no Google rating for a manual book",
      (await page.getByText("Google rating").count()) === 0,
    );
    const readMore = page.getByRole("button", { name: "Read more" });
    const clampedHeight = await page
      .getByText(/A quiet novel about a librarian/)
      .evaluate((el) => el.clientHeight);
    await readMore.click();
    const fullHeight = await page
      .getByText(/A quiet novel about a librarian/)
      .evaluate((el) => el.clientHeight);
    check(
      "Read more shows the full description",
      fullHeight > clampedHeight &&
        (await page
          .getByRole("button", { name: "Show less" })
          .getAttribute("aria-expanded")) === "true",
      `${clampedHeight}px → ${fullHeight}px`,
    );
    await shot("books-08-manual-detail");
    await page.getByRole("link", { name: "Back" }).click();
    await page.waitForURL(/\/books\/search/);
    check(
      "back from a new book skips the filled-in form",
      page.url().includes("/books/search"),
      page.url(),
    );

    // returnTo (onboarding)
    await page.goto(`${BASE}/books/new?returnTo=/settings`);
    check(
      "returnTo is passed on and used by ×",
      (await page.locator('input[name="returnTo"]').inputValue()) ===
        "/settings" &&
        (await page
          .getByRole("link", { name: "Close" })
          .getAttribute("href")) === "/settings",
    );

    // Unknown ids
    for (const id of ["00000000-0000-4000-8000-000000000000", "not-a-book"]) {
      const response = await page.goto(`${BASE}/books/${id}`);
      check(
        `unknown book id (${id.slice(0, 8)}) gives a 404`,
        response.status() === 404 &&
          (await visible(page.getByText("We can't find this book"))),
        String(response.status()),
      );
    }
    await shot("books-09-not-found");

    // Without JavaScript the search still works (server-rendered results)
    const noJs = await browser.newContext({
      viewport: { width: 390, height: 844 },
      javaScriptEnabled: false,
      storageState: await ctx.storageState(),
    });
    const plain = await noJs.newPage();
    await plain.goto(`${BASE}/books/search`);
    await plain.getByLabel(SEARCH_LABEL).fill("eliot");
    await plain.getByLabel(SEARCH_LABEL).press("Enter");
    check(
      "without JavaScript: the search form shows results",
      (await visible(plain.getByText("1 result"))) &&
        (await plain.getByRole("link", { name: /Middlemarch/ }).isVisible()),
    );
    await noJs.close();
  } catch (error) {
    check("run without exceptions", false, error.message);
    await shot("books-error").catch(() => {});
  }

  await browser.close();
  finish(errors);
})();
