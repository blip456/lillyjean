import { describe, expect, it } from "vitest";

import { appToday, challengeState, daysBetween, whenLabel } from "./dates";

describe("appToday", () => {
  it("uses the Brussels calendar day", () => {
    // 23:30 UTC on 14 October is already 15 October in Brussels (UTC+2 in summer time).
    expect(appToday(new Date("2026-10-14T23:30:00Z"))).toBe("2026-10-15");
    expect(appToday(new Date("2026-10-14T12:00:00Z"))).toBe("2026-10-14");
  });
});

describe("daysBetween", () => {
  it("counts whole days, also across months and backwards", () => {
    expect(daysBetween("2026-10-15", "2026-10-15")).toBe(0);
    expect(daysBetween("2026-10-30", "2026-11-02")).toBe(3);
    expect(daysBetween("2026-10-15", "2026-10-10")).toBe(-5);
  });
});

describe("challengeState", () => {
  const today = "2026-10-15";
  it("is completed once a qualifying read exists, even after the end", () => {
    expect(
      challengeState(
        {
          startsOn: "2026-09-01",
          endsOn: "2026-10-01",
          completedOn: "2026-09-20",
        },
        today,
      ),
    ).toBe("completed");
  });

  it("is missed after the end without a completion (P13)", () => {
    expect(
      challengeState(
        { startsOn: "2026-09-01", endsOn: "2026-10-14", completedOn: null },
        today,
      ),
    ).toBe("missed");
  });

  it("is still active on its last day", () => {
    expect(
      challengeState(
        { startsOn: "2026-09-01", endsOn: today, completedOn: null },
        today,
      ),
    ).toBe("active");
  });

  it("is upcoming before the start and active from the start day", () => {
    expect(
      challengeState(
        { startsOn: "2026-10-16", endsOn: null, completedOn: null },
        today,
      ),
    ).toBe("upcoming");
    expect(
      challengeState(
        { startsOn: today, endsOn: null, completedOn: null },
        today,
      ),
    ).toBe("active");
  });
});

describe("whenLabel", () => {
  const today = "2026-10-15";
  it("counts down to the start of an upcoming challenge", () => {
    expect(whenLabel({ startsOn: "2026-10-20", endsOn: null }, today)).toEqual({
      key: "startsIn",
      days: 5,
    });
  });

  it("counts down to the end of a running challenge", () => {
    expect(
      whenLabel({ startsOn: "2026-10-01", endsOn: "2026-10-27" }, today),
    ).toEqual({ key: "endsIn", days: 12 });
  });

  it("says there is no end date", () => {
    expect(whenLabel({ startsOn: "2026-10-01", endsOn: null }, today)).toEqual({
      key: "noEnd",
      days: 0,
    });
  });
});
