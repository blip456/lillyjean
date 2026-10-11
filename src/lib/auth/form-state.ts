/** Result of a form Server Action; messages are translation keys. */
export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
  /** Timestamp of the last code email, used for the resend cooldown. */
  sentAt?: number;
};

export const initialFormState: FormState = {};
