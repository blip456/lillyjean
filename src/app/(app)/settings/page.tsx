import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { PageHeader } from "@/components/page-header";
import { FormMessage } from "@/components/ui/form-message";
import { requireOnboardedAccount } from "@/lib/account/guards";
import { signOut } from "@/lib/auth/actions";
import { APP_VERSION } from "@/lib/release/version";

const changedMessages = {
  email: "emailChanged",
  password: "passwordChanged",
  username: "usernameChanged",
  pledge: "pledgeSaved",
  feedback: "feedbackSent",
} as const;

export default async function SettingsPage({
  searchParams,
}: PageProps<"/settings">) {
  const { profile, email, pledge } = await requireOnboardedAccount();
  const t = await getTranslations("settings");
  const { changed } = await searchParams;
  const changedKey =
    typeof changed === "string" && changed in changedMessages
      ? changedMessages[changed as keyof typeof changedMessages]
      : null;

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} backHref="/profile" />
      {changedKey && <FormMessage tone="success" message={t(changedKey)} />}

      <Section title={t("account")}>
        <Row
          href="/settings/username"
          label={t("username")}
          value={`@${profile.username}`}
        />
        <Row href="/settings/email" label={t("email")} value={email} />
        <Row href="/settings/password" label={t("password")} />
      </Section>

      <Section title={t("reading")}>
        <Row
          href="/settings/pledge"
          label={t("pledge")}
          value={pledge ? t("pledgeValue", { goal: pledge }) : t("noPledge")}
        />
      </Section>

      <Section title={t("help")}>
        <Row href="/settings/feedback" label={t("sendFeedback")} />
      </Section>

      <Section title={t("about")}>
        <div className="flex min-h-12 items-center justify-between px-4">
          <span>{t("version")}</span>
          <span className="font-mono text-sm text-muted">v{APP_VERSION}</span>
        </div>
        <Row href="/changelog" label={t("whatsNew")} />
      </Section>

      {profile.role === "admin" && (
        <Section title={t("admin")}>
          <Row href="/admin" label={t("admin")} />
        </Section>
      )}

      <form action={signOut}>
        <button
          type="submit"
          className="min-h-12 w-full rounded-2xl border border-border bg-surface px-4 text-left font-semibold"
        >
          {t("signOut")}
        </button>
      </form>

      <Link
        href="/settings/delete-account"
        className="block pt-4 text-center text-sm font-semibold text-danger underline underline-offset-4"
      >
        {t("deleteAccount")}
      </Link>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="px-1 text-xs font-semibold tracking-[0.2em] text-muted uppercase">
        {title}
      </h2>
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
        {children}
      </div>
    </section>
  );
}

function Row({
  href,
  label,
  value,
}: {
  href: string;
  label: string;
  value?: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-12 items-center justify-between gap-3 px-4 hover:bg-border/30"
    >
      <span>{label}</span>
      <span className="flex min-w-0 items-center gap-2 text-sm text-muted">
        {value && <span className="truncate">{value}</span>}
        <span aria-hidden="true">›</span>
      </span>
    </Link>
  );
}
