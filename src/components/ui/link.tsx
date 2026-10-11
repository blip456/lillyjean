import NextLink from "next/link";
import type { ComponentProps } from "react";

import { LinkPendingBar } from "./link-pending-bar";

/**
 * Internal link. Prefetches the full page as soon as the link is visible, so a tap opens
 * the next screen without waiting for the server, and shows a thin progress bar when a
 * tap does have to wait (slow network). See T17. Do not use it for URLs with side effects
 * on GET (e.g. /auth/signout): prefetching would trigger them.
 */
export function Link({
  prefetch = true,
  children,
  ...props
}: ComponentProps<typeof NextLink>) {
  return (
    <NextLink prefetch={prefetch} {...props}>
      {children}
      <LinkPendingBar />
    </NextLink>
  );
}
