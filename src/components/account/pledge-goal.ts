import { PLEDGE_MAX, PLEDGE_MIN } from "@/lib/validation";

/**
 * The pledge field keeps what the reader typed as text, so clearing it leaves it empty instead of
 * turning it into 0 (which made typing "200" show "0200"). The server still validates the number.
 */
export function stepGoal(value: string, delta: number): string {
  const current = Number.parseInt(value, 10);
  const start = Number.isNaN(current) ? 0 : current;
  return String(Math.min(PLEDGE_MAX, Math.max(PLEDGE_MIN, start + delta)));
}
