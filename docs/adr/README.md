# Architecture decision records

Platform-wide decisions from the OpenVibe development roadmap (section 10). Each record states the evidence, the decision, the alternatives, migration consequences, rollback and the tests that prove it (roadmap 23.4). A record is written before the code it governs; records for decisions taken earlier on 2026-09-22 were written the same day the code shipped.

| ADR | Decision | Status |
|---|---|---|
| [ADR-001](ADR-001-canonical-subjects.md) | Canonical subject IDs and legacy identity mapping | Accepted, implemented 2026-09-22 |
| [ADR-002](ADR-002-contract-repository.md) | Contract repository and compatibility policy | Accepted, implemented 2026-09-22 (openvibe-contracts v0.1.0+) |
| [ADR-003](ADR-003-service-principals.md) | Service/app principal authentication and capability grants | Accepted, implemented 2026-09-22; amended 2026-09-24 (delegated authorization and approval UX) |
| [ADR-004](ADR-004-durable-events.md) | Durable event store, outbox/inbox and delivery semantics | Accepted 2026-09-22; implementation in progress (OpenVibe.Events) |
| [ADR-005](ADR-005-realtime.md) | Realtime topics, cursor/resume and whether OpenVibe.Realtime exists | Accepted 2026-09-22: realtime runs inside OpenVibe.Events |
| [ADR-006](ADR-006-media-objects.md) | Media object, location and namespace model | Accepted 2026-09-22; implementation in progress (OpenVibe.Media Wave 4); amended 2026-09-24 (placement classes, local provider, infrequent access deferred) |
| [ADR-007](ADR-007-data-ownership.md) | Logical data ownership and database technology | Accepted 2026-09-22; amended 2026-09-24 (PgBouncer, replicas, SERIALIZABLE money paths, Redis non-authoritative) |
| [ADR-008](ADR-008-shared-packages.md) | Shared package publication and release manifests | Accepted 2026-09-22; implementation in progress (OpenVibe.Shared) |
| [ADR-009](ADR-009-live-openre-boundary.md) | Live versus OpenRe boundary | Accepted 2026-09-23; OpenRe deployed, no slot moved yet |
| [ADR-010](ADR-010-chat-boundary.md) | Chat versus Live/Community boundary | Accepted and executed 2026-09-23 (Chat serves Live's chat) |
| [ADR-011](ADR-011-community-pastes.md) | Community paste and comment ownership migration | Accepted and executed 2026-09-22 |
| [ADR-012](ADR-012-economic-classification.md) | Billing vs loyalty, credits and currency classification | Accepted 2026-09-22; gates Waves 8-10; amended 2026-09-24 (transaction-type mapping, OpenCoins stays in Network, table substitution) |
| [ADR-013](ADR-013-mod-manifest.md) | Mod manifest, trust and sandbox/resource model | Accepted 2026-09-23; gates Waves 12 and 21C; amended 2026-09-24 (signing and review open, monetization through Billing, manifest 1.1.0) |
| [ADR-014](ADR-014-developer-projects.md) | Developer project, tenant and quota model | Accepted 2026-09-23; gates Waves 20-21 |
| [ADR-015](ADR-015-ai-workflows.md) | AI workflow and publication ownership boundary | Accepted 2026-09-23; OpenVibe.AI deployed |
| [ADR-016](ADR-016-active-client-updates.md) | Active client update safety and mixed-version window | Accepted 2026-09-23; Track R |
| [ADR-017](ADR-017-sources-home.md) | Home of the source registry and ingestion runtime | Accepted 2026-09-23: OpenVibe.Sources |
| [ADR-018](ADR-018-search-home.md) | Home of the search index and query contract | Accepted 2026-09-23: OpenVibe.Search, FTS first |
| [ADR-019](ADR-019-publishing-packages.md) | Home of the shared publishing packages | Accepted 2026-09-23: OpenVibe.Publishing, packages only |
| [ADR-020](ADR-020-notification-delivery.md) | Notification delivery ownership | Accepted 2026-09-23: Network authority, Events transport |
| [ADR-021](ADR-021-analytics.md) | Analytics ownership and privacy bounds | Accepted 2026-09-23: contract now, 30-day raw retention; extraction decided 2026-09-24: no analytics service |
| [ADR-022](ADR-022-moderation-console.md) | Moderation and policy console | Accepted 2026-09-23: Network module + audit events; Wave 12 revisit 2026-09-24: stands |
| [ADR-023](ADR-023-client-surfaces.md) | First-party client surfaces | Accepted 2026-09-23: OpenVibe.Extensions at Wave 18 |
| [ADR-024](ADR-024-theme-authority.md) | Theme authority between Network and Shared | Accepted 2026-09-23 |
| [ADR-025](ADR-025-marketplace-scope.md) | Marketplace and commerce scope | Accepted 2026-09-23: Trade stays informational |
| [ADR-026](ADR-026-event-redaction.md) | Producer redaction of its own events (`payload.redacts`) and event payload contracts | Accepted and implemented 2026-09-23 (OpenVibe.Events, Chat) |
| [ADR-027](ADR-027-tools-platform-api.md) | Tools platform API: descriptors, one run API, caller tiers, probes, abuse log, legacy sunset | Accepted 2026-09-23; contracts v0.33.0, routes planned |
| [ADR-028](ADR-028-expand-migrate-contract.md) | Expand, migrate, contract: schema changes that survive a rollback (7-day window); destructive-statement check and rollback-with-newer-writes test | Accepted 2026-09-25; enforced in Live |
