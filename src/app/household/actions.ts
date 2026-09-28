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
