"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { APP_VERSION } from "@/lib/release/version";

const STORAGE_KEY = "lillyjean:last-seen-version";

/**
 * Small one-time banner after an update (P31). The very first visit only records the
 * version, so new users are not greeted with a changelog.
 */
export function WhatsNewBanner() {
  const t = useTranslations("whatsNewBanner");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) localStorage.setItem(STORAGE_KEY, APP_VERSION);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reads browser storage once on mount
      else if (seen !== APP_VERSION) setVisible(true);
    } catch {
      // Storage unavailable (private mode): skip the banner.
    }
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, APP_VERSION);
    } catch {}
    setVisible(false);
  };

  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm"
    >
      <p className="flex-1">
        {t("text")}{" "}
        <Link
          href="/changelog"
          onClick={dismiss}
          className="font-semibold underline underline-offset-4"
        >
          {t("link")}
        </Link>
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("dismiss")}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-lg"
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}
