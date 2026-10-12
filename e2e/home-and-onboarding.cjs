// End-to-end check of Sprint 3 Home, tab bar, + menu, mark-as-read picker and the onboarding step
// "Currently reading" (A10). Needs BOOKS_API=fixtures. See e2e/README.md for how to run it.
const { chromium } = require(process.env.PW ?? "playwright");
const { execSync } = require("node:child_process");

const {
  BASE,
  createReader,
  logIn,
  reporter,
  visible,
} = require("./helpers.cjs");

const API = "http://127.0.0.1:54321";
const SHOTS = process.env.SHOTS ?? "e2e/screenshots";
require("node:fs").mkdirSync(SHOTS, { recursive: true });

const { check, finish } = reporter();
const errors = [];

/** Local Supabase keys (same source as helpers.cjs); never production. */
const keys = JSON.parse(
  execSync("pnpm exec supabase status -o json", {
    stdio: ["ignore", "pipe", "ignore"],
  }).toString(),
);

/**
 * A confirmed account without a username, so it starts onboarding: created through the local
 * Auth admin API like createReader, but the library card step is left to the browser.
 */
async function createNewcomer(prefix) {
  const run = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const account = {
    email: `${prefix}.${run}@example.test`,
    password: "a calm reading evening",
    username: `${prefix}_${run}`.toLowerCase().slice(0, 20),
  };
  const response = await fetch(`${API}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: keys.SECRET_KEY,
      Authorization: `Bearer ${keys.SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: account.email,
      password: account.password,
      email_confirm: true,
    }),
  });
  const user = await response.json();
  if (!response.ok) throw new Error(`createNewcomer: ${JSON.stringify(user)}`);
  return { ...account, id: user.id };
}

/** Calls the local API as this account (row level security applies, like in the app). */
async function asUser(account) {
  const tokenResponse = await fetch(
    `${API}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        apikey: keys.PUBLISHABLE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: account.email,
        password: account.password,
      }),
    },
  );
  const { access_token: token } = await tokenResponse.json();
  const headers = {
    apikey: keys.PUBLISHABLE_KEY,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  return {
    async rpc(name, body) {
      const response = await fetch(`${API}/rest/v1/rpc/${name}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(`${name}: ${JSON.stringify(data)}`);
      return data;
    },
    async myBooks() {
      const response = await fetch(
        `${API}/rest/v1/user_books?select=status,books(title)`,
        { headers },
      );
      return (await response.json()).map((row) => [
        row.books.title,
        row.status,
      ]);
    },
  };
}

/** Logs in through the app's form and waits for the page the account lands on. */
async function logInTo(page, account, landing) {
  await page.goto(`${BASE}/login`);
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.waitForURL(landing);
}

async function signOut(page) {
  await page.goto(`${BASE}/settings`);
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL(/\/welcome/);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Polls until `read()` returns something `ok` accepts (database writes are async to the UI). */
async function eventually(read, ok, tries = 20) {
  let value;
  for (let i = 0; i < tries; i++) {
    value = await read();
    if (ok(value)) return value;
    await sleep(250);
  }
  return value;
}

const sorted = (rows) => JSON.stringify([...rows].sort());

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
  let page = await newPage();
  const shot = (name, fullPage = true) =>
    page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage });

  try {
    // 1. Onboarding with "Currently reading" (A10)
    const newcomer = await createNewcomer("nightstand");
    await logInTo(page, newcomer, /\/onboarding\/library-card/);
    check(
      "library card is step 1 of 3",
      await visible(page.getByText("1 of 3")),
    );
    await page.getByLabel("Username").fill(newcomer.username);
    await page.getByText("Available").waitFor({ timeout: 5000 });
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL(/\/onboarding\/currently-reading/);
    check(
      "after the library card comes Currently reading, step 2 of 3",
      (await visible(
        page.getByRole("heading", { name: "What are you reading now?" }),
      )) && (await visible(page.getByText("2 of 3"))),
    );
    const searchField = page.getByLabel("Search by title or author");
    check(
      "search field has a visible label and no placeholder",
      (await searchField.isVisible()) &&
        (await searchField.getAttribute("placeholder")) === null,
    );
    const results = page.getByRole("region", { name: "Search results" });
    check(
      "no results (and no recommendations) before typing",
      (await results.count()) === 0 &&
        (await page.getByRole("button", { pressed: false }).count()) === 0,
    );
    await shot("10-onboarding-currently-reading-empty");

    await searchField.fill("austen");
    check(
      "typing shows search results, announced in a live region",
      await visible(page.getByRole("status").getByText("3 books found")),
    );
    const result = (title) =>
      results.getByRole("button", { name: new RegExp(title) });
    await result("Pride and Prejudice").click();
    await result("Emma").click();
    await result("Persuasion").click();
    await result("Persuasion").click();
    const yourBooks = page.getByRole("region", { name: "Your books" });
    check(
      "chosen results are pressed toggle buttons; tapping again undoes",
      (await result("Pride and Prejudice").getAttribute("aria-pressed")) ===
        "true" &&
        (await result("Emma").getAttribute("aria-pressed")) === "true" &&
        (await result("Persuasion").getAttribute("aria-pressed")) === "false" &&
        (await yourBooks.getByRole("button", { pressed: true }).count()) === 2,
    );
    const user = await asUser(newcomer);
    const chosenInDb = await eventually(
      () => user.myBooks(),
      (rows) =>
        sorted(rows) ===
        sorted([
          ["Emma", "reading"],
          ["Pride and Prejudice", "reading"],
        ]),
    );
    check(
      "chosen books are saved as Reading, the undone one is gone",
      sorted(chosenInDb) ===
        sorted([
          ["Emma", "reading"],
          ["Pride and Prejudice", "reading"],
        ]),
      JSON.stringify(chosenInDb),
    );
    await shot("11-onboarding-currently-reading-chosen");

    // Manual-add detour: D3 (/books/new) is built in another branch, so the check follows the
    // link's URL and then plays D3's part (add the book by hand, come back with ?added=<id>).
    await searchField.fill("The Quiet Shelf");
    await page
      .getByRole("status")
      .getByText("No books found")
      .waitFor({ timeout: 8000 });
    const addLink = page.getByRole("link", { name: "Add it manually" });
    const href = await addLink.getAttribute("href");
    const target = new URL(href, BASE);
    check(
      "Add it manually opens D3 with the search text and a way back",
      target.pathname === "/books/new" &&
        target.searchParams.get("returnTo") ===
          "/onboarding/currently-reading" &&
        target.searchParams.get("title") === "The Quiet Shelf",
      href,
    );
    await addLink.click();
    await page.waitForURL(/\/books\/new/);
    await page.waitForLoadState("networkidle");
    check(
      "D3 is not redirected away during onboarding (username is set by now)",
      new URL(page.url()).pathname === "/books/new" &&
        (await page.getByRole("navigation", { name: "Main" }).count()) === 0,
      page.url(),
    );
    const manualId = await user.rpc("add_manual_book", {
      p_title: "The Quiet Shelf",
      p_authors: ["Ada Reader"],
      p_status: "want_to_read",
    });
    await page.goto(
      `${BASE}/onboarding/currently-reading?added=${encodeURIComponent(manualId)}`,
    );
    check(
      "coming back from D3 shows the new book as chosen, with the earlier ones",
      (await visible(
        yourBooks.getByRole("button", {
          name: /The Quiet Shelf/,
          pressed: true,
        }),
      )) &&
        (await yourBooks.getByRole("button", { pressed: true }).count()) === 3,
    );
    const afterDetour = await eventually(
      () => user.myBooks(),
      (rows) => rows.length === 3 && rows.every(([, s]) => s === "reading"),
    );
    check(
      "the book added by hand is Reading",
      afterDetour.length === 3 &&
        afterDetour.every(([, status]) => status === "reading"),
      JSON.stringify(afterDetour),
    );
    await shot("12-onboarding-after-manual-add");

    await page.getByRole("link", { name: "Continue" }).click();
    await page.waitForURL(/\/onboarding\/pledge/);
    check(
      "Continue goes to the pledge, step 3 of 3",
      await visible(page.getByText("3 of 3")),
    );
    await page.getByRole("button", { name: "Finish" }).click();
    await page.waitForURL(`${BASE}/`);
    const reading = page.getByRole("region", { name: "Currently reading" });
    check(
      "Home shows the chosen books under Currently reading",
      (await visible(reading.getByRole("link", { name: /^Pride and/ }))) &&
        (await visible(reading.getByRole("link", { name: /^Emma/ }))) &&
        (await visible(reading.getByRole("link", { name: /^The Quiet/ }))),
    );
    check(
      "Home stats show 0 of 12 with the pledge",
      (await visible(page.getByText("0 of 12"))) &&
        (await visible(page.getByText("Your pledge: 12 books"))),
    );
    check(
      "no All link with 3 books or fewer",
      (await page.getByRole("link", { name: /^All \(/ }).count()) === 0,
    );
    await shot("13-home-currently-reading");

    // 2. Tab bar (N1)
    const nav = page.getByRole("navigation", { name: "Main" });
    const tabs = await nav.getByRole("link").evaluateAll((links) =>
      links.map((link) => ({
        name: link.textContent.trim(),
        current: link.getAttribute("aria-current"),
        height: link.getBoundingClientRect().height,
        width: link.getBoundingClientRect().width,
      })),
    );
    check(
      "tab bar shows only shipped tabs: Home and +",
      JSON.stringify(tabs.map((tab) => tab.name)) ===
        JSON.stringify(["Home"]) &&
        (await nav
          .getByRole("button", { name: "Create", exact: true })
          .count()) === 1,
      tabs.map((tab) => tab.name).join(","),
    );
    check(
      "no Readlists, Challenges or Friends tabs before their sprint (N1)",
      (await nav.getByText(/Readlists|Challenges|Friends/).count()) === 0,
    );
    check(
      "Home is the current tab (aria-current=page)",
      tabs
        .filter((tab) => tab.current === "page")
        .map((tab) => tab.name)
        .join() === "Home",
    );
    const plusBox = await nav
      .getByRole("button", { name: "Create", exact: true })
      .boundingBox();
    const homeBox = await nav.getByRole("link", { name: "Home" }).boundingBox();
    check(
      "tab targets are at least 44 px",
      tabs.every((tab) => tab.height >= 44 && tab.width >= 44) &&
        plusBox.height >= 44 &&
        plusBox.width >= 44,
    );
    check(
      "Home keeps its left slot and + stays centred",
      homeBox.x + homeBox.width < 390 / 3 &&
        Math.abs(plusBox.x + plusBox.width / 2 - 195) <= 2,
      `home x=${Math.round(homeBox.x)}, + centre=${Math.round(plusBox.x + plusBox.width / 2)}`,
    );
    const layout = await page.evaluate(() => {
      const bar = document
        .querySelector("[data-tab-bar]")
        .getBoundingClientRect();
      const wrapper = document.querySelector("main").parentElement;
      return {
        variable: getComputedStyle(document.documentElement)
          .getPropertyValue("--tab-bar-height")
          .trim(),
        barBottom: bar.bottom,
        viewport: window.innerHeight,
        padding: parseFloat(getComputedStyle(wrapper).paddingBottom),
        barHeight: bar.height,
      };
    });
    check(
      "tab bar is fixed at the bottom and sets --tab-bar-height",
      layout.variable === "4rem" &&
        Math.round(layout.barBottom) === layout.viewport &&
        layout.padding >= layout.barHeight,
      JSON.stringify(layout),
    );
    await page.locator("[data-tab-bar]").screenshot({
      path: `${SHOTS}/14-tab-bar.png`,
    });

    // 3. + menu (N2)
    const plus = nav.getByRole("button", { name: "Create", exact: true });
    await plus.click();
    const menu = page.getByRole("dialog", { name: "Create" });
    const close = nav.getByRole("button", { name: "Close the create menu" });
    check(
      "+ opens the Create sheet and turns into ×",
      (await visible(menu)) &&
        (await close.getAttribute("aria-expanded")) === "true",
    );
    const addBook = menu.getByRole("link", { name: /^Add book/ });
    const markAsRead = menu.getByRole("link", { name: /^Mark as read/ });
    check(
      "sheet offers Add book and Mark as read only",
      (await addBook.getAttribute("href")) === "/books/search" &&
        (await markAsRead.getAttribute("href")) === "/books/mark-as-read" &&
        (await menu.getByRole("link").count()) === 2 &&
        (await visible(
          menu.getByText("Search the book database or add one manually"),
        )) &&
        (await visible(menu.getByText("Pick one of your books and finish it"))),
    );
    check(
      "focus moves into the sheet",
      await addBook.evaluate((link) => link === document.activeElement),
    );
    await shot("20-create-menu", false);
    await page.keyboard.press("Escape");
    check(
      "Escape closes the sheet and returns focus to +",
      (await menu.count()) === 0 &&
        (await plus.evaluate((button) => button === document.activeElement)),
    );
    await plus.click();
    await close.click();
    check("× closes the sheet", (await menu.count()) === 0);
    await plus.click();
    await page.mouse.click(195, 120);
    check("a tap outside closes the sheet", (await menu.count()) === 0);
    await page.goto(`${BASE}/profile`);
    await plus.click();
    await nav.getByRole("link", { name: "Home" }).click();
    await page.waitForURL(`${BASE}/`);
    check(
      "tabs stay usable while the sheet is open",
      (await menu.count()) === 0,
    );
    await page.goto(`${BASE}/readlists`);
    check(
      "unshipped tab pages do not exist yet",
      (await visible(page.getByText(/could not be found|404/).first())) &&
        (await page.getByText(/Arrives in version/).count()) === 0,
    );

    // 4. Mark as read via the + menu → picker → D4; stats update
    await page.goto(`${BASE}/`);
    await plus.click();
    await markAsRead.click();
    await page.waitForURL(/\/books\/mark-as-read/);
    const picker = page.getByRole("region", { name: "Books you are reading" });
    check(
      "the picker lists the books you are reading",
      (await picker.getByRole("button").count()) === 3,
    );
    await shot("30-mark-as-read-picker");
    await picker.getByRole("button", { name: /Pride and Prejudice/ }).click();
    const sheet = page.getByRole("dialog", { name: "Mark as read" });
    await sheet.waitFor();
    await shot("31-mark-as-read-sheet", false);
    await sheet.getByRole("button", { name: "Mark as read" }).click();
    await page.waitForURL(`${BASE}/`);
    check(
      "after marking, Home counts 1 of 12 with a pace line",
      (await visible(page.getByText("1 of 12"))) &&
        (await visible(
          page.getByText(
            /behind your pledge|ahead of your pledge|On track|Pledge reached/,
          ),
        )),
    );
    check(
      "the snackbar offers Undo above the tab bar",
      (await visible(page.getByRole("button", { name: "Undo" }))) &&
        (await page.getByRole("button", { name: "Undo" }).boundingBox()).y +
          44 <=
          (await nav.boundingBox()).y,
    );
    check(
      "the finished book left Currently reading",
      (await reading.getByText("Pride and Prejudice").count()) === 0,
    );
    await shot("32-home-after-mark-as-read", false);

    // 5. More than three books: Home shows three and All (n)
    const persuasion = await user.rpc("save_external_book", {
      p_source: "openlibrary",
      p_source_id: "OL900003W",
      p_title: "Persuasion",
      p_authors: ["Jane Austen"],
    });
    await user.rpc("set_book_status", {
      p_book_id: persuasion,
      p_status: "reading",
    });
    const another = await user.rpc("add_manual_book", {
      p_title: "A Second Quiet Shelf",
      p_authors: ["Ada Reader"],
      p_status: "reading",
    });
    if (!another) throw new Error("add_manual_book returned nothing");
    await page.goto(`${BASE}/`);
    const allLink = page.getByRole("link", { name: "All (4)" });
    check(
      "with 4 books Reading, Home shows 3 and All (4) → the Reading list",
      (await reading.getByRole("listitem").count()) === 3 &&
        (await allLink.getAttribute("href")) === "/books/shelf/reading",
    );
    await signOut(page);

    // 6. Skip path, no goal
    page = await newPage();
    const skipper = await createNewcomer("skipper");
    await logInTo(page, skipper, /\/onboarding\/library-card/);
    await page.getByLabel("Username").fill(skipper.username);
    await page.getByText("Available").waitFor({ timeout: 5000 });
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL(/\/onboarding\/currently-reading/);
    await page.getByRole("link", { name: "Skip" }).click();
    await page.waitForURL(/\/onboarding\/pledge/);
    check("Skip goes to the pledge", true);
    await page.getByRole("button", { name: "No goal, just reading" }).click();
    await page.waitForURL(`${BASE}/`);
    check(
      "no goal: Home shows a plain count and No goal, just reading",
      (await visible(page.getByText("Books read this year"))) &&
        (await visible(page.getByText("No goal, just reading"))) &&
        (await page.getByText(/ of \d+$/).count()) === 0,
    );
    check(
      "Home empty state after skipping",
      await visible(page.getByText("Nothing on your nightstand yet")),
    );
    await shot("40-home-no-goal-empty");
    await signOut(page);

    // 7. Empty Home for a reader with a pledge (B2) and the empty picker
    page = await newPage();
    const emptyReader = await createReader("empty", { pledge: 24 });
    await logIn(page, emptyReader);
    check(
      "B2: 0 of 24, the pledge and the empty Currently reading card",
      (await visible(page.getByText("0 of 24"))) &&
        (await visible(page.getByText("Your pledge: 24 books"))) &&
        (await visible(page.getByText("Nothing on your nightstand yet"))) &&
        (await visible(page.getByText("Find a book and mark it as Reading."))),
    );
    check(
      "Add a book goes to book search",
      (await page
        .getByRole("link", { name: "Add a book" })
        .getAttribute("href")) === "/books/search",
    );
    check(
      "no challenges or readlists sections yet",
      (await page.getByText(/Ongoing challenges|Your readlists/).count()) === 0,
    );
    await shot("41-home-empty");
    await page.goto(`${BASE}/books/mark-as-read`);
    check(
      "empty picker suggests searching for a book",
      (await visible(
        page.getByText("You are not reading any books right now."),
      )) &&
        (await page
          .getByRole("link", { name: "Search for a book" })
          .getAttribute("href")) === "/books/search",
    );
    await shot("42-mark-as-read-empty");
  } catch (error) {
    check("unexpected error", false, error.message.split("\n")[0]);
    await shot("zz-home-error").catch(() => {});
  }

  check("no client-side errors", errors.length === 0, errors.join(" | "));
  await browser.close();
  finish();
})();
