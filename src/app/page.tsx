import { redirect } from "next/navigation";
import { SubmitButton } from "@/components/SubmitButton";
import { HOUSEHOLD_NAME_MAX, householdErrorMessage } from "@/lib/households";
import { requireUser } from "@/lib/supabase/server";
import { createHousehold } from "./household/actions";
import { signOut } from "./login/actions";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function HomePage({ searchParams }: Props) {
  const { error } = await searchParams;
  const { supabase, user } = await requireUser("/");

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .order("joined_at")
    .limit(1)
    .maybeSingle();

  if (membership) redirect(`/household/${membership.household_id}`);

  const errorMessage = householdErrorMessage(error);

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-2xl font-semibold">Create your household</h1>
        <p className="mt-1 text-sm text-neutral-500">
          You&apos;ll be the admin and can invite roommates with a link.
        </p>
      </div>

      <form action={createHousehold} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Household name
          <input
            name="name"
            required
            maxLength={HOUSEHOLD_NAME_MAX}
            placeholder="e.g. Maple Street House"
            className="rounded-md border border-neutral-300 px-3 py-2"
          />
        </label>
        <SubmitButton
          pendingLabel="Creating…"
          className="rounded-md bg-black px-3 py-2 text-white disabled:opacity-60"
        >
          Create household
        </SubmitButton>
      </form>

      {errorMessage && (
        <p role="alert" className="text-sm text-red-600">
          {errorMessage}
        </p>
      )}

      <form action={signOut}>
        <button type="submit" className="text-sm text-neutral-500 underline">
          Sign out ({user.email})
        </button>
      </form>
    </main>
  );
}
