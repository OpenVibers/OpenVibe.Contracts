# Changelog

## 0.336.0 — 2026-11-07

- The run's options carry the latency class the caller asks for: `interactive` (answer as soon as the provider can),
  `background` (minutes; the run is priced on the cheapest tier that can wait) or `batch` (hours; the run is queued and
  answered through a provider's own batch API). A batch run may also say `deadline_hours` (1 to 72): how long the answer may
  take. The class is the workflow's own (the route's `constraints.latency_class`): a caller may ask for a slower class and
  never for a faster one, and a faster ask is not refused — the run happens in the workflow's own class and says so.
- The run's answer carries `latency_class` (the class the run really ran in), `service_tier` (`standard`, `flex`,
  `batch`, `offpeak`, `local`: the tier it was priced on — the one the provider served or the one the router chose) and
  `latency_clamped` (the class asked for and the class used, when the ask was clamped).
- Add the batches contract: `ai.batch@1`, `ai.batch-item@1`, `ai.batch-create-request@1`, `ai.batch-create-result@1` and
  `ai.batch-read-result@1` for `/api/v1/batches` on OpenVibe.AI. A batch is a queue of many prompts that are answered
  later, at half the retail price; the batch says where it stands, and a prompt that reaches its deadline without cheap
  capacity expires and is never charged.
- Add the grants `ai.batches.create` (open a batch, cancel one) and `ai.batches.read` (read the caller's own batches).
  A first-party service opens a batch on the network's own account with `ai.batches.create`; a person or a developer app
  pays with its own account.


## 0.335.0 — 2026-11-07

- Add `actor.voice@1`: an agent's voice as a file, and nothing else. The document carries the agent's name, a short bio, its instructions (the house voice it speaks in), its rules, its default approval level (`ask`, `auto-edits`, `approve-for-me`, `full` — the levels of `actor.agent@1`), the model it prefers and the connected apps it may use (ids only, never a key), an optional face (an avatar ref), an optional author and a `created_at`. It never carries memory, a connector's token or a file.
- The document carries an **integrity** block, not a signature: `integrity: { alg: "sha256", hash }`, where the hash is the sha256 over the canonical JSON of the document. It shows the file was not edited after it was written. It says nothing about who wrote it: anyone can write a file that names an author and compute its hash, so the author in a document is a claim and the contract says so. Only the service that owns an agent may vouch for its author, in its own record.
- The contract says exactly which fields the canonical JSON holds and in which order, and `created_at` is not one of them. The author may be absent: a document may name nobody.
- Importing a voice makes a new agent at level `ask`, whatever the file says: a borrowed agent starts cautious and the person raises it themselves. Valid and invalid fixtures cover a full voice, a minimal one, a document carrying memory, one carrying a connector's token and one with a level that is not a level.
- Additive only: a new contract and its fixtures; nothing that exists today changes shape.

## 0.334.0 — 2026-11-07

- The `chat` manifest names `openvibe.party`, the Watch Together host OpenVibe.Chat serves beside `openvibe.chat`
  (Party watch v1, plan R1). Chat's service manifest is what services check a party link against: a media party plays a
  Media ref or an https URL on a host a manifest names, so a party started from an OpenVibe page passes and a link to
  somebody else's server does not. The `www.` name only redirects, so it is not listed.

## 0.333.0 — 2026-11-07

- The `network` manifest names the two hosts Network serves since 2026-11-07: `openvibe.my` (the account hub's own home,
  Network#646) and `openvibe.link` (OpenVibe Link's home, Network#644). A service that builds its CORS list or its
  checks from manifest domains (Network's first-party origins, Chat's Bearer-only DM grant, the registry's nightly
  browser check, Space's reserved names) now includes them. The `www.` names only redirect, so they are not listed.

## 0.332.0 — 2026-11-07

- Add `common.control-lease@1`, the shared control lease (seven domains plan B3): the thing a lease controls, its holder (a `person`, an `ai` or `nobody`, with the holder's subject or null), when the holder got the controls, an optional absolute `expires_ms`, the subjects watching and a `seq` that increments on every holder change, expiry or take-back. A watcher-only change does not increment `seq`. The authority that owns the thing enforces the rules; Chat hosts a room's lease, names the thing `chat.room:<slug>` and accepts a control change only from the current holder, while take-back by the room's owner always wins; only the owner hands the remote to an `ai`, and a person holder who leaves keeps it for a minute.
- Add `common.sync-clock@1`, the shared timeline (B4): the room, the media (a Media ref or an https URL; Chat accepts only a host an OpenVibe service manifest names, so Party plays OpenVibe media), the position at `at_ms`, the rate, whether it is paused, who set it and a `seq`. A player computes `position_ms + (authority now - at_ms) * rate` while it plays and `position_ms` while it is paused. Chat stamps `at_ms` and `seq` and stores the latest state in `room_sync_clocks` (the memory copy is the room's live state).
- Valid and invalid fixtures cover a person, AI and free lease, a lease with a time limit, seq zero, a nobody with a subject, a duplicate watcher, a URL and a Media-ref clock, a clock at a rate and paused, an http URL, a bad room and a bad media object.

## 0.331.0 — 2026-11-09

- Add `actor.trigger@1`: a trigger made in an Actor conversation — its `trg_…` id, owner, agent, task, kind (`schedule` or `event`), the plain-language and machine schedule (a five-field cron in the person's timezone) or Watch event pattern and filter, the next run, the last run's result (`ok`, `failed`, `needs_you`), state, why it is paused, the consecutive failure count, the Watch subscription's own state and the ten-minute undo window. Owner-only: another person's trigger is the same 404 as one that does not exist.
- `actor.task-event@2` gains an optional `trigger` and the `trigger` step: the card as it is created, edited, paused, resumed, undone or deleted in the conversation travels with the event, so a reader renders the live card without a second fetch. Additive: an event without one stays valid, and the task record is still the source of truth.
- Additive only: a new contract and an optional field plus one new step value; nothing that exists today changes shape.

## 0.330.0 — 2026-11-07

- Add the `mail` service manifest: `openvibe.email` as the site **Email** (icon `mail`, the shared glyph font's E054), tagline "An address for every sign-up", the receive-only wording, legal profile `service`, and position 7, directly after Chat. It declares exposure `live`/`service`, port 5250, database `ov_mail`, the Stalwart mail server, `/api/health` and `/api/ready`, its shutdown and due-based recovery, an expand-only rollback, and the purge lease.
- Add the two capabilities OpenVibe.Mail's API already checks: `mail.addresses.write` (make and retire a mask; make an agent inbox) and `mail.messages.read` (the person's addresses, message metadata and the newest burner code, never a body). Both are first-party, `owner`-constrained, and name their routes. Their request and result schemas are recorded in `compatibility/capability-schema-gaps.json` for now, like the config.manage capabilities added in 0.315.0.
- The manifest lists no `eventsProduced` yet: the service publishes `mail.mask.created` and `mail.received`, but their payload contracts are not in this release.
- Sites from the old position 7 up move one place (Services becomes 8, … Connect becomes 52) so Email sits beside Chat without breaking the unique-position rule. No contract changes shape; the only data change is the site order.

## 0.329.0 — 2026-11-07

- Add `mail.mask@1`: a per-site address on OpenVibe.Mail that delivers into its owner's OpenVibe mailbox and nowhere else. It carries the `msk_…` id, the owner's Network subject, the `<words>.<four characters>@<mask domain>` address, the person's label and purpose, whether it is enabled (a disabled mask leaves the SQL directory Stalwart reads, so it bounces) and when it was made. M1 is receive-only, so this is metadata: no body, no forwarding target.
- Add `mail.burner@1`: a throwaway receive-only address with its `bnr_…` id, an owner (null for the ten-minute burner made without an account), the eight-character address on a rotating burner domain, the expiry, `first_message_only` and the creation time. The one-time read token a create call returns is deliberately not part of the resource.
- Add `mail.agent-inbox@1`: an agent's address `<agent>.<user>@openvibe.email`, its `agi_…` id, the owner, the cleaned agent id and the creation time. The mail lands in the person's mailbox; one agent has one inbox.
- Add `mail.message-summary@1`: the one shape a list API returns for a message — id, sender addresses, subject and received time. `additionalProperties` is false, so a `body`, `preview` or `html` field fails the contract rather than leaking into an API; the body is read only by the verification-code endpoint, in memory.
- All four are new contracts, not changes to existing ones, and the minor is expand-only. Valid and invalid fixtures cover a disabled mask, a guessed address, an anonymous and a one-message burner, a bad owner or agent id, a non-address, and a summary that carries a body.

## 0.328.0 — 2026-11-07

- Add `actor.assignment@1`: one node of the tree of delegated work (plan §12) — id, root, parent, depth, origin (`person`, `routine`, `outside`), mode (`work`, `consult`, `notify`), reply (`resume`, `poll`, `none`), the agent and task it runs as, the node's level and effective level, the root's budget (limit, spent and remaining), state and timestamps. A node is one hand-off: a person giving Actor a task, a routine or Watch trigger starting a run, an agent handing work to another agent, or Actor starting a Codes or Space task. The effective level is the higher of the agent's own and the one inherited along a person's or routine's line; outside work never passes a level down. A cancel cascades down the tree, and a root's budget stops its children when spent. `GET /api/v1/assignments/:id` answers the node and its children and `POST /api/v1/assignments/:id/cancel` cancels the subtree; both are owner-only and another person gets 404. An existing task gets a root lazily.
- Add the capabilities `actor.assignment.read` and `actor.assignment.cancel`, and name them in Actor's service manifest. They are the two assignment routes above.
- `actor.task-event@2` gains an optional `assignment_id` on a step event, so the Dock's timeline can draw the work tree later. Additive: an event without one stays valid, and the task record is still the source of truth.

## 0.327.0 — 2026-11-07

- One Computer across Surf, Actor and the Dock (plan 2026-11-07: "Surf, Computer and Actor are one experience"): `platform.task@1` gains optional `computer` (`session_id`, `machine`, `where`, `cost_hint`, `driving`) — the browser or desktop session a running task opened, wherever it runs. `session_id` is OpenVibe.Run's `ses_…`; it is null only when the desk runs directly on the person's own machine through OpenVibe.Bot, where there is no Run session. `where` is `yours`, `home` or `network`, and `machine` is the person's own word for it.

[... output omitted ...]

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

[desktop bash output truncated: original_bytes=371779; original head+tail shown. Full output: /tmp/pi-bash-f0f51ba6d74457aa.log]