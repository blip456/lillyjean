// End-to-end check of the book menu and readlists on books (Sprint 4: B5 long-press menu, C4
// add-to-readlist sheet, D2 "+ Add to readlist" and "In your readlists").
// Needs the app with a local Supabase and BOOKS_API=fixtures; see e2e/README.md.
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

/** Puts a book on the reader's shelf straight in the database; returns its id. */
function seedBook(reader, title, status, minutesAgo) {
  return psql(
    `with b as (insert into public.books (source, title, authors, created_by, details_checked)
       values ('manual', '${title}', array['Ada Author'], '${reader.id}', true) returning id),
     u as (insert into public.user_books (user_id, book_id, status, status_changed_at)
       select '${reader.id}', id, '${status}', now() - interval '${minutesAgo} minutes' from b)
     select id from b`.replace(/\s+/g, " "),
  );
}

function seedReadlist(reader, name) {
  return psql(
    `with r as (insert into public.readlists (owner_id, name) values ('${reader.id}', '${name}') returning id) select id from r`,
  );
}

/** Readlist ids that hold the book, sorted, comma separated ("" for none). */
const listsOf = (bookId) =>
  psql(
    `select coalesce(string_agg(readlist_id::text, ',' order by readlist_id), '') from public.readlist_books where book_id = '${bookId}'`,
  );
const sorted = (...ids) => [...ids].sort().join(",");

const rowOf = (page, title) => page.locator("li", { hasText: title });
const linkOf = (page, title) =>
  page.getByRole("link", { name: new RegExp(title) }).first();
const menuOf = (page, title) => page.getByRole("dialog", { name: title });
const addSheet = (page) =>
  page.getByRole("dialog", { name: "Add to readlist" });

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

/** Real touch input (CDP), so touch-action, scrolling and the browser's own gestures apply. */
async function touchGesture(
  page,
  cdp,
  point,
  { hold = 0, dx = 0, dy = 0, steps = 14 } = {},
) {
  const send = (type, points) =>
    cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points });
  await send("touchStart", [point]);
  if (hold) await page.waitForTimeout(hold);
  if (dx || dy)
    for (let i = 1; i <= steps; i++) {
      await send("touchMove", [
        { x: point.x + (dx * i) / steps, y: point.y + (dy * i) / steps },
      ]);
      await page.waitForTimeout(16);
    }
  await page.waitForTimeout(60);
  await send("touchEnd", []);
  await page.waitForTimeout(350);
}

/** A point on the row's title, away from the status pill. */
async function rowPoint(page, title) {
  const box = await rowOf(page, title).boundingBox();
  return { x: box.x + 110, y: box.y + box.height / 2 };
}

(async () => {
  const report = reporter();
  const errors = [];
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
  });
  const run = Date.now().toString(36);
  const reader = await createReader("lists");
  const titles = {
    one: `Long Press One ${run}`,
    two: `Long Press Two ${run}`,
    three: `Long Press Three ${run}`,
  };
  const ids = {
    one: seedBook(reader, titles.one, "want_to_read", 1),
    two: seedBook(reader, titles.two, "want_to_read", 2),
    three: seedBook(reader, titles.three, "want_to_read", 3),
  };

  const desktop = await browser.newContext({ viewport: VIEWPORT });
  const page = await desktop.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  const shot = (name, p = page) =>
    p.screenshot({ path: `${SHOTS}/readlist-${name}.png` });

  try {
    await logIn(page, reader);

    // C4 empty state (no readlists yet), from the book page (D2).
    await page.goto(`${BASE}/books/${ids.one}`);
    const addButton = page.getByRole("button", { name: "Add to readlist" });
    report.check(
      "D2: '+ Add to readlist' button under My status",
      await visible(addButton),
    );
    report.check(
      "D2: no 'In your readlists' section while the book is in none",
      !(await page.getByText("In your readlists").isVisible()),
    );
    await addButton.click();
    const sheet = addSheet(page);
    report.check(
      "C4 empty state: 'No readlists yet' with the name field open",
      (await visible(sheet.getByText("No readlists yet"))) &&
        (await visible(sheet.getByLabel("Name of the new readlist"))),
    );
    report.check(
      "the name field has a visible label and no placeholder",
      (await sheet
        .getByLabel("Name of the new readlist")
        .getAttribute("placeholder")) === null,
    );
    await shot("01-c4-empty");
    await sheet.getByRole("button", { name: "Done" }).click();
    report.check("Done closes the sheet", !(await sheet.isVisible()));

    const lists = {
      winter: {
        name: `Winter ${run}`,
        id: seedReadlist(reader, `Winter ${run}`),
      },
      holiday: {
        name: `Holiday ${run}`,
        id: seedReadlist(reader, `Holiday ${run}`),
      },
    };

    // B5 on a shelf page with touch.
    const phone = await browser.newContext({
      viewport: VIEWPORT,
      hasTouch: true,
      isMobile: true,
      storageState: await desktop.storageState(),
    });
    await phone.addInitScript(() => {
      window.__vibrations = 0;
      navigator.vibrate = () => {
        window.__vibrations++;
        return true;
      };
    });
    const touchPage = await phone.newPage();
    touchPage.on("pageerror", (e) => errors.push(e.message));
    const touch = await phone.newCDPSession(touchPage);
    const shelf = `${BASE}/books/shelf/want-to-read`;
    await touchPage.goto(shelf);
    await rowOf(touchPage, titles.one).waitFor();

    await touchGesture(
      touchPage,
      touch,
      await rowPoint(touchPage, titles.one),
      {
        hold: 650,
      },
    );
    const touchMenu = menuOf(touchPage, titles.one);
    report.check(
      "touch: a long press opens the book menu",
      await visible(touchMenu, 3000),
    );
    report.check(
      "the menu has Add to readlist, Change status and Open book",
      (await touchMenu
        .getByRole("button", { name: "Add to readlist…" })
        .isVisible()) &&
        (await touchMenu
          .getByRole("button", { name: "Change status…" })
          .isVisible()) &&
        (await touchMenu.getByRole("link", { name: "Open book" }).isVisible()),
    );
    report.check(
      "a long press does not open the book",
      touchPage.url() === shelf,
      touchPage.url(),
    );
    report.check(
      "a light haptic tick on open",
      (await touchPage.evaluate(() => window.__vibrations)) >= 1,
    );
    await shot("02-b5-touch-menu", touchPage);
    await touchMenu.getByRole("button", { name: "Close" }).tap();
    await touchPage.waitForTimeout(300);

    // Hold, then slide sideways while the menu is open: no swipe behind it.
    await touchGesture(
      touchPage,
      touch,
      await rowPoint(touchPage, titles.two),
      {
        hold: 650,
        dx: -160,
      },
    );
    const swipeGroup = (title) =>
      touchPage.getByRole("group", { name: `Change the status of ${title}` });
    const rowOffset = (title) =>
      rowOf(touchPage, title)
        .locator(".touch-pan-y")
        .evaluate((row) => row.style.transform || "none");
    report.check(
      "after a long press, moving the finger does not swipe the row",
      (await visible(menuOf(touchPage, titles.two), 2000)) &&
        ["none", "translate3d(0px, 0px, 0px)"].includes(
          await rowOffset(titles.two),
        ),
      await rowOffset(titles.two),
    );
    await touchPage.keyboard.press("Escape");
    await touchPage.waitForTimeout(300);

    // A short tap still opens the book.
    await touchGesture(
      touchPage,
      touch,
      await rowPoint(touchPage, titles.three),
    );
    report.check(
      "touch: a short tap still opens the book",
      await touchPage
        .waitForURL(`${BASE}/books/${ids.three}`, { timeout: 5000 })
        .then(
          () => true,
          () => false,
        ),
    );
    await touchPage.goto(shelf);
    await rowOf(touchPage, titles.three).waitFor();

    // A swipe still reveals the statuses and does not open the menu.
    const pointThree = await rowPoint(touchPage, titles.three);
    await touchGesture(
      touchPage,
      touch,
      { x: pointThree.x + 200, y: pointThree.y },
      { dx: -150 },
    );
    report.check(
      "touch: a swipe still reveals the statuses, without the menu",
      (await visible(
        swipeGroup(titles.three).getByRole("button", {
          name: "Reading",
          exact: true,
        }),
      )) && !(await menuOf(touchPage, titles.three).isVisible()),
    );
    await shot("03-swipe-still-works", touchPage);
    await touchPage.touchscreen.tap(330, 30);
    await touchPage.waitForTimeout(300);

    // A slow vertical drag (scrolling) does not open the menu either.
    await touchGesture(
      touchPage,
      touch,
      await rowPoint(touchPage, titles.one),
      {
        dx: -4,
        dy: -200,
        steps: 40,
      },
    );
    await touchPage.waitForTimeout(300);
    report.check(
      "touch: a vertical drag longer than a long press does not open the menu",
      !(await menuOf(touchPage, titles.one).isVisible()) &&
        touchPage.url() === shelf,
    );

    // Search results (D1) have the same menu.
    await touchPage.goto(`${BASE}/books/search?q=austen`);
    const results = touchPage.getByRole("list", { name: "Search results" });
    const emmaRow = results.getByRole("listitem").filter({
      has: touchPage.getByRole("link", { name: "Emma Jane Austen" }),
    });
    await emmaRow.waitFor();
    const emmaBox = await emmaRow.boundingBox();
    await touchGesture(
      touchPage,
      touch,
      { x: emmaBox.x + 110, y: emmaBox.y + emmaBox.height / 2 },
      { hold: 650 },
    );
    const emmaMenu = menuOf(touchPage, "Emma");
    report.check(
      "search results: a long press opens the menu",
      (await visible(emmaMenu, 3000)) &&
        touchPage.url().endsWith("/books/search?q=austen"),
    );
    await shot("04-b5-search", touchPage);
    await phone.close();

    // Desktop: right-click and the keyboard.
    await page.goto(shelf);
    await rowOf(page, titles.one).waitFor();
    await linkOf(page, titles.one).click({ button: "right" });
    const menu = menuOf(page, titles.one);
    report.check(
      "desktop: right-click opens the menu instead of the browser menu",
      (await visible(menu, 3000)) && page.url() === shelf,
    );
    await shot("05-b5-right-click");
    await page.keyboard.press("Escape");
    report.check("Escape closes the menu", !(await menu.isVisible()));

    await linkOf(page, titles.two).focus();
    await page.keyboard.press("Shift+F10");
    const keyMenu = menuOf(page, titles.two);
    report.check(
      "keyboard: Shift+F10 on a focused row opens the menu with focus inside",
      (await visible(keyMenu, 3000)) &&
        (await keyMenu.evaluate((dialog) =>
          dialog.contains(document.activeElement),
        )),
    );
    await page.keyboard.press("Escape");
    report.check(
      "closing the menu returns focus to the row",
      await linkOf(page, titles.two).evaluate(
        (link) => link === document.activeElement,
      ),
    );

    // Menu → Change status opens the status sheet (B3).
    await linkOf(page, titles.two).click({ button: "right" });
    await keyMenu.getByRole("button", { name: "Change status…" }).click();
    const statusSheet = page
      .getByRole("dialog", { name: titles.two })
      .filter({ has: page.getByRole("radio", { name: "Reading" }) });
    report.check(
      "menu → Change status opens the status sheet",
      (await visible(statusSheet)) &&
        (await statusSheet
          .getByRole("radio", { name: "Want to read" })
          .isChecked()) &&
        !(await keyMenu
          .getByRole("button", { name: "Change status…" })
          .isVisible()),
    );
    await page.keyboard.press("Escape");

    // Menu → Add to readlist (C4): tick two, untick one, create one.
    await linkOf(page, titles.one).click({ button: "right" });
    await menu.getByRole("button", { name: "Add to readlist…" }).click();
    const winter = sheet.getByRole("checkbox", {
      name: new RegExp(lists.winter.name),
    });
    const holiday = sheet.getByRole("checkbox", {
      name: new RegExp(lists.holiday.name),
    });
    report.check(
      "menu → Add to readlist opens the sheet with the readlists, unticked",
      (await visible(winter)) &&
        !(await winter.isChecked()) &&
        !(await holiday.isChecked()) &&
        (await sheet.getByText(`${titles.one} by Ada Author`).isVisible()),
    );
    const rowBox = await sheet
      .getByRole("listitem")
      .filter({ hasText: lists.winter.name })
      .boundingBox();
    report.check(
      "readlist rows are at least 44 px high",
      rowBox && rowBox.height >= 44,
      rowBox ? `${rowBox.height}px` : "",
    );
    await winter.check();
    await holiday.check();
    report.check(
      "ticking two readlists saves both at once",
      await eventually(
        () => listsOf(ids.one),
        sorted(lists.winter.id, lists.holiday.id),
      ),
    );
    report.check(
      "the counts follow the ticks",
      await visible(
        sheet
          .getByRole("listitem")
          .filter({ hasText: lists.winter.name })
          .getByText("1 book"),
      ),
    );
    await shot("06-c4-ticked");
    await winter.uncheck();
    report.check(
      "unticking removes the book from that readlist",
      await eventually(() => listsOf(ids.one), lists.holiday.id),
    );

    await sheet.getByRole("button", { name: "New readlist" }).click();
    const nameField = sheet.getByLabel("Name of the new readlist");
    report.check(
      "New readlist opens a labelled name field with focus",
      await nameField.evaluate((el) => el === document.activeElement),
    );
    await sheet.getByRole("button", { name: "Create" }).click();
    report.check(
      "an empty name shows an error",
      (await visible(sheet.getByText("Give your readlist a name."))) &&
        (await nameField.getAttribute("aria-invalid")) === "true",
    );
    await shot("07-c4-name-error");
    const newName = `Summer ${run}`;
    await nameField.fill(newName);
    await nameField.press("Enter");
    const summer = sheet.getByRole("checkbox", { name: new RegExp(newName) });
    report.check(
      "Create adds the new readlist ticked, at the top",
      (await visible(summer)) &&
        (await summer.isChecked()) &&
        (await sheet
          .getByRole("checkbox")
          .first()
          .evaluate(
            (el, name) => el.closest("label").textContent.includes(name),
            newName,
          )),
    );
    const summerId = psql(
      `select id from public.readlists where owner_id = '${reader.id}' and name = '${newName}'`,
    );
    report.check(
      "the new readlist holds the book in the database",
      Boolean(summerId) &&
        (await eventually(
          () => listsOf(ids.one),
          sorted(lists.holiday.id, summerId),
        )),
    );
    await shot("08-c4-created");
    await sheet.getByRole("button", { name: "Done" }).click();
    report.check(
      "Done closes the sheet and focus goes back to the row",
      !(await sheet.isVisible()) &&
        (await linkOf(page, titles.one).evaluate(
          (link) => link === document.activeElement,
        )),
    );

    // A failed tick rolls back with a message.
    await linkOf(page, titles.two).click({ button: "right" });
    await keyMenu.getByRole("button", { name: "Add to readlist…" }).click();
    const winterTwo = sheet.getByRole("checkbox", {
      name: new RegExp(lists.winter.name),
    });
    await winterTwo.waitFor();
    await page.route("**/books/shelf/**", (route) =>
      route.request().method() === "POST"
        ? route.abort("failed")
        : route.continue(),
    );
    await winterTwo.check();
    report.check(
      "a failed tick is rolled back with a message",
      (await visible(
        sheet.getByText(
          `Couldn't update ${lists.winter.name}. Please try again.`,
        ),
      )) &&
        !(await winterTwo.isChecked()) &&
        listsOf(ids.two) === "",
    );
    await shot("09-c4-error");
    await page.unrouteAll();
    await page.keyboard.press("Escape");

    // Loading state while the lists load.
    await page.route("**/books/shelf/**", async (route) => {
      if (route.request().method() === "POST")
        await new Promise((r) => setTimeout(r, 1500));
      return route.continue();
    });
    await linkOf(page, titles.two).click({ button: "right" });
    await keyMenu.getByRole("button", { name: "Add to readlist…" }).click();
    report.check(
      "the sheet shows a loading state while the lists load",
      await visible(sheet.getByText("Loading your readlists…"), 1400),
    );
    await shot("10-c4-loading");
    await winterTwo.waitFor();
    await page.unrouteAll();
    await page.keyboard.press("Escape");

    // Menu → Open book.
    await linkOf(page, titles.one).click({ button: "right" });
    await menu.getByRole("link", { name: "Open book" }).click();
    report.check(
      "menu → Open book opens the book page",
      await page.waitForURL(`${BASE}/books/${ids.one}`).then(
        () => true,
        () => false,
      ),
    );

    // D2: In your readlists, and the sheet from the book page.
    await page.reload();
    const section = page.locator("section").filter({
      has: page.getByRole("heading", { name: "In your readlists" }),
    });
    const chip = (name) => section.getByRole("link", { name });
    report.check(
      "D2: 'In your readlists' links to the ticked readlists",
      (await visible(chip(lists.holiday.name))) &&
        (await chip(lists.holiday.name).getAttribute("href")) ===
          `/readlists/${lists.holiday.id}` &&
        (await chip(newName).getAttribute("href")) ===
          `/readlists/${summerId}` &&
        (await chip(lists.winter.name).count()) === 0,
    );
    await shot("11-d2-readlists");
    await page.getByRole("button", { name: "Add to readlist" }).click();
    report.check(
      "D2: '+ Add to readlist' opens the sheet with the current ticks",
      (await visible(
        sheet.getByRole("checkbox", { name: new RegExp(newName) }),
      )) &&
        (await sheet
          .getByRole("checkbox", { name: new RegExp(lists.holiday.name) })
          .isChecked()) &&
        !(await sheet
          .getByRole("checkbox", { name: new RegExp(lists.winter.name) })
          .isChecked()),
    );
    await shot("12-d2-c4");
    await sheet
      .getByRole("checkbox", { name: new RegExp(lists.winter.name) })
      .check();
    await sheet
      .getByRole("checkbox", { name: new RegExp(lists.holiday.name) })
      .uncheck();
    await eventually(() => listsOf(ids.one), sorted(lists.winter.id, summerId));
    await sheet.getByRole("button", { name: "Done" }).click();
    report.check(
      "D2: the section follows the changes made in the sheet",
      (await visible(chip(lists.winter.name))) &&
        (await chip(lists.holiday.name)
          .waitFor({ state: "detached", timeout: 5000 })
          .then(
            () => true,
            () => false,
          )),
    );
    report.check(
      "focus returns to '+ Add to readlist' after Done",
      await page
        .getByRole("button", { name: "Add to readlist" })
        .evaluate((button) => button === document.activeElement),
    );
  } catch (error) {
    report.check("run finished without an exception", false, error.message);
    await shot("99-failure").catch(() => {});
  } finally {
    await browser.close();
    report.finish(errors);
  }
})();
