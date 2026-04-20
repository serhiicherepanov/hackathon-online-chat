import { useEffect } from "react";
import { create } from "zustand";

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallPromptState = {
  deferredPrompt: BeforeInstallPromptEvent | null;
  installed: boolean;
  setPrompt: (e: BeforeInstallPromptEvent | null) => void;
  setInstalled: (v: boolean) => void;
};

export const useInstallPromptStore = create<InstallPromptState>((set) => ({
  deferredPrompt: null,
  installed: false,
  setPrompt: (deferredPrompt) => set({ deferredPrompt }),
  setInstalled: (installed) => set({ installed, deferredPrompt: null }),
}));

/**
 * Captures `beforeinstallprompt` into the store and clears it on `appinstalled`.
 * Mount once (e.g. in the app shell). Returns nothing.
 */
export function useInstallPromptListener(): void {
  const setPrompt = useInstallPromptStore((s) => s.setPrompt);
  const setInstalled = useInstallPromptStore((s) => s.setInstalled);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [setPrompt, setInstalled]);
}

/**
 * Returns true if the app is running in an installed "standalone" display
 * mode (PWA launched from the home screen / start menu), on iOS or elsewhere.
 */
export function isRunningStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mm = window.matchMedia?.("(display-mode: standalone)").matches;
  const iosStandalone = (navigator as { standalone?: boolean }).standalone === true;
  return Boolean(mm || iosStandalone);
}

/**
 * Detects iOS Safari (including iPadOS Safari reporting as Mac). Used to
 * surface the "Add to Home Screen" hint since iOS Safari does not fire
 * `beforeinstallprompt`.
 */
export function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIos = /iPhone|iPad|iPod/.test(ua);
  const isIpadAsMac =
    ua.includes("Macintosh") &&
    typeof navigator.maxTouchPoints === "number" &&
    navigator.maxTouchPoints > 1;
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return (isIos || isIpadAsMac) && isSafari;
}
