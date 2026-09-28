import { describe, expect, it } from "vitest";
import { HOUSEHOLD_NAME_MAX, householdErrorMessage, validateHouseholdName } from "./households";

describe("validateHouseholdName", () => {
  it("trims and accepts a normal name", () => {
    expect(validateHouseholdName("  Maple Street  ")).toEqual({ ok: true, name: "Maple Street" });
  });

  it("rejects blank or missing names", () => {
    expect(validateHouseholdName("   ")).toEqual({ ok: false, error: "name_blank" });
    expect(validateHouseholdName(null)).toEqual({ ok: false, error: "name_blank" });
  });

  it("rejects names over the limit", () => {
    expect(validateHouseholdName("a".repeat(HOUSEHOLD_NAME_MAX)).ok).toBe(true);
    expect(validateHouseholdName("a".repeat(HOUSEHOLD_NAME_MAX + 1))).toEqual({
      ok: false,
      error: "name_too_long",
    });
  });
});

describe("householdErrorMessage", () => {
  it("has a message for every error code", () => {
    for (const code of ["name_blank", "name_too_long", "create_failed"]) {
      expect(householdErrorMessage(code)).toBeTruthy();
    }
  });

  it("ignores arbitrary text from the URL", () => {
    expect(householdErrorMessage("You have been hacked, email us")).toBeNull();
    expect(householdErrorMessage(undefined)).toBeNull();
  });
});
