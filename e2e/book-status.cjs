// End-to-end check of status tracking (Sprint 3: B3, B4, D4, shelf lists, Undo, swipe hint).
// Needs the app with a local Supabase; see e2e/README.md. Prints PASS/FAIL per check.
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

const shelfOf = (bookId) =>
  psql(
    `select coalesce((select status || ':' || coalesce(progress::text, '-') from public.user_books where book_id = '${bookId}'), 'none')`,
  );
const readsOf = (bookId) =>
  Number(psql(`select count(*) from public.reads where book_id = '${bookId}'`));
const readDatesOf = (bookId) =>
  psql(
    `select string_agg(finished_on::text, ',' order by finished_on) from public.reads where book_id = '${bookId}'`,
  );

/** Local YYYY-MM-DD, `days` ago. */
function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const rowOf = (page, title) => page.locator("li", { hasText: title });

/** Drags a row to the left with the mouse (pointer events), from near its right edge. */
async function mouseSwipe(
  page,
  title,
  distance,
  { steps = 20, pause = 60 } = {},
) {
  const box = await rowOf(page, title).boundingBox();
  const x = box.x + box.width - 24;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(x - (distance * i) / steps, y + (i % 3) - 1);
    await page.waitForTimeout(16);
  }
  await page.waitForTimeout(pause);
  await page.mouse.up();
  await page.waitForTimeout(300); // Let the row snap into place.
}

/** Real touch input through the browser's input pipeline (touch-action applies). */
async function touchSwipe(page, cdp, title, dx, dy = 0, steps = 14) {
  const box = await rowOf(page, title).boundingBox();
  const x = box.x + box.width - 24;
  const y = box.y + box.height / 2;
  const send = (type, points) =>
    cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points });
  await send("touchStart", [{ x, y }]);
  for (let i = 1; i <= steps; i++) {
    await send("touchMove", [
      { x: x + (dx * i) / steps, y: y + (dy * i) / steps },
    ]);
    await page.waitForTimeout(16);
  }
  await page.waitForTimeout(60);
  await send("touchEnd", []);
  await page.waitForTimeout(300); // Let the row snap into place.
}

/** True when a tap at the element's centre would hit it (not covered by the row). */
async function onTop(locator) {
  return locator.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const hit = document.elementFromPoint(
      box.x + box.width / 2,
      box.y + box.height / 2,
    );
    return element.contains(hit);
  });
}

const snackbar = (page, text) =>
  page.getByRole("status").filter({ hasText: text });
const pill = (page, title) =>
  page.getByRole("button", {
    name: new RegExp(`change the status of ${title}$`),
  });

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

(async () => {
  const report = reporter();
  const errors = [];
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
  });
  const run = Date.now().toString(36);
  const reader = await createReader("status");
  const titles = {
    one: `Swipe One ${run}`,
    two: `Swipe Two ${run}`,
    three: `Swipe Three ${run}`,
    four: `Swipe Four ${run}`,
    current: `Night Train ${run}`,
  };
  const ids = {
    one: seedBook(reader, titles.one, "want_to_read", 1),
    two: seedBook(reader, titles.two, "want_to_read", 2),
    three: seedBook(reader, titles.three, "want_to_read", 3),
    four: seedBook(reader, titles.four, "want_to_read", 4),
    current: seedBook(reader, titles.current, "reading", 5),
  };

  const ctx = await browser.newContext({ viewport: VIEWPORT });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  const shot = (name, p = page) =>
    p.screenshot({ path: `${SHOTS}/status-${name}.png`, fullPage: true });

  try {
    await logIn(page, reader);

    // Empty shelf and unknown shelf.
    await page.goto(`${BASE}/books/shelf/read`);
    report.check(
      "empty Read shelf shows a friendly empty state",
      await visible(page.getByText("No finished books yet")),
    );
    await shot("01-empty-read");
    const notFound = await page.goto(`${BASE}/books/shelf/finished`);
    report.check("unknown shelf is a 404", notFound.status() === 404);

    // Want to read list with the one-time hint.
    await page.goto(`${BASE}/books/shelf/want-to-read`);
    report.check(
      "Want to read shelf lists the books with a count",
      (await visible(page.getByRole("heading", { name: "Want to read" }))) &&
        (await visible(page.getByText("4 books"))) &&
        (await rowOf(page, "Swipe").count()) === 4,
    );
    const hint = page.getByText("Tip: swipe a book to change its status");
    report.check(
      "the swipe hint shows once, above the first row",
      (await visible(hint)) && (await hint.count()) === 1,
    );
    report.check(
      "back link goes to Home",
      (await page.getByRole("link", { name: "Back" }).getAttribute("href")) ===
        "/",
    );
    await shot("02-want-to-read-hint");
    await page.getByRole("button", { name: "Dismiss tip" }).click();
    report.check("the hint can be dismissed", !(await hint.isVisible()));
    await page.reload();
    await rowOf(page, titles.one).waitFor();
    await page.waitForTimeout(500);
    report.check(
      "a dismissed hint stays away after a reload",
      !(await hint.isVisible()),
    );

    // Mouse swipe: reveal the three statuses, without opening the book.
    const perf = await ctx.newCDPSession(page);
    await perf.send("Performance.enable");
    await page.evaluate(() => {
      const stats = {
        longTasks: 0,
        longest: 0,
        shifts: 0,
        gaps: [],
        running: true,
      };
      window.__drag = stats;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          stats.longTasks++;
          stats.longest = Math.max(stats.longest, entry.duration);
        }
      }).observe({ type: "longtask" });
      new PerformanceObserver((list) => {
        stats.shifts += list.getEntries().length;
      }).observe({ type: "layout-shift" });
      let last = performance.now();
      const tick = (now) => {
        stats.gaps.push(now - last);
        last = now;
        if (stats.running) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    const metric = async () =>
      Object.fromEntries(
        (await perf.send("Performance.getMetrics")).metrics.map((m) => [
          m.name,
          m.value,
        ]),
      );
    const before = await metric();
    await mouseSwipe(page, titles.one, 150, { steps: 30 });
    const after = await metric();
    const drag = await page.evaluate(() => {
      window.__drag.running = false;
      const gaps = window.__drag.gaps.slice(1);
      return {
        longTasks: window.__drag.longTasks,
        longest: Math.round(window.__drag.longest),
        shifts: window.__drag.shifts,
        frames: gaps.length,
        worstFrame: Math.round(Math.max(...gaps)),
      };
    });
    const layouts = after.LayoutCount - before.LayoutCount;
    const styles = after.RecalcStyleCount - before.RecalcStyleCount;
    console.log(
      `  drag: ${layouts} layouts, ${styles} style recalcs, ${drag.longTasks} long tasks, ` +
        `${drag.shifts} layout shifts, ${drag.frames} frames, worst frame ${drag.worstFrame} ms`,
    );
    report.check(
      "dragging is smooth: no long tasks or layout shifts, layout only at start and end",
      drag.longTasks === 0 && drag.shifts === 0 && layouts <= 4,
      `${layouts} layouts / ${styles} style recalcs during a 30-step drag`,
    );
    report.check(
      "a drag does not open the book",
      page.url().endsWith("/books/shelf/want-to-read"),
    );
    const actions = page.getByRole("group", {
      name: `Change the status of ${titles.one}`,
    });
    report.check(
      "swiping left reveals Want to read / Reading / Read",
      (await visible(
        actions.getByRole("button", { name: "Reading", exact: true }),
      )) &&
        (await onTop(
          actions.getByRole("button", { name: "Read", exact: true }),
        )) &&
        (await actions
          .getByRole("button", { name: "Want to read" })
          .getAttribute("aria-pressed")) === "true",
    );
    await shot("03-swipe-revealed");
    await actions.getByRole("button", { name: "Reading", exact: true }).click();
    report.check(
      "tapping Reading moves the book, with an Undo snackbar",
      await visible(snackbar(page, "Moved to Reading")),
    );
    report.check(
      "the database has the new status",
      await eventually(() => shelfOf(ids.one), "reading:-"),
    );
    await shot("04-moved-snackbar");
    await rowOf(page, titles.one).waitFor({ state: "detached" });
    report.check("the book leaves the Want to read list", true);
    await page.getByRole("button", { name: "Undo" }).click();
    report.check(
      "Undo puts the book back",
      (await eventually(() => shelfOf(ids.one), "want_to_read:-")) &&
        (await visible(rowOf(page, titles.one))),
    );

    // Long mouse swipe applies the next status.
    await mouseSwipe(page, titles.two, 320);
    report.check(
      "a long swipe applies the next status (Want to read → Reading)",
      (await visible(snackbar(page, "Moved to Reading"))) &&
        (await eventually(() => shelfOf(ids.two), "reading:-")),
    );

    // Touch: a phone-like context with real touch input and "Reduce motion" on.
    const phone = await browser.newContext({
      viewport: VIEWPORT,
      hasTouch: true,
      isMobile: true,
      reducedMotion: "reduce",
      storageState: await ctx.storageState(),
    });
    const touchPage = await phone.newPage();
    touchPage.on("pageerror", (e) => errors.push(e.message));
    const touch = await phone.newCDPSession(touchPage);
    await touchPage.goto(`${BASE}/books/shelf/want-to-read`);
    await rowOf(touchPage, titles.three).waitFor();
    await touchSwipe(touchPage, touch, titles.three, -150);
    const touchActions = touchPage.getByRole("group", {
      name: `Change the status of ${titles.three}`,
    });
    report.check(
      "touch: a short swipe reveals the statuses",
      (await visible(
        touchActions.getByRole("button", { name: "Reading", exact: true }),
      )) &&
        (await onTop(
          touchActions.getByRole("button", { name: "Want to read" }),
        )),
    );
    report.check(
      "reduce motion: the row snaps without animation",
      (await rowOf(touchPage, titles.three)
        .locator(".touch-pan-y")
        .evaluate((row) => row.style.transition)) === "none",
    );
    await shot("05-touch-revealed", touchPage);
    await touchPage.touchscreen.tap(330, 30); // A tap elsewhere closes the row.
    await touchPage.waitForTimeout(300);
    await touchSwipe(touchPage, touch, titles.three, -320);
    report.check(
      "touch: a long swipe applies the next status",
      (await visible(snackbar(touchPage, "Moved to Reading"))) &&
        (await eventually(() => shelfOf(ids.three), "reading:-")),
    );
    await touchSwipe(touchPage, touch, titles.four, -6, 160);
    await touchPage.waitForTimeout(400);
    report.check(
      "touch: a vertical drag does not change anything",
      shelfOf(ids.four) === "want_to_read:-" &&
        touchPage.url().endsWith("/want-to-read"),
    );
    await touchPage.getByRole("link", { name: new RegExp(titles.four) }).tap();
    await touchPage.waitForURL(`${BASE}/books/${ids.four}`);
    report.check("touch: tapping a row still opens the book", true);
    await phone.close();

    // Reading list: status sheet with the optional percentage.
    await page.goto(`${BASE}/books/shelf/reading`);
    await rowOf(page, titles.current).waitFor();
    await pill(page, titles.current).click();
    const sheet = page.getByRole("dialog", { name: titles.current });
    report.check(
      "the status pill opens the status sheet with Reading selected",
      (await visible(sheet)) &&
        (await sheet.getByRole("radio", { name: "Reading" }).isChecked()),
    );
    const slider = sheet.getByRole("slider", { name: "Progress (optional)" });
    report.check(
      "the progress slider is labelled and starts as Not set",
      (await visible(slider)) &&
        (await slider.getAttribute("aria-valuetext")) === "Not set" &&
        (await visible(sheet.getByText("Only if you like to keep track"))),
    );
    await slider.fill("40");
    report.check(
      "the slider shows its value",
      (await slider.getAttribute("aria-valuetext")) === "40%",
    );
    await shot("06-status-sheet");
    await sheet.getByRole("button", { name: "Save" }).click();
    report.check(
      "Save shows the percentage on the row at once",
      await visible(
        pill(page, titles.current).getByText("Reading · 40%"),
        1500,
      ),
    );
    report.check(
      "the percentage is saved",
      (await visible(snackbar(page, "Progress saved"))) &&
        (await eventually(() => shelfOf(ids.current), "reading:40")),
    );
    await shot("07-row-40");
    await pill(page, titles.current).click();
    await sheet.getByRole("button", { name: "Clear progress" }).click();
    report.check(
      "Clear resets the percentage to Not set",
      (await slider.getAttribute("aria-valuetext")) === "Not set",
    );
    await sheet.getByRole("button", { name: "Save" }).click();
    report.check(
      "a cleared percentage is saved",
      await eventually(() => shelfOf(ids.current), "reading:-"),
    );

    // Remove from my books + Undo.
    await pill(page, titles.current).click();
    await sheet.getByRole("button", { name: "Remove from my books" }).click();
    report.check(
      "Remove takes the book off the shelf",
      (await visible(snackbar(page, "Removed from your books"))) &&
        (await eventually(() => shelfOf(ids.current), "none")),
    );
    await page.getByRole("button", { name: "Undo" }).click();
    report.check(
      "Undo after Remove brings the book back",
      (await eventually(() => shelfOf(ids.current), "reading:-")) &&
        (await visible(rowOf(page, titles.current))),
    );

    // Read → mark-as-read sheet with a past date.
    const finishedOn = daysAgo(9);
    await pill(page, titles.two).click();
    const twoSheet = page.getByRole("dialog", { name: titles.two });
    await twoSheet.getByRole("radio", { name: "Read", exact: true }).check();
    await twoSheet.getByRole("button", { name: "Continue" }).click();
    const markSheet = page.getByRole("dialog", { name: "Mark as read" });
    const dateField = markSheet.getByLabel("Finished on");
    report.check(
      "Read continues to the mark-as-read sheet with today as default",
      (await visible(markSheet)) &&
        (await dateField.inputValue()) === daysAgo(0) &&
        (await dateField.getAttribute("max")) === daysAgo(0) &&
        !(await markSheet.getByText("You read this book before").isVisible()),
    );
    await dateField.fill(daysAgo(-3));
    await markSheet.getByRole("button", { name: "Mark as read" }).click();
    report.check(
      "a finish date in the future is refused",
      await visible(
        markSheet.getByText("The finish date cannot be in the future."),
      ),
    );
    await dateField.fill(finishedOn);
    await shot("08-mark-as-read");
    await markSheet.getByRole("button", { name: "Mark as read" }).click();
    report.check(
      "marking as read saves one read on the chosen date",
      (await visible(snackbar(page, "Marked as read"))) &&
        (await eventually(() => readDatesOf(ids.two), finishedOn)) &&
        shelfOf(ids.two) === "read:-",
    );

    // Undo of mark as read.
    await rowOf(page, titles.three).waitFor();
    await mouseSwipe(page, titles.three, 150);
    await page
      .getByRole("group", { name: `Change the status of ${titles.three}` })
      .getByRole("button", { name: "Read", exact: true })
      .click();
    await markSheet.getByRole("button", { name: "Mark as read" }).click();
    await visible(snackbar(page, "Marked as read"));
    await eventually(() => readsOf(ids.three), 1);
    await page.getByRole("button", { name: "Undo" }).click();
    report.check(
      "Undo after mark as read removes the read and restores Reading",
      (await eventually(() => readsOf(ids.three), 0)) &&
        (await eventually(() => shelfOf(ids.three), "reading:-")),
    );

    // Read shelf, re-read through a long swipe.
    await page.goto(`${BASE}/books/shelf/read`);
    report.check(
      "the book appears on the Read shelf",
      await visible(rowOf(page, titles.two)),
    );
    await mouseSwipe(page, titles.two, 320);
    report.check(
      "a long swipe on a read book opens the sheet with the re-read note",
      (await visible(markSheet)) &&
        (await visible(markSheet.getByText("You read this book before"))),
    );
    await shot("09-re-read");
    await markSheet.getByRole("button", { name: "Mark as read" }).click();
    report.check(
      "a re-read counts as a second read",
      (await visible(snackbar(page, "Marked as read again"))) &&
        (await eventually(() => readsOf(ids.two), 2)),
    );
    await shot("10-read-shelf");

    // Remove a read book: status and reads go, Undo restores both.
    await pill(page, titles.two).click();
    await page
      .getByRole("dialog", { name: titles.two })
      .getByRole("button", { name: "Remove from my books" })
      .click();
    const removed =
      (await eventually(() => readsOf(ids.two), 0)) &&
      (await eventually(() => shelfOf(ids.two), "none"));
    await page.getByRole("button", { name: "Undo" }).click();
    report.check(
      "Remove deletes the reads too, and Undo restores them with their dates",
      removed &&
        (await eventually(() => readsOf(ids.two), 2)) &&
        readDatesOf(ids.two) === [finishedOn, daysAgo(0)].sort().join(",") &&
        shelfOf(ids.two) === "read:-",
    );

    // Keyboard only.
    await page.goto(`${BASE}/books/shelf/reading`);
    await rowOf(page, titles.current).waitFor();
    await pill(page, titles.current).focus();
    await page.keyboard.press("Enter");
    const kbSheet = page.getByRole("dialog", { name: titles.current });
    await kbSheet.getByRole("radio", { name: "Want to read" }).focus();
    await page.keyboard.press("Space");
    await kbSheet.getByRole("button", { name: "Save" }).focus();
    await page.keyboard.press("Enter");
    report.check(
      "keyboard: the status sheet changes the status without swiping",
      await eventually(() => shelfOf(ids.current), "want_to_read:-"),
    );
    // Hidden swipe buttons are inert: Tab goes from one row straight to the next.
    const link = rowOf(page, titles.three).getByRole("link");
    await link.focus();
    await page.keyboard.press("Shift+Tab");
    const previous = await page.evaluate(() => ({
      inert: Boolean(document.activeElement?.closest("[inert]")),
      name: document.activeElement?.textContent,
    }));
    report.check(
      "swipe buttons stay out of the keyboard order until revealed",
      !previous.inert &&
        !["Want to read", "Reading", "Read"].includes(previous.name),
      `Shift+Tab from a row lands on "${previous.name}"`,
    );

    // Optimistic: the row changes before the server answers, and rolls back on an error.
    await page.goto(`${BASE}/books/shelf/want-to-read`);
    await rowOf(page, titles.current).waitFor();
    let serverAnswer = "slow";
    await page.route("**/books/shelf/**", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      if (serverAnswer === "fail") return route.abort("failed");
      await new Promise((r) => setTimeout(r, 2000));
      return route.continue();
    });
    await mouseSwipe(page, titles.current, 320);
    const releasedAt = Date.now() - 300; // mouseSwipe waits 300 ms after letting go.
    const shownAt = await pill(page, titles.current)
      .getByText("Reading", { exact: true })
      .waitFor({ timeout: 1500 })
      .then(() => Date.now() - releasedAt);
    report.check(
      "optimistic: the new status shows before the server answers",
      shelfOf(ids.current) === "want_to_read:-",
      `shown within ${shownAt} ms of letting go; the server answer was delayed 2 s`,
    );
    await eventually(() => shelfOf(ids.current), "reading:-");
    await visible(snackbar(page, "Moved to Reading"));
    await page.getByRole("button", { name: "Undo" }).click();
    await eventually(() => shelfOf(ids.current), "want_to_read:-");
    await rowOf(page, titles.current).waitFor();
    serverAnswer = "fail";
    await mouseSwipe(page, titles.current, 320);
    report.check(
      "an error rolls the row back and shows the error",
      (await visible(snackbar(page, "Something went wrong"))) &&
        (await visible(pill(page, titles.current).getByText("Want to read"))) &&
        shelfOf(ids.current) === "want_to_read:-",
    );
    await shot("11-error-rolled-back");
    await page.unrouteAll();
  } catch (error) {
    report.check("run finished without an exception", false, error.message);
    await shot("99-failure").catch(() => {});
  } finally {
    await browser.close();
    report.finish(errors);
  }
})();
