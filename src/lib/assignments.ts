import type { ChoreView, SpaceView } from "@/lib/checklists";
import type { Cadence } from "@/lib/supabase/database.types";
import {
  addDays,
  assigneePosition,
  effectiveSize,
  monthEnd,
  monthIndex,
  seasonEnd,
  seasonName,
  weekIndex,
  weekStart,
} from "@/lib/rotation";

export type RotationSpace = SpaceView & { rotationOffset: number };

export type AssignedChore = { spaceName: string; chore: ChoreView };

export type MyChores = {
  week: { start: string; due: string; chores: AssignedChore[] };
  month: { due: string; chores: AssignedChore[] };
  season: { name: string; due: string; chores: AssignedChore[] };
  /** False when the household size leaves this member out of the rotation. */
  inRotation: boolean;
};

type Input = {
  spaces: RotationSpace[];
  /** Member user ids in rotation order (joined_at, then user_id). */
  memberIds: string[];
  rotationSize: number | null;
  rotationStart: string;
  today: string;
  seasonStart: string;
  /** space id → user id of this season's lead. */
  seasonalLeads: Map<string, string>;
  userId: string;
};

function choreFor(space: RotationSpace, cadence: Cadence): AssignedChore[] {
  const chore = space.chores.find((c) => c.cadence === cadence);
  return chore ? [{ spaceName: space.name, chore }] : [];
}

export function myChores(input: Input): MyChores {
  const { spaces, memberIds, userId, today } = input;
  const size = effectiveSize(input.rotationSize, memberIds.length);
  const position = memberIds.slice(0, size).indexOf(userId);
  const inRotation = position !== -1;
  const week = weekIndex(input.rotationStart, today);
  const month = monthIndex(input.rotationStart, today);

  const assigned = (index: number, cadence: Cadence) =>
    inRotation
      ? spaces
          .filter((s) => assigneePosition(s.rotationOffset, index, size) === position)
          .flatMap((s) => choreFor(s, cadence))
      : [];

  const start = weekStart(today);

  return {
    week: { start, due: addDays(start, 6), chores: assigned(week, "weekly") },
    month: { due: monthEnd(today), chores: assigned(month, "monthly") },
    season: {
      name: seasonName(input.seasonStart),
      due: seasonEnd(input.seasonStart),
      chores: spaces
        .filter((s) => input.seasonalLeads.get(s.id) === userId)
        .flatMap((s) => choreFor(s, "seasonal")),
    },
    inRotation,
  };
}
