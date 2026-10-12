// End-to-end check of the Sprint 2 account flows. See e2e/README.md for how to run it.
const { chromium } = require(process.env.PW ?? "playwright");
const { execSync } = require("node:child_process");

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const MAIL = "http://127.0.0.1:54324/api/v1";
const SHOTS = process.env.SHOTS ?? "e2e/screenshots";
require("node:fs").mkdirSync(SHOTS, { recursive: true });
const run = Date.now().toString(36);
const userA = `reader.${run}@example.test`;
const userB = `second.${run}@example.test`;
const PASS = "a calm reading evening";
const PASS2 = "another quiet library day";

const results = [];
const check = (name, ok, extra = "") => {
  results.push([ok ? "PASS" : "FAIL", name, extra]);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const visible = (locator) =>
  locator.waitFor({ timeout: 8000 }).then(
    () => true,
    () => false,
  );

async function latestCode(email, after) {
  for (let i = 0; i < 30; i++) {
    const list = await (
      await fetch(`${MAIL}/search?query=${encodeURIComponent("to:" + email)}`)
    ).json();
    const msg = (list.messages || []).find(
      (m) => new Date(m.Created).getTime() >= after,
    );
    if (msg) {
      const full = await (await fetch(`${MAIL}/message/${msg.ID}`)).json();
      const code = (full.Text || full.HTML || "").match(/\b(\d{6})\b/);
      if (code) return { code: code[1], subject: msg.Subject };
    }
    await sleep(500);
  }
  throw new Error("no email for " + email);
}

const psql = (sql) =>
  execSync(`docker exec supabase_db_lillyjean psql -U postgres -tAc "${sql}"`)
    .toString()
    .trim();

(async () => {
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

  try {
    // 1. Sign up
    await page.goto(BASE + "/");
    check(
      "signed-out visitors land on Welcome",
      page.url().endsWith("/welcome"),
    );
    await shot("01-welcome");
    await page.getByRole("link", { name: "Create account" }).click();
    await page.getByLabel("Email").fill(userA);
    await page.getByLabel("Password", { exact: true }).fill("short");
    await page.getByRole("button", { name: "Create account" }).click();
    await page
      .getByText("Use at least 12 characters.")
      .waitFor({ timeout: 5000 });
    check("short password is rejected inline", true);
    check(
      "the email is kept after an error",
      (await page.getByLabel("Email").inputValue()) === userA,
    );
    await page.getByLabel("Password", { exact: true }).fill(PASS);
    let t0 = Date.now() - 2000;
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL(/\/verify\?flow=signup/);
    await shot("02-verify");
    const signupMail = await latestCode(userA, t0);
    check(
      "sign-up email contains a 6-digit code",
      Boolean(signupMail.code),
      signupMail.subject,
    );
    await page.getByLabel("6-digit code").fill("000000");
    await page.waitForTimeout(800);
    check(
      "wrong code shows an error",
      await visible(page.getByText(/This code is not right/)),
    );
    await page.getByLabel("6-digit code").fill(signupMail.code); // auto-submits on 6 digits
    await page.waitForURL(/\/onboarding\/library-card/);
    check("after the code, onboarding starts with the library card", true);

    // 2. Onboarding
    const username = `r_${run}`.slice(0, 20);
    await page.getByLabel("Username").fill("admin");
    await page.getByText("Taken").waitFor({ timeout: 5000 });
    check(
      "reserved usernames show as taken and cannot be saved",
      await page.getByRole("button", { name: "Continue" }).isDisabled(),
    );
    await page.getByLabel("Username").fill("a b");
    check(
      "invalid usernames cannot be saved",
      await page.getByRole("button", { name: "Continue" }).isDisabled(),
    );
    await page.getByLabel("Username").fill(username);
    await page.getByText("Available").waitFor({ timeout: 5000 });
    check("live availability check says Available", true);
    await shot("03-library-card");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL(/\/onboarding\/currently-reading/);
    check(
      "Currently reading is step 2 of 3 and can be skipped",
      await visible(page.getByText("2 of 3")),
    );
    await page.getByRole("link", { name: "Skip" }).click();
    await page.waitForURL(/\/onboarding\/pledge/);
    await page.getByRole("button", { name: "One book more" }).click();
    await shot("04-pledge");
    await page.getByRole("button", { name: "Finish" }).click();
    await page.waitForURL(BASE + "/");
    check("Home shows the pledge", await visible(page.getByText("0 of 13")));
    await shot("05-home");

    // 3. Profile and settings
    await page.getByRole("link", { name: "Open your profile" }).click();
    check(
      "profile shows the library card",
      await visible(page.getByText(`@${username}`).first()),
    );
    await shot("06-profile");
    await page.getByRole("link", { name: "Settings" }).click();
    await shot("07-settings");
    check(
      "admin link is hidden for regular users",
      (await page.getByRole("link", { name: "Admin" }).count()) === 0,
    );

    await page.getByRole("link", { name: /Yearly pledge/ }).click();
    await page.getByRole("button", { name: "No goal, just reading" }).click();
    await page.waitForURL(/changed=pledge/);
    check(
      "pledge can be switched to no goal",
      await visible(page.getByText("No goal").first()),
    );

    await page.getByRole("link", { name: "Send feedback" }).click();
    await page
      .getByLabel("Your feedback")
      .fill("The library card feels great.");
    await page.getByRole("button", { name: "Send" }).click();
    await page.waitForURL(/changed=feedback/);
    check(
      "feedback is sent",
      await visible(page.getByText("Thanks! We read every message.")),
    );

    await page.getByRole("link", { name: /^Username/ }).click();
    await page.getByLabel("New username").fill(username + "x");
    await page.getByText("Available").waitFor({ timeout: 5000 });
    await page.getByRole("button", { name: "Save" }).click();
    await page.waitForURL(/changed=username/);
    await page.getByRole("link", { name: /^Username/ }).click();
    check(
      "username cooldown is shown after a change",
      await visible(page.getByText(/You can change it again on/)),
    );
    check(
      "save is disabled during the cooldown",
      await page.getByRole("button", { name: "Save" }).isDisabled(),
    );
    await shot("08-username-cooldown");
    await page.goto(BASE + "/settings");

    await page.getByRole("link", { name: /^Password/ }).click();
    await page.getByLabel("Current password").fill("wrong password here");
    await page.getByLabel("New password").fill(PASS2);
    await page.getByRole("button", { name: "Save" }).click();
    check(
      "wrong current password is rejected",
      await visible(page.getByText("Your current password is not right.")),
    );
    await page.getByLabel("Current password").fill(PASS);
    await page.getByRole("button", { name: "Save" }).click();
    await page.waitForURL(/changed=password/);
    check("password can be changed", true);

    // 4. Admin
    psql(
      `update public.profiles set role = 'admin' where username = '${username}x'`,
    );
    await page.goto(BASE + "/settings");
    await page.getByRole("link", { name: "Admin" }).click();
    await page.getByRole("link", { name: /Feedback/ }).click();
    check(
      "admin sees the feedback list",
      await visible(page.getByText("The library card feels great.").first()),
    );
    await page.getByRole("link", { name: "Oldest first" }).click();
    check(
      "sort toggle switches to oldest first",
      await page.waitForURL(/sort=oldest/).then(
        () => true,
        () => false,
      ),
    );
    await shot("09-admin-feedback");

    // 5. Sign out, wrong password, log in, guest pages redirect
    await page.goto(BASE + "/settings");
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL(/\/welcome/);
    await page.goto(BASE + "/login");
    await page.getByLabel("Email").fill(userA);
    await page.getByLabel("Password", { exact: true }).fill(PASS);
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    check(
      "old password no longer works (neutral message)",
      await visible(page.getByText("Email or password is not right.")),
    );
    await page.getByLabel("Password", { exact: true }).fill(PASS2);
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await page.waitForURL(BASE + "/");
    await page.goto(BASE + "/login");
    check(
      "signed-in users are sent away from guest pages",
      page.url() === BASE + "/",
    );

    // 6. Email change (only the new address confirms, A8)
    await page.goto(BASE + "/settings/email");
    t0 = Date.now() - 2000;
    await page.getByLabel("New email").fill(userB);
    await page.getByRole("button", { name: "Send code" }).click();
    await page.waitForURL(/flow=email_change/);
    const changeMail = await latestCode(userB, t0);
    await page.getByLabel("6-digit code").fill(changeMail.code);
    await page.waitForURL(/changed=email/);
    check(
      "email change confirmed with a code to the new address",
      await visible(page.getByText(userB)),
    );

    // 7. Code login and password reset (fresh browser = signed out)
    await page.goto(BASE + "/settings");
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL(/\/welcome/);
    await page.goto(BASE + "/login/code");
    t0 = Date.now() - 2000;
    await page.getByLabel("Email").fill(userB);
    await page.getByRole("button", { name: "Send code" }).click();
    await page.waitForURL(/flow=login/);
    check(
      "resend is on cooldown right after sending",
      await page.getByRole("button", { name: /Resend code in/ }).isDisabled(),
    );
    const loginMail = await latestCode(userB, t0);
    await page.getByLabel("6-digit code").fill(loginMail.code);
    await page.waitForURL(BASE + "/");
    check("log in with an email code", true);
    await page.goto(BASE + "/settings");
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL(/\/welcome/);

    await sleep(61000); // Supabase allows one email per address per 60 s
    await page.goto(BASE + "/forgot-password");
    t0 = Date.now() - 2000;
    await page.getByLabel("Email").fill(userB);
    await page.getByRole("button", { name: "Send code" }).click();
    await page.waitForURL(/flow=recovery/);
    const resetMail = await latestCode(userB, t0);
    await page.getByLabel("6-digit code").fill(resetMail.code);
    await page.waitForURL(/\/reset-password/);
    await page.getByLabel("New password").fill(PASS);
    await page.getByRole("button", { name: "Save and log in" }).click();
    await page.waitForURL(BASE + "/");
    check("password reset with a code logs you in", true);

    // 8. Unknown email stays neutral
    await page.goto(BASE + "/settings");
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL(/\/welcome/);
    await page.goto(BASE + "/forgot-password");
    await page.getByLabel("Email").fill(`nobody.${run}@example.test`);
    await page.getByRole("button", { name: "Send code" }).click();
    await page.waitForURL(/flow=recovery/);
    check(
      "unknown email gets the same code screen",
      await visible(page.getByText(/If this address can be used/)),
    );

    // 8b. What's new banner (P31) and PWA manifest
    await page.goto(BASE + "/login");
    await page.getByLabel("Email").fill(userB);
    await page.getByLabel("Password", { exact: true }).fill(PASS);
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await page.waitForURL(BASE + "/");
    check(
      "no What's new banner on a first visit",
      (await page.getByText("see what's new").count()) === 0,
    );
    await page.evaluate(() =>
      localStorage.setItem("lillyjean:last-seen-version", "0.0.1"),
    );
    await page.goto(BASE + "/");
    check(
      "What's new banner after an update",
      await visible(page.getByText("see what's new")),
    );
    await page.getByRole("button", { name: "Dismiss" }).click();
    await page.goto(BASE + "/");
    check(
      "banner stays away after dismissing",
      (await page.getByText("see what's new").count()) === 0,
    );
    const manifest = await (await fetch(BASE + "/manifest.webmanifest")).json();
    const iconStatuses = await Promise.all(
      manifest.icons.map((i) => fetch(BASE + i.src).then((r) => r.status)),
    );
    check(
      "manifest is installable (standalone, icons reachable)",
      manifest.display === "standalone" && iconStatuses.every((s) => s === 200),
      iconStatuses.join(","),
    );
    await page.goto(BASE + "/settings");
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL(/\/welcome/);

    // 9. Delete account
    await page.goto(BASE + "/login");
    await page.getByLabel("Email").fill(userB);
    await page.getByLabel("Password", { exact: true }).fill(PASS);
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await page.waitForURL(BASE + "/");
    await page.goto(BASE + "/settings/delete-account");
    await shot("10-delete-account");
    await page.getByLabel("Password", { exact: true }).fill(PASS);
    await page.getByRole("button", { name: "Delete my account" }).click();
    await page.waitForURL(/deleted=1/);
    check(
      "deleting the account signs you out with a notice",
      await visible(page.getByText(/Your account is closed/)),
    );
    await page.goto(BASE + "/login");
    await page.getByLabel("Email").fill(userB);
    await page.getByLabel("Password", { exact: true }).fill(PASS);
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await page.waitForURL(/\/welcome\?deleted=1/);
    check("a deleted account cannot use the app", true);
  } catch (e) {
    check("unexpected error", false, e.message.split("\n")[0]);
    await shot("zz-error");
  }

  check("no client-side errors", errors.length === 0, errors.join(" | "));
  for (const [s, n, x] of results) console.log(s, "-", n, x ? `(${x})` : "");
  await browser.close();
  process.exitCode = results.some(([s]) => s === "FAIL") ? 1 : 0;
})();
