"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Whether this tab has moved between screens of the app since it loaded. ← uses it to go back in
 * the browser history only when the previous entry is a screen of the app; after opening a shared
 * link or a fresh start it goes to the screen's fallback instead (P46).
 */
let navigated = false;

export function hasInAppHistory() {
  return navigated;
}

/** Notes every change of screen. Mounted once, in the signed-in frame. */
export function useTrackInAppHistory() {
  const pathname = usePathname();
  const first = useRef(pathname);
  useEffect(() => {
    if (pathname !== first.current) navigated = true;
  }, [pathname]);
}
