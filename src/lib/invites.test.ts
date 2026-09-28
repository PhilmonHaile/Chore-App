import { describe, expect, it } from "vitest";
import { buildInviteUrl, inviteErrorMessage, isInviteToken, toInviteError } from "./invites";

const TOKEN = "3f1c2a4e-9b7d-4c1e-8a2f-5d6e7f8a9b0c";

describe("isInviteToken", () => {
  it("accepts a UUID token", () => {
    expect(isInviteToken(TOKEN)).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isInviteToken("not-a-token")).toBe(false);
    expect(isInviteToken(`${TOKEN}x`)).toBe(false);
    expect(isInviteToken("")).toBe(false);
  });
});

describe("buildInviteUrl", () => {
  it("builds an absolute link to the invite page", () => {
    expect(buildInviteUrl("https://chore.app", TOKEN)).toBe(`https://chore.app/invite/${TOKEN}`);
  });

  it("ignores any path already on the origin", () => {
    expect(buildInviteUrl("http://localhost:3000/", TOKEN)).toBe(
      `http://localhost:3000/invite/${TOKEN}`,
    );
  });
});

describe("toInviteError", () => {
  it("maps database exceptions to error codes", () => {
    expect(toInviteError("expired_invite")).toBe("expired_invite");
    expect(toInviteError("invalid_invite")).toBe("invalid_invite");
  });

  it("treats anything unexpected as a failed join", () => {
    expect(toInviteError("connection reset")).toBe("join_failed");
    expect(toInviteError(undefined)).toBe("join_failed");
  });
});

describe("inviteErrorMessage", () => {
  it("has a message for every error code", () => {
    for (const code of ["invalid_invite", "expired_invite", "join_failed"]) {
      expect(inviteErrorMessage(code)).toBeTruthy();
    }
  });

  it("returns null for unknown or missing codes", () => {
    expect(inviteErrorMessage(undefined)).toBeNull();
    expect(inviteErrorMessage("<script>")).toBeNull();
  });
});
