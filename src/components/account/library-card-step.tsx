"use client";

import { useTranslations } from "next-intl";

import { LibraryCard } from "@/components/library-card";

import { UsernameForm } from "./username-form";

/** Onboarding step 1: choose a username with a live library card preview (A9). */
export function LibraryCardStep({ memberSince }: { memberSince: string }) {
  const t = useTranslations();

  return (
    <UsernameForm
      context="onboarding"
      label={t("onboarding.libraryCard.username")}
      submitLabel={t("common.continue")}
      preview={(username) => (
        <LibraryCard
          username={username || null}
          memberSince={new Date(memberSince)}
        />
      )}
    />
  );
}
