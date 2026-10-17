import { z } from "zod";

/** Challenge rules (E6, E8). Messages are translation keys under `errors` in messages/en.json. */
export const CHALLENGE_TITLE_MAX = 80;
export const CHALLENGE_THEME_MAX = 300;
/** At least 5 candidate books (P12). */
export const MIN_CANDIDATES = 5;
export const MAX_CANDIDATES = 100;

export const challengeIdSchema = z.uuid({ error: "unknown" });

const isoDate = (required: string) =>
  z
    .string()
    .trim()
    .refine((value) => value !== "", { error: required })
    .refine(
      (value) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
        const date = new Date(`${value}T00:00:00Z`);
        return (
          !Number.isNaN(date.getTime()) &&
          date.toISOString().slice(0, 10) === value
        );
      },
      { error: "challengeDateInvalid" },
    );

export const challengeSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, { error: "challengeTitleRequired" })
      .max(CHALLENGE_TITLE_MAX, { error: "challengeTitleTooLong" }),
    theme: z
      .string()
      .trim()
      .max(CHALLENGE_THEME_MAX, { error: "challengeThemeTooLong" })
      .transform((value) => value || null),
    startsOn: isoDate("challengeStartRequired"),
    endsOn: z
      .string()
      .trim()
      .transform((value) => value || null)
      .pipe(isoDate("challengeDateInvalid").nullable()),
    bookIds: z
      .array(z.uuid({ error: "unknown" }))
      .transform((ids) => [...new Set(ids)])
      .pipe(
        z
          .array(z.string())
          .min(MIN_CANDIDATES, { error: "challengeTooFewCandidates" })
          .max(MAX_CANDIDATES, { error: "challengeTooManyCandidates" }),
      ),
  })
  .refine((value) => !value.endsOn || value.endsOn >= value.startsOn, {
    error: "challengeEndBeforeStart",
    path: ["endsOn"],
  });

export type ChallengeInput = z.infer<typeof challengeSchema>;
