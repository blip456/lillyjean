"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { hasInAppHistory } from "@/components/navigation/in-app-history";
import { Link } from "@/components/ui/link";

/**
 * ← that goes back to the screen you came from (P46): a book from the search, Home or a list; a
 * shelf list from Home or the Readlists tab; the search from the list it was opened on. When the
 * screen was opened directly (shared link, new tab, fresh start) it goes to `fallback`.
 */
export function BackLink({ fallback = "/" }: { fallback?: string }) {
  const t = useTranslations("common");
  const router = useRouter();

  return (
    <Link
      href={fallback}
      prefetch={false}
      aria-label={t("back")}
      onClick={(event) => {
        if (hasInAppHistory()) {
          event.preventDefault();
          router.back();
        }
      }}
      className="-ml-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-xl"
    >
      <span aria-hidden="true">←</span>
    </Link>
  );
}
