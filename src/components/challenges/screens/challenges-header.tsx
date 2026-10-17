import { getTranslations } from "next-intl/server";

import { Avatar } from "@/components/avatar";
import { PlusIcon } from "@/components/navigation/icons";
import { Link } from "@/components/ui/link";
import {
  CHALLENGES_PATH,
  NEW_CHALLENGE_PATH,
  PAST_CHALLENGES_PATH,
} from "@/lib/challenges/links";

type ChallengesHeaderProps = {
  username: string | null;
  view: "active" | "past";
  completedCount: number;
};

const VIEWS = [
  { id: "active", href: CHALLENGES_PATH },
  { id: "past", href: PAST_CHALLENGES_PATH },
] as const;

/**
 * Top of the Challenges tab (E1 Active, E3 Past): title with + (E6) and the avatar (profile),
 * the Active · Past switch (Discover arrives with official challenges) and the counter
 * "n challenges completed": a plain number, no arrow (E7 feedback).
 */
export async function ChallengesHeader({
  username,
  view,
  completedCount,
}: ChallengesHeaderProps) {
  const t = await getTranslations();

  return (
    <div className="space-y-5">
      <header className="flex min-h-11 items-center justify-between gap-4">
        <h1 className="font-serif text-3xl font-semibold">
          {t("challengeScreens.title")}
        </h1>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={NEW_CHALLENGE_PATH}
            aria-label={t("challengeScreens.newChallenge")}
            className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-surface"
          >
            <PlusIcon />
          </Link>
          <Link
            href="/profile"
            aria-label={t("challengeScreens.openProfile")}
            className="rounded-full"
          >
            <Avatar username={username} />
          </Link>
        </div>
      </header>

      <nav aria-label={t("challengeScreens.views")}>
        <ul className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-surface p-1">
          {VIEWS.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                replace
                aria-current={item.id === view ? "page" : undefined}
                className="flex min-h-11 items-center justify-center rounded-lg text-sm font-semibold text-muted aria-[current=page]:bg-foreground aria-[current=page]:text-background"
              >
                {t(`challengeScreens.${item.id}`)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <p className="text-sm">
        {t("challenges.completedCount", { count: completedCount })}
      </p>
    </div>
  );
}

export const sectionTitle =
  "text-xs font-semibold tracking-[0.2em] text-muted uppercase";
