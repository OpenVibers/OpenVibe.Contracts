# ADR-006: Media object, location and namespace model

**Status:** Accepted 2026-09-22; implementation in progress (OpenVibe.Media Wave 4)

## Context and current evidence

Media stored VODs, clips, files and paste screenshots in separate predecessor-shaped tables with a single mutable provider field; copies in local/B2/R2 were implicit.

## Decision

- `media_objects` (`med_<ULID>`) is the canonical record; VOD/clip/file rows become typed projections linked by `object_id`.
- `media_locations` records every copy (local/B2/R2) with state and checksum; B2 stays canonical archive, R2 a promoted hot copy; promotion is analytics-gated policy in configuration, demotion only removes the promoted copy.
- Namespaces are the `:app` tenants plus developer projects later; access by app key or service token with a namespace-scoped capability.
- Retention holds (moderation, DMCA, creator pin, admin, evidence) block deletion and demotion.
- The public object-size invariant is configuration (default max 500 MB, target 256, warn 384), validated and reported, not a copied constant.

## Alternatives considered

- Keep per-kind tables only: rejected, every new kind re-implements storage.
- Full S3 wire compatibility first: deferred; a small native object API first, an S3 facade later if needed.

## Migration consequences

Backfill creates an object per existing row without moving bytes; reconciliation verifies locations before any state is trusted.

## Rollback

The object layer is additive; old routes keep working throughout.

## Acceptance tests

Non-Live app uploads/reads with only a capability grant; deliberate replica loss is detected; private objects cannot be fetched without a grant; invariant violations are reported.
