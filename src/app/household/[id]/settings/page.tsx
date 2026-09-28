import Link from "next/link";
import { notFound } from "next/navigation";
import { effectiveSize } from "@/lib/rotation";
import { settingsErrorMessage, timeZoneOptions } from "@/lib/settings";
import { requireUser } from "@/lib/supabase/server";
import { saveSettings } from "./actions";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
};

export default async function SettingsPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { error, saved } = await searchParams;
  const { supabase, user } = await requireUser(`/household/${id}/settings`);

  const [household, members] = await Promise.all([
    supabase.from("households").select("name, timezone, rotation_size").eq("id", id).maybeSingle(),
    supabase.from("household_members").select("user_id, role").eq("household_id", id),
  ]);
  if (!household.data) notFound();

  const memberCount = members.data?.length ?? 0;
  const isAdmin = members.data?.some((m) => m.user_id === user.id && m.role === "admin") ?? false;
  const { name, timezone, rotation_size } = household.data;
  const errorMessage = settingsErrorMessage(error);
  const field = "rounded-md border border-neutral-300 px-3 py-2 disabled:bg-neutral-50";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-4 py-10">
      <header>
        <Link href={`/household/${id}`} className="text-sm text-neutral-500 underline">
          {name}
        </Link>
        <h1 className="text-2xl font-semibold">Household settings</h1>
        {!isAdmin && (
          <p className="mt-1 text-sm text-neutral-500">Only the admin can change these.</p>
        )}
      </header>

      <form action={saveSettings.bind(null, id)} className="flex flex-col gap-4">
        <fieldset disabled={!isAdmin} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Time zone
            <select name="timezone" defaultValue={timezone} className={field}>
              {timeZoneOptions().map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
            <span className="text-xs text-neutral-500">
              Weeks start Monday; chores are due Sunday at 11:59 PM in this time zone.
            </span>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Household size
            <select name="rotation_size" defaultValue={rotation_size ?? "auto"} className={field}>
              <option value="auto">
                Match roommates ({effectiveSize(null, memberCount)})
              </option>
              {[2, 3, 4].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span className="text-xs text-neutral-500">
              How many roommates share the rotation, in the order they joined.
            </span>
            {rotation_size !== null && rotation_size > memberCount && (
              <span className="text-xs text-amber-700">
                Only {memberCount} of {rotation_size} spots are filled, so some chores have
                nobody assigned until more roommates join.
              </span>
            )}
          </label>

          {isAdmin && (
            <button type="submit" className="rounded-md bg-black px-3 py-2 text-white">
              Save settings
            </button>
          )}
        </fieldset>
      </form>

      {saved && !errorMessage && (
        <p role="status" className="text-sm text-green-700">
          Settings saved.
        </p>
      )}
      {errorMessage && (
        <p role="alert" className="text-sm text-red-600">
          {errorMessage}
        </p>
      )}
    </main>
  );
}
