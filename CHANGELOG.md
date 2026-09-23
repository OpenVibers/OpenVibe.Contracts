# Changelog

All notable changes to `openvibe-contracts`. Releases are git tags (`vX.Y.Z`) that consumers install
from `https://codeload.github.com/OpenVibers/OpenVibe.Contracts/tar.gz/refs/tags/<tag>`. Before v0.30.0,
the notes were in the tag and commit messages (`git tag -n1`).

## 0.33.0 — 2026-09-23

Additive: `compat.js` reports no breaking change against v0.32.0.

**Tools platform API** (new ADR-027). The tools on openvibe.tools become one registry and one run API,
open to the SDK, with tiered, weighted quotas.

- `tools.tool@1`: the **tool descriptor**, one per catalogue tool.
  - Identity: `id`, `family`, `name`, `summary`.
  - `status`: `stable` | `beta` | `preview` | `unavailable`, with `statusReason`.
  - How it runs:
    - `execution`: `client` | `sync` | `job`.
    - `api`: whether the run API exposes the tool.
    - `run`: `{ method: POST, path: /api/v1/tools/{id}/run, job: { type, operation, preset? } | null, legacy? }`.
  - Its data:
    - `input`: a JSON Schema, embedded or `{ $ref }` to `GET /api/v1/tools/:id/schema#/$defs/input`.
    - `files`: `{ min, max, accept, maxBytes }` or null.
    - `output`: `{ kind: json|file|files|text, schema?, mime? }`.
    - `limits`: `timeoutMs`, and optionally `maxDurationSec`, `maxPixels`, `maxPages`, `maxInputBytes`,
      `perTargetPerMinute`.
  - Access and cost:
    - `auth`: `{ anonymous, capability: tools.tool.run | tools.net.probe }`.
    - `quotaClass` and `cost` (the relative weight quotas count).
    - `egress`: the server fetches a host the caller chose.
  - `hosts` and `docs`.

  The schema enforces these rules:
  - `api: false` has `run: null`, and `api: true` has a run and an input schema.
  - Only job tools name a job, and an API job tool always does.
  - File output through the API comes from a job.
  - A `tools.net.probe` tool fetches and is never anonymous.
  - An anonymous egress tool declares `limits.perTargetPerMinute`.
  - A client tool never fetches.
  - `unavailable` needs `statusReason`.
  - JSON output has a schema.
- `tools.tool-list@1`: the `GET /api/v1/tools` answer (`tools`, `count`, `updated_at`, optional `families`).
- `tools.run-request@1`: the body of `POST /api/v1/tools/{id}/run`, `{ input, files?, wait_ms?, idempotency_key? }`.
  It can be JSON or multipart, like the jobs API. `files` references a Media object (`{ media_id }`)
  or a result file of the caller's own job (`{ job_id, index }`), so tools can chain. The refusal
  codes are listed in the description.
- `tools.run@1`: the answer. Either `{ state: succeeded, tool, result: { data?, text?, files? }, took_ms, job? }`,
  or `{ state: failed|cancelled, tool, error, took_ms, job? }`, or `{ state: queued|running, tool, job, location }`
  (202).
- `tools.job@1`: the jobs API's view of a job, read from `apps/_shared/jobs` `system.view()` today.
  It carries state, progress, attempts, times, `expires_at`, result files (`storage`, `media`, `url`),
  error, retry links and references. It also has an optional `tool`, set when the job came from a
  run. `tools.job-request@1` is the body of `POST /api/v1/jobs`.
- `contracts.tools` (`lib/tools.js`) adds three helpers:
  - `checkDescriptor(d)` applies the schema plus the rules that depend on the id: `run.path` is the
    tool's own, `$ref`s point at its own schema, `files.min <= files.max`, `legacy` never lists the
    run API, and the quota class has no tier word.
  - `checkList(list)` checks every descriptor, that ids and hosts are unique, and that counts are right.
  - `jobInput(d, input)` returns `{ ...input, ...preset, tool: operation }`.

**Capabilities**

- These are `planned` until Tools serves their routes:
  - `tools.tool.read`: public, quota class `tools-read`. `GET /api/v1/tools`, `GET /api/v1/tools/:id`
    and `GET /api/v1/tools/:id/schema`.
  - `tools.tool.run`: public, quota class `tools-run`, `tools.run-request@1` → `tools.run@1`.
    `POST /api/v1/tools/:id/run`.
  - `tools.net.probe`: **partner**, quota class `tools-probe`. Network grants it only through a
    staff-set project allowance, never a default one. It covers port, ping, traceroute, mtr, latency
    and bulk header and TLS checks through the API.
- `tools.job.create` adds `POST /api/v1/jobs/:id/retry` and `PUT|DELETE /api/v1/jobs/:id/references/:ref`,
  and declares `tools.job-request@1` → `tools.job@1`. `tools.job.read` and `tools.job.cancel` declare
  `tools.job@1`.

**Manifests and statuses**

- Tools 0.4.0:
  - lists the three new capabilities;
  - gains `ready: /api/ready`;
  - its notes now say that job results are in Media and job events reach OpenVibe.Events in
    production, that the gateway has no jobs routes yet, and what ADR-027 plans.
- `tools.job.created|started|succeeded|failed` are `active` (they were `planned`), because Tools
  publishes them. Their descriptions no longer say planned.

**Tests.** `test/run.js` checks:
- every descriptor fixture with `checkDescriptor`;
- that a run endpoint exists exactly when `api` is true;
- that only job tools name a job;
- the egress, probe and client rules, and tier-free quota classes;
- that the run capabilities and the descriptor's `auth.capability` agree;
- that a run's result files are exactly the job's, and that runs and jobs share the Idempotency-Key
  rule and the job type pattern;
- that the `tools.job.succeeded` event carries a subset of the job view;
- the list's counts, ids and hosts.

## 0.32.0 — 2026-09-23

Additive: `compat.js` reports no breaking change against v0.31.0.

- **Channel/owner lineage resolver** (roadmap §15.10, requirement D20): one resolver for channel, stream,
  VOD, clip, Pulse and creator-UI callers. OpenVibe.Live implements it.
  - `lineage.resolve-request@1`: any of `slug` (a channel, or `<channel>/<slot>`), `parent_slug`,
    `channel_id`, `stream_id`, `slot_id`, `vod_id`, `clip_id`, `media_object_id` (`med_…` or
    `legacy:<app>:<kind>:<id>`), `owner_subject` and `legacy_ids` (`live_user_id`, `network_user_id`).
    `display_name` is accepted and never used.
  - `lineage.resolution@1`: `status` `resolved` with the canonical `channel` (`id`, `slug`,
    `owner_subject`, optional `legacy_ids`), whatever of `stream`, `vod`, `clip` and `media_object`
    the inputs reached, `resolved_by` (the deciding input), `rule`, `confidence`
    (`exact` | `derived` | `legacy_map`), `via` and `checked`; or `status` `unresolved` with a
    `reason` (`no_input`, `display_name_only`, `not_found`, `conflict`, `ambiguous`,
    `source_unavailable`) and no channel.
  - Precedence, in the roadmap's order: explicit slug, nested or parent slug, channel id, stream
    lookup (stream, slot), the record's own lineage (clip, VOD), Media lineage, owner subject, legacy
    maps. The first input that resolves decides, and every other input that resolves must name the
    same channel or the answer is `conflict`. Inside a record the first link that answers wins: a clip
    goes to its stream, then its VOD, then the channel recorded on it, never the clipper; a VOD goes to
    its stream, then its slot, then the owner recorded on it. A display name alone resolves nothing.
- New capability `live.lineage.resolve` (Live, internal): `GET|POST /internal/lineage/resolve`.
- **Event payload contracts for events already emitted**, each read from the producer's code and checked
  against payloads it builds:
  - `tips.interaction.moderated@1` (a paid message filtered, held, hidden or restored, by role; the
    deliveries a hide cancelled; never the supporter, message, reason or moderator) and
    `tips.interaction.erased@1` (a supporter erased their data; `redacts` takes back the interaction's
    earlier events), from OpenVibe.Tips' drafts. New capability `tips.interaction.moderate` (Tips,
    internal): the moderation queue and log, hide and restore. The Tips manifest (0.4.0) lists all three.
  - `media.job.proposed|queued|started|retrying|succeeded|failed|cancelled@1`: OpenVibe.Media's job
    transitions (`server/events.js` `recordJob`), one contract each like `tools.job.*`. The payload is
    an event projection of the job (`queue.jobEvent`), every field always present: `id`, `app_id`,
    `object_id`, `type`, `status`, `attempts`, `max_attempts`, `error_code` (the stable code only),
    `cancel_requested`, `has_result`, and `run_after`, `decided_at`, `created_at`, `updated_at`,
    `started_at`, `finished_at` as ISO 8601 UTC (`…Z`) or null. Deliberately left out, because events
    travel beyond the tenant: the tenant's `params`, the caller's `idempotency_key`, the free-text
    `error`, the `result` (a thumbnail URL, of a private VOD too), `created_by`/`decided_by` and
    `owner_user_id` (tenant-local user ids). A consumer GETs the job with a tenant token for those
    (`GET /api/v2/:app/jobs/:id`, unchanged); `has_result` says whether there is a result to fetch.
    `retrying` carries status `queued`, `started` status `running`; `finished_at` is set exactly on
    `succeeded`, `failed` and `cancelled`, `started_at` on everything that ran, `run_after` always on
    `retrying`. No service consumed `media.job.*` before this narrowing. The Media manifest (0.2.0)
    lists them.
  - `live.stream.started@1` and `live.stream.ended@1` (public: stream id, channel username, display
    name, URL and user subject when Live knows it, title, category or null, protocol, NSFW flag,
    times; `ended` adds `ended_at` and `duration_seconds`) and `live.release.deployed@1` (internal:
    head commit, short release, previous head, up to 40 new commits, `deployed_at`, `notes_url`).
  - `network.module.updated@1`: one event per change to a user-module record (write, delete by the
    person or the owning service, account removal, account merge), with the revision after the
    change, the changed field names and only the new values of changed public fields. A deleted
    record carries no values; `merged_into` and `merged_from` mark the two sides of a merge. The
    Network manifest (0.3.0) produces it and consumes `live.stream.started` (go-live notifications).
- `chat.preferences` is owned by `chat` (OpenVibe.Chat since the Wave 6 cutover); the Chat manifest
  (0.4.0) lists it in `namespacesOwned`. `chat.tts_defaults` stays with Live. `modules.namespace@1`'s
  description says what account removal and merge do to a person's records, apart from `onOwnerRemoved`.
- Routes: `host.site.manage` adds the staff takedowns (`POST|DELETE /api/v1/projects/:id/takedown`,
  `POST|DELETE /api/v1/sites/:id/takedown`); `wiki.page.create` adds `POST /api/v1/spaces/:space/import`
  and `wiki.revision.publish` adds `POST /api/v1/pages/:id/revisions/:n/review`.

## 0.31.0 — 2026-09-23

Additive: `compat.js` reports no breaking change against v0.30.2.

- `registry.release-manifest` 1.0.0 → 1.1.0 (ADR-016, roadmap Track R). Six optional fields, so a
  `/release.json` can say what changed and what it still accepts:
  - `components`: `{ <id>: { kind: style|content|script|server, version } }`. A tab applies a release
    in place only when every component that changed is `style`, `content` or `server`. `shell` is the
    catch-all for client code that no other component lists.
  - `assets`: `{ "<logical path>": { url, component, integrity? } }`, the content-addressed URL of each
    asset this release serves.
  - `schema_generation` and `schema_compatible_from` (integers or null): the database schema generation,
    and the oldest generation whose code still runs against it. A rollback below the second is not
    data-safe.
  - `contract_ranges`: `{ <contract id>: { version, accepts: ">=a.b.c <x.y.z", role?: produces|consumes } }`.
    A page from release A works against a server on release B when A's version is in B's `accepts`
    and B's version is in A's `accepts`.
  - `metrics_url`: where tabs POST their update outcome counts (D46).
- A consumer that validates manifests against 0.30.x rejects these fields (`additionalProperties: false`).
  openvibe-shared ≥ 1.5.0 therefore serves only the fields the service's installed openvibe-contracts
  declares. A service starts serving them by moving its pin to this release.

## 0.30.2 — 2026-09-23

- New capability `live.follower.read` (Live, internal): `GET /internal/followers`, used by OpenVibe.Network's
  go-live notifications from `live.stream.started`.
- `chat.message.send` is owned by `chat` (was `live`) and is also implemented by Chat's service API
  (`POST /internal/live/calls`); it moves from Live's manifest to Chat's.
- Live declares `eventsProduced` (`live.stream.started`, `live.stream.ended`, `live.release.deployed`) and
  `eventsConsumed` (`openre.session.*`, `media.vod.*`, `media.clip.*`, `media.storage.*`); Media declares
  its seven `media.*` event types.

## 0.30.1 — 2026-09-23

- `billing.cashout.requested|paid|denied`: `cashout.payout_method` carries the method's `type` only
  (`additionalProperties: false`). The address (e.g. a PayPal email) stays in Billing and never
  travels on the retained event stream. No producer had emitted a cashout event yet.

## 0.30.0 (2026-09-23)

Additive: `compat.js` reports no breaking change against v0.29.0. No existing contract changed.

**Event payload contracts** (ADR-026). Each event type has a contract named after it, with the envelope
`version` as its major: ``contracts.validate(`${env.event_type}@${env.version}`, env.payload)``. The files
are `contracts/events/payloads/<event_type>.v1.json`, and every one has valid and invalid fixtures. The
shapes come from the producers' code.

- Chat: `chat.message.deleted` (`message_ids`, and `redacts: { subject_type: chat_message, subject_ids }`, which is required).
- Tips: `tips.interaction.ready|failed|cancelled`, `tips.goal.updated`, `tips.overlay.delivered|failed`.
- VIP: `vip.plan.published`, `vip.membership.changed`.
- Billing: `billing.transaction.settled|reversed`, `billing.entitlement.changed`,
  `billing.subscription.canceled`, `billing.cashout.requested|paid|denied`, `billing.staff.action`,
  `billing.receipt.external`.
- Wiki: `wiki.space.updated`, `wiki.revision.created`, `wiki.watch.triggered`,
  `wiki.page.published|updated|unpublished|deleted`, `wiki.index_document.upserted|deleted`.
- Blog: `blog.post.created|published|updated|unpublished|deleted`, `blog.schedule.failed`,
  `blog.index_document.upserted|deleted`.
- Sources: `sources.item.created|updated|removed`, `sources.fetch.failed`,
  `sources.index_document.upserted|deleted`.
- Search: `search.document.indexed|removed`.
- Deals: `deals.watch.matched`. Trade: `trade.alert.triggered`.
- **Planned** (catalog status `planned`, not emitted yet): `ai.run.queued|succeeded|failed|cached` and
  `tools.job.created|started|succeeded|failed`. Tools job events carry ids, type, owner, state, times,
  result locations and errors, never inputs, output data, file names or the anonymous session.
- `*.index_document.upserted` payloads are `search.index-document@1`, with the owner and type fixed.

**Redaction** (new ADR-026, linked from ADR-004):

- `events.redaction-directive@1` is `payload.redacts` (`event_ids` and/or `subject_type` + `subject_ids`, up to 1000 each).
- `events.tombstone-payload@1` is what a redacted event's payload becomes.
- The ADR documents 403 `events.redaction_not_allowed`, 422 `events.invalid_redaction` and the realtime
  public replay window (`REALTIME_PUBLIC_REPLAY_SECONDS`, default 300, `gap` reason `public_window`).
- Delivery signature v2 was already documented (ADR-004, README).

**AI** (ADR-015):

- `ai.run-request@1` is the body of `POST /api/v1/runs`, and `ai.run@1` is the run resource.
- `ai.run.create` now declares both as `inputSchema`/`outputSchema`, and `ai.run.read` declares `outputSchema`.

**Manifests**

- Service manifests:
  - chat 0.3.0 produces `chat.message.deleted`.
  - tools 0.3.0 produces `tools.job.*`.
  - network 0.2.0 consumes `deals.watch.matched` and `trade.alert.triggered`.
  - billing 0.3.0 produces `billing.receipt.external`, and tips 0.3.0 consumes it.
  - ai 0.2.0 lists its planned `ai.run.*`.
- Capabilities: `chat.live_bridge.write` lists `chat.message.deleted`, `tools.job.create` lists `tools.job.*`
  and `ai.run.create` lists `ai.run.*`.
- Notes corrected:
  - Wiki is deployed and public at openvibe.wiki.
  - Reviews, VIP and Tips are deployed internally and not launched publicly. Tips also loses the stale "Proposed manifest" line.
- SDK, Shared and Examples are `alpha`, no longer `placeholder`: SDK and Shared are released libraries,
  and Examples is a repository with CI. Realtime is the only placeholder left.

**Tests**

- Every payload contract lives at its event type's path, is listed in its owner's `eventsProduced`, fits in an
  envelope and rejects a tombstone.
- Every consumed event type (wildcards included) has a producing manifest, and each type has one producer.
- The directive's limits are checked.
- Generated TypeScript declares every type it references.
