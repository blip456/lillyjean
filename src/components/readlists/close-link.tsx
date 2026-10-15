"use client";

import { useRouter } from "next/navigation";

import { Link } from "@/components/ui/link";

/**
 * × on the readlist form (C3): goes back to the screen the form was opened from (+ menu, Home,
 * a readlist), or to `fallback` when the form was opened directly.
 */
export function CloseLink({
  fallback,
  label,
}: {
  fallback: string;
  label: string;
}) {
  const router = useRouter();

  return (
    <Link
      href={fallback}
      prefetch={false}
      aria-label={label}
      onClick={(event) => {
        if (window.history.length > 1) {
          event.preventDefault();
          router.back();
        }
      }}
      className="-ml-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-2xl"
    >
      <span aria-hidden="true">×</span>
    </Link>
  );
}
