import { z } from "zod";

/** Readlist rules (C3). Messages are translation keys under `errors` in messages/en.json. */
export const READLIST_NAME_MAX = 60;
export const READLIST_DESCRIPTION_MAX = 500;

export const readlistIdSchema = z.uuid({ error: "unknown" });

export const readlistSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "readlistNameRequired" })
    .max(READLIST_NAME_MAX, { error: "readlistNameTooLong" }),
  description: z
    .string()
    .trim()
    .max(READLIST_DESCRIPTION_MAX, { error: "readlistDescriptionTooLong" })
    .transform((value) => value || null),
});

export type ReadlistInput = z.infer<typeof readlistSchema>;
