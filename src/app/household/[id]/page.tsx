import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { signOut } from "../../login/actions";
import { InvitePanel } from "./InvitePanel";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; joined?: string }>;
};

export default async function HouseholdPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { error, joined } = await searchParams;
  const { supabase, user } = await requireUser(`/household/${id}`);

  // RLS returns nothing unless the user is a member of this household.
  const { data: household } = await supabase
    .from("households")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();

  if (!household) notFound();

  const { data: members } = await supabase
    .from("household_members")
    .select("user_id, display_name, role, joined_at")
    .eq("household_id", id)
    .order("joined_at");

  const isAdmin = members?.some((m) => m.user_id === user.id && m.role === "admin") ?? false;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-4 py-10">
      <header>
        <p className="text-sm text-neutral-500">Household</p>
        <h1 className="text-2xl font-semibold">{household.name}</h1>
      </header>

      {joined && (
        <p role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-800">
          You&apos;ve joined {household.name}.
        </p>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Roommates ({members?.length ?? 0})</h2>
        <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200">
          {members?.map((m) => (
            <li key={m.user_id} className="flex items-center justify-between px-4 py-2 text-sm">
              <span>
                {m.display_name}
                {m.user_id === user.id && <span className="text-neutral-500"> (you)</span>}
              </span>
              {m.role === "admin" && <span className="text-xs text-neutral-500">Admin</span>}
            </li>
          ))}
        </ul>
      </section>

      {isAdmin && (
        <InvitePanel householdId={id} supabase={supabase} failed={error === "invite"} />
      )}

      <form action={signOut}>
        <button type="submit" className="text-sm text-neutral-500 underline">
          Sign out
        </button>
      </form>
    </main>
  );
}
