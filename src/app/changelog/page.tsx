import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { getChangelog } from "@/lib/release/changelog.server";
import { APP_VERSION } from "@/lib/release/version";

export default async function ChangelogPage() {
  const t = await getTranslations("release");
  const releases = await getChangelog();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 p-6">
      <Link href="/" className="text-sm underline-offset-4 hover:underline">
        {t("back")}
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">{t("whatsNew")}</h1>
      <p className="text-sm opacity-70">
        {t("version", { version: APP_VERSION })}
      </p>

      {releases.length === 0 ? (
        <p className="mt-8">{t("noReleases")}</p>
      ) : (
        <ol className="mt-8 space-y-8">
          {releases.map((release) => (
            <li key={release.version}>
              <h2 className="text-lg font-semibold">
                {release.version}
                {release.date && (
                  <span className="ml-2 text-sm font-normal opacity-70">
                    {release.date}
                  </span>
                )}
              </h2>
              {release.sections.map((section) => (
                <section key={section.title} className="mt-3">
                  <h3 className="text-sm font-medium uppercase opacity-70">
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
    </main>
  );
}
