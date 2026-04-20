"use client";

import { useEffect } from "react";
import { useInstallPromptListener } from "@/lib/pwa/install-prompt";
import { reportError } from "@/lib/report-error";

/**
 * Registers the service worker once per page load behind feature detection.
 * Renders nothing. Registration failures log via `reportError` and never
 * break the page. On browsers without service-worker support, this is a no-op.
 */
export function ServiceWorkerProvider(): null {
  useInstallPromptListener();
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;
    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => {
          if (cancelled) return;
          reportError(err, { where: "service-worker-register" });
        });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
