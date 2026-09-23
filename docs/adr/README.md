# Architecture decision records

Platform-wide decisions from the OpenVibe development roadmap (section 10). Each record states the evidence, the decision, the alternatives, migration consequences, rollback and the tests that prove it (roadmap 23.4). A record is written before the code it governs; records for decisions taken earlier on 2026-09-22 were written the same day the code shipped.

| ADR | Decision | Status |
|---|---|---|
| [ADR-001](ADR-001-canonical-subjects.md) | Canonical subject IDs and legacy identity mapping | Accepted, implemented 2026-09-22 |
| [ADR-002](ADR-002-contract-repository.md) | Contract repository and compatibility policy | Accepted, implemented 2026-09-22 (openvibe-contracts v0.1.0+) |
| [ADR-003](ADR-003-service-principals.md) | Service/app principal authentication and capability grants | Accepted, implemented 2026-09-22 |
| [ADR-004](ADR-004-durable-events.md) | Durable event store, outbox/inbox and delivery semantics | Accepted 2026-09-22; implementation in progress (OpenVibe.Events) |
| [ADR-005](ADR-005-realtime.md) | Realtime topics, cursor/resume and whether OpenVibe.Realtime exists | Accepted 2026-09-22: realtime runs inside OpenVibe.Events |
| [ADR-006](ADR-006-media-objects.md) | Media object, location and namespace model | Accepted 2026-09-22; implementation in progress (OpenVibe.Media Wave 4) |
| [ADR-007](ADR-007-data-ownership.md) | Logical data ownership and database technology | Accepted 2026-09-22 |
| [ADR-008](ADR-008-shared-packages.md) | Shared package publication and release manifests | Accepted 2026-09-22; implementation in progress (OpenVibe.Shared) |
| [ADR-009](ADR-009-live-openre-boundary.md) | Live versus OpenRe boundary | Accepted 2026-09-23; gates Wave 7 |
| [ADR-011](ADR-011-community-pastes.md) | Community paste and comment ownership migration | Accepted and executed 2026-09-22 |
| [ADR-012](ADR-012-economic-classification.md) | Billing vs loyalty, credits and currency classification | Accepted 2026-09-22; gates Waves 8-10 |
| [ADR-013](ADR-013-mod-manifest.md) | Mod manifest, trust and sandbox/resource model | Accepted 2026-09-23; gates Waves 12 and 21C |
| [ADR-014](ADR-014-developer-projects.md) | Developer project, tenant and quota model | Accepted 2026-09-23; gates Waves 20-21 |
| [ADR-016](ADR-016-active-client-updates.md) | Active client update safety and mixed-version window | Accepted 2026-09-23; Track R |
| [ADR-017](ADR-017-sources-home.md) | Home of the source registry and ingestion runtime | Accepted 2026-09-23: OpenVibe.Sources |
| [ADR-018](ADR-018-search-home.md) | Home of the search index and query contract | Accepted 2026-09-23: OpenVibe.Search, FTS first |
| [ADR-019](ADR-019-publishing-packages.md) | Home of the shared publishing packages | Accepted 2026-09-23: OpenVibe.Publishing, packages only |
| [ADR-020](ADR-020-notification-delivery.md) | Notification delivery ownership | Accepted 2026-09-23: Network authority, Events transport |
| [ADR-021](ADR-021-analytics.md) | Analytics ownership and privacy bounds | Accepted 2026-09-23: contract now, 30-day raw retention |
| [ADR-022](ADR-022-moderation-console.md) | Moderation and policy console | Accepted 2026-09-23: Network module + audit events |
| [ADR-023](ADR-023-client-surfaces.md) | First-party client surfaces | Accepted 2026-09-23: OpenVibe.Extensions at Wave 18 |
| [ADR-024](ADR-024-theme-authority.md) | Theme authority between Network and Shared | Accepted 2026-09-23 |
| [ADR-025](ADR-025-marketplace-scope.md) | Marketplace and commerce scope | Accepted 2026-09-23: Trade stays informational |

ADR-010 (Chat boundary) and ADR-015 (AI workflow and publication ownership) are written with the Wave 6 and Wave 13 extractions.
