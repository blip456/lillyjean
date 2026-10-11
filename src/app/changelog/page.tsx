import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/page-header";
import { getChangelog } from "@/lib/release/changelog.server";
import { APP_VERSION } from "@/lib/release/version";

/** What's new (G3): generated from release-please's CHANGELOG.md. */
export default async function ChangelogPage() {
  const t = await getTranslations("release");
  const releases = await getChangelog();

  return (
    <div className="mx-auto w-full max-w-md flex-1 px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-10 md:max-w-xl">
      <PageHeader
        title={t("whatsNew")}
        backHref="/settings"
        intro={t("version", { version: APP_VERSION })}
      />

      {releases.length === 0 ? (
        <p className="mt-8">{t("noReleases")}</p>
      ) : (
        <ol className="mt-8 space-y-8">
          {releases.map((release) => (
            <li key={release.version}>
              <h2 className="font-serif text-xl font-semibold">
                v{release.version}
                {release.date && (
                  <span className="ml-2 font-sans text-sm font-normal text-muted">
                    {release.date}
                  </span>
                )}
              </h2>
              {release.sections.map((section) => (
                <section key={section.title} className="mt-3">
                  <h3 className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">
                    {section.title}
                  </h3>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {section.items.map((item, index) => (
                      <li key={index}>
                        {item.scope && <strong>{item.scope}: </strong>}
                        {item.text}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
