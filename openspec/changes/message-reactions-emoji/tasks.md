## 1. Data model and migration

- [ ] 1.1 Add Prisma `MessageReaction` model (ids, indexes, unique `(messageId, userId, emoji)`, cascade on message delete) and generate migration
- [ ] 1.2 Run `pnpm db:generate` and ensure migration applies cleanly via `docker compose exec app pnpm db:migrate` in dev

## 2. Validation and aggregation

- [ ] 2.1 Implement emoji validation helper (trim, max bytes, reject non-emoji text) with unit tests
- [ ] 2.2 Add aggregation helper to build deterministic `ReactionSummary[]` for a message id (sorted emoji, sorted user ids, counts)

## 3. API and serialization

- [ ] 3.1 Extend `serializeMessage` / `MessagePayload` types with `reactions` (empty for deleted messages)
- [ ] 3.2 Implement `POST /api/messages/[id]/reactions` toggle: membership + DM freeze checks, deleted message handling, transaction, JSON response with action added/removed
- [ ] 3.3 Ensure `GET /api/conversations/:id/messages` includes reactions (batch load or join — avoid N+1)

## 4. Realtime

- [ ] 4.1 After successful toggle, publish `message.reactions.updated` on `room:` / `dm:` post-commit; log Centrifugo failures without failing HTTP
- [ ] 4.2 Extend Centrifugo payload typing / client event union for `message.reactions.updated`

## 5. Client UI

- [ ] 5.1 Render reaction chips + “add reaction” on message rows (rooms + DM), using existing emoji picker where possible
- [ ] 5.2 Wire toggle to `POST /api/messages/:id/reactions`; merge `message.reactions.updated` into TanStack Query / list state without full reload
- [ ] 5.3 Add accessible labels and keyboard support for reaction controls

## 6. Verification

- [ ] 6.1 Unit tests: validation, serialization, toggle authorization edge cases (non-member, frozen DM, deleted message)
- [ ] 6.2 Playwright: member adds and removes a reaction in a public room (or documented DM flow with `befriendContexts` if required)
- [ ] 6.3 Run `pnpm typecheck`, `pnpm test`, and full `./scripts/ci-e2e.sh` before push
