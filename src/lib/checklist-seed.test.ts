import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Checks the seed migration against the PRD Checklists tab.
const sql = readFileSync(
  join(process.cwd(), "supabase/migrations/20260928100000_checklist_templates.sql"),
  "utf8",
);

const spaces = [...sql.matchAll(/^\s+\((\d+), '([^']+)', '(\w+)'\)/gm)].map((m) => ({
  position: Number(m[1]),
  name: m[2],
  templateKey: m[3],
}));

const ITEM_ROW = /^\s+\('(\w+)', '(weekly|monthly|seasonal)', (\d+), '((?:[^']|'')+)'\)/gm;
const items = [...sql.matchAll(ITEM_ROW)].map((m) => ({
  templateKey: m[1],
  cadence: m[2],
  position: Number(m[3]),
  label: m[4],
}));

function list(templateKey: string, cadence: string) {
  return items.filter((i) => i.templateKey === templateKey && i.cadence === cadence);
}

function count(templateKey: string, cadence: string) {
  return list(templateKey, cadence).length;
}

describe("seed spaces", () => {
  it("has the 7 PRD spaces in order", () => {
    expect(spaces.map((s) => s.name)).toEqual([
      "Kitchen",
      "Bathroom 1",
      "Bathroom 2",
      "Living Room",
      "Dining Room",
      "Stairs",
      "Hallways",
    ]);
    expect(spaces.map((s) => s.position)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("gives both bathrooms the same checklist", () => {
    const bathrooms = spaces.filter((s) => s.name.startsWith("Bathroom"));
    expect(bathrooms.map((s) => s.templateKey)).toEqual(["bathroom", "bathroom"]);
  });

  it("has a checklist for every space", () => {
    for (const space of spaces) {
      expect(items.some((i) => i.templateKey === space.templateKey)).toBe(true);
    }
  });
});

describe("seed checklist item counts match the PRD", () => {
  const expected: [string, number, number, number][] = [
    ["kitchen", 15, 8, 7],
    ["bathroom", 11, 8, 6],
    ["living_room", 9, 7, 6],
    ["dining_room", 8, 6, 5],
    ["stairs", 6, 5, 4],
    ["hallways", 6, 6, 5],
  ];

  it.each(expected)("%s: %i weekly, %i monthly, %i seasonal", (key, weekly, monthly, seasonal) => {
    expect(count(key, "weekly")).toBe(weekly);
    expect(count(key, "monthly")).toBe(monthly);
    expect(count(key, "seasonal")).toBe(seasonal);
  });

  it("has 128 template items in total (bathrooms share one list)", () => {
    expect(items).toHaveLength(128);
  });

  it.each(expected)("%s lists are numbered 1 to n with no gaps", (key) => {
    for (const cadence of ["weekly", "monthly", "seasonal"]) {
      const positions = list(key, cadence).map((i) => i.position);
      expect(positions).toEqual(positions.map((_, index) => index + 1));
    }
  });

  it("has no duplicate items within a checklist", () => {
    const keys = items.map((i) => `${i.templateKey}|${i.cadence}|${i.label}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
