import { describe, expect, it } from "vitest";
import { groupChecklists } from "./checklists";

const spaces = [
  { id: "s2", name: "Stairs", position: 6 },
  { id: "s1", name: "Kitchen", position: 1 },
];
const chores = [
  { id: "c3", space_id: "s1", cadence: "seasonal" as const },
  { id: "c1", space_id: "s1", cadence: "weekly" as const },
  { id: "c2", space_id: "s1", cadence: "monthly" as const },
  { id: "c4", space_id: "s2", cadence: "weekly" as const },
];
const items = [
  { id: "i2", chore_id: "c1", label: "Mop the floor", position: 2 },
  { id: "i1", chore_id: "c1", label: "Sweep the floor", position: 1 },
  { id: "i3", chore_id: "c2", label: "Deep clean the oven", position: 1 },
];
const points = [
  { chore_id: "c1", points: 2 },
  { chore_id: "c2", points: 1 },
  { chore_id: "c3", points: 0 },
];

describe("groupChecklists", () => {
  const grouped = groupChecklists(spaces, chores, items, points);

  it("orders spaces by position", () => {
    expect(grouped.map((s) => s.name)).toEqual(["Kitchen", "Stairs"]);
  });

  it("orders chores weekly, monthly, seasonal", () => {
    expect(grouped[0].chores.map((c) => c.cadence)).toEqual(["weekly", "monthly", "seasonal"]);
  });

  it("orders items by position", () => {
    expect(grouped[0].chores[0].items.map((i) => i.label)).toEqual([
      "Sweep the floor",
      "Mop the floor",
    ]);
  });

  it("uses points from the chore_points view", () => {
    expect(grouped[0].chores.map((c) => c.points)).toEqual([2, 1, 0]);
  });

  it("treats a chore with no points row or items as 0 points and empty", () => {
    expect(grouped[1].chores[0]).toEqual({ id: "c4", cadence: "weekly", points: 0, items: [] });
  });
});
