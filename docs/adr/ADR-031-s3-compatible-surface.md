# ADR-031: An S3-compatible surface for OpenVibe.Media

**Status:** Accepted 2026-09-26 (roadmap WS-N task 8). Implementation follows in OpenVibe.Media. Amended 2026-10-02: named object zones (OpenVibe.Zone). A bucket is a named zone inside a project environment, resolved per access key. The environment's own namespace is the zone `default`.

## Context and current evidence

- Developers store files through Media's object API: `med_` ids, per-project tenants with byte quotas, uploads verified at `complete`, and signed URLs for sandbox reads (ADR-006, ADR-014).
- Many tools already speak S3: the AWS SDKs, rclone, static-site deployers and backup scripts. Asking developers to learn a second storage API is friction.

## Decision

- **A subset of S3, not all of it**, served at `https://s3.openvibe.media` (path style: `/<bucket>/<key>`).
- **A bucket is a project namespace.** The developer's tenant (`app.<project>`) has one bucket per environment: `<project_key>-sandbox` and `<project_key>` (production). Keys are the object's path under that namespace.
- **Supported operations:**
  - objects: `PutObject`, `GetObject` (with ranges), `HeadObject`, `DeleteObject`;
  - listing: `ListObjectsV2` (prefix, delimiter, continuation) and `ListBuckets` (the project's own);
  - presigned `GET` and `PUT` (SigV4 query), valid for at most 7 days.
  - Everything else answers `NotImplemented`, including ACLs, policies, versioning and multipart uploads. Multipart is a candidate for a second phase: Media's own chunked uploads cover large files today.
- **Credentials are per project and scoped:**
  - Codes issues access keys (`ovk_…` id plus secret) bound to one project and environment, with read and/or write.
  - The secret is shown once and stored encrypted, because SigV4 needs it to verify.
  - Every request is authorised as that project's app would be, so the same quota, capability checks (`media.object.*`) and sandbox rules apply.
- **Same objects, two doors:** an object written over S3 is an ordinary Media object (`med_` id, owner app, lifecycle, derivatives), and the reverse. `PutObject` completes the object in the same request (hash and quota checked); a quota overrun answers `QuotaExceeded` (403).
- **Conformance** is proven with the AWS SDK for JavaScript v3 against a local Media, for every supported operation, including a presigned round trip and the `NotImplemented` answers.

## Alternatives considered

- **Full S3** (MinIO in front of Media): rejected. It gives two sources of truth for objects, and no quota or capability integration.
- **No S3 at all:** rejected. It is the most requested integration for storage.
- **Buckets as free-form names:** rejected. Namespaces already are the unit of ownership, quota and grants.

## Migration consequences

A new vhost, a signature verifier and access-key issuance in Codes (contract `media.access-key@1`, capability `media.object.s3`). No change to existing objects.

## Rollback

Turn the vhost off and revoke the keys. Objects written through it stay ordinary Media objects.

## Acceptance tests

- The AWS SDK v3 conformance suite passes against a local Media.
- A key cannot touch another project, and sandbox keys cannot touch production.
- A quota overrun is refused.
- A presigned URL expires on time.
- An object written over S3 reads through the object API with the same bytes and hash.

## Amendment 2026-10-02: named object zones (OpenVibe.Zone)

**Status:** Accepted for implementation planning 2026-10-02 (plan D37; the Zone research report, build step 1). It serves ADR-034 sections 2, 3 and 9. It keeps ADR-035's ownership rule. Nothing here is built. Contracts, all `planned`: `zone.object-zone@1` and its create, update, list, list-query, delete-query and usage contracts, with the Zone service manifest and its planned capabilities.

### Context

OpenVibe.Zone (openvibe.zone, formerly "Data") promises developers named, private storage zones per project and environment. The Decision above fixed one bucket per project environment and rejected free-form bucket names, because the namespace is the unit of ownership, quota and grants. Without this amendment there would be two object catalogs, two quotas and two deletion paths for the same bytes.

Evidence on 2026-10-02:
- The S3 surface is not built. Media has no S3 route.
- Contracts has no `media.access-key` contract. No access key has been issued.
- No client holds a `<project_key>` bucket name.

### Decision

**1. A zone is a named Media namespace, so there is still one object catalog.**
- An object zone is a named namespace inside one project environment.
- Its objects are ordinary Media objects (`med_` ids) in Media's one object table, with one lifecycle. Zone never lists, stores or copies keys or bytes.
- The rule of the Decision above still holds, now one level down: the namespace is the unit of ownership, quota and grants, and a zone is a namespace.

**2. Ownership.**

| Concern | Owner |
|---|---|
| The zone record: id, name, environment, state, access policy, per-zone quota setting, the usage view, control API, resource index entry | **Zone**, in its own PostgreSQL database (ADR-035). Zone never reads Media's database. |
| Objects, keys, bytes, placement and replicas, hashes, holds, derivatives, the S3 and native data APIs, signing, quota enforcement at write time, the counting of usage, and deletion of every copy | **Media** |
| Projects, environments, members, project quotas, grants and their resource scopes, revocation | **Network** (ADR-014, ADR-034 section 3) |
| S3 access keys: issuance, show-once secret, revocation | **Codes**, as decided above, with a zone scope added |
| Rating usage against the price list | **Billing** (ADR-034 section 9) |
| Display and control in the console | **Services**, only through Zone's API |

**3. Names.**
- **Zone id:** `zon_<ULID>`. It is never reused.
- **Resource name:** `ovrn:zone:<project_id>:object-zone/<zone_id>`. It is used in grants, audit, events, usage and bills.
  - The environment is an immutable attribute of the zone and a grant condition. It is not part of the name.
  - Objects keep their Media resource name, `ovrn:media:<project_id>:object/<med_id>`. Media records the object's `zone_id`.
- **Zone name:**
  - 3 to 63 characters of `a-z`, `0-9` and single inner hyphens. A valid name is also a valid S3 bucket name.
  - It is unique among **all** the zones of one project environment, `deleted` ones included. A name is never given to a second zone of that environment: once its zone is `deleting` or `deleted`, the name is retired, and creating a zone with it answers `409 zone.name_retired`.
  - It is immutable. There is no rename, because the name is the bucket that clients configure.
  - The name `default` is reserved (see 4).
  - So within one project environment a name identifies exactly one zone id, for ever. This is what binds a signed request to one zone (see 9). S3 lets a deleted bucket's name be taken again, and a URL signed for the old bucket then reaches the new one; retiring names closes that.
- **Media namespace:** `<environment root>.<zone_id>`, for example `app.prj_01J….sandbox.zon_01K…`. The namespace uses the id, never the name, so Media never depends on a name.
- **One identity.** `ovrn` and `media_namespace` are derived from `id`, `project_id`, `env` and `default`. They are never set on their own.
  - JSON Schema cannot compare two fields, so `contracts.zones.checkObjectZone(z)` adds the equality checks to the schema: the OVRN names the record's project and id, and the namespace is the record's environment root, plus `.<id>` unless the zone is the default.
  - Zone runs the check on every record before it stores or returns it. Media runs it on every provision call and refuses a mismatch, so a projection row can never point one zone's name at another zone's namespace.
- **Bucket name:** the zone name, resolved within the **project and environment of the access key** that signed the request.
  - Two projects can each have a bucket named `assets`. So can one project's sandbox and its production.
  - A key can only ever resolve its own environment's zones.
  - Media's projection keeps `deleted` zones, so a retired name resolves to its deleted zone (`NoSuchBucket`), never to another one.
  - This replaces the global `<project_key>` and `<project_key>-sandbox` bucket names in the Decision above. Those names were never issued.
- **Object key:**
  - The key is the S3 key: UTF-8, 1 to 1,024 bytes. It is unique among the live objects of one zone.
  - An object created through the native API without a key gets a derived key (see 4). This keeps "same objects, two doors" true.

**4. The default zone.**
- Every project environment has one zone named `default`. Its Media namespace is the **environment root itself**.
- Zone creates it with the environment. Zone backfills it for existing projects.
- Existing objects in the environment root, and in any sub-namespace that is not a zone (a legacy child namespace), belong to it. No object moves and no namespace string changes.
- **Derived keys.** Media gives every object without a key a key derived from its namespace and its `med_` id:
  - an object in the environment root gets `<med_id>`;
  - an object in a legacy child namespace `<root>.<seg1>.<seg2>` gets `<seg1>/<seg2>/<med_id>`, so `ListObjectsV2` with delimiter `/` shows that namespace as a common prefix.
  - The backfill (see Compatibility and migration) derives keys for every row, tombstoned rows included, and finishes before the S3 vhost accepts a write. No client-chosen key exists yet, and `med_` ids are unique and never reused, so derived keys cannot collide.
  - After that, a keyless native create checks the key's uniqueness in the transaction that creates the object. If a client has already written that exact key over S3, Media takes a new `med_` id. It never overwrites.
  - An S3 write to the default zone stores the object in the environment root with the key as given. A `/` in a key never creates or names a Media namespace.
- **Legacy visibility.** The default zone's `access` is `per-object`, because existing objects may be `public` or `unlisted` (`media.object@1`):
  - Existing objects keep their `visibility`, `public_url` and cached copies. Native callers may still set `public` or `unlisted` in the default zone, as today.
  - The S3 surface never serves an object without a signature, whatever its visibility. An object written over S3 is `private`.
  - Making a public or unlisted object private, or deleting it, purges its CDN and public-cache copies (see 10).
  - A project that wants a private-only bucket creates a named zone. Turning a default zone private is a later, explicit migration per project, which would set each object private and purge it. It never happens silently.
- It cannot be deleted on its own. It goes when the environment or the project is deleted.
- A grant on the default zone covers the environment root's subtree except the `zon_` sub-namespaces. That is the only boundary rule Media adds.

**5. Control API (Zone).** Base `https://api.openvibe.zone/api/v1`, authorised with Network tokens. Each route has one planned capability in the Zone service manifest (`manifests/services/zone.json`) and named request and response contracts:

| Route | Capability | Request | Answer |
|---|---|---|---|
| `POST /projects/{project_id}/zones` | `zone.zone.create` | body `zone.object-zone-create-request@1`, `Idempotency-Key` header | `201` `zone.object-zone@1` |
| `GET /projects/{project_id}/zones` | `zone.zone.list` | query `zone.object-zone-list-query@1` (`env`, `include_deleted`, `cursor`, `limit`) | `200` `zone.object-zone-list@1` |
| `GET /zones/{zone_id}` | `zone.zone.read` | none | `200` `zone.object-zone@1` |
| `PATCH /zones/{zone_id}` | `zone.zone.manage` | body `zone.object-zone-update-request@1` (`quota_bytes`, `description` only) | `200` `zone.object-zone@1` |
| `DELETE /zones/{zone_id}` | `zone.zone.delete` | query `zone.object-zone-delete-query@1` (`recursive`) | `202` `zone.object-zone@1` in state `deleting` |
| `GET /zones/{zone_id}/usage` | `zone.usage.read` | none | `200` `zone.object-zone-usage@1` (see 8) |

- Create answers by the state of the zone of the environment that has the name: `409 zone.name_taken` if it is `provisioning` or `active`, `409 zone.name_retired` if it is `deleting` or `deleted`. It answers `403 zone.quota_exceeded` past the project's `zones` quota. Zone enforces this quota, and deleted zones do not count against it.
- Name and environment are immutable. An update that names them is refused by its schema.
- Delete answers `409 zone.not_empty` for a zone that still holds live objects, unless the caller sends `recursive=true`. It answers `409 zone.held` while any object of the zone is under a retention hold, as `media.object.delete` refuses a held object. The default zone answers `409 zone.default`.
- `GET /resources` lists entries of kind `zone.object-zone` (`common.resource-summary@1`).
- Errors are `errors.problem@1`.
- The capabilities are `planned`. `lib/openapi.js` builds `generated/openapi` from active capabilities only, so these routes enter `generated/openapi/zone.json` in the release that implements them and turns the capabilities active. Each capability already names its routes and contracts.

Zone provisions each change in Media **synchronously**:
- Zone calls Media's internal zone endpoint (service token, planned capability `media.zone.provision`, granted only to Zone).
- Each call carries the zone's `revision`. Media applies only a higher revision.
- A zone becomes `active`, or a quota change takes effect, only after Media acknowledges it.
- Media keeps a projection of the zone (id, project, environment, name, namespace, quota, state, revision). It uses the projection to resolve bucket names and enforce quotas.
- An hourly reconciliation compares Zone's list with Media's projection. A difference is an alert, and Zone's record wins.

**6. Data APIs (Media).** They change only as follows:
- **S3** at `https://s3.openvibe.media`, path style `/<zone name>/<key>`:
  - `ListBuckets` lists the active zones of the key's environment.
  - `HeadBucket` is added to the supported operations, because SDKs and rclone probe with it.
  - `CreateBucket` and `DeleteBucket` stay `NotImplemented`. Zones are created and deleted only through Zone's API, so policy and quota live in one place.
  - An unknown bucket, or a zone that is `deleting` or `deleted`, answers `NoSuchBucket`.
- **Native object API** (`/api/v2/:app/objects`): a request that names a zone's namespace reads and writes that zone.
- **Overwrite:** a `PutObject` to an existing key creates a new object and deletes the previous one through the deletion path in section 10. There is no versioning in v1. An overwrite of an object under a retention hold is refused with `AccessDenied`, as its deletion would be.

**7. Scoped grants.**
- The data capabilities stay Media's: `media.object.read`, `.list`, `.upload`, `.delete` and `media.object.s3`.
- Their resource scope (ADR-034 section 3) may name:
  - one zone, `ovrn:zone:<project_id>:object-zone/<zone_id>`;
  - every zone of the project, `ovrn:zone:<project_id>:object-zone/*`.
- Media maps a zone's resource name to its namespace through the projection. Environment is a grant condition, and a sandbox credential never reaches a production zone.
- Access keys (`media.access-key@1`, still to be written) gain an optional `zones` list of zone ids.
  - An empty list means the whole environment, as the Decision above describes.
  - A key scoped to zones cannot list, read, sign for or write any other zone.
- An environment-wide grant (namespace = environment root) keeps meaning "as the project's app" and covers every zone in that environment.

**8. Quotas and usage attribution.**
- **Bytes:**
  - The project environment's byte quota (Network, ADR-014) is the ceiling.
  - A zone may set a lower `quota_bytes`. The sum of zone quotas may exceed the environment quota, because the environment quota is still enforced.
  - Media checks both limits in the same request that completes a write. Either refusal is `QuotaExceeded` (403), as decided above.
  - Only live objects count. An object counts as soon as it completes and stops counting at its tombstone, even before its copies are erased.
- **Zone count:** the project's `zones` quota is enforced by Zone.
- **Counting:** **Media is the only counter.** Per zone and per closed hour it emits `media.usage.recorded` (`common.usage-recorded@1`, planned for Media). Every rollup names the zone twice:
  - `resource` is the zone's resource name, `ovrn:zone:<project_id>:object-zone/<zone_id>`, as ADR-034 section 9 requires of billable usage. The console links it. Rollups are counts; Billing rates readings only; Media posts readings for what it bills.
  - `dimension` is the zone id in lowercase (`zon_01k…`), for consumers that only group by dimension.
  - Rollups for the default zone carry the default zone's resource name too. A rollup without `resource` is never Media's.
- The series are:
  - stored bytes: capability `media.object.upload`, unit `byte_hours`;
  - write and list operations: each capability, unit `requests`;
  - read operations: `media.object.read`, unit `requests`;
  - egress: `media.object.read`, unit `egress_bytes`.
- **Zone's usage view:**
  - Zone sums Media's rollups for the zone, plus a current-bytes snapshot that Media's internal zone endpoint returns.
  - Zone never counts bytes itself.
  - Zone's control operations are not metered (ADR-034 section 9: a project's internal traffic is free).

**9. Private access and signed URLs.**
- Named zones are `private` only in v1. The default zone is `per-object` (see 4).
  - A named zone's object never has a `public_url`, never enters a public cache, and refuses visibility `public` or `unlisted`.
  - Publishing a zone through the CDN (research build step 6) is a later amendment. It would add an `access` value to `zone.object-zone@1`.
- Presigned SigV4 `GET` and `PUT` URLs are signed by the client with a zone-scoped or environment-wide key and are valid for at most 7 days.
- Media checks the signature, the key's scope, the zone state and the quota **when the URL is used**, not when it is signed. A URL stops working as soon as any of these happens:
  - the key is revoked;
  - the zone becomes `deleting`;
  - the object is deleted.
- **A signed request is bound to one immutable zone id.** The signature covers the access key id, which fixes the project and environment, and the path, which names the bucket. A name names one zone id in its environment for ever (see 3). So every signature resolves to the zone id it was made for, and to no other:
  - this holds whatever signing time (`X-Amz-Date`) the client chose, past or future. Time is never what binds a URL to a zone;
  - once that zone is `deleting` or `deleted`, the URL answers `NoSuchBucket` until it expires, and no later zone can take its name;
  - a zone-scoped key names zone ids, so it cannot reach another zone either.
- Media also refuses with `AccessDenied` a request whose signing time is more than 15 minutes in the future, as S3 does. This limits clock skew; it is not what binds a request to a zone.
- A presigned URL names a key, not a version. After an overwrite it serves the new object, as S3 does.
- A caller that holds only an app token uses Media's native signed download for an `med_` id. Zone never signs and never serves bytes.

**10. One byte and deletion lifecycle, including replicas.** It is the lifecycle `media.object.delete` already promises (a soft delete, a restore within the retention period, and a refusal under a retention hold), extended to every door and every copy. Every way an object can be removed goes through **Media's one deletion path**:
- S3 `DeleteObject`;
- native `DELETE` (`media.object.delete`);
- an overwrite;
- zone deletion;
- environment, project or account deletion (ADR-033).

An object has three states on this path: **live**, **tombstoned** (restorable until its `purge_after`) and **purged** (every copy erased).
1. **Holds refuse first.** A caller's deletion of an object under a retention hold (ADR-006) is refused, through every door: the native API as `media.object.delete` does today, and S3 `DeleteObject` and overwrite with `AccessDenied`. A held object stays live and readable. Zone deletion is refused the same way (`409 zone.held`, see 5).
2. **Tombstone (soft delete).** In one transaction, the object's `lifecycle_status` becomes `deleted`, `purge_after` is set, `media.object.deleted` is emitted through the outbox, and the object stops counting. From then on every door answers "not found": S3 `NoSuchKey`, the native API `404`, presigned URLs and signed downloads.
   - For S3 `DeleteObject`, native `DELETE` and an overwrite, `purge_after` is the end of the namespace's retention period, as today.
   - For zone deletion, and for environment, project or account deletion, `purge_after` is the tombstone itself. These deletions are not restorable.
3. **Restore.** Until `purge_after`, `POST /api/v2/:app/objects/:id/restore` makes the object live again, checked against the namespace's and the zone's quotas, as today. It is refused while the object's zone is `deleting` or `deleted`, and with `409` when a live object of the zone now holds its key (only an S3 write or an overwrite can cause that, because derived keys never collide). S3 has no restore. An object deleted over S3 is restored through the native API.
4. **Purge, fastest copies first.** After `purge_after`:
   - an object that is or was `public` or `unlisted` first has its CDN and public-cache copies purged. Only the default zone can hold one (see 4). A named zone's objects are never in the CDN. If a later public zone is added, its objects are purged here too;
   - the R2 hot cache and the local asset-origin and cache copies are removed, then the B2 canonical copy. For B2, every file version is deleted (`b2_delete_file_version`). A hide marker is not deletion;
   - a copy is marked removed in `media_locations` only after the provider confirms it is gone (a `HEAD` answers not found).
   - Every copy is erased within 24 hours of `purge_after`. A sweeper retries failed removals. A location still present after the deadline raises an operator alert.
5. **Holds placed later.** A hold placed on a tombstoned object before it is purged delays the purge only: the object stays "not found" and uncounted, cannot be restored past its `purge_after`, and is purged when the hold clears. ADR-033's rules for held media apply to account deletion.
6. **The record.** The purged row, without bytes, is kept for audit. The account-deletion rules of ADR-033 apply to any subject fields.

**Zone deletion** uses the same path:
1. Zone checks with Media that no object of the zone is held (`409 zone.held` otherwise), then sets the zone to `deleting` and pushes that to Media synchronously. From then on, data requests answer `NoSuchBucket`.
2. Media tombstones every live object of the namespace in batches, with `purge_after` at the tombstone, and purges every object of the namespace, including those tombstoned earlier whose retention period has not ended.
3. Through the internal endpoint, Media reports `objects_remaining` and `held_objects`.
4. When no object remains and every copy is confirmed gone, Zone marks the zone `deleted`. Its name is retired, never freed (see 3), so no later zone can accept a request signed for this one (see 9).
5. Codes revokes keys scoped only to that zone. Network drops grants scoped to its resource name. Ids are never reused, so a leftover grant can never match a later zone.

A hold placed on an object of the zone after that check is still allowed: Media still tombstones the object, and the hold delays only its purge (step 5 above). It keeps the zone in `deleting`, with `held_objects` above 0, until the hold clears.

**11. Export.** The S3 and native read APIs are the export path for a zone. ADR-033's account export lists a subject's projects' zones by name and resource name. It does not copy their bytes.

### Compatibility and migration

- **Contracts:** the new `zone.*` contracts, the Zone service manifest and its capabilities are additive and `planned`. No active contract changes.
  - When Media implements this amendment, `media.object@1` gains optional `zone_id` and `key` in a minor version. Its description already allows added fields.
  - `media.access-key@1` is written with the `zones` scope from the start.
  - `common.usage-recorded@1` gains an optional `resource` (a resource name). It is additive: existing producers do not send it, and their rollups are unchanged.
- **Media, expand/migrate/contract (ADR-028):**
  - expand: a nullable `zone_id` and `key` on objects, and the zone projection table;
  - migrate: Zone creates each environment's default zone and pushes it. Media then backfills `zone_id` and the derived `key` (see 4) for every row, before the S3 vhost accepts writes. Metadata only: no object moves, no namespace changes, and no visibility changes;
  - contract: `zone_id` and `key` become required for developer-project tenants, with a unique index on (`zone_id`, `key`) over live objects.
  - First-party `:app` tenants (for example `community`) are not zones and do not change.
- **Clients:** existing native-API callers keep working unchanged. Their namespaces are the default zone, and their objects keep their visibility, public URLs and cached copies (see 4).
  - Native `DELETE` and restore keep the contract of `media.object.delete`: a soft delete for the retention period, a restore within it, and a refusal under a hold (see 10). What is new is that the purge after the retention period is defined to erase every copy.
  - The one new refusal is a restore whose key a live object now holds. Only an S3 write can cause it, so a caller that never uses S3 never meets it.

### Rollback

- Turn off Zone's control API. Media keeps serving every zone from its projection. Zone's database holds no bytes and no object list.
- If Zone's database is lost, its zone records can be rebuilt from Media's projection (id, project, environment, name, quota, state). Zone remains the authority once it is restored.
- Turning off the S3 vhost (the Rollback above) leaves zones reachable through the native API.

### Acceptance tests (in addition to those above)

- **Two doors:** one object written over S3 to zone `assets` reads through the native API with the same `med_` id, bytes and hash, and the reverse.
  - Deleting it through either door makes both doors and a presigned URL answer "not found".
  - Every location row is confirmed removed. The B2 copy has no remaining file version.
- **Isolation:** two projects each create a zone named `assets`, and each key sees only its own. A sandbox key cannot resolve a production zone. A key scoped to zone A gets `AccessDenied` on zone B.
- **Quotas:** a write over the zone's `quota_bytes` is refused. So is a write within the zone's quota that is over the environment quota.
- **Zone deletion:**
  - `DELETE` on a non-empty zone without `recursive` answers `409 zone.not_empty`. On a zone with a held object it answers `409 zone.held`.
  - With `recursive`, the zone answers `NoSuchBucket` at once, every object is tombstoned with no restore window, and every copy is erased within the deadline.
  - Creating a zone with the deleted zone's name, while it is `deleting` and after it is `deleted`, answers `409 zone.name_retired`.
- **Holds:** a native `DELETE`, an S3 `DeleteObject` and an S3 overwrite of a held object are each refused, and the object stays readable. A hold placed on a tombstoned object keeps its canonical copy until the hold clears, while every door answers "not found".
- **Restore:** an object deleted over S3 is restored within the retention period through the native API and reads over S3 again with the same bytes. After `purge_after`, no copy remains.
- **Default zone:**
  - After the backfill, existing root-namespace objects list in bucket `default` under their `med_` id, and objects of a legacy child namespace list under its `<seg>/` prefix, without any move. Every derived key is unique.
  - A keyless native create whose derived key a client already wrote over S3 gets a new `med_` id and overwrites nothing.
  - A grant on the default zone does not reach a `zon_` sub-namespace.
- **Legacy visibility:** a public object in the default zone keeps its `public_url` after the migration. An unsigned S3 `GetObject` for it answers `AccessDenied`. Deleting it purges its CDN copy.
- **No name reuse, whatever the signing time:** presign a `GET` for zone `assets` with an `X-Amz-Date` 10 minutes in the future, and another with the current time. Delete `assets`. Both URLs answer `NoSuchBucket`, inside their 7 days and after the future date has passed. Creating a new `assets` in that environment answers `409 zone.name_retired`. The same name in the other environment, or in another project, is a different bucket and accepts neither URL.
- **Identity:** `contracts.zones.checkObjectZone` refuses a record whose OVRN or namespace names another zone or project. Media refuses such a provision call.
- **Usage:** every Media usage rollup carries the zone's resource name as `resource` and its id as `dimension`. Their stored-byte total matches Media's live bytes for the zone.
- **Reconciliation:** an injected mismatch between Zone and Media's projection raises the alert.
