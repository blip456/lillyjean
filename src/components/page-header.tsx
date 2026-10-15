import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { BackLink } from "@/components/back-link";
import { Link } from "@/components/ui/link";

type PageHeaderProps = {
  title: ReactNode;
  backHref?: string;
  /**
   * ← goes back to the previous screen, with `backHref` only as the fallback (P46). For screens
   * that are opened from several places, such as the shelf lists and the search.
   */
  backToPrevious?: boolean;
  intro?: ReactNode;
  aside?: ReactNode;
};

export function PageHeader({
  title,
  backHref,
  backToPrevious = false,
  intro,
  aside,
}: PageHeaderProps) {
  const t = useTranslations("common");

  return (
    <header className="space-y-3">
      <div className="flex min-h-11 items-center justify-between gap-3">
        {backHref && backToPrevious ? (
          <BackLink fallback={backHref} />
        ) : backHref ? (
          <Link
            href={backHref}
            aria-label={t("back")}
            className="-ml-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-xl"
          >
            <span aria-hidden="true">←</span>
          </Link>
        ) : (
          <span />
        )}
        {aside}
      </div>
      <h1 className="font-serif text-3xl leading-tight font-semibold">
        {title}
      </h1>
      {intro && <p className="text-muted">{intro}</p>}
    </header>
  );
}
