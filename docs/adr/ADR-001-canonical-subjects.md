# ADR-001: Canonical subject IDs and legacy identity mapping

**Status:** Accepted, implemented 2026-09-22

## Context and current evidence

Live, Media and Games each kept their own integer user ids; the same integer named different people in different services (Network #57 and Live #57). Community existed partly to translate identities through Live. The Wave 0 baseline counted 391 Network accounts, 27,848 guest sessions, and 326 Live↔Network links known only to Live.

## Decision

- Every actor is a `SubjectRef` `{ type: user|guest|service|app|mod|system, id }` (contract `identity.subject-ref@1`). Users and guests get ULID ids (`usr_`, `gst_`), services and system actors slugs.
- OpenVibe.Network issues subjects and keeps `identity_legacy_map (source_system, source_type, source_id) -> subject_id`. A mapping is never repointed; a conflicting write is reported.
- Subject ids are added **alongside** integer ids. Tokens keep the integer `sub` and gain `subject_id`.
- Services resolve through `/internal/identity/resolve` and `resolve-batch` with a service token (`identity.subject.resolve`).

## Alternatives considered

- Replace integer ids with subjects everywhere at once (big-bang): rejected, every consumer breaks together.
- Let each service keep translating through the service that knows (Community → Live): rejected, it is the coupling this removes.
- UUIDv4 ids: rejected in favour of ULIDs, which sort by creation time and keep indexes append-mostly.

## Migration consequences

Backfilled at Network boot (idempotent, time part from `created_at`). Live reports its links daily (`identity-legacy-sync`); `/internal/link-account` writes the map too. Rows created in the 2026-08-17..20 window may carry Network ids where Live ids were expected (see ADR-011 import).

## Rollback

Additive: removing `subject_id` columns and the map returns to the previous state; nothing reads subjects in place of integer ids where a legacy caller still needs the integer.

## Acceptance tests

`OpenVibe.Network/test/identity-subjects.test.js`: backfill validity and stability, legacy-map seeding, no repointing, problem+json errors, `subject_id` in tokens with `sub` unchanged. Production: resolve by Live id returns the Network account; unknown ids return 404 problem.
