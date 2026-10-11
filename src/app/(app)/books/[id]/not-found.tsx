import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/page-header";
import { ButtonLink } from "@/components/ui/button";

/** Unknown or invalid book id (D2). */
export default async function BookNotFound() {
  const t = await getTranslations("bookDetail");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("notFound")}
        backHref="/"
        intro={t("notFoundText")}
      />
      <ButtonLink href="/books/search" block>
        {t("searchBooks")}
      </ButtonLink>
    </div>
  );
}
