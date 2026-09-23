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
| [ADR-011](ADR-011-community-pastes.md) | Community paste and comment ownership migration | Accepted and executed 2026-09-22 |
