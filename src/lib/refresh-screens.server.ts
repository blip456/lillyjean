import "server-only";

import { updateTag } from "next/cache";

/** No fetch carries this tag; updating it only tells the client that data changed (T22). */
const SCREENS_TAG = "screens";

/**
 * Call after every change from a Server Action, so no screen shows an old value (T21, T22).
 * The client drops all cached pages and the current page is rendered again, exactly as when the
 * root layout path is revalidated. Unlike a path revalidation, it keeps the cached Open Library and
 * Google Books responses, so adding books from the search does not search the book databases again.
 */
export function refreshScreens() {
  updateTag(SCREENS_TAG);
}
