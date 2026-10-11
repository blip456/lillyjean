import { getFormatter, getTranslations } from "next-intl/server";

import { UsernameForm } from "@/components/account/username-form";
import { PageHeader } from "@/components/page-header";
import { requireOnboardedAccount } from "@/lib/account/guards";

const COOLDOWN_DAYS = 30;

export default async function ChangeUsernamePage() {
  const { profile } = await requireOnboardedAccount();
  const t = await getTranslations();
  const format = await getFormatter();

  const changedAt = profile.username_changed_at
    ? new Date(profile.username_changed_at)
    : null;
  const nextChange = changedAt
    ? new Date(changedAt.getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000)
    : null;
  // eslint-disable-next-line react-hooks/purity -- server render, evaluated once per request
  const coolingDown = nextChange !== null && nextChange.getTime() > Date.now();

  return (
    <div className="space-y-6">
      <PageHeader title={t("changeUsername.title")} backHref="/settings" />
      <p>
        <span className="font-semibold">{t("changeUsername.current")}:</span> @
        {profile.username}
      </p>
      <p className="text-sm text-muted">
        {coolingDown && nextChange
          ? t("changeUsername.nextChange", {
              date: format.dateTime(nextChange, { dateStyle: "long" }),
            })
          : t("changeUsername.rule")}
      </p>
      <UsernameForm
        context="settings"
        label={t("changeUsername.new")}
        submitLabel={t("common.save")}
        current={profile.username}
        disabled={coolingDown}
      />
    </div>
  );
}
