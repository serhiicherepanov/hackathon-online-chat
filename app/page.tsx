import Link from "next/link";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Technical abstract background */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/tech-bg.jpg')" }}
      />
      {/* Overlay for better readability */}
      <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px]" />
      {/* Decorative pastel blobs */}
      <div className="absolute -top-48 -right-48 h-[500px] w-[500px] rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-48 -left-48 h-[500px] w-[500px] rounded-full bg-accent/20 blur-3xl" />
      
      <main className="relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-6 py-12">
        <div className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">
            Hackathon · R0 MVP
          </p>
          <h1 className="text-5xl font-bold tracking-tight text-foreground">
            Online Chat
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            A classic web chat — rooms, DMs, contacts, files, moderation — built on
            Next.js 15, PostgreSQL, and Centrifugo. This landing page confirms the
            stack booted.
          </p>
        </div>

        <div className="flex flex-wrap gap-4">
          <Link
            href="/sign-up"
            className="rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-md transition-all hover:shadow-lg hover:bg-primary/90 active:scale-[0.98]"
          >
            Sign up
          </Link>
          <Link
            href="/sign-in"
            className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm px-6 py-3 text-sm font-medium shadow-sm transition-all hover:bg-accent hover:shadow-md active:scale-[0.98]"
          >
            Sign in
          </Link>
          <Link
            href="/rooms"
            className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm px-6 py-3 text-sm font-medium shadow-sm transition-all hover:bg-accent hover:shadow-md active:scale-[0.98]"
          >
            Rooms
          </Link>
          <Link
            href="/stack-check"
            className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm px-6 py-3 text-sm font-medium shadow-sm transition-all hover:bg-accent hover:shadow-md active:scale-[0.98]"
          >
            Stack check
          </Link>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-md p-6 text-sm text-muted-foreground shadow-lg">
          <p className="mb-3 font-semibold text-foreground">Where to look next</p>
          <ul className="list-inside list-disc space-y-2">
            <li>
              Specification: see <code className="rounded bg-muted px-1.5 py-0.5 text-xs">docs/index.md</code> in the repository.
            </li>
            <li>
              Health endpoint: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/api/health</code>.
            </li>
            <li>
              Stack smoke test: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/stack-check</code> (Centrifugo connects
              inside the signed-in app shell).
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
