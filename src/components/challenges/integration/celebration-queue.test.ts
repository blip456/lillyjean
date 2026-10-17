import { describe, expect, it } from "vitest";

import {
  currentMoment,
  dismiss,
  enqueue,
  otherChallenges,
} from "./celebration-queue";

const keys = () => {
  let key = 0;
  return () => ++key;
};
const challenge = (id: string, bookTitle = "Emma") => ({
  id,
  title: `Challenge ${id}`,
  bookTitle,
});

describe("celebration queue", () => {
  it("does nothing for an empty list", () => {
    expect(enqueue([], [], keys())).toEqual([]);
    expect(currentMoment([])).toBeNull();
  });

  it("puts every challenge one read completed in one moment (P10)", () => {
    const queue = enqueue([], [challenge("a"), challenge("b")], keys());
    expect(queue).toHaveLength(1);
    const moment = currentMoment(queue)!;
    expect(moment.bookTitle).toBe("Emma");
    expect(moment.challenges.map((c) => c.id)).toEqual(["a", "b"]);
    expect(otherChallenges(moment).map((c) => c.id)).toEqual(["b"]);
  });

  it("queues a later celebration behind the one on screen", () => {
    const next = keys();
    let queue = enqueue([], [challenge("a")], next);
    queue = enqueue(queue, [challenge("b", "Persuasion")], next);
    expect(currentMoment(queue)!.challenges[0].id).toBe("a");
    queue = dismiss(queue);
    expect(currentMoment(queue)!.bookTitle).toBe("Persuasion");
    expect(dismiss(queue)).toEqual([]);
  });

  it("never celebrates the same challenge twice", () => {
    const next = keys();
    const queue = enqueue([], [challenge("a"), challenge("a")], next);
    expect(queue[0].challenges).toHaveLength(1);
    expect(enqueue(queue, [challenge("a")], next)).toBe(queue);
  });

  it("splits challenges completed by different books into moments", () => {
    const queue = enqueue(
      [],
      [challenge("a"), challenge("b", "Persuasion"), challenge("c")],
      keys(),
    );
    expect(queue.map((m) => [m.bookTitle, m.challenges.length])).toEqual([
      ["Emma", 2],
      ["Persuasion", 1],
    ]);
    expect(new Set(queue.map((m) => m.key)).size).toBe(2);
  });
});
