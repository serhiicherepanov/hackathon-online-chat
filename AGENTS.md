# Agent guidance — online chat (hackathon)

This repository implements a **classic web chat**: rooms (public/private), DMs, contacts, files/images, moderation, presence, and **~300 concurrent users**. Authoritative spec: **[`REQUIREMENTS.md`](REQUIREMENTS.md)** → **[`docs/index.md`](docs/index.md)** (all sections). Phased delivery plan: **[`docs/plan/index.md`](docs/plan/index.md)** (R0 MVP → R5 advanced stretch).

**Runtime:** **Docker Compose** orchestrates **all** services (e.g. Next.js app, PostgreSQL, Centrifugo, and any supporting containers). Local development and submission both assume **`docker compose up`** from the repo root—not a mix of bare-metal DB and containerized app.

## Critical rules (from requirements)

These are non-negotiable constraints agents must respect; details live in linked docs.

**Delivery & scale**

- **~300 simultaneous users**; a single room **up to 1000 participants**; a user may join **unlimited** rooms (sizing hint: ~20 rooms, ~50 contacts).
- After send, messages should reach recipients **within 3 seconds**; presence updates **under 2 seconds**.
- UI must stay usable with **very large history** (spec calls out **at least 10,000 messages** in a room)—use pagination/virtualization accordingly.

**Persistence & history**

- Messages **persist for years**; load older history via **infinite scroll** (not one giant fetch).
- **Consistency** must hold for: membership, room bans, file access rights, message history, admin/owner permissions.

**Files**

- Store uploads on the **local file system**; **max 20 MB** per file, **max 3 MB** per image.

**Sessions & presence**

- **No** forced logout from inactivity; **login persists** across browser close/reopen; app must work with **multiple tabs** for the same user.
- **Offline** only when **no** open tabs with the app; with several tabs, **online if any tab is active**; **AFK only when every tab has been idle for more than 1 minute**; **sign out** ends **this browser session only** (other sessions stay valid).
- Offline recipients: messages are **stored and shown** when they connect next.

**Domain invariants (samples)**

- **Email** and **username** unique; **username immutable**; **room names** unique.
- **Personal dialogs**: exactly **two** participants; PM only between **friends** with **no user-to-user ban**; after a ban, **existing DM history stays visible but frozen/read-only**.
- **Room deletion** removes **all** its messages and attachments **permanently**. Losing **room access** removes access to its messages and files; **files remain** after upload if the uploader later loses access **unless the room is deleted**.
- UX should feel like a **classic web chat**, not a modern social/collab product.

**Submission**

- Project **must** be buildable and runnable with **`docker compose up`** from the **repository root** (see [`docs/requirements/submission.md`](docs/requirements/submission.md)).

## Stack (authoritative)

| Layer | Choice |
|--------|--------|
| App | **Next.js 15+** (App Router), **TypeScript** (Compose service) |
| UI | **shadcn/ui** (Tailwind CSS + Radix UI primitives) |
| Real-time server | **Centrifugo** (Compose service; WebSocket / SSE) |
| Real-time client | **centrifuge-js** |
| Database | **PostgreSQL** (Compose service) |
| ORM | **Prisma** |
| Client global state | **Zustand** (chat UI + membership/presence-style state that must be fast and local) |
| Server/async data | **TanStack Query** (REST/Server Actions responses; **paginated message history**) |
| Long lists | **React Virtuoso** (virtualize message threads and other large lists) |

**Note:** Development and production builds use **Next.js tooling** (e.g. Turbopack in dev). Do not assume **Vite** unless the project adds it explicitly (e.g. Vitest). Prefer aligning with the Next.js defaults already in `package.json` when it exists.

## Architectural boundaries

1. **Persistence and business rules** live in **Next.js** (Route Handlers, Server Actions, or a dedicated API layer) backed by **PostgreSQL + Prisma**.
2. **Live delivery** (typing, presence, new message fan-out, subscriptions) goes through **Centrifugo**; the browser uses **centrifuge-js** to subscribe/publish per your channel design. All real-time transport is Centrifugo-based — no XMPP/Jabber or alternate protocols. The R5 stretch (see plan) scales Centrifugo horizontally with a Redis engine and adds a bot/integration HTTP API, rather than introducing a different protocol.
3. **TanStack Query** owns **fetched, cacheable** data: message history pages, room lists, user profiles, etc. Use stable query keys; invalidate or append on mutations and when Centrifugo signals new data.
4. **Zustand** owns **high-churn or UI-coordination** state: active room, connection status, ephemeral notifications, merged “live + loaded” message view if needed—avoid duplicating server truth without a clear rule for reconciliation.
5. **Lists**: render message and other long scroll regions with **React Virtuoso**; avoid mounting thousands of DOM nodes for chat history.

## Conventions

- **TypeScript** everywhere in app code; strict types for Prisma models and Centrifugo payload shapes.
- **shadcn/ui**: compose primitives; keep tokens in Tailwind theme, avoid one-off inline styles for the same patterns.
- **Environment**: document required vars (e.g. `DATABASE_URL`, Centrifugo HTTP API / WebSocket URLs, tokens) in `.env.example` when adding features—never commit secrets.
- **Docker Compose**: Define **every** runtime dependency in Compose (app, DB, Centrifugo, volumes for Postgres data and **local file uploads** per spec). Root `docker compose up` must yield a runnable stack per submission rules; service names, ports, and internal URLs must match **Prisma** (`DATABASE_URL`), **Next.js**, and **centrifuge-js** connection settings (use `.env.example`; document hostnames for inter-container networking).
- **Error boundaries**: wrap risky client subtrees with React error boundaries so a single failure never blanks the whole chat. Use Next.js App Router `error.tsx` files at route segments (app root, `(chat)/layout`, per-room view, settings) and component-level boundaries (e.g. `react-error-boundary`) around:
  - the **Centrifugo-connected** realtime provider (connection/subscription failures must not crash the shell),
  - the **Virtuoso message list** and message renderers (bad payloads, missing attachments, markdown/emoji render errors),
  - **file/image previews and uploads** (corrupt files, network errors, permission loss),
  - **TanStack Query** consumers that throw on error (`useQuery({ throwOnError: true })` / `useSuspenseQuery`) — pair each with a boundary + `QueryErrorResetBoundary` so "Retry" actually refetches,
  - third-party/embeddable widgets (link previews, code highlighting, audio/video players).

  Boundary UIs must show a short human message, a **Retry** action that resets the boundary (and refetches queries where relevant), and log via a single `reportError(err, context)` helper. Keep boundaries **scoped** — don't wrap the entire app in one giant boundary; the sidebar, active room, and composer should fail independently. Server Components and Server Actions use Next.js error files / `try/catch` instead, not React boundaries.

## Keep `README.md` in sync with reality

[`README.md`](README.md) is a **living document** and must always reflect the **actual** state of the repo, not the planned state. Any change that alters how a contributor sets up, configures, or runs the app **must update `README.md` in the same change**. Concrete triggers:

- First `docker-compose.yml` lands → fill the **Setup & running locally** section with real commands, service URLs, and exposed ports.
- First `.env.example` lands or any variable is added/renamed → update the **Environment variables** section to match exactly.
- Next.js app scaffolded / `package.json` scripts added or changed → update the **Development workflow** section (dev server, Prisma migrate, lint/test commands).
- A release (R0, R1, …) is completed → tick it off in the **Release plan** table and refresh the **Status** line near the top.
- A new top-level directory, tool, or required runtime port is introduced → reflect it in **Repository layout** and the setup/env sections.
- A feature is removed or scope is cut → remove or annotate the corresponding claim in the README.

Rules of thumb:

- Do **not** defer README updates to a later change. If the code isn't real yet, the README section must say so with an explicit placeholder ("Will be populated in R0" is fine); it must never claim a capability the repo does not actually ship.
- The README is written for a reviewer who just cloned the repo with zero prior context — every command shown must actually work against the current `HEAD`.
- When in doubt, prefer shorter and truthful over longer and aspirational.

## Tooling (MCP)

- **Context7** — use for **any** library/framework/SDK/CLI question (Next.js, Prisma, Centrifugo, centrifuge-js, shadcn/ui, TanStack Query, Zustand, React Virtuoso, Tailwind, Docker Compose, etc.) to fetch **current** docs and implementation examples before writing code. Prefer it over web search and over relying on training memory, even for well-known libraries — APIs drift between versions. Use it for: API syntax, config options, version migrations, setup/wiring patterns, and library-specific debugging.
- **Playwright MCP** — use for **any** interaction with the running app (manual QA, smoke tests, reproducing a bug, verifying a UI change, clicking through a flow). Always re-open the browser at the start of a session and resize to fullscreen before interacting. Use it to take screenshots / DOM snapshots to verify behavior instead of guessing from code. Do **not** use Playwright MCP for pure unit-logic tasks where no browser is needed.

## What to avoid

- Putting authoritative message storage only in realtime payloads—**history belongs in Postgres**; Centrifugo is for delivery and optional ephemeral events.
- Using Zustand as the primary store for paginated history (use TanStack Query + Virtuoso).
- Blocking the main thread with non-virtualized huge message lists.

## Useful references in-repo

- Project overview and how to run it: [`README.md`](README.md) — keep this truthful at all times (see above).
- Requirements entrypoint: [`REQUIREMENTS.md`](REQUIREMENTS.md), full TOC: [`docs/index.md`](docs/index.md)
- Release plan: [`docs/plan/index.md`](docs/plan/index.md) — R0 demo-able MVP, R1 rich messaging, R2 social & presence, R3 moderation, R4 polish & submission, R5 advanced stretch
- OpenSpec workflow (if used): [`openspec/config.yaml`](openspec/config.yaml), skills under `.cursor/skills/`

When unsure, prefer **small, testable slices**: Prisma schema + one API + one screen + Centrifugo channel contract before expanding.
