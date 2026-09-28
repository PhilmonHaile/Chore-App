export const HOUSEHOLD_NAME_MAX = 80;

export type HouseholdError = "name_blank" | "name_too_long" | "create_failed";

export type NameResult = { ok: true; name: string } | { ok: false; error: HouseholdError };

export function validateHouseholdName(raw: FormDataEntryValue | null): NameResult {
  const name = typeof raw === "string" ? raw.trim() : "";
  if (!name) return { ok: false, error: "name_blank" };
  if (name.length > HOUSEHOLD_NAME_MAX) return { ok: false, error: "name_too_long" };
  return { ok: true, name };
}

export function householdErrorMessage(code: string | undefined): string | null {
  switch (code) {
    case "name_blank":
      return "Give your household a name.";
    case "name_too_long":
      return `Keep the name under ${HOUSEHOLD_NAME_MAX} characters.`;
    case "create_failed":
      return "Couldn't create the household. Try again.";
    default:
      return null;
  }
}
