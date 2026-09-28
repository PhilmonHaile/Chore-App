import Link from "next/link";
import { notFound } from "next/navigation";
import { ChoreDetails } from "@/components/ChoreDetails";
import { loadChecklists } from "@/lib/load-checklists";
import { requireUser } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }> };

export default async function SpacesPage({ params }: Props) {
  const { id } = await params;
  const { supabase } = await requireUser(`/household/${id}/spaces`);

  const { data: household } = await supabase
    .from("households")
    .select("name")
    .eq("id", id)
    .maybeSingle();
  if (!household) notFound();

  const spaces = await loadChecklists(supabase, id);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-4 py-10">
      <header>
        <Link href={`/household/${id}`} className="text-sm text-neutral-500 underline">
          {household.name}
        </Link>
        <h1 className="text-2xl font-semibold">Rooms &amp; checklists</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Each item is worth 1 point. Editing checklists is coming in a later update.
        </p>
      </header>

      {spaces.length === 0 && (
        <p className="text-sm text-neutral-500">No rooms have been set up for this household yet.</p>
      )}

      {spaces.map((space) => (
        <section key={space.id} className="rounded-lg border border-neutral-200">
          <h2 className="border-b border-neutral-200 px-4 py-3 font-medium">{space.name}</h2>
          {space.chores.map((chore) => (
            <ChoreDetails key={chore.id} chore={chore} />
          ))}
        </section>
      ))}
    </main>
  );
}
