const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isInviteToken(token: string): boolean {
  return UUID_PATTERN.test(token);
}

export function buildInviteUrl(origin: string, token: string): string {
  return new URL(`/invite/${token}`, origin).toString();
}

export type InviteError = "invalid_invite" | "expired_invite" | "already_in_household" | "join_failed";

/** Maps a database error message from accept_invite to a known error code. */
export function toInviteError(message: string | undefined): InviteError {
  if (message?.includes("already_in_household")) return "already_in_household";
  if (message?.includes("expired_invite")) return "expired_invite";
  if (message?.includes("invalid_invite")) return "invalid_invite";
  return "join_failed";
}

export function inviteErrorMessage(code: string | undefined): string | null {
  switch (code) {
    case "invalid_invite":
      return "This invite link isn't valid. Ask your household admin for a new one.";
    case "expired_invite":
      return "This invite link has expired. Ask your household admin for a new one.";
    case "already_in_household":
      return "You're already in a household. Chore-App supports one household per person for now.";
    case "join_failed":
      return "Something went wrong joining the household. Please try again.";
    default:
      return null;
  }
}
