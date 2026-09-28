// Rotation rules for Story 3. Dates are calendar dates as "YYYY-MM-DD" strings,
// always interpreted in the household's time zone.

export const MIN_ROTATION_SIZE = 2;
export const MAX_ROTATION_SIZE = 4;
const DAY_MS = 86_400_000;

/** Household size used by the rotation: the admin's setting, else the member count, kept to 2–4. */
export function effectiveSize(setting: number | null, memberCount: number): number {
  if (setting !== null) return setting;
  return Math.min(Math.max(memberCount, MIN_ROTATION_SIZE), MAX_ROTATION_SIZE);
}

/**
 * 0-based member position for a space in a given week or month.
 * With 4 members this reproduces the PRD grid; smaller households wrap with modulo.
 */
export function assigneePosition(rotationOffset: number, periodIndex: number, size: number): number {
  return (((rotationOffset + periodIndex) % size) + size) % size;
}

/** Today's date in a time zone, e.g. localDate(now, "America/New_York") → "2026-10-04". */
export function localDate(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function toUtc(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  return fromUtc(toUtc(date) + days * DAY_MS);
}

/** The Monday on or before a date. */
export function weekStart(date: string): string {
  const day = new Date(toUtc(date)).getUTCDay(); // 0 = Sunday
  return addDays(date, -((day + 6) % 7));
}

/** Weeks since the rotation began; week 1 of the PRD grid is index 0. */
export function weekIndex(rotationStart: string, today: string): number {
  const days = Math.round((toUtc(weekStart(today)) - toUtc(weekStart(rotationStart))) / DAY_MS);
  return Math.floor(days / 7);
}

/** Calendar months since the rotation began. */
export function monthIndex(rotationStart: string, today: string): number {
  const [sy, sm] = rotationStart.split("-").map(Number);
  const [ty, tm] = today.split("-").map(Number);
  return ty * 12 + tm - (sy * 12 + sm);
}

export function monthEnd(date: string): string {
  const [y, m] = date.split("-").map(Number);
  return fromUtc(Date.UTC(y, m, 0));
}

export type Season = "Spring" | "Summer" | "Fall" | "Winter";

// Season start dates come from the database (season_start_for) so they match
// the stored seasonal leads.

export function seasonEnd(start: string): string {
  const [y, m] = start.split("-").map(Number);
  return fromUtc(Date.UTC(y, m + 2, 0));
}

export function seasonName(start: string): Season {
  const month = Number(start.split("-")[1]);
  if (month === 3) return "Spring";
  if (month === 6) return "Summer";
  if (month === 9) return "Fall";
  return "Winter";
}

/** e.g. "Sun, Oct 4". Dates are calendar dates, so format them in UTC. */
export function formatDay(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(toUtc(date)));
}
