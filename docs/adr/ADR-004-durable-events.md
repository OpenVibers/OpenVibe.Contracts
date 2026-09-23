# ADR-004: Durable event store, outbox/inbox and delivery semantics

**Status:** Accepted 2026-09-22; implementation in progress (OpenVibe.Events)

## Context and current evidence

Cross-service side effects are best-effort POSTs and HMAC webhooks; a consumer that is down misses them.

## Decision

- OpenVibe.Events persists every event (`events.event-envelope@1`) before any consumer sees it, then delivers to subscriptions with retries (exponential backoff), a dead-letter state, and replay by cursor.
- Producers write events to a transactional outbox in the same database transaction as the domain change; a relay publishes them (at-least-once, idempotent by `event_id`).
- Consumers get exactly-once *effects* through an inbox of idempotency receipts in their own database.
- Storage starts on SQLite (single host, see ADR-007); Redis is not durable truth and is not used.

### Delivery signatures and replay window (2026-09-23)

- Every delivery is HMAC-SHA256-signed with the subscription secret. v1, `X-OpenVibe-Signature: sha256=<hex HMAC of the raw body>`, has no time in it: a captured delivery can be replayed forever, and only the consumer's `event_id` inbox limits the damage.
- v2 adds `X-OpenVibe-Timestamp: <unix seconds>` and `X-OpenVibe-Signature-V2: t=<ts>,v2=<hex HMAC of "<ts>.<raw body>">`. Events signs every attempt, retries and replays included, with the time it is sent.
- Consumers accept a v2 signature only within ±300 s of their clock, compare in constant time, and never fall back to v1 when a v2 header is present but bad or stale. With `requireV2` they also refuse deliveries without v2, which closes the replay-by-stripping-the-header path.
- Rollout is additive: Events sends v1 and v2 first; consumers then move to openvibe-sdk 0.4.0 (v2 checked whenever present) and set `requireV2: true` one by one; v1 stays on the wire until every consumer requires v2, and only then may it be removed. Rollback at any step is to unset `requireV2` (consumers) or stop sending v2 (Events, only while no consumer requires it).

### Redaction, payload contracts and the public replay window (2026-09-23)

- A producer takes back its own events with `payload.redacts` (`events.redaction-directive@1`). Events turns the targets into tombstones (`events.tombstone-payload@1`) at their original seq. Naming another source's event is 403 `events.redaction_not_allowed`, and a malformed directive is 422 `events.invalid_redaction`. See [ADR-026](ADR-026-event-redaction.md).
- Each event type's payload has a contract named after the type, with the envelope `version` as its major (`contracts/events/payloads/<event_type>.v<version>.json`, from v0.30.0).
- Browsers are replayed only the `public` events of the last `REALTIME_PUBLIC_REPLAY_SECONDS` (default 300). An older cursor gets `event: gap` with reason `public_window`.

## Alternatives considered

- Kafka/NATS now: rejected, operational weight far beyond current volume.
- Webhooks only: rejected, no durability or replay.

## Migration consequences

Migrate one existing family at a time (notifications, Media ready/failed, stream lifecycle), keeping the old direct call until the event path is proven, then deleting it.

## Rollback

Producers can switch back to their direct calls; events already stored stay replayable.

## Acceptance tests

Events tests: persistence before delivery, retry/backoff, DLQ, replay, crash-and-replay yields one effect, outbox commit/rollback, SSE visibility and resume. Signatures: v1 and v2 on every attempt, a fresh timestamp per retry, v2 refused outside ±300 s or with a changed body or timestamp, and (SDK) no v1 fallback when v2 is present, v1-only refused under `requireV2`.
