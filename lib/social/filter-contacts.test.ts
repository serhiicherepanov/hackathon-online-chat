import { describe, expect, it } from "vitest";
import {
  filterByPeerUsername,
  matchesContactQuery,
} from "./filter-contacts";

const rows = [
  { peer: { username: "alice" } },
  { peer: { username: "Alina" } },
  { peer: { username: "bob" } },
];

describe("matchesContactQuery", () => {
  it("returns true for empty/whitespace query (match all)", () => {
    expect(matchesContactQuery("alice", "")).toBe(true);
    expect(matchesContactQuery("alice", "   ")).toBe(true);
  });

  it("does case-insensitive substring match", () => {
    expect(matchesContactQuery("Alice", "ali")).toBe(true);
    expect(matchesContactQuery("alice", "ALI")).toBe(true);
  });

  it("returns false when no substring match", () => {
    expect(matchesContactQuery("bob", "ali")).toBe(false);
  });
});

describe("filterByPeerUsername", () => {
  it("returns a copy of the full list for empty query", () => {
    expect(filterByPeerUsername(rows, "")).toEqual(rows);
    expect(filterByPeerUsername(rows, "   ")).toEqual(rows);
  });

  it("narrows by case-insensitive substring on peer.username", () => {
    expect(filterByPeerUsername(rows, "ali")).toEqual([
      { peer: { username: "alice" } },
      { peer: { username: "Alina" } },
    ]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(filterByPeerUsername(rows, "zzz")).toEqual([]);
  });
});
