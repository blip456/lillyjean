import "server-only";

import { redirect } from "next/navigation";

import { getCurrentAccount } from "@/lib/profile";

/** Signed in and not deleted; onboarding may still be open. */
export async function requireAccount() {
  const account = await getCurrentAccount();
  if (!account) redirect("/welcome");
  if (account.profile.deleted_at) redirect("/auth/signout?reason=deleted");
  return account;
}

/** Signed in with a finished library card (username chosen). */
export async function requireOnboardedAccount() {
  const account = await requireAccount();
  if (!account.profile.username) redirect("/onboarding/library-card");
  return account;
}

export async function requireAdmin() {
  const account = await requireOnboardedAccount();
  if (account.profile.role !== "admin") redirect("/settings");
  return account;
}
