import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/account/guards";
import { createClient } from "@/lib/supabase/server";

/** Feedback list (H2), sortable newest or oldest first (P32). */
export default async function AdminFeedbackPage({
  searchParams,
}: PageProps<"/admin/feedback">) {
  await requireAdmin();
  const t = await getTranslations("admin");
  const format = await getFormatter();
  const { sort } = await searchParams;
  const oldestFirst = sort === "oldest";

  const supabase = await createClient();
  const { data: items } = await supabase
    .from("feedback")
    .select(
      "id, message, app_version, created_at, author:profiles(username, deleted_at)",
    )
    .order("created_at", { ascending: oldestFirst });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("feedback")}
        backHref="/admin"
        intro={t("feedbackCount", { count: items?.length ?? 0 })}
      />
      <nav aria-label={t("sort")} className="flex gap-2">
        <SortLink
          href="/admin/feedback"
          active={!oldestFirst}
          label={t("newest")}
        />
        <SortLink
          href="/admin/feedback?sort=oldest"
          active={oldestFirst}
          label={t("oldest")}
        />
      </nav>
      {!items?.length && <p className="text-muted">{t("empty")}</p>}
      <ul className="space-y-3">
        {items?.map((item) => (
          <li key={item.id}>
            <Card className="space-y-2">
              <p className="text-sm text-muted">
                <span className="font-semibold text-foreground">
                  {!item.author || item.author.deleted_at
                    ? t("deletedUser")
                    : item.author.username
                      ? `@${item.author.username}`
                      : t("noUsername")}
                </span>{" "}
                ·{" "}
                {format.dateTime(new Date(item.created_at), {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
                {item.app_version && ` · v${item.app_version}`}
              </p>
              <p className="whitespace-pre-wrap">{item.message}</p>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SortLink({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-surface"
      }`}
    >
      {label}
    </Link>
  );
}
