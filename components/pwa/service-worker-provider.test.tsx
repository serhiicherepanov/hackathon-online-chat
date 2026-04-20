import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ServiceWorkerProvider } from "./service-worker-provider";

describe("ServiceWorkerProvider", () => {
  it("no-ops when navigator.serviceWorker is absent", () => {
    const originalNavigator = globalThis.navigator;
    Object.defineProperty(globalThis, "navigator", {
      value: {},
      writable: true,
      configurable: true,
    });
    expect(() => render(<ServiceWorkerProvider />)).not.toThrow();
    Object.defineProperty(globalThis, "navigator", {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  it("calls register when serviceWorker is present", async () => {
    const register = vi.fn().mockResolvedValue({ scope: "/" });
    const originalNavigator = globalThis.navigator;
    Object.defineProperty(globalThis, "navigator", {
      value: { serviceWorker: { register } },
      writable: true,
      configurable: true,
    });
    render(<ServiceWorkerProvider />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(register).toHaveBeenCalledWith("/sw.js", { scope: "/" });
    Object.defineProperty(globalThis, "navigator", {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });
});
