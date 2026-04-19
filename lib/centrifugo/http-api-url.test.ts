import { afterEach, describe, expect, it, vi } from "vitest";
import { centrifugoHttpApiUrl } from "./http-api-url";

describe("centrifugoHttpApiUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("joins origin and api path", () => {
    vi.stubEnv("CENTRIFUGO_URL", "http://centrifugo:3080");
    expect(centrifugoHttpApiUrl("/api/info")).toBe("http://centrifugo:3080/api/info");
  });

  it("supports a path prefix (Traefik subpath) without double slashes", () => {
    vi.stubEnv("CENTRIFUGO_URL", "https://app.example.com/realtime");
    expect(centrifugoHttpApiUrl("/api/info")).toBe(
      "https://app.example.com/realtime/api/info",
    );
  });

  it("normalizes trailing slash on base", () => {
    vi.stubEnv("CENTRIFUGO_URL", "https://app.example.com/realtime/");
    expect(centrifugoHttpApiUrl("api/publish")).toBe(
      "https://app.example.com/realtime/api/publish",
    );
  });
});
