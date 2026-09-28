"use server";

import { redirect } from "next/navigation";
import { isInviteToken, toInviteError } from "@/lib/invites";
import { requireUser } from "@/lib/supabase/server";

export async function acceptInvite(token: string) {
  const invitePath = `/invite/${token}`;
  if (!isInviteToken(token)) redirect(`${invitePath}?error=invalid_invite`);

  const { supabase } = await requireUser(invitePath);
  const { data: householdId, error } = await supabase.rpc("accept_invite", { p_token: token });

  // 23505: a simultaneous second request already added them; home sends them to their household.
  if (error?.code === "23505") redirect("/");
  if (error || !householdId) {
    redirect(`${invitePath}?error=${toInviteError(error?.message)}`);
  }
  redirect(`/household/${householdId}?joined=1`);
}
