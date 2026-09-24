# ADR-006: Media object, location and namespace model

**Status:** Accepted 2026-09-22; implementation in progress (OpenVibe.Media Wave 4). Amended 2026-09-24: four placement classes, the local/dev provider, the infrequent-access tier deferred (roadmap §28.3 m1).

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

## Amendment 2026-09-24: placement classes, local provider, infrequent access

Roadmap §28.3 m1 and §28.4 item 6. A copy's **placement class** says why it exists and what may
remove it. The provider says where it is. There are four classes:

| Class | Purpose | Where today | Rules |
|---|---|---|---|
| **canonical** | The durable copy of record | B2 (`provider b2`, `storage_class cold`); the local disk for an object not yet offloaded | Never removed while the object exists or is held. Demotion never touches it. Deletion only after holds clear. |
| **hot cache** | A promoted copy for heavy playback | R2 (`provider r2`, `storage_class cache`) | Only analytics-gated promotion creates it (the Decision above; roadmap §28.2 M2). Demotion removes only this copy. It is never the only copy. |
| **asset origin** | Small public assets served through the CDN: avatars, thumbnails, previews, sprites, paste screenshots and similar | Media's own host disk behind Cloudflare (`provider local`, `storage_class hot`) | May be the canonical copy for small assets. It is served with long-lived, content-hashed or revisioned URLs. A separate cheap origin VPS is used only when disk or egress measurements call for one. |
| **local scratch** | Development and active processing: recordings in progress, remux and cut work, job temporaries | the host's local disk | Never a durable copy and never a location of record. A job cleans up after itself, and a restart may discard scratch. |

`media_locations.storage_class` keeps its values (`hot`, `cold`, `cache`). The class is derived from
the provider and the object kind until Media adds a `placement` column. That column is additive,
and Media records it with its lifecycle work.

**Local/dev provider.** `local` is a first-class provider. With no B2 or R2 credentials, every
Media path degrades to it: uploads, playback, thumbnails, jobs and the objects API
(`providerConfigured('b2')` and `('r2')` gates in `server/vod/vod-storage.js`). Development and tests
therefore need no cloud account. Still to do in Media: one provider interface (`put`, `get`,
`head`, `delete`, `presign`, `list`) with `local`, `b2` and `r2` implementations behind it, instead of
branches inside `vod-storage.js`. The S3 facade (Alternatives above) would sit on that interface.

**Infrequent-access tier: deferred.** No infrequent-access or archive storage class (B2 has none; S3
IA and Glacier-style tiers are not used) is adopted at current scale. On 2026-09-24, production held 2,839
ready objects totalling 481 GB, which fits B2 at its single price. Revisit when retrieval-priced storage would save more than it costs
in retrieval fees and restore latency, measured from `media_locations` sizes and access. That
change is a new amendment here.
