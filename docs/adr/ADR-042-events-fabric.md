# ADR-042: The events fabric — carrier classes, per-key ordering, cursors and tiers

**Status:** Accepted 2026-09-29 (plan track T7, "Events complete"; the owner's plan names NATS JetStream as the
cell-local carrier). Amends ADR-004: its "Kafka/NATS now: rejected" is superseded for the STREAM class only.

## Context and current evidence

- OpenVibe.Events stores every event in PostgreSQL (`events`), then one polling worker delivers to subscriptions
  (`server/worker.js`). Two workers would double-send: a delivery is claimed with an in-process `busy` set, not a
  database lease.
- How an event type should be carried is already a contract: `events.delivery-policy@1` gives a class
  (`realtime_ephemeral`, `interactive`, `interactive_durable`, `domain`, `critical`, `background`, `bulk`, `webhook`),
  durability, delivery semantics, an ordering scope and key, latency targets, retention (hot, replay, archive) and a
  routing objective. Nothing reads it yet.
- `openvibe-sdk/placement` (`plan()`, `resource-offer@1`, `rate-card@1`) already chooses among offers by hard
  constraints, then cost and latency, with hysteresis and an explanation. Media's fabric uses the same shape.
- The global `seq` is the wire position today: `publish-result.seq`, `read-result.after_seq/next_after_seq/latest_seq`,
  the SSE `id` and `X-OpenVibe-Seq`. Seven repositories persist it.
- Valkey (ADR-035) already carries queues and pub/sub for nine services through `openvibe-sdk/queue` and `/pubsub`.

## Decision

1. **Two layers, one vocabulary each.** The delivery policy stays the only semantic vocabulary. The carrier class is
   an internal, derived label, never a contract enum and never in the envelope:

   | Policy class | Carrier class | Carriers (in preference order) |
   | --- | --- | --- |
   | `realtime_ephemeral` | TOPIC (fan-out, no ack, no retention) | `valkey-v1` pub/sub, `pg-v1` |
   | `interactive`, `interactive_durable`, `domain`, `critical`, `background`, `bulk`, `webhook` | QUEUE (competing consumers, ack, at least once) | `valkey-v1` streams, `pg-v1` |
   | any class with `durability: required` and an `ordering.key` | STREAM (retained, ordered per key, offsets) | `nats-v1` (JetStream), `pg-v1` |

   A publisher's declared intent may raise a class and never lower it. The resolved carrier class, carrier and the
   planner's reasons are answered by the delivery, replay and `GET /api/v1/placement` APIs.
2. **PostgreSQL stays the record.** Every event is written to `events` and every delivery to `deliveries` before any
   carrier sees it. A carrier is a transport: when one is unhealthy or ineligible the planner drops it with a reason
   and `pg-v1` carries the delivery. No carrier outage loses an event.
3. **The lease first.** `deliveries` gains `ordering_key`, `carrier`, `lease_owner` and `lease_until`; a worker claims
   with `FOR UPDATE SKIP LOCKED`, at most one delivery in flight per (subscription, ordering key). This ships before
   any second carrier, because it is what makes a second worker safe.
4. **Per-key ordering.** The key is `policy.ordering.key` resolved against the envelope, defaulting to the subject
   (`subject.type` + `subject.id`), else the event type. Never the seq. A key's backlog stays on one carrier until it
   drains (placement is pinned per key backlog, not per time window), so a rebalance cannot reorder a key.
5. **The planner.** Dispatch calls `openvibe-sdk/placement` `plan()` with requirements
   `{ kind: 'events.deliver', mobility: 'stateful-partition' }` plus the class's latency, durability and ordering,
   against one `resource-offer@1` per carrier adapter (capabilities `events:gateway`, `events:durable`,
   `events:ordered`), priced from a revisioned `rate-card@1` set, with health from the worker's own EWMA and breaker
   (Media's `signals.js` pattern). Decisions are cached per (class, key) with hysteresis and recorded in
   `delivery_placements`, so an explanation can be answered from history.
6. **JetStream carries STREAM only.** One `nats-server -js` per cell on the Events host (`openvibe-nats.service`, file
   storage under `/var/lib/nats`, loopback and private network only, one stream per carrier class). It is never the
   record; when it is down STREAM deliveries fail open to `pg-v1`.
7. **Cursors replace the global seq.** `publish-result` gains `cursor` and `read-result` gains `cursor` and
   `next_cursor` (opaque: a hot-store position plus a retention epoch); the SSE `id` becomes the cursor. Consumers'
   positions live in `consumer_checkpoints` with `epoch` and `carrier` columns. `seq` is still returned for exactly one
   release after the cursor ships; it and `X-OpenVibe-Seq` are then deleted, with the "global order" promise.
   *Positions done 2026-10-10 (Contracts 0.132.0, openvibe-sdk 0.42.0, Shared 3.0.1, Events):* every consumer reads by
   cursor, and nothing accepts a number as a position any more: `after_seq` is a 400, pages carry no `next_after_seq` or
   `latest_seq`, checkpoints store and return the opaque cursor, and a bare-number `Last-Event-ID` is not a position.
   *Done 2026-10-10 (Contracts 0.136.0, Events, openvibe-sdk 0.43.0):* the per-event `seq` is gone from pull items,
   single reads, publish results, SSE data and the delivery body, and `X-OpenVibe-Seq` is no longer sent: there is no
   global order on the wire, and clients dedupe by `event_id`. Only the operator routes (the delivery list and
   replay `from_seq`) still page by the hot store's position, and `gap` ranges still count it, informationally.
8. **Three tiers.** hot = `events` (pruned at `retention.hot`); replay = `events_archive` in the same database (no
   delivery rows, compressed payloads, pruned at `retention.replay`); archive = monthly NDJSON objects in object
   storage, restored only by an operator job into `events_archive`. Pulls and scans span hot and replay with one
   cursor and answer the existing `gap` shape outside both. The archive tier is never on an online path.
9. **One inbox.** `lib/client.js` re-exports the SDK's `createPgInbox` and `createPgOutbox`; its SQLite copies and
   `better-sqlite3` go.
10. **The origin.** Events serves its API and product on `openvibe.events` in one deploy; `events.openvibe.network`
    answers 308 only while its access log still shows callers, then it and its certificate are deleted.

## Alternatives considered

- **A TOPIC/QUEUE/STREAM contract enum:** rejected. It would be a second vocabulary beside the delivery-policy class
  and a contract bump for every consumer, for a label only Events uses.
- **JetStream for every class:** rejected. TOPIC and QUEUE traffic is served by Valkey and PostgreSQL, which already run;
  a daemon is justified only where retained, ordered, offset-addressed logs are the product (STREAM).
- **Kafka:** rejected for the same operational-weight reason ADR-004 gave; JetStream's single binary and file storage
  fit one cell.
- **Keeping the global seq:** rejected. A single sequence is a single writer; cursors carry the retention epoch that
  a tiered, multi-carrier store needs.

## Migration consequences

- Migration `0002` (expand): `delivery_policies`, the four `deliveries` columns, `events_archive`,
  `delivery_placements`, and `consumer_checkpoints.epoch/carrier`. Contract migration after the seq release.
- Contracts: `publish-result` and `read-result` gain their cursor fields (additive, a minor release).
- The SDK events client and the seven seq readers move to cursors in the compatibility release.
- Host: the `openvibe-nats.service` unit, its storage and firewall rules; backups need nothing (NATS is not the record).

## Rollback

- Carriers: mark an adapter ineligible (configuration) and every delivery falls back to `pg-v1` at once.
- The lease and the tiers are additive schema; the previous release ignores the new columns.
- Cursors: during the compatibility release both `seq` and `cursor` are returned, so a consumer rolls back freely;
  after `seq` is deleted, rolling a consumer back past its cursor support is not possible.
- The origin: the old host keeps its 308 until its log is quiet; re-pointing is a DNS and nginx change.

## Acceptance tests

- Every policy class maps to exactly one carrier class; an unknown class is refused; a publisher cannot lower one.
- Two workers, one due delivery: exactly one send. Per-key order holds across two workers and a crash (the consumer
  dedupes the redelivery); two keys interleave freely.
- A carrier marked unhealthy is excluded with a reason and `pg-v1` delivers; nothing is lost.
- `GET /api/v1/placement` shape: non-empty reasons, eligibility, cost and latency per candidate; hysteresis holds a
  placement inside `minGain`; a stored decision explains a past delivery.
- Cursor round trip: publish, pull from the cursor, checkpoint, SSE resume; a cursor outside hot and replay gets `gap`.
- Tiers: a hot-pruned event is readable through replay; archive write and operator restore round-trip; a cursor across
  the tier boundary reports no false gap.
- The inbox is awaited, duplicate-safe under concurrency and rolls back with the caller's transaction.
