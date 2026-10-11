import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { getUpcomingReleases } from "@/lib/release/roadmap.server";

/** What's coming: the upcoming releases from docs/backlog.md, so testers know what to expect. */
export default async function WhatsComingPage() {
  const t = await getTranslations("roadmap");
  const releases = await getUpcomingReleases();

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} backHref="/settings" intro={t("intro")} />

      {releases.length === 0 ? (
        <p>{t("empty")}</p>
      ) : (
        <ol className="space-y-4">
          {releases.map((release, index) => (
            <li key={release.sprint}>
              <Card className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-border px-3 py-0.5 font-mono text-sm">
                    {t("version", { version: release.version ?? "" })}
                  </span>
                  {index === 0 && (
                    <span className="rounded-full bg-primary px-3 py-0.5 text-sm font-semibold text-primary-foreground">
                      {t("next")}
                    </span>
                  )}
                </div>
                <h2 className="font-serif text-xl font-semibold">
                  {release.title}
                </h2>
                {release.goal && <p className="text-muted">{release.goal}</p>}
                <ul className="list-disc space-y-1 pl-5">
                  {release.items.map((item, itemIndex) => (
                    <li key={itemIndex}>{item}</li>
                  ))}
                </ul>
              </Card>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
