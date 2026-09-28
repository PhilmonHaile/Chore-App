"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseSettings } from "@/lib/settings";
import { requireUser } from "@/lib/supabase/server";

export async function saveSettings(householdId: string, formData: FormData) {
  const path = `/household/${householdId}/settings`;
  const result = parseSettings(formData);
  if (!result.ok) redirect(`${path}?error=${result.error}`);

  const { supabase } = await requireUser(path);
  // The database function re-checks admin rights and the time zone.
  const { error } = await supabase.rpc("update_household_settings", {
    hid: householdId,
    p_timezone: result.timezone,
    p_rotation_size: result.rotationSize,
  });

  if (error) redirect(`${path}?error=${error.message.includes("not_admin") ? "not_admin" : "save_failed"}`);
  revalidatePath(`/household/${householdId}`, "layout");
  redirect(`${path}?saved=1`);
}
