import { describe, expect, it } from "vitest";
import { isValidTimeZone, parseSettings, settingsErrorMessage, timeZoneOptions } from "./settings";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("time zones", () => {
  it("accepts IANA names and rejects anything else", () => {
    expect(isValidTimeZone("America/New_York")).toBe(true);
    expect(isValidTimeZone("UTC")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus_Mons")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
  });

  it("offers UTC in the picker", () => {
    expect(timeZoneOptions()).toContain("UTC");
    expect(timeZoneOptions()).toContain("America/New_York");
  });
});

describe("parseSettings", () => {
  it("treats auto as 'use the member count'", () => {
    expect(parseSettings(form({ timezone: "UTC", rotation_size: "auto" }))).toEqual({
      ok: true,
      timezone: "UTC",
      rotationSize: null,
    });
  });

  it("accepts sizes 2 to 4", () => {
    for (const size of ["2", "3", "4"]) {
      expect(parseSettings(form({ timezone: "Europe/London", rotation_size: size }))).toEqual({
        ok: true,
        timezone: "Europe/London",
        rotationSize: Number(size),
      });
    }
  });

  it("rejects bad sizes and time zones", () => {
    for (const size of ["1", "5", "2.5", "abc"]) {
      expect(parseSettings(form({ timezone: "UTC", rotation_size: size }))).toEqual({
        ok: false,
        error: "invalid_rotation_size",
      });
    }
    expect(parseSettings(form({ timezone: "Nowhere", rotation_size: "2" }))).toEqual({
      ok: false,
      error: "invalid_timezone",
    });
  });

  it("only shows fixed error messages", () => {
    expect(settingsErrorMessage("invalid_timezone")).toBeTruthy();
    expect(settingsErrorMessage("<script>alert(1)</script>")).toBeNull();
  });
});
