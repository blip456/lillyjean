import { z } from "zod";

/**
 * Shared input rules. Messages are translation keys under `errors` in messages/en.json,
 * so the same rules serve server actions and client-side hints.
 */

export const USERNAME_PATTERN = /^[a-z0-9._]{3,20}$/;
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 72; // bcrypt limit used by Supabase Auth
export const PLEDGE_MIN = 1;
export const PLEDGE_MAX = 999;
export const FEEDBACK_MAX_LENGTH = 5000;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "emailInvalid" }));

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, { error: "passwordTooShort" })
  .max(PASSWORD_MAX_LENGTH, { error: "passwordTooLong" });

export const codeSchema = z
  .string()
  .transform((value) => value.replace(/\s/g, ""))
  .pipe(z.string().regex(/^\d{6}$/, { error: "codeInvalid" }));

/** Lowercases input so "Reader" and "reader" are the same username (A6). */
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.string().regex(USERNAME_PATTERN, { error: "usernameFormat" }));

export const pledgeSchema = z.coerce
  .number({ error: "pledgeInvalid" })
  .int({ error: "pledgeInvalid" })
  .min(PLEDGE_MIN, { error: "pledgeInvalid" })
  .max(PLEDGE_MAX, { error: "pledgeInvalid" });

export const feedbackSchema = z
  .string()
  .trim()
  .min(1, { error: "feedbackEmpty" })
  .max(FEEDBACK_MAX_LENGTH, { error: "feedbackTooLong" });

/** Flows that use a 6-digit email code (decision A3). */
export const codeFlows = [
  "signup",
  "login",
  "recovery",
  "email_change",
] as const;
export type CodeFlow = (typeof codeFlows)[number];
export const codeFlowSchema = z.enum(codeFlows);

/** Returns the first error key of a failed parse. */
export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "unknown";
}
