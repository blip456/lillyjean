import { getTranslations } from "next-intl/server";

import {
  NewReadlistTile,
  ReadlistTile,
} from "@/components/readlists/readlist-tile";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@/components/ui/link";
import { newReadlistHref, READLISTS_PATH } from "@/lib/readlists/links";
import type { ReadlistSummary } from "@/lib/readlists/types";

/**
 * "Your readlists" on Home (B1, B2): a horizontal row of mosaics with "All" → C1 and a last
 * "+ New" tile → C3, or a friendly empty state.
 */
export async function ReadlistsRow({
  readlists,
}: {
  readlists: ReadlistSummary[];
}) {
  const t = await getTranslations("home");

  return (
    <section aria-labelledby="your-readlists" className="space-y-2">
      <div className="flex min-h-11 items-center justify-between gap-4">
        <h2
          id="your-readlists"
          className="text-xs font-semibold tracking-[0.2em] text-muted uppercase"
        >
          {t("yourReadlists")}
        </h2>
        {readlists.length > 0 && (
          <Link
            href={READLISTS_PATH}
            aria-label={t("allReadlistsLabel")}
            className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4"
          >
            {t("allReadlists")}
          </Link>
        )}
      </div>
      {readlists.length === 0 ? (
        <Card className="flex items-center gap-4 border-dashed">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{t("readlistsEmptyTitle")}</p>
            <p className="text-sm text-muted">{t("readlistsEmptyText")}</p>
          </div>
          <ButtonLink
            href={newReadlistHref()}
            variant="secondary"
            className="shrink-0 px-4"
          >
            {t("newReadlist")}
          </ButtonLink>
        </Card>
      ) : (
        <ul className="-mx-6 flex snap-x scroll-px-6 gap-3 overflow-x-auto px-6 pb-2">
          {readlists.map((readlist) => (
            <li key={readlist.id} className="shrink-0 snap-start">
              <ReadlistTile readlist={readlist} size="row" />
            </li>
          ))}
          <li className="shrink-0 snap-start">
            <NewReadlistTile
              size="row"
              label={t("newReadlistTile")}
              accessibleLabel={t("newReadlist")}
            />
          </li>
        </ul>
      )}
    </section>
  );
}
