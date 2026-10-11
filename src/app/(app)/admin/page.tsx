import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/page-header";
import { Link } from "@/components/ui/link";
import { requireAdmin } from "@/lib/account/guards";
import { createClient } from "@/lib/supabase/server";

/** Admin home (H1). Access is checked here and by the database policies. */
export default async function AdminPage() {
  await requireAdmin();
  const t = await getTranslations("admin");
  const supabase = await createClient();
  const { count } = await supabase
    .from("feedback")
    .select("id", { count: "exact", head: true });

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} backHref="/settings" intro={t("intro")} />
      <Link
        href="/admin/feedback"
        className="flex min-h-14 items-center justify-between rounded-2xl border border-border bg-surface px-4"
      >
        <span className="font-semibold">{t("feedback")}</span>
        <span className="text-sm text-muted">
          {t("feedbackCount", { count: count ?? 0 })}{" "}
          <span aria-hidden="true">›</span>
        </span>
      </Link>
    </div>
  );
}
