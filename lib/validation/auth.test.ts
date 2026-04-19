import { describe, it, expect } from "vitest";
import {
  deleteAccountBody,
  passwordChangeBody,
  passwordResetConfirmBody,
  passwordResetRequestBody,
  profileUpdateBody,
  registerBody,
  signInBody,
} from "./auth";

describe("registerBody", () => {
  it("accepts a valid payload", () => {
    const r = registerBody.safeParse({
      email: "alice@example.com",
      username: "alice_01",
      password: "supersecret",
    });
    expect(r.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const r = registerBody.safeParse({
      email: "not-an-email",
      username: "alice",
      password: "supersecret",
    });
    expect(r.success).toBe(false);
  });

  it("rejects usernames with disallowed characters", () => {
    const r = registerBody.safeParse({
      email: "alice@example.com",
      username: "alice space",
      password: "supersecret",
    });
    expect(r.success).toBe(false);
  });

  it("rejects too-short passwords", () => {
    const r = registerBody.safeParse({
      email: "alice@example.com",
      username: "alice",
      password: "short",
    });
    expect(r.success).toBe(false);
  });
});

describe("signInBody", () => {
  it("accepts any non-empty login+password", () => {
    expect(
      signInBody.safeParse({ login: "alice", password: "x" }).success,
    ).toBe(true);
  });

  it("rejects empty fields", () => {
    expect(signInBody.safeParse({ login: "", password: "" }).success).toBe(
      false,
    );
  });
});

describe("password reset validation", () => {
  it("accepts a valid reset request email", () => {
    expect(
      passwordResetRequestBody.safeParse({ email: "alice@example.com" }).success,
    ).toBe(true);
  });

  it("requires a token and a valid replacement password", () => {
    expect(
      passwordResetConfirmBody.safeParse({
        token: "abc123",
        password: "supersecret",
      }).success,
    ).toBe(true);
    expect(
      passwordResetConfirmBody.safeParse({
        token: "",
        password: "short",
      }).success,
    ).toBe(false);
  });
});

describe("passwordChangeBody", () => {
  it("accepts the current and new password", () => {
    expect(
      passwordChangeBody.safeParse({
        currentPassword: "oldpassword",
        newPassword: "newpassword123",
      }).success,
    ).toBe(true);
  });
});

describe("profileUpdateBody", () => {
  it("accepts display name updates", () => {
    expect(
      profileUpdateBody.safeParse({ displayName: "Alice Example" }).success,
    ).toBe(true);
  });

  it("accepts avatar removal with null", () => {
    expect(profileUpdateBody.safeParse({ avatarUrl: null }).success).toBe(true);
  });

  it("rejects empty updates", () => {
    expect(profileUpdateBody.safeParse({}).success).toBe(false);
  });
});

describe("deleteAccountBody", () => {
  it("requires the username and confirmation phrase", () => {
    expect(
      deleteAccountBody.safeParse({
        username: "alice",
        confirmation: "DELETE MY ACCOUNT",
      }).success,
    ).toBe(true);
    expect(deleteAccountBody.safeParse({ username: "", confirmation: "" }).success).toBe(
      false,
    );
  });
});
