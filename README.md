# Online Chat (hackathon)

A classic web-based online chat application: public and private rooms, 1:1
personal messages, contacts/friends, file and image sharing, basic moderation,
and persistent message history. Designed for ~300 concurrent users, ~1000
participants per room, and multi-year message retention.

> **Status:** planning / pre-R0. The codebase has not been scaffolded yet; this
> README documents the intent and is kept in lock-step with the actual project
> state (see the [Readme maintenance rule](#readme-maintenance-rule) below).

## Table of contents

- [Highlights](#highlights)
- [Stack](#stack)
- [Repository layout](#repository-layout)
- [Requirements](#requirements)
- [Release plan](#release-plan)
- [Setup & running locally](#setup--running-locally)
- [Environment variables](#environment-variables)
- [Development workflow](#development-workflow)
- [Submission](#submission)
- [Readme maintenance rule](#readme-maintenance-rule)

## Highlights

- Classic web-chat UX: top menu, side list of rooms + contacts, centred message
  thread, bottom composer, members panel.
- Public room catalog with search + unique room names; private rooms are
  invitation-only.
- Personal 1:1 dialogs with the same features as rooms.
- Real-time delivery under 3 s and presence propagation under 2 s.
- Persistent history with infinite scroll, virtualized to stay fast at 10 000+
  messages.
- Local-filesystem attachments (max 20 MB per file, 3 MB per image) with
  membership-gated downloads.
- Moderation: owner/admin roles, room bans, admin-deleted messages,
  invitations.
- Multi-tab aware presence (online / AFK / offline) and persistent login across
  browser restarts.

See [`REQUIREMENTS.md`](REQUIREMENTS.md) → [`docs/index.md`](docs/index.md) for
the authoritative specification.

## Stack

| Layer | Choice |
|-------|--------|
| App framework | Next.js 15+ (App Router), TypeScript |
| UI primitives | shadcn/ui (Tailwind CSS + Radix) |
| Realtime server | Centrifugo (WebSocket / SSE) |
| Realtime client | centrifuge-js |
| Database | PostgreSQL |
| ORM | Prisma |
| Client global state | Zustand |
| Server/async data | TanStack Query |
| Long lists | React Virtuoso |
| Orchestration | Docker Compose (every runtime dep) |

All realtime transport is Centrifugo-based. No XMPP/Jabber or alternate
protocols are used; the stretch release scales Centrifugo horizontally instead.
Architecture and boundaries are detailed in [`AGENTS.md`](AGENTS.md).

## Repository layout

```
.
├── REQUIREMENTS.md              # pointer to spec
├── AGENTS.md                    # architecture + rules for agents & contributors
├── README.md                    # this file
├── docs/
│   ├── index.md                 # spec TOC
│   ├── requirements/            # functional, non-functional, UI, wireframes
│   └── plan/                    # release-by-release delivery plan
└── openspec/                    # optional workflow config
```

Application code, `docker-compose.yml`, and `.env.example` will appear in R0.

## Requirements

- Authoritative entry point: [`REQUIREMENTS.md`](REQUIREMENTS.md)
- Full spec TOC: [`docs/index.md`](docs/index.md)
- Individual sections:
  - [Introduction](docs/requirements/introduction.md)
  - [Functional](docs/requirements/functional.md)
  - [Non-functional](docs/requirements/non-functional.md)
  - [UI](docs/requirements/ui.md)
  - [Notes](docs/requirements/notes.md)
  - [Advanced (stretch)](docs/requirements/advanced.md)
  - [Submission](docs/requirements/submission.md)
  - [Wireframes](docs/requirements/appendix-wireframes.md)

## Release plan

Hackathon-priority ordering — each release is a self-contained, demo-able
product. See [`docs/plan/index.md`](docs/plan/index.md).

| Release | Theme |
|---------|-------|
| [R0 — Demo-able MVP](docs/plan/r0-mvp.md) | Compose, auth, rooms (public + private flag), DMs, realtime text, unread badges, online/offline presence |
| [R1 — Rich Messaging](docs/plan/r1-rich-messaging.md) | Attachments (file + image), reply, edit, delete, multiline, emoji |
| [R2 — Social & Presence](docs/plan/r2-social-presence.md) | Friends, blocks with frozen DMs, AFK/multi-tab, typing |
| [R3 — Moderation & Admin](docs/plan/r3-moderation.md) | Roles, bans, invitations, Manage Room modal, live access revocation |
| [R4 — Polish & Submission](docs/plan/r4-polish-scale.md) | Password reset, delete account, active sessions UI, 10k-message perf, 300-client load test, README polish, seed |
| [R5 — Advanced (stretch)](docs/plan/r5-advanced.md) | Multi-node Centrifugo + Redis, bot/integration API, realtime admin dashboards |

## Setup & running locally

> Will be populated at the start of R0 when `docker-compose.yml` lands. Placeholder is
> intentional — keep this section truthful (see
> [Readme maintenance rule](#readme-maintenance-rule)).

Planned shape:

```bash
git clone <repo>
cd <repo>
cp .env.example .env
docker compose up --build
# open http://localhost:3000
```

`docker compose up` from the repository root must be the only command required
to run the full stack (per [submission rules](docs/requirements/submission.md)).

## Environment variables

> Will be populated when `.env.example` is created in R0. Expected variables
> include `DATABASE_URL`, `CENTRIFUGO_HTTP_API`, `CENTRIFUGO_TOKEN_HMAC`,
> `AUTH_SECRET`, `UPLOADS_DIR`.

## Development workflow

> Will be populated once the Next.js app is scaffolded. Will cover at minimum:
> `npm run dev`, Prisma migrate commands, running linters, and how to talk to
> Centrifugo locally.

## Submission

- Public GitHub repository.
- Project must be buildable and runnable with `docker compose up` in the
  repository root.
- Full rules: [`docs/requirements/submission.md`](docs/requirements/submission.md).

## Readme maintenance rule

This README is a living document. Whenever a change to the actual project state
lands, the README must be updated in the same change so that it stays truthful.
Triggers include, but are not limited to:

- First `docker-compose.yml` → fill [Setup & running locally](#setup--running-locally)
  with real commands and service URLs.
- First `.env.example` → fill [Environment variables](#environment-variables)
  with the real variable list and descriptions.
- Next.js app scaffolded (`package.json`, scripts) → fill
  [Development workflow](#development-workflow) with real commands.
- New release completed → tick it off under [Release plan](#release-plan) and
  refresh the [Status](#online-chat-hackathon) badge near the top.
- New top-level directory or tool → reflect it in
  [Repository layout](#repository-layout).
- New required runtime port → document it in setup + env sections.

Agents and contributors: do not split README updates into a "later" PR. If the
code is not real, neither is the README section — use a placeholder that says
so, but never let the README claim a capability the repo doesn't actually
ship.
