# ADR-004: Durable event store, outbox/inbox and delivery semantics

**Status:** Accepted 2026-09-22; implementation in progress (OpenVibe.Events)

## Context and current evidence

Cross-service side effects are best-effort POSTs and HMAC webhooks; a consumer that is down misses them.

## Decision

- OpenVibe.Events persists every event (`events.event-envelope@1`) before any consumer sees it, then delivers to subscriptions with retries (exponential backoff), a dead-letter state, and replay by cursor.
- Producers write events to a transactional outbox in the same database transaction as the domain change; a relay publishes them (at-least-once, idempotent by `event_id`).
- Consumers get exactly-once *effects* through an inbox of idempotency receipts in their own database.
- Storage starts on SQLite (single host, see ADR-007); Redis is not durable truth and is not used.

## Alternatives considered

- Kafka/NATS now: rejected, operational weight far beyond current volume.
- Webhooks only: rejected, no durability or replay.

## Migration consequences

Migrate one existing family at a time (notifications, Media ready/failed, stream lifecycle), keeping the old direct call until the event path is proven, then deleting it.

## Rollback

Producers can switch back to their direct calls; events already stored stay replayable.

## Acceptance tests

Events tests: persistence before delivery, retry/backoff, DLQ, replay, crash-and-replay yields one effect, outbox commit/rollback, SSE visibility and resume.
