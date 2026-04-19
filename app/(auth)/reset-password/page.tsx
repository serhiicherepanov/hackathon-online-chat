"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState(searchParams.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const urlToken = searchParams.get("token") ?? "";
    if (urlToken) {
      setToken(urlToken);
    }
  }, [searchParams]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/password/reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (!res.ok) {
        setError("That reset token is invalid, expired, or already used.");
        return;
      }

      setSubmitted(true);
      setPassword("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose a new password</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {submitted ? (
            <div className="space-y-2 rounded-xl border bg-muted/40 p-4 text-sm">
              <p>Your password has been reset.</p>
              <p className="text-muted-foreground">
                You can sign in again with the new password.
              </p>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="reset-token">Reset token</Label>
            <Input
              id="reset-token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reset-password">New password</Label>
            <Input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button className="w-full" disabled={busy} type="submit">
            Save new password
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <Link className="underline" href="/sign-in">
              Return to sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
