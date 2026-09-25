# Changelog

All notable changes to `openvibe-contracts`. Releases are git tags (`vX.Y.Z`) that consumers install
from `https://codeload.github.com/OpenVibers/OpenVibe.Contracts/tar.gz/refs/tags/<tag>`. Before v0.30.0,
the notes were in the tag and commit messages (`git tag -n1`).

## 0.50.0 — 2026-09-25

Capability schemas (roadmap WS-C task 4), starting with Search: **`search.query@1`** (the query string of `GET /api/v1/search` and `/suggest`: q, owner, type, lang, facets, limit, cursor, `facet.<key>`), **`search.query-result@1`** (a page of hits the caller may see, `next_cursor`, facet counts; never an ACL or a total) and **`search.write-result@1`** (`PUT /api/v1/documents/…`: applied or unchanged; stale and conflicting revisions are 409 problems). `search.query.run` and `search.query.delegate` name the first two; `search.document.write` names the third as its output. Fixtures for each. Two conventions so every capability can name schemas: **`common.no-body@1`** (a request whose parameters are the path and query) and **`common.binary@1`** (a response of bytes); **`media.file-upload@1`** is the multipart body of `POST /api/v1/:app/files`. The Media and Tools capabilities name them. **A ratchet**: `test/capability-schemas.test.js` fails on an active capability without an input or output schema unless it is in `compatibility/capability-schema-gaps.json` (162 today), and on a listed gap that has been filled; the list only shrinks. Additive.

Every active capability now names both schemas: **the gap list is empty (162 → 0; 178/178 active capabilities complete)**. 275 new request, result and record schemas, each read from the owning service's routes, with valid and invalid fixtures. By owner: **chat** (2: the `/ws/chat` chat frame and its broadcast, the Live bridge batch), **community** (10: paste record, paste create/write/moderate, forum post writes, discussion moderation, Pulse writes), **billing** (19: transaction, balance, cashout, subscription, entitlement and intent records with each capability's request and result), **ai** (7: provider and model records, provider management, usage, template/workflow/route versions), **events** (8: publish result, pull reads and checkpoints, subscriptions, delivery admin), **network** (9), **vip** (26), **tips** (25), **live** (6), **games** (5, including the mod runtime bindings for props and announcements), **openre** (13), **sources** (2), **wiki** (18), **blog** (20), **codes** (2), **host** (10), **news** (24), **reviews** (23), **deals** (15), **coupons** (12) and **trade** (19). Where one capability covers several routes with different bodies, its schema is an `anyOf` of one branch per body. Requests set `additionalProperties: false` only where the service refuses unknown fields. Capabilities whose routes all take no body name `common.no-body@1`. Additive.

Seven older capability schema references are corrected to what the routes take and return. `events.event.read` now answers `events.read-result@1` (was the bare envelope). `codes.release.read` answers the new **`codes.release-read-result@1`** (was `codes.app-manifest@1`). `community.paste.create` answers the new **`community.paste-create-result@1`**. `community.post.create` answers the new **`community.post-write-result@1`**, built on the new **`community.forum-thread@1`** and **`community.forum-post@1`** records (both were `common.entity-ref@1`). `community.pulse.write` takes the new **`community.pulse-write-request@1`** (was `common.entity-ref@1`). `games.mod.manage` takes the new **`games.mod-manage-request@1`**, and `games.mod.read` answers the new **`games.mod-read-result@1`** built on the new **`games.mod-view@1`** (both were `mods.mod-manifest@1`). No contract changes shape; only the capability manifests point elsewhere. Additive.

The remaining references that did not match their routes are corrected the same way (29 new schemas):
- **codes.release.manage** takes **`codes.release-manage-request@1`** (was `codes.app-manifest@1`: the body wraps the manifest with kind, notes and publish; deprecate and revoke take a reason).
- **community.pulse.read**, **community.space.read** and **community.thread.read** answer **`community.pulse-read-result@1`**, **`community.space-read-result@1`** and **`community.thread-read-result@1`**, with the new **`community.pulse-item@1`** and **`community.forum-space@1`** records. Each also covers its HTML pages and RSS feeds. All three were `common.entity-ref@1`.
- **community.comment.write** takes **`community.comment-write-request@1`** and answers **`community.comment-write-result@1`**, with the new **`community.comment-thread@1`** and **`community.comment@1`** records. Both were `common.entity-ref@1`.
- **sources.item.read** and **sources.source.read** answer **`sources.item-read-result@1`** and **`sources.source-read-result@1`**: one branch per route, lists and single records.
- **ai.run.read** answers **`ai.run-read-result@1`**. **ai.run.create** takes **`ai.run-create-request@1`** (a run request, a direct operation's input, citations, or no body) and answers **`ai.run-create-result@1`** (`{ run }` or `{ citations }`, not the bare run), with the new **`ai.run-citation@1`**.
- **events.event.publish** and **events.app.publish** take **`events.publish-request@1`**: one envelope, or `{ events: [...] }` of 1 to 100.
- **identity.subject.resolve** takes **`identity.resolve-request@1`** and answers **`identity.resolve-result@1`** (**`identity.subject-projection@1`**, or `{ results }` for a batch). They were `identity.legacy-identity-map@1` and `identity.subject-ref@1`.
- **network.modules.write** takes **`network.module-write-request@1`** (`{ data }`; the answer stays `modules.module-record@1`).
- **media.object.read** takes no body and answers **`media.file-read-result@1`** (the file's metadata, or its bytes on `/f/:key`). **media.object.upload** answers the new **`media.file@1`** (Media answers a file record, not a `media.media-ref@1`).
- **search.query.run** and **search.query.delegate** answer **`search.read-result@1`**: search, suggestions, or one document. **search.document.write** takes **`search.document-write-request@1`** and answers **`search.owner-result@1`**: write results, reconciliation pages, the stored document, rejections.
- **tools.tool.read** answers **`tools.tool-read-result@1`** (the list, one tool, or its schema document). **tools.job.create** takes **`tools.job-create-request@1`**: retry and references take no body. **tools.job.read** answers **`tools.job-read-result@1`**: the job, or a result file's bytes. The Tools assertions in `test/run.js` name the new ids.

No existing contract changes shape; only the manifests point elsewhere. Additive.

## 0.49.0 — 2026-09-25

Platform blocks (roadmap WS-E task 5). **`network.block.changed`**: a person blocked or unblocked someone (`blocker`, `blocked`, `active`, a per-pair `revision`); Network keeps the blocks, keyed by subjects, and Chat and Community consume the event. New capability **`network.blocks.read`** (first-party, never for apps): `GET /internal/blocks?subject=` lists who a person blocked and who blocked them. Fixtures for a block and an unblock. Additive.

## 0.48.0 — 2026-09-25

**Correction to 0.47.0.** `network.grant.changed` was already emitted by Network's developer event relay for a developer app's grant, and OpenVibe.Events acts on it (it stops an app's subscriptions when its `events.app.subscribe` grant leaves approved). 0.47.0 gave that event a service-principal payload that does not match. Now `network.grant.changed` describes what is actually sent: `{ project_id, capability, audience, from, to }`, subject `app`. A first-party service principal's grant change is the new **`network.principal_grant.changed`** (the 0.47.0 payload under its own name). Nothing consumed the 0.47.0 shape. The compat gate records this in `compatibility/corrections.json` (accepted against v0.47.0 only).

## 0.47.0 — 2026-09-25

**`network.grant.changed`** gets a payload contract (roadmap WS-D task 3; corrected in 0.48.0: that shape is `network.principal_grant.changed`): a service principal's capability grant was given, changed (namespaces or expiry), revoked by the owner, or expired, with actor and reason. Network writes it beside an audit row in the transaction that changes the grant; the seeded defaults are not announced. New capability **`network.staff.read`** (active, first-party, never grantable to apps): list the network's staff with their roles and staff-map capabilities, `GET /api/v1/staff/moderators` (WS-D task 4). Fixtures for a grant and an expiry. Additive.

## 0.46.0 — 2026-09-25

**`live.moderation.action`** (ADR-022, roadmap WS-D task 1): a staff or channel-moderator action taken on OpenVibe.Live outside chat (site, global and IP bans, message deletes and purges from the admin panel, a stream force-ended, relay users hidden, channel moderators added or removed), with the same payload as `chat.moderation.action`. Events requires an event's prefix to match its source, so Live cannot send Chat's event for its own admin actions. OpenVibe.Network consumes it into the moderation audit log. The live manifest produces it and the network manifest consumes it. Fixtures cover a site ban and a force-ended stream. Additive.

## 0.45.0 — 2026-09-25

**`live.index_document.upserted|deleted`** also carry Live's public VOD and clip pages (types `vod` and `clip`, id = the Media id, canonical `openvibe.live/vod/<id>` and `/clip/<id>`), alongside channels. Live owns those canonical pages (title, channel, AI overview, transcript), so Live sends their Search documents. `media.index_document.*` is only for VODs and clips whose canonical page is on openvibe.media (apps other than Live), the same rule as Media's sitemap. Fixtures for a VOD, an AI clip (noindex) and a VOD tombstone. Additive.

## 0.44.0 — 2026-09-25

Search documents from three more owners (roadmap WS-O task 10): **`live.index_document.upserted|deleted`** (a streamer's channel page, type `channel`), **`media.index_document.upserted|deleted`** (public, playable VODs and clips, types `vod` and `clip`) and **`community.index_document.upserted|deleted`** (public forum threads and public pastes, types `thread` and `paste`). They use the same shape as the Wiki, Blog, News and other owners' index events: the `search.index-document@1` document, or a tombstone `{ type, id, revision }`. OpenVibe.Search consumes them through `*.index_document.*`. The live, media and community manifests list them. Fixtures cover the Live payloads. Additive.

## 0.43.0 — 2026-09-25

**`network.user.updated`** (roadmap WS-B task 2). A person's whole current profile after any change that other services may know about: username, display name, picture, colour, role or ban. The payload carries a `revision` and the list of what `changed` (`created` for a new account). Consumers keep a projection by writing the newest over what they have: roles apply in both directions, and a ban arrives even for someone who never comes back. Network produces it and Live consumes it (Live's `subject_projection`, replacing the `/internal/user-role` push). Fixtures cover valid and invalid payloads. Additive.

## 0.42.0 — 2026-09-25

The service manifests carry what Network's registry and site list used to hard-code (roadmap WS-C task 1, "manifest-derived registry"):

- **`internalOrigin`**: the loopback address a running service answers on, which the registry polls. An `OV_<ID>_INTERNAL_URL` loopback override can still replace it.
- **`exposure`**: where the service can be reached today. `state` is live, internal, library, repository, placeholder or retired; `publicSite` says what the public domain answers (the service, a placeholder, or nothing); there is an optional `note`; libraries also give `package` and `repo`. This is separate from `status` (maturity).
- **`site`**: how a site is presented, with `name`, `icon`, `tagline`, `what`, `legalProfile` (the legal wording of /terms, /privacy, /dmca), `position`, and `host` for a site without a public origin. A service without `site` is not a site.
- **`ready`** is added to the network, media and games manifests (`/api/ready`).

The values are exactly what Network hard-coded. A service going public is now one manifest edit here. The test requires every first-party manifest to have an exposure, every running service to have a unique loopback port, libraries to name their package and repository, and site positions to be unique. The additions are optional in the schema, so this release is additive.

## 0.41.1 — 2026-09-25

Plain-language descriptions for `ai.preferences`, `chat.preferences`, `games.progress.summary` and `live.profile`. my.openvibe.network now shows these descriptions to people on its AI & Data tab. No schema change.

## 0.41.0 — 2026-09-25

User modules, the rest of D06 (roadmap WS-B task 9):

- **Field-level read rules.** A namespace may list `readers`: `{ service: [fields] }`. A service other than the owner that reads a record (with `network.modules.read`) sees only the public fields and the fields listed for it. `modules.serviceView(namespace, service, data)` applies the rule; Network's service read applies it.
- **Version migration.** A namespace may list declarative `migrations` (`{ from, to, rename, drop, defaults }`). `modules.upgrade(namespace, data, version)` brings a stored record to the current version. Network upgrades a record when it is read and stores it at the current version on the next write. The contract test requires a path from every earlier version.
- **New namespaces:**
  - `chat.dm_settings`: new conversations from everyone or nobody, group invites, previews;
  - `chat.presence_prefs`: whether the person is named in chat user lists;
  - `live.stats`: 30-day streaming summary;
  - `ai.usage_summary`: 30-day AI runs on the person's behalf;
  - `community.profile`: threads, posts, comments, pastes, first and last activity;
  - `wiki.projects`: spaces the person owns or edits, where only public ones are named.
- **`chat.tts_defaults` v2**, now owned by Chat. Its fields are the settings Live's chat panel actually has: `send`, `send_while_live`, `volume`, `sounds`, `sound_volume`, `sources`. v1 (voice, rate, muted) was never written, and a v1 record upgrades to an empty v2 record.
- **`tools.usage` v2** adds `favorites` (unique tool ids, at most 24). The person may write it; every v1 record is valid v2.
- **`ai.preferences`** is readable by `ai` (all five fields).
- The chat and ai service manifests list their new namespaces.

## 0.40.0 — 2026-09-24

The chat manifest names its own domain: **openvibe.chat** (`domains`, `publicOrigin`). OpenVibe.Chat serves the site itself (global chat, messages, settings, sign-in with the Network), and Network's first-party CORS list, which comes from these manifests, now includes it. Additive.

## 0.39.0 — 2026-09-24

**`network.user.token_valid_after`** (revocation propagation, roadmap WS-B task 4): when a person's tokens stop being good (a password change or reset, sign out everywhere, a ban, an account deletion or staff ending their sessions), Network moves their cutoff and emits this event in the same transaction. Every service that accepts Network user tokens refuses one whose `iat * 1000 < Date.parse(valid_after)` (Network's own rule), drops what it cached for those tokens and closes the sockets they opened. Consumers keep the latest cutoff per subject. Network produces it; Chat, Community, Live, Media, Tools and Games consume it. Fixtures cover valid and invalid payloads. Additive.

## 0.38.0 — 2026-09-24

Staff map 1.1.0 (ADR-022), so the content products and Games can check staff capabilities instead of comparing role names:

- **`staff.content.moderate`** (global_mod): moderate what people publish on Blog, Deals, Coupons, Codes and Host.
- **`staff.editorial.manage`** (admin): the network's own publications: the official blog and wiki spaces, News stories, Reviews entities, Trade context, Coupons merchants.
- **`staff.games.manage`** (admin): the Games map editor and mod administration.
- **`since` and the `staff_map` claim.** Capabilities record the map version that added them, and Network issues `staff_map` with `staff_caps`. `staff.can()` judges a capability newer than a token's map by the token's role, so an addition reaches existing tokens (which live for days) at once. What a token was issued still wins for everything its map knew.

Additive.

## 0.37.0 — 2026-09-24

`network.integration.github.read` (first-party only) lets a service read the network's GitHub API token. The owner sets the token in Network's admin panel, or in `GITHUB_TOKEN`. OpenVibe.Blog's network changelog uses it, so its GitHub calls do not share the host's anonymous rate limit. It is never granted to apps or mods. Additive.

## 0.36.0 — 2026-09-24

The moderation audit log (ADR-022):

- **`chat.moderation.action`** now has a payload contract, matching what OpenVibe.Chat already sends for chat and Live moderation.
- **`community.moderation.action`** is new: staff actions on other people's content in Community.

OpenVibe.Network's manifest consumes both, plus `tips.interaction.moderated` and `billing.staff.action`, for the audit log staff can read in admin. Fixtures cover valid and invalid payloads. Additive.

## 0.35.0 — 2026-09-24

- OpenVibe.Community publishes events: `community.paste.created|updated|deleted`, `community.thread.created`,
  `community.post.created`, `community.comment.created` (payload contracts with fixtures; the community manifest
  0.2.0 lists them). Payloads carry ids, owner or author subject, visibility and the public URL, never a body,
  title or content: consumers (Search, Pulse, Live's Content feed) read the item itself.

## 0.34.3 — 2026-09-24

- `openvibe-contracts-check` skips `*.test.*` and `*.spec.*` files: tests mint tokens carrying other owners'
  capabilities on purpose, and repositories that keep tests next to the code (Games) could not run the check.

## 0.34.2 — 2026-09-24

- Fixture fix: the valid mod-manifest 1.1 example (`market-stall-1.1.json`) asked for the first-party
  `vip.entitlement.check`, which is never granted to apps or mods; it now asks for the public `vip.perk.list`.

## 0.34.1 — 2026-09-24

- `tools.tool.run` and `tools.net.probe` are **active**: the run API (`POST /api/v1/tools/:id/run`) and the gateway
  jobs facade shipped in OpenVibe.Tools 5ac8309 and are deployed. The SDK v0.6.0 tools client passes against them.
- `tools.run@1` lists the problem codes the run API emits beyond 0.33.1's: tools.input.too_large (413),
  tools.run.timeout (504), tools.origin.refused (403), tools.session_required (401), tools.run.file_not_found (404),
  tools.run.failed (500). Additive; no schema change.

## 0.34.0 — 2026-09-24

Additive: `compat.js` reports no breaking change against v0.33.1. Closes the Contracts rows of the
roadmap completeness audit (§28.3, §30.2, W1 D7, W12, W22).

**51 event payload contracts**, all `active`: every one is emitted by its producer's code today.
Each was read from the emitter and its call sites. News, Reviews and Deals were also checked against
envelopes captured from their own code, and Trade against its one production outbox row.

- News (11): `news.source.ingested|failed`, `news.cluster.updated`,
  `news.story.created|flagged|published|updated|unpublished|retracted`, `news.index_document.*`.
- Reviews (9): `reviews.entity.merged|split`, `reviews.signal.added|removed`,
  `reviews.summary.published|updated|unpublished`, `reviews.index_document.*`.
- Coupons (8): `coupons.coupon.created|updated|expired|disabled`, `coupons.report.created`,
  `coupons.confidence.changed`, `coupons.index_document.*`.
- Deals (6): `deals.offer.created|updated|expired`, `deals.vote.changed`, `deals.index_document.*`.
- Trade (5): `trade.observation.created`, `trade.source.stale|recovered`, `trade.index_document.*`.
- Games (10): `games.player.joined|left`, `games.skill.leveled`, `games.blueprint.unlocked`,
  `games.world.saved`, `games.mod.installed|enabled|disabled|grants_changed|revoked`.
- Media (2): `media.object.deleted` and `media.object.visibility_changed` (OpenVibe.Media 039dc48).
  Triggers stage them in the transaction that changes the object, and the outbox writes them there.
  They carry identity and state only: never the title, owner, storage keys or size. A
  visibility change never repeats the value. The media manifest now lists both.

Every `*.index_document.upserted` is a `search.index-document@1` with the owner fixed. Every
`.deleted` is a `{ type, id, revision }` tombstone.

Community lists no `eventsProduced`, because it emits nothing yet, so there is no `community.*`
contract. 29 listed events still have no contract:

- chat: 3
- codes: 3
- host: 4
- media: `vod.*`, `clip.*`, `object.uploaded` and `storage.*`, 7 in all
- network: 5
- openre: 7

Found while reading the producers (fixes belong in those repos):

- **News drops some flag events.** `stories.js:238` sends `priority: 'normal'` for `source_updated`
  flags. The envelope allows only `critical|important|low`, so Events refuses them.
- **Coupons can publish service notes.** A calling service's note is copied into the public event's
  `reason`.
- **Deals under-reports changes.** On the importer paths, `changed` can leave out a `product_id` or
  `expires_at` change.

**ADR amendments** (dated 2026-09-24):

- **ADR-003, delegated authorization.**
  - Who may name the acting person, and the rule that a call gets the intersection of the app's
    grants, the approved scopes and the person's own rights.
  - Staff power and money are never delegated. Tokens last 5 minutes and cannot be refreshed. Audit
    names both the app and the person.
  - The approval UX in force today, and what Network still owes: the capability list on the chooser,
    stored authorizations, and connected apps with revoke.
- **ADR-006:**
  - four placement classes: canonical, hot cache, asset origin, local scratch;
  - `local` as the first-class dev provider;
  - the infrequent-access tier deferred at 2,839 objects / 481 GB.
- **ADR-007:**
  - PgBouncer transaction pooling;
  - replicas only for reads that tolerate lag;
  - SERIALIZABLE plus ordered row locks and 40001 retries on money paths;
  - Redis never authoritative.
- **ADR-012:**
  - The roadmap's ledger names mapped to Billing's transaction types and legs: platform fee,
    creator earning, payout hold and release, compensating reversals.
  - OpenCoins stays in Network. This supersedes the Wave 8 line "Network's OpenCoins wallet becomes
    a Billing client".
  - Billing's `cashouts`, reversal transactions and VIP plans replace the roadmap's `payouts`,
    `refunds` and `plans` tables.
- **ADR-013:**
  - Package signing and review are named as open owner decisions.
  - Mod monetization goes only through Billing and VIP primitives.
  - The manifest 1.1.0 fields (below).
- **ADR-021, extraction decided.** There is no analytics service. Analytics stays per service through
  `openvibe-shared/analytics`, and the schema stays in Shared. The decision rests on measured volume:
  Live has 1.78M raw events in 30 days (58k a day, 502 MB). The ADR names the triggers for a revisit.
- **ADR-022, the Wave 12 revisit.** The decision stands. The ADR names the trigger for the next
  revisit.

**Realtime is `retired`** (ADR-005), not a placeholder. A retired manifest offers no domain,
capability, event, namespace or health path.

**Staff capability map** (W1 D7, ADR-022): a new contract, `policy.staff-role-map@1` (owner `network`), and the map
in force, `manifests/policy/staff-roles.json`.

- **Roles:** `user < streamer < global_mod < admin < owner`. `owner` is never a stored role: it is
  `role: admin` plus the `is_owner` claim. `user` and `streamer` hold no staff capability.
- **32 `staff.<area>.<action>` capabilities**, each with the lowest role that holds it:
  - 12 for `global_mod`, including `staff.moderation.chat|calls|channels|bans|ip|logs|bypass|pastes|discussions`,
    `staff.content.view_private` and `staff.content.hide`;
  - 15 for `admin`, including `staff.users.manage`, `staff.roles.assign`, `staff.site.view|configure`
    and `staff.streams.end|manage`;
  - 5 for `owner`: `staff.roles.grant_admin`, `staff.secrets.manage`,
    `staff.money.freeze|cashouts` and `staff.loyalty.grant`.

  Each lists the file:line role checks it replaces in Live (210 sites inventoried), Chat, Community,
  Network and Billing.
- **Local powers:** channel and self powers stay with the product and are not staff capabilities.
  They are listed under `local`.
- **Claims** that Network issues: `role`, `is_owner` and `staff_caps`.
- **Rules** that a capability alone does not express:
  - rank and owner protection;
  - no staff power in service, app or mod tokens, and none through delegation;
  - vouching only with the moderate capability;
  - roles change only in Network;
  - every action is reported to the moderation log.
- **`contracts.staff`:** `roles`, `effectiveRole`, `atLeast`, `capabilitiesOf` and `can`. Issued
  `staff_caps` win over the role. A family grant (`staff.moderation.*`) stays inside one area, and
  there is no `staff.*` wildcard.
- **Adoption comes later:** Network issuing the claims, and Live, Chat and Community replacing
  their raw role checks.

**Capability catalog gaps** (roadmap §30.2), 15 capabilities checked against each service's routes
and production:

- **Active:** public reads that production serves to anyone:
  - `live.channel.read`, `live.stream.read` and `live.discovery.read`;
  - `community.space.read`, `community.thread.read` and `community.pulse.read`;
  - `search.query.run`: the public index query, suggest and document read. Service tokens keep using
    `search.query.delegate`.
- **Planned:** each names its current routes and the id that guards them today:
  - `live.owner.resolve`: there is no public route yet; `live.lineage.resolve` stays internal;
  - `media.upload.create`, `media.derivative.create`, `media.derivative.read`,
    `media.lifecycle.read` and `media.lifecycle.transition`: Media's guard checks
    `media.object.upload` / `media.object.read` until it accepts these ids;
  - `community.space.manage`;
  - `community.vote.set`: value 0 removes a vote, so there is no `vote.remove`.
- **New `publishing` library manifest** (openvibe-publishing v0.2.1, ADR-019), with no `publishing.*`
  capability. A package has no grant boundary, and the product capabilities (`wiki.*`, `blog.*`,
  `news.*`) already cover those routes. Network's registry-exposure test needs a `publishing` entry
  before Network moves to this release.

**`mods.mod-manifest@1` 1.0.0 → 1.1.0** (roadmap §28.3 m6). Every 1.0.0 manifest stays valid. The new
fields are all optional:

- `permissions.readGrants` / `writeGrants` split namespace access into read-only and read-write.
- `billingHooks`: `[{ kind: entitlement|checkout, key, description? }]`, never a price.
- `dependencies`: `[{ id: mod_…, version: <range>, optional? }]`.

Games still validates a local 1.0.0 copy.

**Manifests:** the Deals notes now say that Network consumes `deals.watch.matched`.

## 0.33.1 — 2026-09-23

Additive: `compat.js` reports no breaking change against v0.33.0.

Follow-ups to the Tools registry, which OpenVibe.Tools now serves in production (`GET /api/v1/tools`,
`/api/v1/tools/:id` and `/api/v1/tools/:id/schema` on openvibe.tools and every satellite).

**Capabilities and manifests**

- `tools.tool.read` is `active` (it was `planned`). The gateway answers for all 169 tools, and the img,
  audio, docs, text, yt, maps and food satellites answer for their own. Its description now says what
  the routes answer: CORS for any origin, ETag and 304, `$defs.input: false` for a tool without an API,
  `400 tools.query.invalid` and `404 tools.tool.not_found`.
- `tools.tool.run` and `tools.net.probe` stay `planned` until Tools serves the run API.
- Tools 0.4.1: its notes say the registry is served.

**`tools.tool@1` 1.0.0 → 1.1.0.** Two optional fields, so every v0.33.0 descriptor stays valid:

- `keywords`: the catalogue's search terms (`GET /api/catalog.json` `tools[].keywords`), which
  `GET /api/v1/tools?q=` matches beside the id, name and summary. Unique, trimmed, non-empty phrases.
- `examples`: `[{ title?, input, files?: [{ name?, mime, url? }] }]`, sample runs that the docs and the
  generated OpenAPI document will publish. Each input is valid against the tool's input schema. The
  schema refuses examples on a tool without an API.

The descriptions now also say:

- `output.schema` describes `result.data` whatever the execution. For a job tool, that is the data of
  the run's result and of its job's result, which are the same object.
- `GET /api/v1/tools/:id/schema` has `$defs.input: false` when `api` is false.
- There is no `planned` status. A planned catalogue entry is not a tool: it has no descriptor and is
  not listed. Neither is a mirror (a second build of another tool). Both answer
  `404 tools.tool.not_found`, with a detail that says the id is planned or names the tool it mirrors.
  `tools.tool-list@1` says the same, and that `family`, `execution` and `status` take comma lists.

A consumer that validates descriptors against v0.33.0 refuses `keywords` and `examples`
(`additionalProperties: false`). Tools should start serving them only after it moves its pin to this
release, and so should any service that validates descriptors it reads.

**`contracts.tools.checkDescriptor`** now checks each example:

- its input against the tool's input schema, when the schema is embedded (errors point at
  `/examples/<i>/input/…`);
- its size as JSON against `limits.maxInputBytes`;
- its files against `files`: the count within `min` and `max`, and each `mime` allowed by `accept`
  (`image/*` takes `image/heic`).

An input given as `{ $ref }` (the list form) is not fetched, so its examples are checked where the
schema is embedded: `GET /api/v1/tools/:id` and the Tools registry test. When there are examples to
check, an embedded input schema that does not compile is reported. All 169 of Tools' current
descriptors pass, and so do they with their catalogue keywords and their own example inputs added.

**Problem codes Tools emits.** They are listed with the routes that answer them, as every service's are
(`errors.problem@1` carries any code).

- Registry (`tools.tool@1`, `tools.tool-list@1`, `tools.tool.read`):
  - `400 tools.query.invalid`: an unknown `execution` or `status` value, or an `api` that is not
    `true` or `false`;
  - `404 tools.tool.not_found`: an unknown id, and a planned or mirror id, with a detail saying which.
- `tools.run-request@1` and `tools.job-request@1`:
  - `503 tools.unavailable`: a program or upstream the tool needs is missing. A job submission is
    refused then, rather than failing later. `503 tools.tool.unavailable` is still the run API's
    refusal for a tool whose descriptor status is `unavailable`.
  - Coming with the shared guard, not emitted yet: `429 tools.quota.exceeded` (the caller's allowance
    in the quota class is spent) and `503 tools.busy` (every slot for that kind of work is taken).
    Both carry `Retry-After`. The run request still lists `quota.exceeded` beside the new code.
- Codes a tool chooses, carried as the error of a failed run or job (`tools.run@1`, `tools.job@1`,
  `tools.job.failed`): `413 tools.pdf.too_many_pages` (over `limits.maxPages`) and
  `422 tools.pdf.wrong_password`.

**Fixtures and tests**

- The valid png, dns, jsonminify and port descriptors carry keywords and examples, and the list fixture
  carries keywords.
- New invalid descriptors: an example whose input the tool's schema refuses, an example file that
  `files.accept` does not allow, examples on a page-only tool, and a blank keyword.
- `test/run.js` checks the `tools.tool` and `tools.tool-list` fixtures with `checkDescriptor` and
  `checkList`, not only the schema, so an invalid fixture can break a rule that JSON Schema cannot
  express. It also checks:
  - that a v0.33.0 descriptor, without the new fields, is still valid;
  - each example rule;
  - that `tools.tool.read` is `active` while the run capabilities stay `planned`;
  - that there is no `planned` status;
  - that each new code is a valid problem code and is listed with its status;
  - that `tools.quota.exceeded` and `tools.busy` carry `Retry-After`.

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
