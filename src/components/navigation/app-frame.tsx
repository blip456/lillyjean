"use client";

import { usePathname } from "next/navigation";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { hidesTabBar } from "@/lib/navigation";

import { CreateMenu } from "./create-menu";
import { TabBar } from "./tab-bar";

/**
 * Signed-in screens: the page, the tab bar (N1) and the create menu (N2). While the create menu is
 * open, the page behind it is inert but the tab bar stays usable, as in the wireframe.
 */
export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // The menu belongs to the screen it was opened on, so any navigation closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  // Forget it after leaving that screen, so coming back does not reopen it.
  if (openOn !== null && openOn !== pathname) setOpenOn(null);
  const menuOpen = openOn === pathname;
  const toggleRef = useRef<HTMLButtonElement>(null);
  const showTabBar = !hidesTabBar(pathname);

  const close = useCallback((returnFocus: boolean) => {
    setOpenOn(null);
    if (returnFocus) toggleRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(true);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen, close]);

  return (
    <>
      <main className="flex-1" inert={menuOpen}>
        {children}
      </main>
      {showTabBar && (
        <>
          {menuOpen && <CreateMenu onClose={close} />}
          <TabBar
            pathname={pathname}
            menuOpen={menuOpen}
            toggleRef={toggleRef}
            onToggleMenu={() => (menuOpen ? close(false) : setOpenOn(pathname))}
          />
        </>
      )}
    </>
  );
}
