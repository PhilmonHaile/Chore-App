import { MAX_ROTATION_SIZE, MIN_ROTATION_SIZE } from "@/lib/rotation";

export function timeZoneOptions(): string[] {
  const zones = Intl.supportedValuesOf("timeZone");
  return zones.includes("UTC") ? zones : ["UTC", ...zones];
}

export function isValidTimeZone(zone: string): boolean {
  if (!zone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

export type SettingsError = "invalid_timezone" | "invalid_rotation_size" | "save_failed" | "not_admin";

export type SettingsResult =
  | { ok: true; timezone: string; rotationSize: number | null }
  | { ok: false; error: SettingsError };

/** rotation_size "auto" (or empty) means: use the number of members. */
export function parseSettings(form: FormData): SettingsResult {
  const timezone = String(form.get("timezone") ?? "").trim();
  if (!isValidTimeZone(timezone)) return { ok: false, error: "invalid_timezone" };

  const rawSize = String(form.get("rotation_size") ?? "auto");
  if (rawSize === "auto" || rawSize === "") return { ok: true, timezone, rotationSize: null };

  const size = Number(rawSize);
  if (!Number.isInteger(size) || size < MIN_ROTATION_SIZE || size > MAX_ROTATION_SIZE) {
    return { ok: false, error: "invalid_rotation_size" };
  }
  return { ok: true, timezone, rotationSize: size };
}

export function settingsErrorMessage(code: string | undefined): string | null {
  switch (code) {
    case "invalid_timezone":
      return "Pick a time zone from the list.";
    case "invalid_rotation_size":
      return `Household size must be between ${MIN_ROTATION_SIZE} and ${MAX_ROTATION_SIZE}.`;
    case "not_admin":
      return "Only the household admin can change settings.";
    case "save_failed":
      return "Couldn't save settings. Try again.";
    default:
      return null;
  }
}
