import "server-only";

import {
  getChallengesForBook,
  getMyChallenges,
} from "@/lib/challenges/queries.server";

import { type ChallengeIndicator, indicatorFor } from "./indicator";

/**
 * Starts loading my challenges, so the indicators below are ready when the page's own query
 * (e.g. the book search) is done: the page still loads in one round (T21).
 */
export function preloadBookIndicators() {
  void getMyChallenges();
}

/**
 * The challenge indicator (P25) for many books at once: book id → indicator, books in none of my
 * open challenges left out. Built on the same per-request loader as every challenge query, so
 * this adds no query when the challenges are already loaded.
 *
 * Not `getChallengeIndicators`: that one only counts, and the wording depends on whether the book
 * is my pick ("Part of") or only a candidate ("Candidate in").
 */
export async function getBookIndicators(
  bookIds: string[],
): Promise<Record<string, ChallengeIndicator>> {
  const lists = await Promise.all(bookIds.map(getChallengesForBook));
  const indicators: Record<string, ChallengeIndicator> = {};
  bookIds.forEach((id, index) => {
    const indicator = indicatorFor(lists[index]);
    if (indicator) indicators[id] = indicator;
  });
  return indicators;
}
