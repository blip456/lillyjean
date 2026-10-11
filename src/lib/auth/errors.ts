import type { AuthError } from "@supabase/supabase-js";

/** Maps Supabase Auth error codes to translation keys under `errors`. */
export function authErrorKey(error: AuthError): string {
  switch (error.code) {
    case "invalid_credentials":
      return "credentials";
    case "weak_password":
      return "passwordWeak";
    case "same_password":
      return "samePassword";
    case "otp_expired":
      return "codeWrong";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "rateLimited";
    case "session_not_found":
    case "session_expired":
      return "sessionExpired";
    default:
      return "unknown";
  }
}
