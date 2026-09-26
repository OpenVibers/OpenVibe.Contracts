# ADR-031: An S3-compatible surface for OpenVibe.Media

**Status:** Accepted 2026-09-26 (roadmap WS-N task 8). Implementation follows in OpenVibe.Media.

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
