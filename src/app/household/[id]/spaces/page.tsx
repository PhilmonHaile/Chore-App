import Link from "next/link";
import { notFound } from "next/navigation";
import { CADENCE_LABELS, groupChecklists } from "@/lib/checklists";
import { requireUser } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }> };

export default async function SpacesPage({ params }: Props) {
  const { id } = await params;
  const { supabase } = await requireUser(`/household/${id}/spaces`);

  // RLS limits every query to households the user belongs to.
  const [household, spaces, chores, items, points] = await Promise.all([
    supabase.from("households").select("name").eq("id", id).maybeSingle(),
    supabase.from("spaces").select("id, name, position").eq("household_id", id),
    supabase.from("chores").select("id, space_id, cadence").eq("household_id", id),
    supabase.from("chore_items").select("id, chore_id, label, position").eq("household_id", id),
    supabase.from("chore_points").select("chore_id, points").eq("household_id", id),
  ]);

  if (!household.data) notFound();

  // Surface failures via the error boundary rather than showing empty lists or 0 pts.
  const failed = [spaces, chores, items, points].find((r) => r.error);
  if (failed?.error) throw new Error(`Couldn't load checklists: ${failed.error.message}`);

  const grouped = groupChecklists(
    spaces.data ?? [],
    chores.data ?? [],
    items.data ?? [],
    points.data ?? [],
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-4 py-10">
      <header>
        <Link href={`/household/${id}`} className="text-sm text-neutral-500 underline">
          {household.data.name}
        </Link>
        <h1 className="text-2xl font-semibold">Rooms &amp; checklists</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Each item is worth 1 point. Editing checklists is coming in a later update.
        </p>
      </header>

      {grouped.length === 0 && (
        <p className="text-sm text-neutral-500">No rooms have been set up for this household yet.</p>
      )}

      {grouped.map((space) => (
        <section key={space.id} className="rounded-lg border border-neutral-200">
          <h2 className="border-b border-neutral-200 px-4 py-3 font-medium">{space.name}</h2>
          {space.chores.map((chore) => (
            <details key={chore.id} className="border-b border-neutral-100 last:border-b-0">
              <summary className="flex cursor-pointer items-center justify-between px-4 py-2 text-sm">
                <span>{CADENCE_LABELS[chore.cadence]}</span>
                <span className="text-neutral-500">
                  {chore.items.length} items · {chore.points} pts
                </span>
              </summary>
              <ol className="list-decimal space-y-1 px-4 pb-3 pl-9 text-sm text-neutral-700">
                {chore.items.map((item) => (
                  <li key={item.id}>{item.label}</li>
                ))}
              </ol>
            </details>
          ))}
        </section>
      ))}
    </main>
  );
}
