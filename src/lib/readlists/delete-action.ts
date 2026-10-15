"use server";

import { redirect, RedirectType } from "next/navigation";

import { type ActionResult, deleteReadlist } from "./actions";
import { DELETED_PARAM, READLISTS_PATH } from "./links";

/**
 * Delete a readlist (C2, C3) and go to the overview in the same response. Redirecting from the
 * server avoids a flash of "Readlist not found": the readlist's own page is not shown again
 * after it is gone. `?deleted=1` makes the overview say "Readlist deleted" (a redirecting
 * action does not return to the caller). Returns only on an error.
 */
export async function deleteReadlistAndLeave(
  readlistId: string,
): Promise<ActionResult> {
  const result = await deleteReadlist(readlistId);
  if (!result.ok) return result;
  redirect(`${READLISTS_PATH}?${DELETED_PARAM}=1`, RedirectType.replace);
}
