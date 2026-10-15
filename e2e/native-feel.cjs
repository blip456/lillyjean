// End-to-end check that the installed app behaves like an app, not a web page (P47): no swipe
// from the screen edge to the previous page (iOS), taps on the edge still work, no text selection
// or link preview on a long press except in fields and longer texts, no rubber band or
// double-tap zoom. Emulates an iPhone with the app on the home screen. See e2e/README.md.
const { chromium } = require(process.env.PW ?? "playwright");

const { BASE, createReader, logIn, reporter } = require("./helpers.cjs");

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";

(async () => {
  const { check, finish } = reporter();
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
  });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: IPHONE_UA,
    hasTouch: true,
    isMobile: true,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const cdp = await ctx.newCDPSession(page);
  // The app on the home screen: iOS sets navigator.standalone (Chromium cannot emulate the
  // display-mode media feature). `?tab` in the URL switches it off, as in a browser tab.
  await ctx.addInitScript(() => {
    if (!location.search.includes("tab"))
      Object.defineProperty(navigator, "standalone", { get: () => true });
  });

  /** Real touch (CDP); returns whether the app cancelled its start. */
  async function touch(x, y, { dx = 0 } = {}) {
    await page.evaluate(() => {
      window.__cancelled = null;
      window.addEventListener(
        "touchstart",
        (event) => (window.__cancelled = event.defaultPrevented),
        { once: true },
      );
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    if (dx)
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: x + dx, y }],
      });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    return page.evaluate(() => window.__cancelled);
  }
  const style = (selector, property) =>
    page
      .locator(selector)
      .first()
      .evaluate(
        (el, prop) => getComputedStyle(el).getPropertyValue(prop),
        property,
      );

  try {
    const reader = await createReader("native");
    await logIn(page, reader);
    await page.goto(`${BASE}/books/shelf/reading`);
    await page.waitForLoadState("networkidle");

    check(
      "the emulated app runs from the home screen",
      await page.evaluate(() => navigator.standalone === true),
    );
    check(
      "a touch starting at the left edge is cancelled (no swipe back)",
      (await touch(5, 400, { dx: 120 })) === true,
    );
    check(
      "a touch starting at the right edge is cancelled (no swipe forward)",
      (await touch(386, 400, { dx: -120 })) === true,
    );
    check(
      "a touch in the middle is left alone (scrolling, swiping rows)",
      (await touch(195, 400)) === false,
    );
    check(
      "the page did not change while swiping from the edges",
      page.url() === `${BASE}/books/shelf/reading`,
      page.url(),
    );

    const back = page.getByRole("link", { name: "Back" });
    const box = await back.boundingBox();
    check(
      "← sits partly in the left edge strip",
      box !== null && box.x < 24,
      JSON.stringify(box),
    );
    await touch(Math.max(2, box.x + 4), box.y + box.height / 2);
    await page.waitForURL(`${BASE}/`).catch(() => {});
    check(
      "a tap on ← in the edge strip still works",
      page.url() === `${BASE}/`,
      page.url(),
    );

    check(
      // -webkit-touch-callout (link preview, "Save image") is WebKit-only: check it on an iPhone.
      "no text selection on a long press",
      (await style("body", "user-select")) === "none" &&
        (await style("a", "user-select")) === "none",
    );
    check(
      "no rubber band, pull-to-refresh or double-tap zoom",
      (await style("html", "overscroll-behavior-y")) === "none" &&
        (await style("html", "overscroll-behavior-x")) === "none" &&
        (await style("html", "touch-action")) === "manipulation",
    );

    await page.goto(`${BASE}/books/search?q=austen`);
    check(
      "fields can still be selected and edited",
      (await style("input[type=search]", "user-select")) === "text",
    );
    await page.getByRole("link", { name: /Emma/ }).first().click();
    await page.waitForURL(/\/books\/[0-9a-f-]{36}$/);
    const description = page.locator("p.select-text").first();
    check(
      "a book description can still be selected and copied",
      (await description.count()) === 1 &&
        (await description.evaluate(
          (el) => getComputedStyle(el).userSelect,
        )) === "text",
    );

    // In a browser tab (not installed), the browser's own back swipe is left alone.
    await page.goto(`${BASE}/books/shelf/reading?tab`);
    await page.waitForLoadState("networkidle");
    check(
      "in a browser tab, edge touches are left to the browser",
      (await touch(5, 400)) === false,
    );
  } catch (error) {
    check("unexpected error", false, error.message.split("\n")[0]);
  }

  check("no client-side errors", errors.length === 0, errors.join(" | "));
  await browser.close();
  finish();
})();
