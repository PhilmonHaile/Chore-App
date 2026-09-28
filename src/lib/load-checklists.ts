import type { SupabaseClient } from "@supabase/supabase-js";
import type { RotationSpace } from "@/lib/assignments";
import { groupChecklists } from "@/lib/checklists";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Loads a household's spaces, chores, items and points, nested for display.
 * RLS limits every query to households the user belongs to. Throws on failure
 * so pages show an error rather than empty lists or 0 pts.
 */
export async function loadChecklists(
  supabase: SupabaseClient<Database>,
  householdId: string,
): Promise<RotationSpace[]> {
  const [spaces, chores, items, points] = await Promise.all([
    supabase.from("spaces").select("id, name, position, rotation_offset").eq("household_id", householdId),
    supabase.from("chores").select("id, space_id, cadence").eq("household_id", householdId),
    supabase.from("chore_items").select("id, chore_id, label, position").eq("household_id", householdId),
    supabase.from("chore_points").select("chore_id, points").eq("household_id", householdId),
  ]);

  const failed = [spaces, chores, items, points].find((r) => r.error);
  if (failed?.error) throw new Error(`Couldn't load checklists: ${failed.error.message}`);

  const offsets = new Map((spaces.data ?? []).map((s) => [s.id, s.rotation_offset]));
  return groupChecklists(spaces.data ?? [], chores.data ?? [], items.data ?? [], points.data ?? []).map(
    (space) => ({ ...space, rotationOffset: offsets.get(space.id) ?? 0 }),
  );
}
