import { describe, it, expect } from "vitest";
import { registerBody, signInBody } from "./auth";

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
