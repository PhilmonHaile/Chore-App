import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import { inviteErrorMessage, isInviteToken } from "@/lib/invites";
import { requireUser } from "@/lib/supabase/server";
import { acceptInvite } from "./actions";

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function InvitePage({ params, searchParams }: Props) {
  const { token } = await params;
  const { error } = await searchParams;
  const { supabase } = await requireUser(`/invite/${token}`);

  const { data } = isInviteToken(token)
    ? await supabase.rpc("get_invite", { p_token: token })
    : { data: null };
  const invite = data?.[0];

  // A link that's missing or expired can't be retried; a failed join can.
  const problem = !invite
    ? inviteErrorMessage("invalid_invite")
    : !invite.is_valid
      ? inviteErrorMessage("expired_invite")
      : null;
  const joinError = inviteErrorMessage(error);

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      {invite && !problem ? (
        <>
          <div>
            <p className="text-sm text-neutral-500">You&apos;re invited to join</p>
            <h1 className="text-2xl font-semibold">{invite.household_name}</h1>
          </div>
          <form action={acceptInvite.bind(null, token)}>
            <SubmitButton
              pendingLabel="Joining…"
              className="w-full rounded-md bg-black px-3 py-2 text-white disabled:opacity-60"
            >
              Join household
            </SubmitButton>
          </form>
          {joinError && (
            <p role="alert" className="text-sm text-red-600">
              {joinError}
            </p>
          )}
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold">Can&apos;t join</h1>
          <p role="alert" className="text-sm text-red-600">
            {problem}
          </p>
          <Link href="/" className="text-sm underline">
            Go to Chore-App
          </Link>
        </>
      )}
    </main>
  );
}
