import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ReadlistForm } from "@/components/readlists/readlist-form";
import { ReadlistFormHeader } from "@/components/readlists/readlist-form-header";
import { findReadlist } from "@/lib/readlists/find-readlist.server";
import { readlistHref } from "@/lib/readlists/links";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("readlists.form");
  return { title: t("editTitle") };
}

/** C3 in edit mode: rename, change the description, or delete the readlist (P42). */
export default async function EditReadlistPage({
  params,
}: PageProps<"/readlists/[id]/edit">) {
  const readlist = await findReadlist((await params).id);
  if (!readlist) notFound();
  const t = await getTranslations("readlists.form");

  return (
    <div className="space-y-6">
      <ReadlistFormHeader
        title={t("editTitle")}
        closeHref={readlistHref(readlist.id)}
        closeLabel={t("close")}
      />
      <ReadlistForm
        mode="edit"
        readlist={{
          id: readlist.id,
          name: readlist.name,
          description: readlist.description,
        }}
      />
    </div>
  );
}
