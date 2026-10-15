import { safeReturnTo } from "@/lib/books/navigation";

import { readlistIdSchema } from "./validation";

/** URLs of the readlist screens (C1–C3). */

export const READLISTS_PATH = "/readlists";

/** `/readlists?deleted=1`: the overview after deleting a readlist shows "Readlist deleted". */
export const DELETED_PARAM = "deleted";

export function readlistHref(id: string) {
  return `${READLISTS_PATH}/${id}`;
}

export function editReadlistHref(id: string) {
  return `${READLISTS_PATH}/${id}/edit`;
}

/**
 * "New readlist" (C3). `bookId` puts that book in the new list straight away; `returnTo` (a
 * same-site path) is where the form goes after creating, instead of the new list.
 */
export function newReadlistHref({
  bookId,
  returnTo,
}: { bookId?: string | null; returnTo?: string | null } = {}) {
  const params = new URLSearchParams();
  if (bookId) params.set("bookId", bookId);
  const back = safeReturnTo(returnTo);
  if (back) params.set("returnTo", back);
  const search = params.toString();
  return search ? `${READLISTS_PATH}/new?${search}` : `${READLISTS_PATH}/new`;
}

type Param = string | string[] | undefined;

/** `?bookId=&returnTo=` of /readlists/new, keeping only a valid book id and a same-site path. */
export function readNewReadlistParams(params: {
  bookId?: Param;
  returnTo?: Param;
}): { bookId: string | null; returnTo: string | null } {
  const first = (value: Param) => (Array.isArray(value) ? value[0] : value);
  const bookId = readlistIdSchema.safeParse(first(params.bookId));
  return {
    bookId: bookId.success ? bookId.data : null,
    returnTo: safeReturnTo(first(params.returnTo)),
  };
}
