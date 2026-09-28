import { describe, expect, it } from "vitest";
import { myChores, type RotationSpace } from "./assignments";
import type { Cadence } from "./supabase/database.types";

const OFFSETS: [string, number][] = [
  ["Kitchen", 0], ["Bathroom 1", 1], ["Bathroom 2", 2], ["Living Room", 2],
  ["Dining Room", 1], ["Stairs", 3], ["Hallways", 0],
];

const spaces: RotationSpace[] = OFFSETS.map(([name, rotationOffset], i) => ({
  id: `s${i}`,
  name,
  rotationOffset,
  chores: (["weekly", "monthly", "seasonal"] as Cadence[]).map((cadence) => ({
    id: `s${i}-${cadence}`,
    cadence,
    points: 3,
    items: [],
  })),
}));

const members = ["alex", "bea", "cam", "dee"];

function run(overrides: Partial<Parameters<typeof myChores>[0]> = {}) {
  return myChores({
    spaces,
    memberIds: members,
    rotationSize: null,
    rotationStart: "2026-09-28",
    today: "2026-09-30",
    seasonStart: "2026-09-01",
    seasonalLeads: new Map([["s0", "bea"], ["s6", "bea"], ["s3", "alex"]]),
    userId: "alex",
    ...overrides,
  });
}

const names = (chores: { spaceName: string }[]) => chores.map((c) => c.spaceName).sort();

describe("myChores", () => {
  it("gives position 1 their week 1 grid spaces", () => {
    const mine = run();
    expect(names(mine.week.chores)).toEqual(["Hallways", "Kitchen"]);
    expect(mine.week.chores.every((c) => c.chore.cadence === "weekly")).toBe(true);
  });

  it("moves to the next grid week on Monday", () => {
    expect(names(run({ today: "2026-10-05" }).week.chores)).toEqual(["Stairs"]);
  });

  it("uses the same slots for monthly chores, shifting one person per month", () => {
    expect(names(run().month.chores)).toEqual(["Hallways", "Kitchen"]);
    expect(names(run({ today: "2026-10-15" }).month.chores)).toEqual(["Stairs"]);
    expect(run().month.chores.every((c) => c.chore.cadence === "monthly")).toBe(true);
  });

  it("shows seasonal chores for spaces the user leads", () => {
    expect(names(run().season.chores)).toEqual(["Living Room"]);
    expect(names(run({ userId: "bea" }).season.chores)).toEqual(["Hallways", "Kitchen"]);
    expect(run().season.name).toBe("Fall");
  });

  it("assigns every weekly chore to exactly one roommate", () => {
    for (const size of [2, 3, 4]) {
      const memberIds = members.slice(0, size);
      const all = memberIds.flatMap((userId) => run({ memberIds, userId }).week.chores);
      expect(all).toHaveLength(7);
      expect(new Set(all.map((c) => c.chore.id)).size).toBe(7);
    }
  });

  it("leaves members beyond the household size out of the rotation", () => {
    const mine = run({ rotationSize: 3, userId: "dee" });
    expect(mine.inRotation).toBe(false);
    expect(mine.week.chores).toEqual([]);
    expect(mine.month.chores).toEqual([]);
  });

  it("reports due dates for the week, month and season", () => {
    const mine = run();
    expect(mine.week).toMatchObject({ start: "2026-09-28", due: "2026-10-04" });
    expect(mine.month.due).toBe("2026-09-30");
    expect(mine.season.due).toBe("2026-11-30");
  });
});
