"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { validateHouseholdName } from "@/lib/households";
import { requireUser } from "@/lib/supabase/server";

export async function createHousehold(formData: FormData) {
  const result = validateHouseholdName(formData.get("name"));
  if (!result.ok) redirect(`/?error=${result.error}`);

  const { supabase } = await requireUser("/");
  const { data: householdId, error } = await supabase.rpc("create_household", {
    p_name: result.name,
  });

  // Already in a household (e.g. a second click got through): home sends them to it.
  // 23505 is the one-household-per-user index catching two simultaneous requests.
  if (error?.message.includes("already_in_household") || error?.code === "23505") redirect("/");
  if (error || !householdId) redirect("/?error=create_failed");
  redirect(`/household/${householdId}`);
}

/** Replaces the household's invite link: older links stop working. */
export async function createInvite(householdId: string) {
  const path = `/household/${householdId}`;
  const { supabase } = await requireUser(path);

  // RLS only lets admins revoke and insert invites for their own household.
  const { error: revokeError } = await supabase
    .from("household_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("household_id", householdId)
    .is("revoked_at", null);

  const { error } = revokeError
    ? { error: revokeError }
    : await supabase.from("household_invites").insert({ household_id: householdId });

  if (error) redirect(`${path}?error=invite`);
  revalidatePath(path);
}
