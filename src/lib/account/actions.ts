"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { authErrorKey } from "@/lib/auth/errors";
import type { FormState } from "@/lib/auth/form-state";
import { APP_VERSION } from "@/lib/release/version";
import { createClient } from "@/lib/supabase/server";
import {
  emailSchema,
  feedbackSchema,
  firstError,
  passwordSchema,
  pledgeSchema,
  usernameSchema,
} from "@/lib/validation";

const contextSchema = z.enum(["onboarding", "settings"]).catch("settings");

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/** Validates the session from the JWT claims (no extra round trip to Supabase Auth). */
async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/welcome");
  return { supabase, user: { id: claims.sub, email: claims.email } };
}

/**
 * Pages stay in the client cache for a short while (staleTimes in next.config.ts);
 * drop them after a change so no screen shows the old value.
 */
function refreshPages() {
  revalidatePath("/", "layout");
}

/** Database rule violations raised by the profiles trigger and constraints. */
function usernameErrorKey(error: PostgrestError) {
  if (error.code === "23505") return "usernameTaken";
  if (error.message.includes("username_cooldown")) return "usernameCooldown";
  if (error.message.includes("username_reserved")) return "usernameReserved";
  if (error.message.includes("username_format")) return "usernameFormat";
  return "unknown";
}

export async function saveUsername(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = contextSchema.parse(field(formData, "context"));
  const username = usernameSchema.safeParse(field(formData, "username"));
  if (!username.success)
    return { fieldErrors: { username: firstError(username.error) } };

  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("profiles")
    .update({ username: username.data })
    .eq("id", user.id);
  if (error) return { fieldErrors: { username: usernameErrorKey(error) } };

  refreshPages();
  redirect(
    context === "onboarding"
      ? "/onboarding/currently-reading"
      : "/settings?changed=username",
  );
}

export async function savePledge(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = contextSchema.parse(field(formData, "context"));
  const noGoal = field(formData, "intent") === "no-goal";
  const year = new Date().getFullYear();
  const { supabase, user } = await requireUser();

  if (noGoal) {
    const { error } = await supabase
      .from("reading_pledges")
      .delete()
      .eq("user_id", user.id)
      .eq("year", year);
    if (error) return { error: "unknown" };
  } else {
    const goal = pledgeSchema.safeParse(field(formData, "goal"));
    if (!goal.success) return { fieldErrors: { goal: firstError(goal.error) } };
    const { error } = await supabase.from("reading_pledges").upsert({
      user_id: user.id,
      year,
      goal: goal.data,
      updated_at: new Date().toISOString(),
    });
    if (error) return { error: "unknown" };
  }

  refreshPages();
  redirect(context === "onboarding" ? "/" : "/settings?changed=pledge");
}

export async function changeEmail(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = emailSchema.safeParse(field(formData, "email"));
  if (!email.success)
    return { fieldErrors: { email: firstError(email.error) } };

  const { supabase, user } = await requireUser();
  if (email.data === user.email) return { fieldErrors: { email: "sameEmail" } };

  const { error } = await supabase.auth.updateUser({ email: email.data });
  // An address that belongs to another account is not revealed (A7).
  const existingAccount = ["email_exists", "user_already_exists"].includes(
    error?.code ?? "",
  );
  if (error && !existingAccount) return { error: authErrorKey(error) };

  redirect(`/verify?flow=email_change&email=${encodeURIComponent(email.data)}`);
}

/** Confirms the current password by signing in again; also refreshes the session. */
async function checkPassword(email: string, password: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return !error;
}

export async function changePassword(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const current = field(formData, "current");
  const next = passwordSchema.safeParse(field(formData, "password"));
  if (!next.success)
    return { fieldErrors: { password: firstError(next.error) } };

  const { supabase, user } = await requireUser();
  if (!(await checkPassword(user.email ?? "", current))) {
    return { fieldErrors: { current: "currentPassword" } };
  }

  const { error } = await supabase.auth.updateUser({ password: next.data });
  if (error) {
    const key = authErrorKey(error);
    return key === "passwordWeak" || key === "samePassword"
      ? { fieldErrors: { password: key } }
      : { error: key };
  }

  redirect("/settings?changed=password");
}

export async function sendFeedback(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const message = feedbackSchema.safeParse(field(formData, "message"));
  if (!message.success)
    return { fieldErrors: { message: firstError(message.error) } };

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("feedback")
    .insert({ message: message.data, app_version: APP_VERSION });
  if (error) return { error: "unknown" };

  refreshPages();
  redirect("/settings?changed=feedback");
}

export async function deleteAccount(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, user } = await requireUser();
  if (!(await checkPassword(user.email ?? "", field(formData, "password")))) {
    return { fieldErrors: { password: "currentPassword" } };
  }

  const { error } = await supabase.rpc("request_account_deletion");
  if (error) return { error: "unknown" };

  await supabase.auth.signOut({ scope: "local" });
  redirect("/welcome?deleted=1");
}
