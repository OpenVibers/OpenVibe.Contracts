# ADR-021: Analytics ownership and privacy bounds

**Status:** Accepted 2026-09-23. Contract now; extraction decision at Wave 22.

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
