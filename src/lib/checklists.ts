import type { Cadence } from "@/lib/supabase/database.types";

export const CADENCES: readonly Cadence[] = ["weekly", "monthly", "seasonal"];

export const CADENCE_LABELS: Record<Cadence, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  seasonal: "Seasonal",
};

type SpaceRow = { id: string; name: string; position: number };
type ChoreRow = { id: string; space_id: string; cadence: Cadence };
type ItemRow = { id: string; chore_id: string; label: string; position: number };
type PointsRow = { chore_id: string; points: number };

export type ChoreView = { id: string; cadence: Cadence; points: number; items: ItemRow[] };
export type SpaceView = { id: string; name: string; chores: ChoreView[] };

/**
 * Nests flat rows into spaces → chores (weekly, monthly, seasonal) → items,
 * each in display order. Points come from the chore_points view.
 */
export function groupChecklists(
  spaces: SpaceRow[],
  chores: ChoreRow[],
  items: ItemRow[],
  points: PointsRow[],
): SpaceView[] {
  const pointsByChore = new Map(points.map((p) => [p.chore_id, p.points]));
  const itemsByChore = new Map<string, ItemRow[]>();
  for (const item of items) {
    const list = itemsByChore.get(item.chore_id) ?? [];
    list.push(item);
    itemsByChore.set(item.chore_id, list);
  }

  return [...spaces]
    .sort((a, b) => a.position - b.position)
    .map((space) => ({
      id: space.id,
      name: space.name,
      chores: chores
        .filter((c) => c.space_id === space.id)
        .sort((a, b) => CADENCES.indexOf(a.cadence) - CADENCES.indexOf(b.cadence))
        .map((c) => ({
          id: c.id,
          cadence: c.cadence,
          points: pointsByChore.get(c.id) ?? 0,
          items: (itemsByChore.get(c.id) ?? []).sort((a, b) => a.position - b.position),
        })),
    }));
}
