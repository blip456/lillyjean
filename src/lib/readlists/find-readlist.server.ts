import "server-only";

import { getReadlist } from "./queries.server";
import { readlistIdSchema } from "./validation";

/** The readlist for a URL id (C2, C3), or null for an invalid id or a list that is not yours. */
export async function findReadlist(id: string) {
  if (!readlistIdSchema.safeParse(id).success) return null;
  return getReadlist(id);
}
