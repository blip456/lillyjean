"use client";

import { useTranslations } from "next-intl";

import type messages from "../../messages/en.json";

type ErrorKey = keyof (typeof messages)["errors"];

/** Translates an error key from a Server Action; unknown keys fall back to a generic message. */
export function useErrorMessage() {
  const t = useTranslations("errors");
  return (key?: string) => {
    if (!key) return undefined;
    return t.has(key as ErrorKey) ? t(key as ErrorKey) : t("unknown");
  };
}
