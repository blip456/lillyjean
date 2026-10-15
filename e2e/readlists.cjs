// End-to-end check of the readlist screens (Sprint 4: C1 overview, C2 detail, C3 create / edit /
// delete, the Readlists tab, the Home row and "New readlist" in the + menu). Needs the app with a
// local Supabase; see e2e/README.md. Prints PASS/FAIL per check.
const { chromium } = require(process.env.PW ?? "playwright");
const { execSync } = require("node:child_process");
const { readFileSync } = require("node:fs");

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
const UUID = /\/readlists\/([0-9a-f-]{36})$/;

const { check, finish } = reporter();

/** Local Supabase keys (same source as helpers.cjs); never production. */
const keys = JSON.parse(
  execSync("pnpm exec supabase status -o json", {
    stdio: ["ignore", "pipe", "ignore"],
  }).toString(),
);

/**
 * Stores a cover in the public `covers` bucket like the app does (T20), so the mosaic shows real
 * images without the internet. Returns the path for `books.cover_path`.
 */
async function storeCover() {
  const path = "e2e/readlists-cover.png";
  const response = await fetch(
    `http://127.0.0.1:54321/storage/v1/object/covers/${path}`,
    {
      method: "POST",
      headers: {
        apikey: keys.SECRET_KEY,
        Authorization: `Bearer ${keys.SECRET_KEY}`,
        "Content-Type": "image/png",
        "x-upsert": "true",
      },
      body: readFileSync("src/app/icon.png"),
    },
  );
  if (!response.ok) throw new Error(`storeCover: ${await response.text()}`);
  return path;
}
const errors = [];

const sql = (text) => text.replace(/\s+/g, " ").replace(/"/g, '\\"');

/** Puts a book on the reader's shelf straight in the database; returns its id. */
function seedBook(reader, title, status, coverPath = null) {
  return psql(
    sql(`with b as (insert into public.books (source, title, authors, cover_path, created_by, details_checked)
       values ('manual', '${title}', array['Ada Author'], ${coverPath ? `'${coverPath}'` : "null"}, '${reader.id}', true) returning id),
     u as (insert into public.user_books (user_id, book_id, status) select '${reader.id}', id, '${status}' from b)
     select id from b`),
  );
}

/** A readlist owned by `reader`, made in the database; returns its id. */
function seedReadlist(reader, name, minutesAgo = 0) {
  return psql(
    sql(`with r as (insert into public.readlists (owner_id, name, updated_at)
       values ('${reader.id}', '${name}', now() - interval '${minutesAgo} minutes') returning id)
     select id from r`),
  );
}

/** Adds a book to a readlist in the database, `minutesAgo` minutes ago (order: P40). */
function seedEntry(reader, readlistId, bookId, minutesAgo) {
  psql(
    sql(`insert into public.readlist_books (readlist_id, book_id, added_by, added_at)
       values ('${readlistId}', '${bookId}', '${reader.id}', now() - interval '${minutesAgo} minutes')`),
  );
}

const count = (query) => Number(psql(query));

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
    const reader = await createReader("lists", { pledge: 12 });
    await logIn(page, reader);

    // 1. Home empty state (B2) and the Readlists tab (N1)
    const homeLists = page.getByRole("region", { name: "Your readlists" });
    check(
      "B2: Home shows the readlists empty state with New readlist",
      (await visible(homeLists.getByText("Make your first readlist"))) &&
        (await visible(
          homeLists.getByText("Collect books, like a playlist."),
        )) &&
        (await homeLists
          .getByRole("link", { name: "New readlist" })
          .getAttribute("href")) === "/readlists/new",
    );
    check(
      "Home keeps the fixed order: stats, currently reading, readlists (P23)",
      await page.evaluate(() => {
        const headings = [...document.querySelectorAll("main h2")].map(
          (h) => h.textContent,
        );
        return (
          headings.indexOf("Currently reading") <
            headings.indexOf("Your readlists") &&
          headings.indexOf("Currently reading") >= 0
        );
      }),
    );
    await shot("50-home-readlists-empty");

    const tabNames = await nav
      .getByRole("link")
      .evaluateAll((links) => links.map((link) => link.textContent.trim()));
    check(
      "tab bar shows Home and Readlists; Challenges and Friends are still absent",
      JSON.stringify(tabNames) === JSON.stringify(["Home", "Readlists"]) &&
        (await nav.getByText(/Challenges|Friends/).count()) === 0,
      tabNames.join(","),
    );
    const readlistsTab = nav.getByRole("link", { name: "Readlists" });
    const tabBox = await readlistsTab.boundingBox();
    check(
      "Readlists sits in slot 2, left of the +",
      tabBox.x > 390 / 5 - 10 && tabBox.x + tabBox.width < 195,
      `x=${Math.round(tabBox.x)}`,
    );
    await readlistsTab.click();
    await page.waitForURL(`${BASE}/readlists`);
    check(
      "Readlists tab opens C1 and is the current tab",
      (await visible(
        page.getByRole("heading", { name: "Readlists", exact: true }),
      )) &&
        (await readlistsTab.getAttribute("aria-current")) === "page" &&
        (await nav
          .getByRole("link", { name: "Home" })
          .getAttribute("aria-current")) === null,
    );

    // 2. Empty overview (C1)
    const yourBooks = page.getByRole("region", { name: "Your books" });
    const shelfLinks = await yourBooks
      .getByRole("link")
      .evaluateAll((links) =>
        links.map((link) => [
          link.getAttribute("href"),
          link.textContent.trim(),
        ]),
      );
    check(
      "C1: the three statuses are system lists that open the shelves",
      JSON.stringify(shelfLinks) ===
        JSON.stringify([
          ["/books/shelf/want-to-read", "0Want to read"],
          ["/books/shelf/reading", "0Reading"],
          ["/books/shelf/read", "0Read"],
        ]),
      JSON.stringify(shelfLinks),
    );
    const overviewLists = page.getByRole("region", { name: "Your readlists" });
    check(
      "C1 empty state: Make your first readlist, with New readlist",
      (await visible(overviewLists.getByText("Make your first readlist"))) &&
        (await overviewLists
          .getByRole("link", { name: "New readlist" })
          .getAttribute("href")) === "/readlists/new",
    );
    check(
      "no filter bar until sharing ships (P42)",
      (await page.getByText(/^(Mine|Shared with me)$/).count()) === 0,
    );
    check(
      "header + is a 44 px link to New readlist",
      await page
        .locator("header")
        .getByRole("link", { name: "New readlist" })
        .evaluate((link) => {
          const box = link.getBoundingClientRect();
          return (
            link.getAttribute("href") === "/readlists/new" &&
            box.width >= 44 &&
            box.height >= 44
          );
        }),
    );
    await shot("51-readlists-empty");

    // 3. + menu: New readlist (N2)
    await nav.getByRole("button", { name: "Create", exact: true }).click();
    const menu = page.getByRole("dialog", { name: "Create" });
    const menuLinks = await menu
      .getByRole("link")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
    check(
      "+ menu: Add book, Mark as read, New readlist (in that order)",
      JSON.stringify(menuLinks) ===
        JSON.stringify([
          "/books/search",
          "/books/mark-as-read",
          "/readlists/new",
        ]) && (await visible(menu.getByText("Collect books, like a playlist"))),
      menuLinks.join(","),
    );
    await shot("52-create-menu-new-readlist", false);
    await menu.getByRole("link", { name: /^New readlist/ }).click();
    await page.waitForURL(`${BASE}/readlists/new`);

    // 4. Create with validation errors first (C3)
    const name = page.getByLabel("Name", { exact: true });
    check(
      "C3: New readlist form without the tab bar; labels, no placeholders",
      (await visible(page.getByRole("heading", { name: "New readlist" }))) &&
        (await nav.count()) === 0 &&
        (await name.getAttribute("placeholder")) === null &&
        (await page
          .getByLabel("Description (optional)")
          .getAttribute("placeholder")) === null &&
        (await visible(page.getByRole("link", { name: "Close" }))),
    );
    await page.getByRole("button", { name: "Create readlist" }).click();
    check(
      "empty name: Give your readlist a name.",
      (await visible(page.getByText("Give your readlist a name."))) &&
        (await name.getAttribute("aria-invalid")) === "true",
    );
    await name.fill("x".repeat(61));
    await page.getByRole("button", { name: "Create readlist" }).click();
    check(
      "61 characters: Use at most 60 characters. (and the text is kept)",
      (await visible(page.getByText("Use at most 60 characters."))) &&
        (await name.inputValue()).length === 61,
    );
    await shot("53-new-readlist-errors");
    await name.fill("Summer reads");
    await page
      .getByLabel("Description (optional)")
      .fill("Light books for long evenings.");
    await page.getByRole("button", { name: "Create readlist" }).click();
    await page.waitForURL(UUID);
    const listId = page.url().match(UUID)[1];
    check(
      "creating opens the new readlist (C2) with its description",
      (await visible(page.getByRole("heading", { name: "Summer reads" }))) &&
        (await visible(page.getByText("Light books for long evenings."))) &&
        (await visible(
          page.locator("main header").getByText("No books", { exact: true }),
        )) &&
        (await nav.count()) === 1,
    );
    check(
      "C2 empty state: Add a book → search",
      (await visible(page.getByText("No books in this readlist yet"))) &&
        (await page
          .getByRole("link", { name: "Add a book" })
          .getAttribute("href")) === "/books/search",
    );
    await shot("54-readlist-empty");

    // 5. Books in the list: mosaic, count and newest first (P40)
    const cover = await storeCover();
    const books = {
      emma: seedBook(reader, "Emma", "reading", cover),
      persuasion: seedBook(reader, "Persuasion", "want_to_read"),
      quiet: seedBook(reader, "The Quiet Shelf", "read", cover),
      north: seedBook(reader, "North and South", "want_to_read"),
      middle: seedBook(reader, "Middlemarch", "want_to_read"),
    };
    seedEntry(reader, listId, books.middle, 50);
    seedEntry(reader, listId, books.north, 40);
    seedEntry(reader, listId, books.persuasion, 30);
    seedEntry(reader, listId, books.quiet, 20);
    seedEntry(reader, listId, books.emma, 10);
    await page.reload();
    const rows = page.getByRole("list", { name: "Books in this readlist" });
    const titles = await rows
      .getByRole("listitem")
      .evaluateAll((items) =>
        items.map((item) => item.querySelector("a .font-semibold").textContent),
      );
    check(
      "C2 lists the books most recently added first (P40)",
      JSON.stringify(titles) ===
        JSON.stringify([
          "Emma",
          "The Quiet Shelf",
          "Persuasion",
          "North and South",
          "Middlemarch",
        ]),
      titles.join(", "),
    );
    const pills = await rows
      .locator('button[aria-haspopup="dialog"] > span:first-child')
      .allTextContents();
    check(
      "C2 shows 5 books and my status on each row",
      (await visible(
        page.locator("main header").getByText("5 books", { exact: true }),
      )) &&
        JSON.stringify(pills) ===
          JSON.stringify([
            "Reading",
            "Read",
            "Want to read",
            "Want to read",
            "Want to read",
          ]),
      pills.join(", "),
    );
    const mosaic = await page
      .locator("main [data-mosaic]")
      .first()
      .evaluate((node) => ({
        hidden: node.getAttribute("aria-hidden"),
        cells: node.children.length,
        images: [...node.querySelectorAll("img")].map((img) => [
          img.getAttribute("alt"),
          img.getAttribute("loading"),
        ]),
        text: node.textContent,
      }));
    check(
      "the header mosaic is decorative: four newest books, covers and generated covers",
      mosaic.hidden === "true" &&
        mosaic.cells === 4 &&
        JSON.stringify(mosaic.images) ===
          JSON.stringify([
            ["", "lazy"],
            ["", "lazy"],
          ]) &&
        mosaic.text.includes("Persuasion") &&
        mosaic.text.includes("North and South") &&
        !mosaic.text.includes("Middlemarch"),
      JSON.stringify(mosaic),
    );
    check(
      "+ Add books links to the search",
      (await page
        .getByRole("link", { name: "Add books" })
        .getAttribute("href")) === "/books/search",
    );
    await shot("55-readlist-detail");

    // Remove from this readlist via the book menu (B5, right-click on desktop), then Undo.
    const inList = () =>
      count(
        `select count(*) from public.readlist_books where readlist_id = '${listId}'`,
      );
    const middleRow = rows
      .getByRole("listitem")
      .filter({ hasText: "Middlemarch" });
    await middleRow.getByRole("link").first().click({ button: "right" });
    const bookMenu = page.getByRole("dialog", { name: /Middlemarch/ });
    await bookMenu
      .getByRole("button", { name: "Remove from this readlist" })
      .click();
    await middleRow.waitFor({ state: "detached" }).catch(() => {});
    const undo = page.getByRole("button", { name: "Undo" });
    await undo.waitFor().catch(() => {});
    check(
      "the book menu removes a book from the readlist and offers Undo",
      (await middleRow.count()) === 0 &&
        (await visible(page.getByText("Removed from this readlist"))) &&
        inList() === 4,
    );
    await undo.click();
    await middleRow.waitFor().catch(() => {});
    check(
      "Undo puts the book back in its old place",
      (await visible(middleRow)) &&
        inList() === 5 &&
        (await rows
          .getByRole("listitem")
          .last()
          .textContent()
          .then((text) => text.includes("Middlemarch"))),
    );

    await page.getByRole("link", { name: "Back to readlists" }).click();
    await page.waitForURL(`${BASE}/readlists`);
    const tile = overviewLists.getByRole("link", { name: /Summer reads/ });
    check(
      "C1 shows the readlist as a tile with mosaic and 5 books",
      (await visible(tile)) &&
        (await tile.textContent()).includes("5 books") &&
        (await tile.locator("[data-mosaic]").count()) === 1 &&
        (await tile.getAttribute("href")) === `/readlists/${listId}`,
    );
    check(
      "C1 counts the statuses: 3 Want to read, 1 Reading, 1 Read",
      JSON.stringify(
        await yourBooks
          .getByRole("link")
          .evaluateAll((links) => links.map((l) => l.textContent.trim())),
      ) === JSON.stringify(["3Want to read", "1Reading", "1Read"]),
    );
    check(
      "C1 ends the grid with a New readlist tile",
      (await overviewLists
        .getByRole("link", { name: "New readlist" })
        .getAttribute("href")) === "/readlists/new",
    );
    await shot("56-readlists-overview");

    await yourBooks.getByRole("link", { name: /Want to read/ }).click();
    await page.waitForURL(`${BASE}/books/shelf/want-to-read`);
    check(
      "the Want to read system list opens its shelf",
      await visible(page.getByRole("heading", { name: "Want to read" })),
    );

    // 6. Rename via ⋯ → Edit (C3 edit mode)
    await page.goto(`${BASE}/readlists/${listId}`);
    const more = page.getByRole("button", {
      name: "More actions for this readlist",
    });
    await more.click();
    const listMenu = page.getByRole("dialog", { name: "Summer reads" });
    check(
      "⋯ opens a sheet with Edit and Delete",
      (await visible(listMenu.getByRole("link", { name: "Edit" }))) &&
        (await visible(listMenu.getByRole("button", { name: "Delete" }))),
    );
    await shot("57-readlist-menu", false);
    await page.keyboard.press("Escape");
    await listMenu.waitFor({ state: "hidden" }).catch(() => {});
    check(
      "Escape closes the sheet and focus goes back to ⋯",
      (await listMenu.isVisible()) === false &&
        (await more.evaluate((button) => button === document.activeElement)),
    );
    await more.click();
    await listMenu.getByRole("link", { name: "Edit" }).click();
    await page.waitForURL(`${BASE}/readlists/${listId}/edit`);
    check(
      "Edit readlist: prefilled, Save, Delete readlist, no tab bar",
      (await visible(page.getByRole("heading", { name: "Edit readlist" }))) &&
        (await name.inputValue()) === "Summer reads" &&
        (await page.getByLabel("Description (optional)").inputValue()) ===
          "Light books for long evenings." &&
        (await visible(page.getByRole("button", { name: "Save" }))) &&
        (await visible(
          page.getByRole("button", { name: "Delete readlist" }),
        )) &&
        (await nav.count()) === 0,
    );
    await shot("58-edit-readlist");
    await name.fill("");
    await page.getByRole("button", { name: "Save" }).click();
    check(
      "saving an empty name shows the error",
      await visible(page.getByText("Give your readlist a name.")),
    );
    await name.fill("Autumn reads");
    await page.getByRole("button", { name: "Save" }).click();
    await page.waitForURL(`${BASE}/readlists/${listId}`);
    check(
      "the new name shows on the readlist",
      await visible(page.getByRole("heading", { name: "Autumn reads" })),
    );

    // 7. Delete with confirmation (P42); the books stay on the shelf
    await more.click();
    const renamedMenu = page.getByRole("dialog", { name: "Autumn reads" });
    await renamedMenu.getByRole("button", { name: "Delete" }).click();
    const confirm = page.getByRole("dialog", {
      name: "Delete this readlist?",
    });
    check(
      "Delete asks for confirmation; focus is on Keep it",
      (await visible(
        confirm.getByText(
          "“Autumn reads” will be deleted. The books stay on your shelf.",
        ),
      )) &&
        (await confirm
          .getByRole("button", { name: "Keep it" })
          .evaluate((button) => button === document.activeElement)),
    );
    await shot("59-delete-confirmation", false);
    await confirm.getByRole("button", { name: "Keep it" }).click();
    await confirm.waitFor({ state: "hidden" }).catch(() => {});
    check(
      "Keep it closes the sheet and keeps the readlist",
      (await confirm.isVisible()) === false &&
        count(
          `select count(*) from public.readlists where id = '${listId}'`,
        ) === 1,
    );
    await more.click();
    await renamedMenu.getByRole("button", { name: "Delete" }).click();
    // The deleted list's page must not flash "Readlist not found" on the way out.
    await page.evaluate(() => {
      window.__sawNotFound = false;
      new MutationObserver(() => {
        if (
          document
            .querySelector("main")
            ?.innerText.includes("Readlist not found")
        )
          window.__sawNotFound = true;
      }).observe(document.body, { childList: true, subtree: true });
    });
    await confirm.getByRole("button", { name: "Delete readlist" }).click();
    await page.waitForURL(`${BASE}/readlists`);
    check(
      "deleting goes to the overview with Readlist deleted",
      (await visible(page.getByRole("status").getByText("Readlist deleted"))) &&
        (await overviewLists.getByText("Autumn reads").count()) === 0 &&
        (await visible(overviewLists.getByText("Make your first readlist"))),
    );
    check(
      "no flash of Readlist not found while leaving the deleted list",
      (await page.evaluate(() => window.__sawNotFound)) === false,
    );
    await shot("60-after-delete", false);
    check(
      "the readlist is gone, the five books are still on the shelf",
      count(`select count(*) from public.readlists where id = '${listId}'`) ===
        0 &&
        count(
          `select count(*) from public.user_books where user_id = '${reader.id}'`,
        ) === 5,
    );

    // 8. Create from a book: ?bookId=&returnTo= adds the book and goes back
    await page.goto(
      `${BASE}/readlists/new?bookId=${books.persuasion}&returnTo=${encodeURIComponent(`/books/${books.persuasion}`)}`,
    );
    await name.fill("Austen evenings");
    await page.getByRole("button", { name: "Create readlist" }).click();
    await page.waitForURL(`${BASE}/books/${books.persuasion}`);
    const fromBook = psql(
      sql(`select r.name || ':' || count(rb.book_id) from public.readlists r
         join public.readlist_books rb on rb.readlist_id = r.id
         where r.owner_id = '${reader.id}' and rb.book_id = '${books.persuasion}' group by r.name`),
    );
    check(
      "?bookId=&returnTo= creates the list with the book and returns to the book",
      fromBook === "Austen evenings:1",
      fromBook,
    );
    await page.goto(
      `${BASE}/readlists/new?bookId=nope&returnTo=${encodeURIComponent("https://example.com/")}`,
    );
    check(
      "an invalid book id and another website are not passed on",
      (await page.locator('input[name="bookId"]').count()) === 0 &&
        (await page.locator('input[name="returnTo"]').count()) === 0 &&
        (await page
          .getByRole("link", { name: "Close" })
          .getAttribute("href")) === "/readlists",
    );

    // 9. Delete from the edit form
    const spare = seedReadlist(reader, "Spare list", 500);
    await page.goto(`${BASE}/readlists/${spare}/edit`);
    await page.getByRole("button", { name: "Delete readlist" }).click();
    await confirm.getByRole("button", { name: "Delete readlist" }).click();
    await page.waitForURL(`${BASE}/readlists`);
    check(
      "Delete readlist on the edit form deletes after confirmation",
      count(`select count(*) from public.readlists where id = '${spare}'`) ===
        0,
    );

    // 10. Home row (B1): up to six readlists, All and + New
    const austen = psql(
      `select id from public.readlists where owner_id = '${reader.id}' and name = 'Austen evenings'`,
    );
    seedEntry(reader, austen, books.emma, 5);
    seedEntry(reader, austen, books.quiet, 4);
    for (let i = 1; i <= 6; i++) seedReadlist(reader, `Shelf ${i}`, 60 + i);
    await page.goto(`${BASE}/`);
    const rowTiles = await homeLists
      .getByRole("listitem")
      .evaluateAll((items) =>
        items.map((item) => {
          const link = item.querySelector("a");
          return (
            link.getAttribute("aria-label") ?? link.children[1].textContent
          );
        }),
      );
    check(
      "Home shows six readlists, most recently changed first, then + New",
      rowTiles.length === 7 &&
        rowTiles[0] === "Austen evenings" &&
        rowTiles[6] === "New readlist" &&
        !rowTiles.includes("Shelf 6"),
      rowTiles.join(", "),
    );
    check(
      "Home row: All → overview, + New → New readlist",
      (await homeLists
        .getByRole("link", { name: "All readlists" })
        .getAttribute("href")) === "/readlists" &&
        (await homeLists
          .getByRole("link", { name: "New readlist" })
          .getAttribute("href")) === "/readlists/new" &&
        (await visible(homeLists.getByText("3 books"))),
    );
    await homeLists.scrollIntoViewIfNeeded();
    await shot("61-home-readlists-row");
    await homeLists.getByRole("link", { name: "New readlist" }).click();
    await page.waitForURL(`${BASE}/readlists/new`);
    check("+ New opens the form", true);
    await page.goto(`${BASE}/`);
    await homeLists.getByRole("link", { name: "All readlists" }).click();
    await page.waitForURL(`${BASE}/readlists`);
    check(
      "All opens the overview with all seven readlists",
      (await overviewLists.getByRole("link", { name: /books?$/ }).count()) ===
        7,
    );
    await shot("62-readlists-overview-many");

    // 11. Someone else's readlist, or an unknown id → 404
    const other = await createReader("other");
    const theirs = seedReadlist(other, "Not yours");
    for (const path of [
      `/readlists/${theirs}`,
      `/readlists/${theirs}/edit`,
      "/readlists/not-a-readlist",
    ]) {
      const response = await page.goto(`${BASE}${path}`);
      check(
        `${path.replace(theirs, "<someone else's>")} is not found`,
        response.status() === 404 &&
          (await visible(
            page.getByRole("heading", { name: "Readlist not found" }),
          )) &&
          (await page.getByText("Not yours", { exact: true }).count()) === 0,
        String(response.status()),
      );
    }
    await shot("63-readlist-not-found");
  } catch (error) {
    check("unexpected error", false, error.message.split("\n")[0]);
    await shot("zz-readlists-error").catch(() => {});
  }

  check("no client-side errors", errors.length === 0, errors.join(" | "));
  await browser.close();
  finish();
})();
