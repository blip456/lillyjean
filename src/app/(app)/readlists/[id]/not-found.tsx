import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/page-header";
import { ButtonLink } from "@/components/ui/button";
import { READLISTS_PATH } from "@/lib/readlists/links";

/** Unknown readlist id, or a readlist that belongs to someone else (C2, C3). */
export default async function ReadlistNotFound() {
  const t = await getTranslations("readlists");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("notFound")}
        backHref={READLISTS_PATH}
        intro={t("notFoundText")}
      />
      <ButtonLink href={READLISTS_PATH} block>
        {t("allReadlists")}
      </ButtonLink>
    </div>
  );
}
