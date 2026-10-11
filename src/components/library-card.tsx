import { useFormatter, useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { Avatar } from "@/components/avatar";

type LibraryCardProps = {
  username: string | null;
  memberSince: Date;
  children?: ReactNode;
};

/** The library card from onboarding (A9), reused as the profile header (G1). */
export function LibraryCard({
  username,
  memberSince,
  children,
}: LibraryCardProps) {
  const t = useTranslations("common");
  const format = useFormatter();

  return (
    <section
      aria-label={t("libraryCard")}
      className="rounded-2xl border-2 border-foreground/80 bg-surface p-5 shadow-[4px_4px_0_0] shadow-foreground/15"
    >
      <p className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">
        {t("libraryCard")}
      </p>
      <div className="mt-3 flex items-center gap-4">
        <Avatar username={username} size="lg" />
        <div className="min-w-0">
          <p className="truncate font-serif text-2xl font-semibold">
            @{username || "…"}
          </p>
          <p className="text-sm text-muted">
            {t("memberSince", {
              date: format.dateTime(memberSince, {
                month: "long",
                year: "numeric",
              }),
            })}
          </p>
        </div>
      </div>
      {children && (
        <div className="mt-4 border-t border-dashed border-border pt-3">
          {children}
        </div>
      )}
    </section>
  );
}
