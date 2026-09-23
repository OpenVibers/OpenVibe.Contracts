# ADR-011: Community paste and comment ownership migration

**Status:** Accepted and executed 2026-09-22

## Context and current evidence

Pastes were stored in Media (bytes and semantics) and written through Live, which translated identities; Community proxied everything through Live.

## Decision

- OpenVibe.Community owns pastes, versions, likes and comments in its own database; owners are Network subjects.
- Media keeps screenshot bytes; new screenshots go to Media's token-only `community` tenant.
- AI-derived pastes are origin `ai` and ownerless, linked to their stream (roadmap §33).
- Live and the Tools gateway forward to Community; Media answers 410 to paste writes and 301s paste pages.

## Alternatives considered

- Keep pastes in Media and teach it subjects (option A): rejected, the semantics move to Community in Wave 5 anyway.

## Migration consequences

Export bundle (read-only, sha256, no IPs) → idempotent import with legacy maps and import-hold; owners in the 2026-08-17..20 window where both id spaces resolve differently are held (1 paste, 4 comments). Shadow parity: 878/878 public pastes identical before the flip. Incremental import after the flip caught 2 late pastes.

## Rollback

Set PASTES_AUTHORITY=live in Community and Live, remove Media's PASTES_FROZEN_APPS/PASTES_MOVED_TO; export Community-side writes first.

## Acceptance tests

Community test suite (store, API, importer, SSR), Live `pastes-community.test.js`, Media `pastes-moved.test.js`; production: all three entry points serve the same 880 pastes.
