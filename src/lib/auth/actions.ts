"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  codeFlowSchema,
  codeSchema,
  type CodeFlow,
  emailSchema,
  firstError,
  passwordSchema,
} from "@/lib/validation";

import { authErrorKey } from "./errors";
import type { FormState } from "./form-state";

function verifyUrl(flow: CodeFlow, email: string) {
  return `/verify?flow=${flow}&email=${encodeURIComponent(email)}`;
}

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function signUp(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = emailSchema.safeParse(field(formData, "email"));
  const password = passwordSchema.safeParse(field(formData, "password"));
  if (!email.success || !password.success) {
    return {
      fieldErrors: {
        ...(email.success ? {} : { email: firstError(email.error) }),
        ...(password.success ? {} : { password: firstError(password.error) }),
      },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: email.data,
    password: password.data,
  });

  // Existing accounts are not revealed (A7): those continue to the same code screen.
  const existingAccount = ["user_already_exists", "email_exists"].includes(
    error?.code ?? "",
  );
  if (error && !existingAccount) {
    const key = authErrorKey(error);
    return key === "passwordWeak"
      ? { fieldErrors: { password: key } }
      : { error: key };
  }

  redirect(verifyUrl("signup", email.data));
}

export async function verifyCode(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const flow = codeFlowSchema.safeParse(field(formData, "flow"));
  const email = emailSchema.safeParse(field(formData, "email"));
  const code = codeSchema.safeParse(field(formData, "code"));
  if (!flow.success || !email.success) return { error: "unknown" };
  if (!code.success) return { fieldErrors: { code: firstError(code.error) } };

  const supabase = await createClient();
  const type =
    flow.data === "signup" || flow.data === "login" ? "email" : flow.data;
  const { error } = await supabase.auth.verifyOtp({
    email: email.data,
    token: code.data,
    type,
  });
  if (error)
    return {
      fieldErrors: {
        code:
          authErrorKey(error) === "unknown" ? "codeWrong" : authErrorKey(error),
      },
    };

  if (flow.data === "recovery") redirect("/reset-password");
  if (flow.data === "email_change") redirect("/settings?changed=email");
  redirect("/");
}

export async function resendCode(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const flow = codeFlowSchema.safeParse(field(formData, "flow"));
  const email = emailSchema.safeParse(field(formData, "email"));
  if (!flow.success || !email.success) return { error: "unknown" };

  const supabase = await createClient();
  const { error } =
    flow.data === "signup"
      ? await supabase.auth.resend({ type: "signup", email: email.data })
      : flow.data === "email_change"
        ? await supabase.auth.resend({
            type: "email_change",
            email: email.data,
          })
        : flow.data === "recovery"
          ? await supabase.auth.resetPasswordForEmail(email.data)
          : await supabase.auth.signInWithOtp({
              email: email.data,
              options: { shouldCreateUser: false },
            });

  // Only rate limits are shown; anything else stays neutral (A7).
  if (error && authErrorKey(error) === "rateLimited")
    return { error: "rateLimited" };
  return { message: "resent", sentAt: Date.now() };
}

export async function logIn(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = emailSchema.safeParse(field(formData, "email"));
  const password = field(formData, "password");
  if (!email.success)
    return { fieldErrors: { email: firstError(email.error) } };
  if (!password) return { error: "credentials" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: email.data,
    password,
  });

  if (error?.code === "email_not_confirmed") {
    await supabase.auth.resend({ type: "signup", email: email.data });
    redirect(verifyUrl("signup", email.data));
  }
  if (error)
    return {
      error:
        authErrorKey(error) === "rateLimited" ? "rateLimited" : "credentials",
    };

  redirect("/");
}

export async function requestLoginCode(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = emailSchema.safeParse(field(formData, "email"));
  if (!email.success)
    return { fieldErrors: { email: firstError(email.error) } };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: { shouldCreateUser: false },
  });
  if (error && authErrorKey(error) === "rateLimited")
    return { error: "rateLimited" };

  redirect(verifyUrl("login", email.data));
}

export async function requestPasswordReset(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = emailSchema.safeParse(field(formData, "email"));
  if (!email.success)
    return { fieldErrors: { email: firstError(email.error) } };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.data);
  if (error && authErrorKey(error) === "rateLimited")
    return { error: "rateLimited" };

  redirect(verifyUrl("recovery", email.data));
}

export async function setNewPassword(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const password = passwordSchema.safeParse(field(formData, "password"));
  if (!password.success)
    return { fieldErrors: { password: firstError(password.error) } };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) {
    const key = authErrorKey(error);
    return key === "passwordWeak" || key === "samePassword"
      ? { fieldErrors: { password: key } }
      : { error: key };
  }

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/welcome");
}
