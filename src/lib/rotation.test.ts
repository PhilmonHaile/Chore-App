import { describe, expect, it } from "vitest";
import {
  assigneePosition,
  effectiveSize,
  formatDay,
  localDate,
  monthEnd,
  monthIndex,
  seasonEnd,
  seasonName,
  weekIndex,
  weekStart,
} from "./rotation";

// Grid slots from the rotation migration.
const OFFSETS: Record<string, number> = {
  Kitchen: 0, "Dining Room": 1, "Living Room": 2, Stairs: 3, Hallways: 0, "Bathroom 1": 1, "Bathroom 2": 2,
};

// The PRD's 4-week grid, member positions 1–4.
const PRD_GRID: Record<string, number>[] = [
  { Kitchen: 1, "Dining Room": 2, "Living Room": 3, Stairs: 4, Hallways: 1, "Bathroom 1": 2, "Bathroom 2": 3 },
  { Kitchen: 2, "Dining Room": 3, "Living Room": 4, Stairs: 1, Hallways: 2, "Bathroom 1": 3, "Bathroom 2": 4 },
  { Kitchen: 3, "Dining Room": 4, "Living Room": 1, Stairs: 2, Hallways: 3, "Bathroom 1": 4, "Bathroom 2": 1 },
  { Kitchen: 4, "Dining Room": 1, "Living Room": 2, Stairs: 3, Hallways: 4, "Bathroom 1": 1, "Bathroom 2": 2 },
];

function gridFor(week: number, size: number) {
  return Object.fromEntries(
    Object.entries(OFFSETS).map(([space, offset]) => [space, assigneePosition(offset, week, size) + 1]),
  );
}

describe("weekly rotation grid", () => {
  it.each([0, 1, 2, 3])("matches PRD week %i for 4 roommates", (week) => {
    expect(gridFor(week, 4)).toEqual(PRD_GRID[week]);
  });

  it("repeats after week 4", () => {
    expect(gridFor(4, 4)).toEqual(PRD_GRID[0]);
    expect(gridFor(9, 4)).toEqual(PRD_GRID[1]);
  });

  it.each([2, 3])("assigns every chore to a real member with %i roommates", (size) => {
    for (let week = 0; week < 12; week++) {
      for (const position of Object.values(gridFor(week, size))) {
        expect(position).toBeGreaterThanOrEqual(1);
        expect(position).toBeLessThanOrEqual(size);
      }
    }
  });

  it.each([2, 3, 4])("shares work equally over a full cycle with %i roommates", (size) => {
    const load = new Array(size).fill(0);
    for (let week = 0; week < size; week++) {
      for (const position of Object.values(gridFor(week, size))) load[position - 1]++;
    }
    expect(new Set(load).size).toBe(1);
  });
});

describe("monthly rotation", () => {
  it("shifts every assignment one person each month and wraps", () => {
    expect([0, 1, 2, 3, 4].map((m) => assigneePosition(0, m, 4) + 1)).toEqual([1, 2, 3, 4, 1]);
    expect([0, 1, 2, 3].map((m) => assigneePosition(3, m, 3) + 1)).toEqual([1, 2, 3, 1]);
  });

  it("counts calendar months since the rotation started", () => {
    expect(monthIndex("2026-09-28", "2026-09-30")).toBe(0);
    expect(monthIndex("2026-09-28", "2026-10-01")).toBe(1);
    expect(monthIndex("2026-09-28", "2027-01-15")).toBe(4);
  });
});

describe("effectiveSize", () => {
  it("uses the admin setting when there is one", () => {
    expect(effectiveSize(3, 4)).toBe(3);
  });

  it("defaults to the member count, kept to 2–4", () => {
    expect(effectiveSize(null, 1)).toBe(2);
    expect(effectiveSize(null, 3)).toBe(3);
    expect(effectiveSize(null, 6)).toBe(4);
  });
});

describe("weeks start Monday", () => {
  it("finds the Monday of a week", () => {
    expect(weekStart("2026-09-28")).toBe("2026-09-28"); // Monday
    expect(weekStart("2026-10-04")).toBe("2026-09-28"); // Sunday
    expect(weekStart("2026-10-05")).toBe("2026-10-05");
  });

  it("counts weeks from the rotation start", () => {
    expect(weekIndex("2026-09-28", "2026-10-04")).toBe(0);
    expect(weekIndex("2026-09-28", "2026-10-05")).toBe(1);
    expect(weekIndex("2026-09-28", "2026-10-26")).toBe(4);
  });
});

describe("time zones", () => {
  // 03:30 UTC on Monday Oct 5 is still Sunday Oct 4 in New York.
  const now = new Date("2026-10-05T03:30:00Z");

  it("uses the household's local date", () => {
    expect(localDate(now, "UTC")).toBe("2026-10-05");
    expect(localDate(now, "America/New_York")).toBe("2026-10-04");
    expect(localDate(now, "Asia/Tokyo")).toBe("2026-10-05");
  });

  it("keeps a New York household in the previous week until local midnight", () => {
    expect(weekIndex("2026-09-28", localDate(now, "America/New_York"))).toBe(0);
    expect(weekIndex("2026-09-28", localDate(now, "UTC"))).toBe(1);
  });
});

// Season start boundaries are tested in supabase/tests/rotation_test.sql.
describe("meteorological seasons", () => {
  it.each([
    ["2026-03-01", "Spring"],
    ["2026-06-01", "Summer"],
    ["2026-09-01", "Fall"],
    ["2026-12-01", "Winter"],
  ])("a season starting %s is %s", (start, name) => {
    expect(seasonName(start)).toBe(name);
  });

  it("ends the day before the next season", () => {
    expect(seasonEnd("2026-09-01")).toBe("2026-11-30");
    expect(seasonEnd("2026-12-01")).toBe("2027-02-28");
    expect(seasonEnd("2027-12-01")).toBe("2028-02-29");
  });
});

describe("due dates", () => {
  it("ends months correctly", () => {
    expect(monthEnd("2026-02-10")).toBe("2026-02-28");
    expect(monthEnd("2026-12-31")).toBe("2026-12-31");
  });

  it("formats calendar dates without shifting the day", () => {
    expect(formatDay("2026-10-04")).toBe("Sun, Oct 4");
  });
});
