import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-6 py-12">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Hackathon · R0 scaffold
        </p>
        <h1 className="text-4xl font-bold tracking-tight">Online Chat</h1>
        <p className="text-lg text-muted-foreground">
          A classic web chat — rooms, DMs, contacts, files, moderation — built on
          Next.js 15, PostgreSQL, and Centrifugo. This landing page confirms the
          stack booted.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/stack-check"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Open stack check
        </Link>
        <a
          href="https://github.com/"
          className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Project docs
        </a>
      </div>

      <div className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
        <p className="mb-2 font-medium text-foreground">Where to look next</p>
        <ul className="list-inside list-disc space-y-1">
          <li>
            Specification: see <code>docs/index.md</code> in the repository.
          </li>
          <li>
            Health endpoint: <code>/api/health</code>.
          </li>
          <li>
            Stack smoke test: <code>/stack-check</code>.
          </li>
        </ul>
      </div>
    </main>
  );
}
