"use client";

import {
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
} from "react";

import {
  CLICK_GUARD_MS,
  isMenuKey,
  LONG_PRESS_MS,
  movedTooFar,
  startsLongPress,
} from "./long-press";

type Press = {
  pointerId: number;
  x0: number;
  y0: number;
  timer: ReturnType<typeof setTimeout>;
  /** The menu opened during this press; the rest of the gesture is ignored. */
  fired: boolean;
};

export type LongPressOptions = {
  enabled: boolean;
  onOpen: () => void;
  /** Pointer downs inside elements matching this selector never start a press. */
  ignore?: string;
};

function haptic() {
  try {
    navigator.vibrate?.(10);
  } catch {
    // Not supported (iOS) or blocked: skipped silently.
  }
}

/**
 * Swallows these events on the whole page (capture phase, before React sees them) until the
 * returned function is called. A contextmenu event only loses the browser menu: when it lands
 * on a row, that row still opens its own menu.
 */
function swallow(types: string[]) {
  const block = (event: Event) => {
    event.preventDefault();
    if (event.type !== "contextmenu") event.stopPropagation();
  };
  for (const type of types) document.addEventListener(type, block, true);
  return () => {
    for (const type of types) document.removeEventListener(type, block, true);
  };
}

/**
 * After a long press opened the menu, the release is not a tap: the browser would send its
 * click to whatever is under the finger by then (the menu's backdrop, which closes it), and some
 * phones send a contextmenu event. Both are swallowed until shortly after the release.
 */
function swallowRelease(pointerId: number) {
  const release = swallow(["click", "contextmenu"]);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const onEnd = (event: PointerEvent) => {
    if (event.pointerId === pointerId) timer = setTimeout(done, CLICK_GUARD_MS);
  };
  const done = () => {
    clearTimeout(timer);
    release();
    document.removeEventListener("pointerup", onEnd, true);
    document.removeEventListener("pointercancel", onEnd, true);
    document.removeEventListener("pointerdown", done, true);
  };
  document.addEventListener("pointerup", onEnd, true);
  document.addEventListener("pointercancel", onEnd, true);
  // A new touch starts a new gesture: from then on taps count again.
  document.addEventListener("pointerdown", done, true);
}

/**
 * Long press, right-click and the keyboard menu keys on a book row open its menu (B5, P24).
 *
 * Returns props for an element around the swipe row. The handlers run in the capture phase, so
 * they see every pointer event before the swipe does. Movement of 8 px cancels the press, which
 * is no later than the row decides between a swipe and a scroll, so swiping and vertical
 * scrolling work as before. After the menu opened, the rest of the gesture neither swipes the
 * row nor follows the link. While a press is held the element has `data-pressing="true"`.
 */
export function useLongPress({ enabled, onOpen, ignore }: LongPressOptions) {
  const press = useRef<Press | null>(null);
  const element = useRef<HTMLElement | null>(null);

  const setPressing = (pressing: boolean) => {
    if (element.current) element.current.dataset.pressing = String(pressing);
  };

  const cancel = () => {
    if (press.current) clearTimeout(press.current.timer);
    press.current = null;
    setPressing(false);
  };

  useEffect(
    () => () => {
      if (press.current) clearTimeout(press.current.timer);
    },
    [],
  );

  /** The menu opens during a press: ignore the rest of that gesture. */
  const fire = (current: Press) => {
    clearTimeout(current.timer);
    current.fired = true;
    swallowRelease(current.pointerId);
  };

  const open = () => {
    setPressing(false);
    haptic();
    onOpen();
  };

  if (!enabled) return {};

  const onPointerDownCapture = (event: ReactPointerEvent<HTMLElement>) => {
    cancel();
    if (!startsLongPress(event)) return;
    if (ignore && (event.target as Element).closest(ignore)) return;
    element.current = event.currentTarget;
    const current: Press = {
      pointerId: event.pointerId,
      x0: event.clientX,
      y0: event.clientY,
      fired: false,
      timer: setTimeout(() => {
        if (press.current !== current) return;
        fire(current);
        open();
      }, LONG_PRESS_MS),
    };
    press.current = current;
    setPressing(true);
  };

  const onPointerMoveCapture = (event: ReactPointerEvent<HTMLElement>) => {
    const current = press.current;
    if (!current || current.pointerId !== event.pointerId) return;
    if (current.fired) {
      // The menu is open: keep the swipe row from following the finger behind it.
      event.stopPropagation();
      return;
    }
    if (movedTooFar(event.clientX - current.x0, event.clientY - current.y0))
      cancel();
  };

  const onPointerEndCapture = (event: ReactPointerEvent<HTMLElement>) => {
    if (press.current?.pointerId === event.pointerId) cancel();
  };

  return {
    onPointerDownCapture,
    onPointerMoveCapture,
    onPointerUpCapture: onPointerEndCapture,
    onPointerCancelCapture: onPointerEndCapture,
    onContextMenu: (event: MouseEvent<HTMLElement>) => {
      // Right-click on desktop; on Android a long touch can end up here before our timer.
      event.preventDefault();
      const current = press.current;
      if (current?.fired) return;
      if (current) fire(current);
      element.current = event.currentTarget;
      open();
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (!isMenuKey(event)) return;
      event.preventDefault();
      element.current = event.currentTarget;
      // The browser may still send its own contextmenu event for the same key, to whatever
      // has focus by then (the menu); keep the browser menu from showing on top of ours.
      setTimeout(swallow(["contextmenu"]), CLICK_GUARD_MS);
      open();
    },
    onDragStart: (event: MouseEvent<HTMLElement>) => {
      if (press.current) event.preventDefault();
    },
  };
}
