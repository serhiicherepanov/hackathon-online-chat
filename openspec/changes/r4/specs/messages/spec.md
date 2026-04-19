## ADDED Requirements

### Requirement: History retrieval remains bounded for benchmark-scale conversations
The system SHALL continue to serve conversation history through the existing keyset-paginated API shape even for rooms with at least 10,000 persisted messages, and SHALL NOT require loading the full history in a single response.

#### Scenario: Large room still uses paginated history
- **WHEN** a member opens a conversation whose persisted history contains at least 10,000 messages
- **THEN** `GET /api/conversations/:id/messages` still returns only a bounded page plus `nextCursor`
- **AND** loading older history continues through repeated `before=<cursor>` requests rather than a full-history fetch

### Requirement: Message history queries stay index-backed at large scale
The system SHALL retain database indexes and query ordering that keep the newest-page and older-page history queries aligned with `(conversationId, createdAt, id)` access patterns at R4 scale.

#### Scenario: History index exists for conversation pagination
- **WHEN** the Prisma schema and generated migration are inspected for the `Message` model
- **THEN** the message-history path has an index that supports filtering by `conversationId` and ordering/pagination by `createdAt` and `id`
- **AND** the application history query uses the same ordering contract as the public API
