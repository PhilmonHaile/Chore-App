"use server";

import { redirect } from "next/navigation";
import { getOrigin } from "@/lib/origin";
import { safeNextPath } from "@/lib/redirect";
import { createClient } from "@/lib/supabase/server";

export async function sendMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const next = safeNextPath(String(formData.get("next") ?? ""));
  const back = `/login?next=${encodeURIComponent(next)}`;

  if (!email.includes("@")) redirect(`${back}&error=email`);

  const origin = await getOrigin();
  const callback = new URL("/auth/callback", origin);
  callback.searchParams.set("next", next);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: callback.toString(), shouldCreateUser: true },
  });

  if (error) redirect(`${back}&error=send`);
  redirect(`${back}&sent=1`);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
