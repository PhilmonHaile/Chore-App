import { CopyButton } from "@/components/CopyButton";
import { buildInviteUrl } from "@/lib/invites";
import { getOrigin } from "@/lib/origin";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createInvite } from "../actions";

type Props = {
  householdId: string;
  supabase: SupabaseClient<Database>;
  failed: boolean;
};

/** Admin-only: shows the current invite link, or a button to make one. */
export async function InvitePanel({ householdId, supabase, failed }: Props) {
  const { data: invite } = await supabase
    .from("household_invites")
    .select("token, expires_at")
    .eq("household_id", householdId)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const url = invite ? buildInviteUrl(await getOrigin(), invite.token) : null;
  const createForThisHousehold = createInvite.bind(null, householdId);

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4">
      <h2 className="font-medium">Invite roommates</h2>

      {url && invite ? (
        <>
          <div className="flex gap-2">
            <input
              readOnly
              value={url}
              aria-label="Invite link"
              className="min-w-0 flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
            <CopyButton text={url} />
          </div>
          <p className="text-xs text-neutral-500">
            Anyone with this link can join until{" "}
            {new Date(invite.expires_at).toLocaleDateString()}. Creating a new link turns this
            one off.
          </p>
        </>
      ) : (
        <p className="text-sm text-neutral-500">Create a link and send it to your roommates.</p>
      )}

      <form action={createForThisHousehold}>
        <button type="submit" className="rounded-md bg-black px-3 py-2 text-sm text-white">
          {url ? "Create a new link" : "Create invite link"}
        </button>
      </form>

      {failed && (
        <p role="alert" className="text-sm text-red-600">
          Couldn&apos;t create an invite link. Try again.
        </p>
      )}
    </section>
  );
}
