/** URLs of the challenge screens (E1–E8). */

export const CHALLENGES_PATH = "/challenges";
export const PAST_CHALLENGES_PATH = "/challenges/past";
export const NEW_CHALLENGE_PATH = "/challenges/new";

export function challengeHref(id: string) {
  return `${CHALLENGES_PATH}/${id}`;
}

export function editChallengeHref(id: string) {
  return `${CHALLENGES_PATH}/${id}/edit`;
}

/** E5 Submit my own pick. */
export function ownPickHref(id: string) {
  return `${CHALLENGES_PATH}/${id}/pick`;
}
