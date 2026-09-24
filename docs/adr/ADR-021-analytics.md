# ADR-021: Analytics ownership and privacy bounds

**Status:** Accepted 2026-09-23. Contract now; extraction decision at Wave 22. Amended 2026-09-24: extraction decided (no analytics service; analytics stays per service through `openvibe-shared/analytics`).

## Context and current evidence

Three repositories carry their own `analytics_events`. Aggregation lives in Tools. No retention bound exists anywhere (baseline D07-D10).

## Decision

- **Shared contract, not a shared service.** An `analytics/event.v1` contract in OpenVibe.Contracts carries:
  - the event name, service, route template (never a raw URL with ids or queries), session id (rotating, not a user id), coarse geo (country), user-agent class and timestamp.
- **What is never collected:** IP addresses, precise location and subject ids in raw analytics. Subject-level metrics are opt-in product features, not analytics.
- **Owned rollups stay put.** Each service keeps its own raw events for at most **30 days**. Rollups (daily counts) live with their owner. The cross-site rollup stays in Tools and Network.
- **Extraction:** whether to create an analytics service is decided at Wave 22, from measured volume.

## Alternatives considered

- An analytics service now: rejected, since nothing is measured yet to size it.
- Third-party analytics: rejected on privacy grounds.

## Migration consequences

Each service adds a nightly prune (30 days) and maps its existing events to the contract fields.

## Rollback

Pruning is the only destructive step. Export the rollups before enabling it.

## Acceptance tests

- No raw analytics row older than 30 days.
- No IP address or subject id in any analytics table.

## Amendment 2026-09-24: the extraction decision

Wave 22 asked whether to create an analytics service, "from measured volume". **Decision: no
analytics service.** Analytics stays per service, through the shared module
`openvibe-shared/analytics` (tracker, privacy, retention, schema, prune CLI; Shared ≥ 1.4.0).
The ADR-021 privacy rules above apply unchanged: no IP address, precise location or subject id in
raw analytics, and at most 30 days of raw events.

**Measured volume** (production, read-only, 2026-09-24):

- Live `analytics.db`, the largest: 1,776,181 raw events in its 30-day window (2026-08-25 to
  2026-09-24), 58,247 in the last 24 hours, a 502 MB SQLite file. It was 1.7 GB before the
  ADR-021 prune and scrub.
- Network: raw analytics in its own database, pruned to 30 days (network.db 731 → 276 MB after the
  ADR-021 scrub and VACUUM).
- Tools: one analytics database per satellite, each smaller than Live's.

One process per service writes this volume into SQLite without strain. No product needs raw events
joined across services: the cross-site rollup already lives in Tools and Network. An extra
service would add a deploy unit, a network hop on every page view and a second copy of the privacy
rules, and would buy nothing measured.

**Where the contract lives.** The event schema is `openvibe-shared/analytics/event.v1.json`
(`docs/schemas/analytics-event.v1.json` in OpenVibe.Shared), versioned with the module that writes
it. It is not copied into this repository's catalog, because a second copy would drift. The Decision
above said "in OpenVibe.Contracts"; this amendment corrects that.

**Revisit** (a new amendment here) when any of these is measured:

- one service's raw events pass 1,000,000 a day, or its 30-day raw table passes 5 GB;
- a product needs raw events joined across services (funnels or attribution across sites), which
  rollups cannot answer;
- analytics writes show up in a service's latency or `/ready`;
- the platform moves to more than one host for a service that records analytics.

**Consumers:** Live (`server/index.js`, `server/paths.js`), Network (`server/analytics/network.js`)
and the Tools satellites (`apps/*/server/index.js`) use the module. A new product that wants
analytics uses it too, with its own database and the nightly prune.
