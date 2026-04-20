"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  computeMuteUntil,
  isMuted,
  useNotificationPrefs,
  type Category,
  type SoundLevel,
} from "@/lib/notifications/prefs";
import { useInstallPromptStore } from "@/lib/pwa/install-prompt";
import { isIosSafari, isRunningStandalone } from "@/lib/pwa/install-prompt";
import {
  getPermissionState,
  subscribeForPush,
  unsubscribeFromPush,
} from "@/lib/notifications/subscribe";
import {
  isAutoplayBlocked,
  onAutoplayBlocked,
  play,
  unlock,
} from "@/lib/notifications/sound";

type PermState = "unsupported" | NotificationPermission | "unknown";

const SOUND_LEVELS: SoundLevel[] = ["off", "soft", "normal", "loud"];
const MUTE_CHOICES: Array<{
  id: "1h" | "8h" | "tomorrow8am" | "indefinite";
  label: string;
}> = [
  { id: "1h", label: "1 hour" },
  { id: "8h", label: "8 hours" },
  { id: "tomorrow8am", label: "Until tomorrow 8am" },
  { id: "indefinite", label: "Indefinitely" },
];

export function NotificationsSettingsCard() {
  const { prefs, loading, update } = useNotificationPrefs();
  const [perm, setPerm] = useState<PermState>("unknown");
  const [busy, setBusy] = useState(false);
  const [autoplayToast, setAutoplayToast] = useState(false);
  const installPrompt = useInstallPromptStore((s) => s.deferredPrompt);
  const installed = useInstallPromptStore((s) => s.installed);

  useEffect(() => {
    void getPermissionState().then((p) => setPerm(p));
    const off = onAutoplayBlocked(() => setAutoplayToast(true));
    return off;
  }, []);

  const muted = isMuted(prefs);
  const supported = perm !== "unsupported";

  async function onEnable() {
    if (!supported) return;
    setBusy(true);
    try {
      unlock();
      const result =
        typeof Notification !== "undefined" && Notification.permission !== "granted"
          ? await Notification.requestPermission()
          : "granted";
      setPerm(result);
      if (result === "granted") {
        await subscribeForPush();
      }
    } finally {
      setBusy(false);
    }
  }

  async function onDisable() {
    setBusy(true);
    try {
      await unsubscribeFromPush();
    } finally {
      setBusy(false);
    }
  }

  async function toggleCategory(category: Category, value: boolean) {
    if (category === "room") return;
    const key =
      category === "dm" ? "dm" : category === "mention" ? "mention" : "friendRequest";
    await update({ [key]: value } as Record<string, boolean>);
  }

  async function setSound(category: Category, level: SoundLevel) {
    await update((p) => ({
      ...p,
      sound: { ...p.sound, [category]: level },
    }));
  }

  async function onMute(id: (typeof MUTE_CHOICES)[number]["id"] | "resume") {
    const until = computeMuteUntil(id);
    await update({ muteUntil: until });
  }

  const canInstall = Boolean(installPrompt) && !installed && !isRunningStandalone();
  const showIosHint =
    isIosSafari() && !isRunningStandalone() && perm !== "granted";

  async function onInstallClick() {
    if (!installPrompt) return;
    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
    } finally {
      useInstallPromptStore.getState().setPrompt(null);
    }
  }

  return (
    <Card data-testid="settings-notifications-card">
      <CardHeader>
        <CardTitle>Desktop notifications</CardTitle>
        <CardDescription>
          Get sound and OS alerts for new DMs, mentions, and friend requests.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!supported ? (
          <p className="text-sm text-muted-foreground">
            Your browser does not support desktop notifications.
          </p>
        ) : perm === "denied" ? (
          <p className="text-sm text-muted-foreground">
            Notifications are blocked. Enable them in your browser&rsquo;s site
            settings to receive alerts.
          </p>
        ) : perm === "granted" ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-emerald-600 dark:text-emerald-400">
              Notifications are enabled.
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => void onDisable()}
              data-testid="disable-notifications"
            >
              Disable
            </Button>
          </div>
        ) : (
          <Button
            disabled={busy || loading}
            onClick={() => void onEnable()}
            data-testid="enable-notifications"
          >
            Enable desktop notifications
          </Button>
        )}

        {canInstall ? (
          <div className="rounded-md border p-3 text-sm">
            <p className="mb-2 font-medium">Install Online Chat</p>
            <p className="mb-3 text-muted-foreground">
              Install the app to receive notifications even when the browser is
              closed.
            </p>
            <Button size="sm" onClick={() => void onInstallClick()}>
              Install app
            </Button>
          </div>
        ) : null}

        {showIosHint ? (
          <p className="rounded-md border p-3 text-sm text-muted-foreground">
            To enable notifications on iPhone/iPad, tap Share → Add to Home
            Screen, then reopen this app.
          </p>
        ) : null}

        {autoplayToast ? (
          <p className="rounded-md border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900">
            Your browser is blocking notification sounds. Check autoplay
            settings for this site.
          </p>
        ) : null}

        <section className="space-y-3">
          <p className="text-sm font-medium">Categories</p>
          {(["dm", "mention", "friend-request"] as Category[]).map((category) => {
            const key =
              category === "dm"
                ? "dm"
                : category === "mention"
                  ? "mention"
                  : "friendRequest";
            const label =
              category === "dm"
                ? "Direct messages"
                : category === "mention"
                  ? "@-mentions"
                  : "Friend requests";
            const enabled = prefs[key as keyof typeof prefs] === true;
            return (
              <div
                key={category}
                className="flex items-center justify-between gap-3 rounded-md border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{label}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={enabled ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => void toggleCategory(category, !enabled)}
                    data-testid={`toggle-${category}`}
                  >
                    {enabled ? "On" : "Off"}
                  </Button>
                  <select
                    aria-label={`${label} sound level`}
                    className="rounded-md border bg-background px-2 py-1 text-sm"
                    value={prefs.sound[category]}
                    onChange={(e) =>
                      void setSound(category, e.target.value as SoundLevel)
                    }
                  >
                    {SOUND_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {level === "off" ? "No sound" : `Sound: ${level}`}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      unlock();
                      play(category, prefs.sound[category]);
                    }}
                  >
                    Test
                  </Button>
                </div>
              </div>
            );
          })}
        </section>

        <section className="space-y-3">
          <Label className="text-sm font-medium">Mute</Label>
          {muted ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Notifications muted
                {prefs.muteUntil && prefs.muteUntil < Number.MAX_SAFE_INTEGER
                  ? ` until ${new Date(prefs.muteUntil).toLocaleString()}`
                  : " indefinitely"}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void onMute("resume")}
                data-testid="resume-notifications"
              >
                Resume notifications
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {MUTE_CHOICES.map((choice) => (
                <Button
                  key={choice.id}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void onMute(choice.id)}
                  data-testid={`mute-${choice.id}`}
                >
                  Mute {choice.label}
                </Button>
              ))}
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
