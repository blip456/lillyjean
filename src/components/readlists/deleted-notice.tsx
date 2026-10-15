"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

import { useSnackbar } from "@/components/ui/snackbar";
import { READLISTS_PATH } from "@/lib/readlists/links";

/**
 * "Readlist deleted" on the overview after a delete (`/readlists?deleted=1`), shown once; the
 * address goes back to /readlists so a refresh or Back does not repeat it.
 */
export function DeletedNotice() {
  const t = useTranslations("readlists");
  const showSnackbar = useSnackbar();
  const router = useRouter();
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    showSnackbar({ message: t("deleted") });
    router.replace(READLISTS_PATH, { scroll: false });
  }, [showSnackbar, router, t]);

  return null;
}
