import Link from "next/link";
import { notFound } from "next/navigation";
import { ChoreDetails } from "@/components/ChoreDetails";
import { myChores, type AssignedChore } from "@/lib/assignments";
import { CADENCE_LABELS } from "@/lib/checklists";
import { loadChecklists } from "@/lib/load-checklists";
import { formatDay, localDate } from "@/lib/rotation";
import { requireUser } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }> };

export default async function MyChoresPage({ params }: Props) {
  const { id } = await params;
  const { supabase, user } = await requireUser(`/household/${id}/chores`);

  const [household, members, season] = await Promise.all([
    supabase
      .from("households")
      .select("name, timezone, rotation_size, rotation_start")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("household_members")
      .select("user_id")
      .eq("household_id", id)
      .order("joined_at")
      .order("user_id"),
    supabase.rpc("ensure_seasonal_leads", { hid: id }),
  ]);

  if (!household.data) notFound();
  const failed = [members, season].find((r) => r.error);
  if (failed?.error) throw new Error(`Couldn't load your chores: ${failed.error.message}`);

  const seasonStart = season.data ?? "";
  const [spaces, leads] = await Promise.all([
    loadChecklists(supabase, id),
    supabase
      .from("seasonal_leads")
      .select("space_id, user_id")
      .eq("household_id", id)
      .eq("season_start", seasonStart),
  ]);
  if (leads.error) throw new Error(`Couldn't load seasonal leads: ${leads.error.message}`);

  const { timezone, rotation_size, rotation_start } = household.data;
  const mine = myChores({
    spaces,
    memberIds: (members.data ?? []).map((m) => m.user_id),
    rotationSize: rotation_size,
    rotationStart: rotation_start,
    today: localDate(new Date(), timezone),
    seasonStart,
    seasonalLeads: new Map((leads.data ?? []).map((l) => [l.space_id, l.user_id])),
    userId: user.id,
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-4 py-10">
      <header>
        <Link href={`/household/${id}`} className="text-sm text-neutral-500 underline">
          {household.data.name}
        </Link>
        <h1 className="text-2xl font-semibold">My chores</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Chores are due by 11:59 PM on the date shown ({timezone} time).
        </p>
      </header>

      {!mine.inRotation && (
        <p role="status" className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          The household size is set lower than the number of roommates, so you&apos;re not in
          this rotation. Ask your admin to change it in Settings.
        </p>
      )}

      <ChoreGroup
        title={`This week (from ${formatDay(mine.week.start)})`}
        due={mine.week.due}
        chores={mine.week.chores}
      />
      <ChoreGroup title="This month" due={mine.month.due} chores={mine.month.chores} />
      <ChoreGroup
        title={`This season · ${mine.season.name} lead`}
        due={mine.season.due}
        chores={mine.season.chores}
      />
    </main>
  );
}

function ChoreGroup({ title, due, chores }: { title: string; due: string; chores: AssignedChore[] }) {
  const total = chores.reduce((sum, c) => sum + c.chore.points, 0);
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h2 className="font-medium">{title}</h2>
        <span className="text-xs text-neutral-500">
          Due {formatDay(due)} · {total} pts
        </span>
      </div>
      {chores.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-200 px-4 py-3 text-sm text-neutral-500">
          Nothing assigned to you.
        </p>
      ) : (
        <div className="rounded-lg border border-neutral-200">
          {chores.map(({ spaceName, chore }) => (
            <ChoreDetails
              key={chore.id}
              chore={chore}
              title={`${spaceName} · ${CADENCE_LABELS[chore.cadence]}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
