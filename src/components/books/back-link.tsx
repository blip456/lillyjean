"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Link } from "@/components/ui/link";

/**
 * ← on the book page (D2): goes back to where the book was opened from (search results, Home,
 * a list), or to `fallback` when the page was opened directly (shared link, new tab).
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
        if (window.history.length > 1) {
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
