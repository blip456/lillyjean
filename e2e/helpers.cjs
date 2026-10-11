// Shared helpers for the end-to-end checks (local Supabase only). See e2e/README.md.
const { execSync } = require("node:child_process");

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const API = "http://127.0.0.1:54321";

/** Local Supabase keys from `supabase status`; never production. */
function localKeys() {
  const status = JSON.parse(
    execSync("pnpm exec supabase status -o json", {
      stdio: ["ignore", "pipe", "ignore"],
    }).toString(),
  );
  return { secret: status.SECRET_KEY, publishable: status.PUBLISHABLE_KEY };
}

const psql = (sql) =>
  execSync(`docker exec supabase_db_lillyjean psql -U postgres -tAc "${sql}"`)
    .toString()
    .trim();

/**
 * Creates a confirmed account with a username (onboarding done) through the local Auth admin
 * API, so a check can start on Home without the sign-up emails. `pledge` is optional.
 */
async function createReader(prefix, { pledge } = {}) {
  const run = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const email = `${prefix}.${run}@example.test`;
  const password = "a calm reading evening";
  const username = `${prefix}_${run}`.toLowerCase().slice(0, 20);
  const { secret } = localKeys();
  const response = await fetch(`${API}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: secret,
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  const user = await response.json();
  if (!response.ok) throw new Error(`createReader: ${JSON.stringify(user)}`);
  psql(
    `update public.profiles set username = '${username}' where id = '${user.id}'`,
  );
  if (pledge)
    psql(
      `insert into public.reading_pledges (user_id, year, goal) values ('${user.id}', extract(year from now())::int, ${Number(pledge)})`,
    );
  return { id: user.id, email, password, username };
}

/** Logs in through the app's own form and waits for Home. */
async function logIn(page, reader) {
  await page.goto(`${BASE}/login`);
  await page.getByLabel("Email").fill(reader.email);
  await page.getByLabel("Password", { exact: true }).fill(reader.password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(`${BASE}/`);
}

/** Collects PASS/FAIL lines and prints them; exits 1 when something failed. */
function reporter() {
  const results = [];
  return {
    check(name, ok, extra = "") {
      results.push([ok ? "PASS" : "FAIL", name, extra]);
    },
    finish(errors = []) {
      for (const [status, name, extra] of results)
        console.log(`${status}  ${name}${extra ? `  (${extra})` : ""}`);
      if (errors.length) console.log("Page errors:", errors);
      const failed = results.filter(([s]) => s === "FAIL").length;
      console.log(`\n${results.length - failed}/${results.length} passed`);
      process.exitCode = failed || errors.length ? 1 : 0;
    },
  };
}

const visible = (locator, timeout = 8000) =>
  locator.waitFor({ timeout }).then(
    () => true,
    () => false,
  );

module.exports = { BASE, createReader, logIn, psql, reporter, visible };
