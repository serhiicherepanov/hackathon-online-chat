import { describe, expect, it } from "vitest";
import { extractMentions } from "./mentions";

describe("extractMentions", () => {
  it("returns empty for empty body", () => {
    expect(extractMentions("")).toEqual([]);
  });

  it("extracts leading mention", () => {
    expect(extractMentions("@alice hi")).toEqual(["alice"]);
  });

  it("extracts mid-sentence mentions, dedups, lowercases", () => {
    expect(extractMentions("hey @Bob and @bob and @Carol!")).toEqual([
      "bob",
      "carol",
    ]);
  });

  it("ignores emails", () => {
    expect(extractMentions("foo@bar.com")).toEqual([]);
  });
});
