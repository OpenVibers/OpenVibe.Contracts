# Changelog

All notable changes to `openvibe-contracts`. Releases are git tags (`vX.Y.Z`) that consumers install
from `https://codeload.github.com/OpenVibers/OpenVibe.Contracts/tar.gz/refs/tags/<tag>`. Before v0.30.0,
the notes were in the tag and commit messages (`git tag -n1`).

## 0.122.1 — 2026-10-09

- `manifests/services/inventory.json`: the site's icon is `inventory`. A site's id is its icon (Network's Frame builds
  the site list from it), and `games` collided with OpenVibe.Games.

## 0.122.0 — 2026-10-09

**OpenVibe.Inventory goes live (ADR-054, plan T21 step 2).**
- `manifests/services/inventory.json`:
  - status alpha, exposure `live` with `publicSite: service`, at site position 30 (Inventory);
  - its lifecycle, health, ready and internal origin (127.0.0.1:5030);
  - it consumes the two account events and owns `inventory.*`.
- Six capabilities are active, each naming its routes: `inventory.item.read`, `inventory.item.list`,
  `inventory.equip.manage`, `inventory.item.grant`, `inventory.item.consume` and `inventory.definition.manage`.
  `inventory.definition.review` stays planned until creator submissions open.

## 0.121.0 — 2026-10-09

**The OpenVibe inventory, decided (ADR-054, plan T21 step 1).** A new authority, OpenVibe.Inventory, will own items
across the network: kinds, definitions, instances, the equipped set and an append-only ledger.
- `docs/adr/ADR-054-inventory-authority.md` (accepted):
  - service `inventory`, `ov_inventory`, loopback 5030, `inventory.openvibe.network`;
  - issuers grant within their namespace;
  - nothing is sold, bought, traded or converted until a later money ADR (ADR-012, ADR-025);
  - Live's cosmetics become the first kinds, migrated convert-verify-delete.
- `manifests/services/inventory.json` (placeholder), with seven planned capabilities: `inventory.item.read`,
  `inventory.item.list`, `inventory.equip.manage`, `inventory.item.grant`, `inventory.item.consume`,
  `inventory.definition.manage` and `inventory.definition.review`.
- Schemas, with fixtures: `inventory.kind@1`, `inventory.definition@1`, `inventory.instance@1`,
  `inventory.inventory@1`, `inventory.equipped@1`, `inventory.equipped-batch@1`, `inventory.grant-request@1`,
  `inventory.equip-request@1` and `inventory.definition-request@1`.
- Events: `inventory.item.granted`, `inventory.item.consumed`, `inventory.item.revoked`, `inventory.item.equipped`,
  `inventory.item.unequipped` and `inventory.definition.published`.

## 0.120.0 — 2026-10-09

**Account export and deletion everywhere a person has rows.** Nine more services declare the two account events.
- `deals`, `trade`, `tips`, `vip`, `watch`, `services`, `wiki`, `blog` and `bot` consume
  network.account.export_requested and network.account.deleted (openvibe-sdk/account-data, SDK 0.37.0). Their startup
  recovery names the redelivery. Codes holds no personal rows since its console moved to Services, so it declares none.

## 0.119.0 — 2026-10-08

**OpenVibe.MediaHub goes live: openvibe.download as a private drive.** Account export and deletion are declared for the
six services that answer them.
- `manifests/services/media-hub.json`: status alpha, exposure `live` with `publicSite: service`, its lifecycle, health,
  ready and internal origin (127.0.0.1:4990). It consumes the two account events. openvibe.pics and openvibe.video
  answer with coming pages, and the video.*, pics.* and download.* capabilities stay planned.
- `food`, `help`, `work`, `quest`, `rent` and `actor` consume network.account.export_requested and
  network.account.deleted (openvibe-sdk/account-data, SDK 0.36.0), and their startup recovery names the redelivery.

## 0.118.0 — 2026-10-08

**The forum returns to OpenVibe.Community** (owner decision 2026-10-08: Space becomes code hosting and "spaces";
the vBulletin/phpBB-style forum lives on openvibe.community again, plan T20). The mirror of 0.110.0, which moved it
the other way.
- `manifests/services/community.json`: the forum is Community's again — `community.space.read`,
  `community.space.manage`, `community.thread.read` and `community.post.create` are back in its capability list,
  `community.thread.created` and `community.post.created` back in its `eventsProduced`, and its notes, its Discord
  relay drain and its Roadmap-space recovery describe the forum it serves.
- Those four capabilities are active again with Community's routes (`GET /s`, `GET /s/:space`,
  `GET /s/:space/t/:slug`, `GET /s/feed.xml`, `GET /api/v1/spaces/:space/threads`, `POST /api/v1/spaces/:space/threads`,
  `PUT /api/v1/spaces/:space/members-only`, …). `community.vote.set` names its thread and comment vote routes again,
  guarded by `community.post.create` and `community.comment.write`; `community.space.manage` is the one active grant
  without schemas, so `compatibility/capability-schema-gaps.json` lists it where `space.forum.manage` used to be.
- The seven `community.*` forum schemas and the two event payloads are active again with their fixtures. The `space.*`
  ones (`space.forum-space/thread/post`, `space.forum-read-result`, `space.thread-read-result`,
  `space.post-write-request/result`, `space.thread.created`, `space.post.created`, `space.moderation.action`) are
  retired and kept loadable, and `compatibility/deprecations.json` names each Community replacement with a window
  through 1.0.0. The Community records those replacements had are gone.
- `manifests/services/space.json`: no forum capability or event, and the site block and notes say Space is code
  hosting, with "spaces" (apps that use your OpenVibe account and the SDK) coming next, and that its former `/s/*`
  paths redirect permanently to openvibe.community. Exposure stays live (Space serves a home); its lifecycle drops
  the forum's work (Discord relay, Roadmap resync, events outbox) and keeps what runs.
- `manifests/services/quest.json` counts `community.thread.created` and `community.post.created` again;
  `manifests/services/network.json` consumes `community.moderation.action` and no longer `space.moderation.action`.
- Space ends with no active capability, so `generated/openapi/space.json` is gone.
- Generated bundles, types and OpenAPI documents are refreshed for 0.118.0.
- `manifests/services/space.json` consumes no events: Space's account export and deletion hooks only ever touched the
  forum tables (the forum's account data is Community's), so Network stops waiting for Space's part.
- `manifests/services/deals.json`: exposure `live` with `publicSite: service` — OpenVibe.Deals serves openvibe.deals
  (472 DealNews offers with their links kept verbatim and attributed, community votes and watches).
- Product copy for the services that launched this week: OpenVibe.Food, Help, Work, Quest, Rent and Watch describe
  what is live now and what comes next, and each gets the common questions OpenVibe.Help shows.

## 0.117.0 — 2026-10-08

**OpenVibe.Quest and OpenVibe.Rent become services; OpenVibe.Watch goes live with its public site** (plan T18 step 8,
T19).
- `manifests/services/quest.json` (port 4980, `openvibe.quest` live, site position 27): the shared quest log, counted
  from the domain event types it consumes through OpenVibe.Events; badges, and OpenCoins through Network when switched
  on. No capabilities: a quest log is a person's own.
- `manifests/services/rent.json` (port 5010, `openvibe.rent` live, position 28): listings people post, safety rules,
  reports and a staff queue. No capabilities yet.
- `manifests/services/watch.json` 0.2.0: exposure `live` with `publicSite: service` (sign-in and watch management on
  openvibe.watch), its real lifecycle (25 s shutdown, schedule and outbox recovery), health, ready, internal origin and
  site block (position 29).
- The three product manifests point at their services.

## 0.116.0 — 2026-10-08

**OpenVibe.Food, OpenVibe.Help and OpenVibe.Work become services** (plan T19 "flesh the network out"; owner 2026-10-08).
- `manifests/services/food.json` (port 4970, `openvibe.food` live, site position 24): food banks and budget grocers
  near you from OpenStreetMap (ODbL attribution on every answer), the budget food list, meal plans and a pantry.
- `manifests/services/help.json` (port 5020, `openvibe.help` live, position 25): the network's help centre built from
  this repository's catalog, and support tickets. No capabilities: a ticket is a person's own.
- `manifests/services/work.json` (port 4960, `openvibe.work` live, position 26): job listings from open job boards with
  their provenance (excerpt only, original linked), search and saved searches. No capabilities yet.
- Capabilities (audience `openvibe.food`): `food.plan.write` (sensitive), `food.plan.read`, `food.pantry.write`
  (sensitive), `food.pantry.read`; the place search and the food list are public reads with no capability.
- Schemas: `food.plan-create-request@1`, `food.plan@1`, `food.plan-result@1`, `food.pantry-request@1`,
  `food.pantry-result@1`.
- The three product manifests point at their services.

## 0.115.0 — 2026-10-08

**OpenVibe.Actor becomes a service** (plan T17, ADR-044; owner direction 2026-10-08: Actor is OpenVibe's own general agent
and the router for agent work, "like OpenRouter but for agents").
- `manifests/services/actor.json`: `actor`, port 4950, `openvibe.actor` live with `publicSite: service`; site block
  "Actor · Your agent for everything" (position 23). The product manifest now points at the service.
- Capabilities (audience `openvibe.actor`): `actor.task.create` (POST /api/v1/tasks, cancel; sensitive),
  `actor.task.read` (a task and its live stream), `actor.task.list`, and the public `actor.agent.read` (the agent
  catalog with rate cards, and a dry-run route that explains which agent a task would go to).
- Schemas: `actor.task-create-request@1`, `actor.task-event@1` (the SSE stream: state, output, end, resumable by
  seq), `actor.task-list-result@1`, `actor.agent-list-result@1` (kind, trust, what it can do, rate card, availability).
- `platform.task@1` is active and Actor implements it. Additive: `project_id` is optional (a person's own task has
  none), and a new optional `error` { code, detail } says why a task failed.

## 0.114.0 — 2026-10-08

**Developer links point at OpenVibe.Services.** Manifest text only; no schema, capability or event changed. The
developer console moved from openvibe.codes to openvibe.services in 0.113.0, so these links follow:
- the Host site's "Build on OpenVibe" link;
- the "meanwhile" links of openvibe.website, api.openvibe.network, openvibe.events (to the Events API reference) and
  openvibe.actor;
- the "build on it" cards of openvibe.bot and openvibe.actor.

openvibe.codes now answers those paths with permanent redirects.

## 0.113.0 — 2026-10-08

**The developer portal moves from OpenVibe.Codes to OpenVibe.Services; Codes becomes the open coding-agent harness**
(owner decision 2026-10-08; plan T13 and T16 notes). Codes' portal data in production is empty, so the names move at once.
- New in Services' namespace: `services.release.read` and `services.release.manage` (audience `openvibe.services`), the
  schemas `services.app-manifest@1`, `services.release@1`, `services.release-read-result@1`,
  `services.release-manage-request@1`, `services.release-manage-result@1`, the event payload `services.moderation.action@1`
  and the events `services.app.published|deprecated|revoked`. They are the `codes.*` ones under the new owner and audience.
- Retired, kept loadable: `codes.release.read`, `codes.release.manage`, `codes.resource.read` and the six `codes.*` schemas
  (`compatibility/deprecations.json` names each replacement). Network consumes `services.moderation.action`.
- `manifests/services/services.json`: live with `publicSite: service`; it owns manifests, releases, trust tiers and
  playground logs (kinds `services.manifest` `mfs_`, `services.release` `rel_`) besides the merged index; its site
  block is the developer platform's. `manifests/products/openvibe.services.json` describes the console and docs.
- `manifests/services/codes.json`: no capability or event; the site block describes the harness (position 22).

## 0.112.0 — 2026-10-07

**Robots driven through the relay plugin.** `bot.robot-profile@1` is 1.1.0: `mapping.driver` gains `relay`, the
OpenVibe.Node plugin that forwards `button` and `point` commands to an owner's own script in OpenVibe.Live's
hardware-client messages (OpenVibe.Node #33; plan T15 R9 steps 4-5). Bot's catalogue profile `relay.generic` uses it
for the robots converted from Live's stream controls. Additive: every existing profile stays valid.

## 0.111.0 — 2026-10-07

**Events' public origin is openvibe.events** (plan T7, ADR-042 item 10). Manifest and example changes only; no schema changed.
- `manifests/services/events.json`: `publicOrigin` `https://openvibe.events`; `domains` lists `openvibe.events` first and
  keeps `events.openvibe.network`, which Events still answers until every client has moved (then it answers 308).
  `manifests/repositories/OpenVibe.Events.json` lists the same two names.
- `network.realtime-ticket-result@1`: the `stream_url` description and fixtures use
  `https://openvibe.events/realtime/stream`. The ticket's audience was already `openvibe.events`.
- Product manifests: openvibe.events's launch line names the API and realtime stream there; the realtime notice links
  to `https://openvibe.events/`.

## 0.110.0 — 2026-10-07

**OpenVibe.Space and OpenVibe.AI's public home launch** (plan T10 step 3, T6). It serves the forum at `https://openvibe.space` from
loopback :4940. Community keeps pastes, comments, Pulse and submissions; its former `/s/*` forum paths
redirect permanently to Space.
- `manifests/services/space.json`: `status` alpha, `exposure` live with `publicSite: service`,
  health and readiness paths, lifecycle, and the events Space produces and consumes.
- `space.forum.read`, `space.forum.manage`, `space.thread.read`, and `space.post.write` are active with
  Space's implemented routes. `space.post.write` still guards thread creation; `space.thread.write`
  remains planned as a separate grant. `space.pulse.read` remains planned because Space serves no Pulse.
- `space.thread.created`, `space.post.created`, and `space.moderation.action` have payload contracts and
  valid and invalid fixtures. Space's source is `space`; `space.moderation.action` is
  `common.moderation-action@1` (ADR-022) and OpenVibe.Network consumes it into the moderation audit log.
- Space's problem codes, including `403 space.blocked`, are documented in
  `docs/space-problem-codes.md`; the problem fixture demonstrates the stable URI and code.
- The four former Community forum capabilities are retired and removed from its service list. The seven
  Community forum schemas remain loadable but retired, with Space replacements and a compatibility
  window through 1.0.0. Historical `community.thread.created` and `community.post.created` payloads
  also remain loadable as retired types; Community no longer claims to produce them. Community's
  planned vote grant now describes its surviving comment route only.
- `manifests/services/ai.json`: `exposure` live with `publicSite: service`; `publicOrigin` is
  `https://ai.openvibe.services` (the home, `/stats` and the developer-app API, AI #23), and
  `ai.openvibe.network`, still listed in `domains`, answers 301 to it.
- Generated bundles, types, and OpenAPI documents are refreshed for 0.110.0.

## 0.109.0 — 2026-10-07

**OpenVibe.Run runs, OpenVibe.Services registers, and Bot learns buttons and points.** Two schemas gained optional
shape, Run's job API turned active, and Services registered its first capability and AI its first public one; everything here is
additive, so every existing fixture and profile stays valid.
- `manifests/services/run.json`: `status` alpha; `exposure` internal (deployed on loopback :4920 on 2026-10-07,
  Run #1 and #2); openvibe.run keeps its OpenVibe.Sites placeholder until Run has a product surface.
- `run.job.submit`, `run.job.read`, `run.job.list`, `run.job.cancel`, `run.job.stream`, `run.job.admin`: active,
  with the routes Run serves (`POST /api/v1/jobs`, `GET /api/v1/jobs`, `GET /api/v1/jobs/:id`,
  `POST /api/v1/jobs/:id/cancel`, `POST /api/v1/jobs/:id/stream/ticket` and `GET /api/v1/jobs/:id/stream`,
  `GET /api/v1/admin/jobs`).
- `manifests/services/services.json`: `status` alpha; `exposure` internal (deployed on loopback :4930 on 2026-10-07);
  openvibe.services keeps its placeholder. `services.resource.read` (owner `services`, first-party, active) is
  Services' merged resource index over every authority that serves one (ADR-048), readable by a first-party service
  token holding the capability or by a person's user token scoped to one project they own or belong to.
- `common.resource-list-result@1` is 1.1.0: an optional `partial`, the authorities a merged index could not read for
  this page (`{ service, code }`). A slow or failing authority is omitted, never fails the page (ADR-048).
- `bot.command@1` gains the kinds `button` (`name`, and an optional `state` `down|up` for a hold button) and `point`
  (`x`, `y` in `[0, 1]`). `bot.robot-profile@1` gains `commands.button` (`names`: `label`, optional `key`,
  `cooldown_ms` and `hold`) and `commands.point` (optional `cooldown_ms`), the widget types `buttons` and
  `video_click` (the widget type pattern now admits `_`), and `button`/`point` as widget command kinds (plan T15 R9).
- `ai.app.run` (owner `ai`, public, active; OpenVibe.AI #22): the AI operations as a developer app (ADR-014, plan
  T6) — `POST /api/v1/chat`, `/generate`, `/summarize`, `/classify`, `/extract`, `/embed` and `GET /api/v1/runs/:id`
  for the app's own runs. Every run is metered to the app's project; metered capacity is spent only under the
  project's tier budget, and a sandbox run (or one no tier budget governs) uses only free and local capacity.
- `generated/` gains `openapi/run.json` and `openapi/services.json` (their first active capabilities) and stamps
  every document with the release version.

## 0.108.0 — 2026-10-07

**OpenVibe.Watch runs, and four authorities serve their resource index.** Status changes only; no schema changed.
- `manifests/services/watch.json`: `status` alpha; `exposure` internal (deployed on loopback :4730 on 2026-10-07, Watch #1);
  openvibe.watch keeps its OpenVibe.Sites placeholder until Watch has a product surface.
- `watch.watch.read`, `watch.watch.manage`, `watch.observation.read`, `watch.check.run`: active, with the routes Watch
  serves (`/api/v1/watches`, `/:id`, pause/resume, `/:id/check`, `/:id/observations`, `/:id/checks`).
- `host.resource.read`, `events.resource.read`, `codes.resource.read`, `media.resource.read`: active, implemented by
  `GET /api/v1/resources` and `GET /api/v1/resources/:ovrn` (Host #28, Events #17, Codes #20, Media #47, all deployed).

## 0.107.0 — 2026-10-07

**OpenVibe.Host is live at openvibe.host** (Stage B launched 2026-10-07; Host#26, Sites#11): `manifests/services/host.json` `exposure` becomes `{ state: live, publicSite: service }`, so Network lists Host as an open site.

**The resource index's first authorities** (ADR-048, plan T13 step 8, the Contracts half). OpenVibe.Network has served
`GET /api/v1/resources` since 0.104.0; this adds the planned, first-party capability each surveyed authority needs to
serve its own — `media.resource.read`, `events.resource.read`, `host.resource.read` and `codes.resource.read` — and
names in each the kinds that authority's index will carry. Additive and inert: four new capability manifests, four
service capability lists extended, six id prefixes recorded in `lib/ids.js`; no schema changed, no route named, nothing
activated.

- `media.resource.read` (owner `media`, first-party, **planned**, no routes): Media's index carries its objects, kind
  `media.object` with a `med_<ULID>` id — the canonical blobs its v1 vods, clips and files are projections of
  (`media_objects`, migrations/0001_initial.sql). Vods and clips are projections over objects (bigint ids) and are
  never listed. An object in a developer-project tenant carries that project; an object in a first-party app tenant
  (`live`, `games`, …) has no project and so no OVRN.
- `events.resource.read` (owner `events`, first-party, **planned**, no routes): Events' index carries its
  subscriptions, kind `events.subscription` with a `sub_<ULID>` id (`server/api/subscriptions.js`), project-scoped
  when a developer app created them and project-less when a service did. Events themselves (`evt_`) are what
  `common.resource-name@1` refuses by design, and a project's queue stays out of the index until Events stores a queue
  row.
- `host.resource.read` (owner `host`, first-party, **planned**, no routes): Host's index carries its static sites
  (kind `host.site`, `sit_<ULID>`), the immutable deploys of those sites (kind `host.deploy`, `dpl_<ULID>`) and their
  default and custom domains (kind `host.domain`, `dom_<ULID>`), each with its `project_id`. Host renamed its site id
  prefix from `site_` (four letters) to `sit_` (three) — zero sites exist in production, so nothing converts — so
  `host.site` now composes an OVRN. Host lists no projects: only Network lists projects.
- `codes.resource.read` (owner `codes`, first-party, **planned**, no routes): Codes' index carries its validated app
  and mod manifests (`codes.manifest`, `mfs_<ULID>`) and its releases (`codes.release`, `rel_<ULID>`), each created
  in a Network project. Trust tiers are per-app metadata and playground run logs are audit records, neither a
  resource; Codes hosts no repositories, so the ADR-048 catalog's `codes.repo` is gone.
- **Step 8 phase 2 — the person-owned resources** (Bot robots and devices, Chat rooms, Community spaces,
  OpenRe.Stream streams and Games characters): served like Network's user-owned node principals, no OVRN and
  owner = user, in a later phase, so no `*.resource.read` capability yet.
- **Surveyed and left out** (not even a person-owned resource, so no `*.resource.read` capability): AI (runs and the
  record groups are keyed to requester principals and attribution subjects, never a project) and Tools (a `job_<ULID>`
  is exactly what `common.resource-name@1` refuses, and a job expires unless referenced).
- **`lib/ids.js` records the chosen prefixes** (`subscription: sub`, `deploy: dpl`, `domain: dom`, `manifest: mfs`,
  `release: rel`, `site: sit`); `lib/resources.js` still formats any `<service>.<type>` kind generically, so `nameOf`
  needs no new entry, and `common.resource-name@1` is unchanged. `generated/` gains nothing but the release's version
  stamp — only active capabilities with routes are emitted, and these are planned with none.

## 0.106.0 — 2026-10-07

**OpenVibe.Bot is a site** (Bot #34). Bot has served openvibe.bot since 2026-10-02 (`exposure` live, `publicSite`
service) and, since Bot #34, its own front page; without a `site` block the network navigation and the
openvibe.network home did not list it. Additive: one `site` block, no schema changed.
- `manifests/services/bot.json` `site`: name `Bot`, icon `bot`, tagline "An open control panel for robots", the
  front page's one-line description, legal profile `games` (accounts and per-account state: robots, devices and
  the 30-day command audit), position 21 (after the current entries). The icon id `bot` falls back to the OV
  mark until openvibe-shared draws a `bot` glyph. `manifests/products/openvibe.bot.json` stays the catalog entry
  (the block carries no `tld`).

## 0.105.0 — 2026-10-05

**Chat's ticket conversation and DM block-state reads are live** (Chat #26 and #27). `chat.ticket.write` is active
and `chat.messages.read` gains Chat's DM block-state route. Additive: one new chat result contract, one capability
activated with the routes it names, one route list extended; no existing schema changed.
- `chat.ticket.write` (owner `chat`, first-party, **active**): OpenVibe.Chat serves the per-ticket conversation it
  names (`server/chat/internal-tickets.js`) — `POST /internal/chat/tickets/:ticket_id/messages` creates the
  (ticket id, calling service) conversation on first use and appends one message, and
  `GET /internal/chat/tickets/:ticket_id` reads that service's own conversation, paged; both guarded by the
  capability, so an app, node or agent token is refused.
- `chat.dm-block-state-result@1` (new, owner `chat`, first-party): the answer of
  `GET /internal/chat/dm/block-state?a&b` — `{ blocked }`, true when either user blocked the other, in Chat's
  `dm_blocks` or as a Network platform block — added to `chat.messages.read`'s route list. It follows the other
  `chat.*` internal-read schemas: an `anyOf` of the ok shape and `chat.ingress-ack@1`'s error, with valid and
  invalid fixtures.
- `chat.ticket-conversation@1` moves from planned to active in the catalog. `generated/openapi/chat.json` gains both
  ticket operations (the generator emits an active capability's `implementedBy` routes), and the generated docs move
  to 0.105.0.

## 0.104.0 — 2026-10-05

**Network's resource index is live** (Network PR #62; ADR-048). `network.resource.read` is active: OpenVibe.Network
serves the index it names. No schema changed and no route list changed — the two routes the capability already
listed are now implemented and guarded.
- `network.resource.read` (owner `network`, first-party, **active**): `GET /api/v1/resources` answers a page of
  `common.resource-list-result@1` and `GET /api/v1/resources/:ovrn` answers `common.resource-summary@1`, both
  guarded by the capability. Network's own resources today are its developer projects, apps, keys and nodes.
- `generated/openapi/network.json` gains both operations, since the generator emits an active capability's
  `implementedBy` routes; the OpenAPI version line and the other generated docs move to 0.104.0.
- The T2 Fabric offer registry's public routes, which shared `/api/v1/resources`, have moved to `/api/v1/offers` in
  the same Network release; no Contracts manifest listed those public routes, so no route list changed here.

## 0.103.0 — 2026-10-05

**Chat's three new internal reads and Network's resource index** (Chat PR #24; ADR-048). Additive: three new chat result
contracts and one planned capability, two capability route lists extended, no existing schema broken.
- `chat.site-daily-result@1` (new, owner `chat`, first-party): the answer of `POST /internal/chat/stats` with
  `kind: "site-daily"` — `{ days: [{ day, messages, chatters }] }`, one UTC day per entry in `[since, until)`,
  zero-filled, at most 400 — Live's home series. `chat.stats-request@1` gained `site-daily` in its kind `enum`, with
  the per-kind `allOf` rule that both `since` and `until` are required, the way its `user` and `stream` kinds already
  express their required field.
- `chat.first-chat-result@1` (`{ first }`, Live's welcome check) and `chat.sound-result@1` (`{ sound }`, reusing
  `chat.sounds-result@1`'s sound projection) are the answers of the other two reads. All three follow the other
  `chat.*` internal-read schemas: an `anyOf` of the ok shape and `chat.ingress-ack@1`'s error, with valid and
  invalid fixtures.
- Capabilities: `GET /internal/chat/first-chat` joins `chat.analysis.read`'s routes and
  `GET /internal/chat/sounds/by-command` joins `chat.sounds.read`'s.
- `network.resource.read` (new, owner `network`, first-party, **planned**): OpenVibe.Network's resource index
  (ADR-048 section 3) — `GET /api/v1/resources` answers `common.resource-list-result@1` and
  `GET /api/v1/resources/:ovrn` answers `common.resource-summary@1`; listed in `manifests/services/network.json`.
  The T2 Fabric offer registry's public routes, today sharing `/api/v1/resources`, move to `/api/v1/offers` in
  Network's own release; no Contracts manifest listed those public routes, so no route list changed here.

## 0.102.0 — 2026-10-05

**The Watch contracts** (plan T18). Additive: eight new planned contracts, four planned capabilities and the Watch placeholder manifest, no existing schema changed.
- `watch.watch@1` (new, owner `watch`, first-party, **planned**): a user-defined persistent observation — a source (a push event, a
  webhook, a conditional HTTP URL, a feed or API, a local Node probe, or a Run check), how a value is extracted, how it is compared with
  the last observation, the condition that fires, the actions it wakes (notification, event, webhook, Actor task, Codes run, Run job),
  its budget and retention. Valid and invalid fixtures in `fixtures/watch.watch/`.
- `watch.watch-request@1` (the create/patch body), `watch.watch-result@1` (the list/watch and pause/resume/delete answers),
  `watch.observation@1` (one recorded value, immutable) and `watch.check-run@1` (one check execution, immutable, with the twelve
  terminal states the service's `check_runs.state` CHECK allows), each with fixtures. The request reuses `watch.watch@1`'s `$defs`
  rather than restating the source and condition shapes.
- Events: `watch.observation.recorded` (subject `watch`, internal, low), `watch.watch.triggered` (internal, important; Network turns
  it into a `WATCH_TRIGGERED` notification for `payload.recipient`) and `watch.check.failed` (internal, normal, with
  `consecutive_failures`). **The dossier's `watch.triggered` is named `watch.watch.triggered` here**: the repo's event-type pattern
  (`test/run.js:123`) requires at least three dot-separated segments, as every existing type has.
- Capabilities `watch.watch.read`, `watch.watch.manage`, `watch.observation.read` and `watch.check.run` (all planned, first-party),
  and `manifests/services/watch.json`, a placeholder like Run's: the OpenVibe.Watch repository does not exist yet, so nothing is
  built. `manifests/products/openvibe.watch.json` now names `watch` as its service, as `openvibe.run` names `run`.
- `contracts/platform/resource-offer.v1.json`: the `capabilities` description now documents `runtime:<class>` for a kind harness
  beside the reserved `worker:<class>` names (a docs-only change; Codes already advertises them). `lib/ids.js` already carried
  `watch`/`observation`/`check`, so it is untouched.

## 0.101.0 — 2026-10-05

**The task contract** (plan T17, ADR-044). Additive: one new planned contract and its ADR, no existing schema changed.
- `platform.task@1` (new, owner `network`, public, **planned**): one task at OpenVibe.Actor's router — the resource
  `POST /v1/tasks` creates and `GET /v1/tasks/{id}` reads, modelled on Run's `platform.job@1`. It carries `id`
  (`tsk_<ULID>`), `project_id`, `requester` (a person or an `agent` subject), the `task` text, `mode`
  (`cheapest | balanced | best | fastest | private`), `budget` (`per_task_usd`, `per_day_usd`), `state`
  (`queued | running | verifying | succeeded | failed | cancelled`), `created_at`/`finished_at`, `result`, `cost`,
  `explanation` (a chain of `platform.placement-result@1`, an escalation appending one), the SSE `progress`
  descriptor, the `cancel` record and registered `webhooks` (HTTPS only, secret by reference). Valid and invalid
  fixtures in `fixtures/platform.task/`.
- `docs/adr/ADR-044-actor-runtime.md` (new, **Proposed**; plan T17, the build-order item after the engine): the task
  contract, the adapter interface (capabilities, limits, a reviewed rate card, trust class and BYO keys), modes as
  `openvibe-sdk/placement` objectives, live signals with hysteresis and immediate failover, a `verifying` state for
  cheap-first cross-family checks and the task's own tests, and the five ADR-046 trust classes with `private`
  narrowing to OpenVibe-only. Owner is `network` because no Actor service manifest exists: OpenVibe.Actor is a product
  page (`manifests/products/openvibe.actor.json`, `noRepo`), and every other `platform.*` contract is Network's too.
- `lib/ids.js`: the `task` prefix (`tsk`), so `ids.newId('task')` mints the contract's id.

## 0.100.0 — 2026-10-05

**Three small contract fixes** (plan follow-ups). Additive and widening, no contract removed.
- `platform.usage-sample@1` now says what `resource` is: the producing service's `platform.rate-card@1` `metric` for
  the reading's `provider` (e.g. `tokens`), never a run, job or object id, with a `unit` that is that metric's unit —
  which is exactly what Billing looks the card up by (`provider` + `resource`, then a unit that fits the metric).
  Without the description AI shipped `resource` as a run id and no card matched. A valid AI reading,
  `fixtures/platform.usage-sample/valid/ai-per-metric.json` (service `ai`, provider `openai`, resource/unit `tokens`),
  and a matching `fixtures/platform.rate-card/valid/ai-tokens.json` ground it.
- `platform.placement-result@1`: `selected` is now `type: [string, null]` and says null means no eligible candidate.
  openvibe-sdk/placement `plan()` already answers `{ selected: null, … }` when nothing qualifies; the string-only
  schema refused the only shape that is sent, so this is recorded in `compatibility/corrections.json` against
  v0.99.0. Valid fixture `fixtures/platform.placement-result/valid/none.json`.
- `chat.ticket-conversation@1` (new, owner `chat`, first-party, **planned**) and the planned `chat.ticket.write`
  capability on Chat's manifest: one conversation per (ticket id, calling service), with a posted message whose
  `author_kind` is `person`, `agent` or `staff`, `author` is the author's subject, `body` the text and `created_at`
  when it was written. It gives Help's service tokens a path into Chat without the person-only `POST /api/chat/send`;
  until Chat implements the route the capability stays out of `generated/openapi/chat.json`. Valid and invalid
  fixtures are in `fixtures/chat.ticket-conversation/`.

## 0.99.0 — 2026-10-04

**The estate, generated** (plan T1 step 3). `scripts/estate.js` reads every checkout under the estate root (default
`~/OpenVibers`) — each one's `package.json` pins, `STATUS.json`, `migrations/`, and this repository's
`manifests/services/` and `manifests/products/` — and writes one `manifests/repositories/<name>.json` per repository
plus `docs/ESTATE.md`, the plan §1.1 table (repository, product, authority, runtime, database, domain, SDK/Contracts
pin, deployment, public/private, current track). `node scripts/estate.js --check` exits 1 when either is stale; with no
checkout root (CI) it checks `docs/ESTATE.md` against the checked-in manifests and skips the rest. `docs/ESTATE.md`
was a hand-written 2026-09-30 table and is now a projection of those records, never edited by hand. Additive, no
contract changes.

## 0.98.0 — 2026-10-05

**The node-revoked event contract** (plan T2 follow-up; the deferred item in OpenVibe.Network's
`docs/t2-cells-and-node-principal.md` section 10, "Revocation latency outside Bot"). Adds
`network.node.revoked@1` (owner `network`, first-party, active): a node principal (`nod_…`), a person's paired
machine, was revoked through `POST /internal/node-principals/:id/revoke` (`network.node.manage`, the service that
paired it) or `POST /api/v1/me/nodes/:id/revoke` (the owner's session), or with the owner's account. The payload is
`{ node_id, principal_id, owner, reason?, at }` (`extra` fields refused): `owner` is the person, project or platform
the machine belongs to, `reason` the caller's text when one was given, and the credential and its hash are never
carried. Until now a connected machine learned of a revoke only at its next reauth (≤ 330 s); a consumer can stop it
at once. Registered in the catalog, in Network's `eventsProduced`, and on `network.node.manage`'s `events`, with valid
and invalid fixtures. Network emitting it inside `server/registry/node-principals.js` is a separate follow-up PR and
depends on this one; there is no consumer yet. Additive.

## 0.97.0 — 2026-10-04

**The job contract matches the Node again, and Bot's dispatch answer has a contract** (plan T14 step 6 follow-up).
- `platform.job@1`: `artifact` is required for class `code` as well as `function` again — the allOf `if` names both
  classes and the `artifact` description says so — and the invalid fixture `code-without-artifact` is back.
  OpenVibe.Node already refuses a code job without an exact-version artifact (its `internal/protocol/protocol.go`
  `JobNoArtifact`), and `run.job-create-request@1` already required it; b88849c had dropped the `code` case from
  this contract alone. A correction to match the implementations, not a new rule.
- `bot.job-dispatch-result@1` (new, owner bot, ADR-034): what OpenVibe.Bot answers OpenVibe.Run's `bot.job.dispatch`
  calls (Bot `server/api/v1.js`, `server/jobs/index.js`). `POST /api/v1/jobs` (201) and `POST /api/v1/jobs/:id/cancel`
  answer `{ job, sent }`; `GET /api/v1/jobs/:id` answers `{ job, stdout }`. `$defs.job` is the `run_jobs` row
  (`state` queued … expired, device, payer project, timing, exit, `usage_read` and the original `platform.job@1`
  body); `$defs.stdout` is the held stdout (the last 1 MiB, or null). `bot.job.dispatch` names it as its
  `outputSchema`, so that capability is complete and its row leaves `compatibility/capability-schema-gaps.json`;
  `generated/openapi/bot.json` now carries the responses. Additive.

## 0.96.0 — 2026-10-04

**OpenVibe.Bot's job dispatch for OpenVibe.Run** (plan T14 step 6, R1c): Run hands a job to a paired Node through Bot.
Additive, no breaking changes. One new internal, sensitive capability owned by bot, added to
`manifests/services/bot.json`: `bot.job.dispatch` (permission `bot:jobs`, resource constraint `project`, input
`platform.job@1`, events `run.job.*`). Service-to-service only (Run's service token); never granted to an app or mod and
never delegated to people. It names three routes, so `generated/openapi/bot.json` carries them:
  - `POST /api/v1/jobs` `{node_id, job, project_id, subject, provider}` dispatches a job (idempotent by job id;
    `project_id` is required).
  - `POST /api/v1/jobs/:id/cancel` cancels it.
  - `GET /api/v1/jobs/:id` returns its state, stdout included.

Its `outputSchema` is a recorded gap in `compatibility/capability-schema-gaps.json` until Bot's answer shapes land.

## 0.95.0 — 2026-10-04

**The Services control plane** (ADR-048, plan T13 step 1). Additive: three new catalog ids at 1.0.0, owner `contracts`.
`common.resource-name@1` is the OVRN `ovrn:<service>:<project_id>:<type>/<id>`, with the pattern `common.usage-recorded@1`
and `common.resource-summary@1` already use. `common.resource-control-request@1` is one control operation OpenVibe.Services
sends to the authority that owns a resource (`action`, `resource` or, for `create`, `resource_kind`, `project_id`,
`idempotency_key`, optional `params`, `on_behalf_of`, `confirmation_id`, `dry_run`, `trace_id`), and
`common.resource-control-result@1` the authority's answer (`state` done, pending, refused or failed, with `result`,
`confirmation_required` or an `errors.problem@1`). New `contracts.resources`: `parse`, `format`, `nameOf`, `checkName`,
`checkControlRequest` (the resource's project is `project_id`; `create` names a kind, every other action a resource) and
`checkControlResult` (`problem` and `confirmation_required` fit `state`). New test `test/resources.test.js`.

**OpenVibe.Chat's internal read API** (plan T3, J4b): OpenVibe.Live stops reading its mirrored copy of Chat's tables.
Additive. Six new internal capabilities owned by chat (loopback, Chat service token, Live's principal today; never
granted to an app or delegated), added to `manifests/services/chat.json`:
  - `chat.stats.read` (`POST /internal/chat/stats`): `chat.stats-request@1` (`kind` site, user, stream or channel-top,
    an optional epoch-ms window, `limit` 1-50) → `chat.stats-result@1` (`messages`, `chatters`, `sounds`, `top_chatters`).
  - `chat.messages.read` (`GET /internal/chat/messages`) → `chat.messages-page@1` (`chat_messages` rows, `max_id`).
  - `chat.analysis.read` (`GET /internal/chat/timeline`) → `chat.timeline-result@1` (`buckets` of `{t, count}`, `max_id`).
  - `chat.moderation.queue.read` (`GET /internal/chat/moderation/pending-ip`, `…/relay-users`, `…/relay-users/:id`,
    `…/tts-override`) → `chat.moderation-queue-result@1`, one shape per route with Chat's `pending_ip_messages`,
    `hidden_relay_users` and `tts_voice_overrides` rows. `chat.moderation.read` is unchanged.
  - `chat.sounds.read` (`GET /internal/chat/sounds`) → `chat.sounds-result@1` (`count`, or the `channel_sounds` rows
    still without a Media asset).
  - `chat.sounds.write` (`POST /internal/chat/sounds/asset`): `chat.sound-asset-request@1` → `chat.ingress-ack@1`.

`chat.send-result@1` 1.2.0: the `POST /internal/chat/messages` answer gains optional `first_chat` (boolean).

## 0.94.2 — 2026-10-04

**`past_due` renewal grace on the billing events** (plan T5 step 11, s1). Additive: no field is required or removed.
`billing.entitlement.changed@1` `subscription.status` gains `past_due` (a failed renewal, retried until `grace_until`);
new optional `grace_until` (date-time or null) and `renewal_period_end`; `reason` adds `renewal_failed`, `grace_ended`
and `credit_refund`. `billing.subscription@1` status lists `past_due`. `billing.transaction.reversed@1` already carried a
refund of a credit-paid subscription period (type `refund`, from/to swapped); its description now says so, and a fixture
pins it. New test `test/billing-grace.test.js`. Billing and VIP pin this tag.

## 0.94.1 — 2026-10-04

`community.moderation.action@1` catalog version is `1.1.0` (the additive space-moderator actions of 0.94.0).

## 0.94.0 — 2026-10-04

`community.moderation.action@1` accepts the audit events of per-space moderators (OpenVibe.Community PR 15): the
`action` values `space.moderator_added` and `space.moderator_removed`, and the target type `space` (`id` the space
slug, `owner_subject` the moderator). Additive; fixtures for both actions.

## 0.93.1 — 2026-10-04

**Usage rollups are counts, readings are money** (plan T5 step 8, C1; ADR-031 Counting). Description-only: no schema shape
change. `common.usage-recorded@1` says rollups are counts for dashboards and quotas and Billing never consumes a
`*.usage.recorded` topic; `platform.usage-sample@1` says `idempotency_key` is the only dedupe key and encodes work identity
only, and `service` is the producing service's manifest id; `billing.usage.record` is the only money input to Billing. New
test `test/usage-topics.test.js`: only network, codes and zone may list a `*.usage.recorded` topic as consumed.

## 0.93.0 — 2026-10-04

**OpenVibe.Bot's profiles, device protocol, operator commands, pairing and events** (plan T15 R7; ADR-043). The Bot
manifest and its capabilities came in 0.85.0; this adds the contracts Bot's code already speaks, taken from Bot
`155accc` and OpenVibe.Node `1ebf1a7`. Additive: every contract id is new.
- `bot.robot-profile@1` (public): a profile as `server/profiles/*.json` ships it and `GET /api/v1/profiles` serves it
  (null vendor, kind, description, variants and camera; defaulted limits; `halt` always in `commands`). The per-kind
  `commands` schema is Bot's (`drive`/`ptz` axes, `actuator` number, rgb, tone and bool, `say`, `display`); capability
  and widget names stay open strings.
- `bot.device-message@1`: one frame on the `/device` WebSocket, `v`, `seq`, `ts` on every frame. Server to device:
  `hello`, `config`, `command`, `estop`, `heartbeat_ack`, `error`, `paired`, `rotate`; device to server: `pair`,
  `status`, `telemetry`, `ack`, `nack`, `heartbeat`, `reauth`, `estop_state`. Job frames stay `platform.job-frame@1`.
  The description names both implementations (Bot `server/realtime.js`, Node `internal/protocol/protocol.go`).
- `bot.command@1` and `bot.command-result@1`: the `/control` command frame and its `command_result` answer (`ack`,
  `nack`, `refused` with Bot's refusal code, `expired`, `pending`; `cached` for a repeated id).
- `bot.robot-read-request@1`: the query of `bot.robot.read` (`owner`, and `limit`/`before` for the audit page); it is
  now that capability's input, so its OpenAPI routes list the query parameters.
- `bot.pair-request@1` and `bot.pair-result@1`: `POST /api/v1/pair` and `POST /api/v1/devices/bind`. The credential,
  the publish key and the WHIP URL are shown once; without OpenRe the answer says `video: not_configured`.
- Event payloads for the five events Bot produces: `bot.robot.online` and `bot.robot.offline` (`robot_id`,
  `device_id`), `bot.estop.set` and `bot.estop.cleared` (`robot_id`, `by`, `principal_kind`), `bot.command.refused`
  (`robot_id`, `kind`, `reason`, `role`; never the value).
- `bot.robot.control` lists its `/control` WebSocket bindings (`command`, `estop`, `estop_clear`) as notes, and the
  events they emit (`bot.estop.cleared`, `bot.command.refused`); the Bot manifest's notes name both WebSockets' contracts.
- New `test/bot-manifest.test.js`: the manifest's capabilities and events equal Bot's `STATUS.json` lists.

## 0.92.0 — 2026-10-04

`platform.job@1` gains `inputs` (Media objects pinned by sha256) and the `net` values `none`, `public`, `openvibe-only`.
Additive; a v1 worker still refuses an unknown `net` with `nack`.

## 0.91.0 — 2026-10-04

**Chat's service-token ingress** (plan T3 J2, OpenVibe.Chat PR #16). These are the capabilities and request contracts of
`/internal/chat/*`, the typed Chat endpoints that replace Live's generic bridge (`POST /internal/live/calls`). All of it is
additive.
- New active capabilities, owner `chat`, `first-party`, quota class `internal-write`, each with an input and an output
  schema. They are loopback only and need a service token. They are never granted to an app or delegated to an agent.
  - `chat.event.publish` (`POST /internal/chat/events`, sensitive): transient frames to a stream, a channel, an owner's
    streams, global chat, everyone or one person.
  - `chat.moderation.write` (`POST /internal/chat/moderation`, sensitive): one typed action per request (deletes,
    IP-approval reviews, relay identities, TTS voice overrides, disconnect, log). It emits `chat.message.deleted` and
    `chat.moderation.action`.
  - `chat.cache.invalidate` (`POST /internal/chat/invalidate`): cache hints for a person, a channel, IP approvals and bans.
  Chat's manifest lists all three.
- `chat.message.send` also names `POST /internal/chat/messages`, and `chat.presence.read` names
  `GET /internal/chat/presence`. Both keep their existing routes.
- New contracts under `contracts/chat/`, which follow Chat's validators:
  - `chat.event-request@1`: target kinds, the 16 frame types, the per-frame fields and the target each frame needs.
  - `chat.moderation-request@1`: one `oneOf` branch per action, each with its own fields only.
  - `chat.invalidate-request@1`: at least one hint, and `user_data` needs `user`.
  - `chat.moderation-result@1`: deleted `ids`, or `changes` and `id`.
  - `chat.ingress-ack@1`: `{ ok: true }`, or the `{ ok: false, error }` refusal every `/internal/chat` route answers.
  Every request needs an idempotency `key` of 1–160 characters `[A-Za-z0-9:._-]`. Chat applies it once per caller and
  route; a reused key with another body gets 409.
- `chat.send-request` 1.1.0 adds the `/internal/chat/messages` body (room line or DM, `mirror`, `tts`, `frame`,
  `first_chat_key`). `chat.send-result` 1.1.0 adds its `{ ok, id, … }` answer and the ingress error.
- Fixtures: valid and invalid fixtures for every new contract and for the new branches.

## 0.90.0 — 2026-10-04

**OpenVibe.Run service and job API** (plan T14 R1, ADR-034). The contract OpenVibe.Run is built against; everything is
planned (Run's repository does not exist yet) and additive.
- New service manifest `manifests/services/run.json`: `run`, status and exposure `placeholder`, domain `openvibe.run`,
  lifecycle all `none` (not built). `manifests/products/openvibe.run.json` gains `relationships.service: run` and keeps
  `noRepo: true`.
- New planned capabilities, owner `run`, each with an input and an output schema: `run.job.submit` (sensitive: it bills
  the project), `run.job.read`, `run.job.list`, `run.job.cancel`, `run.job.stream` (public, project-scoped) and
  `run.job.admin` (internal operator access to every project's jobs). `run.admin` is spelled `run.job.admin` because a
  capability id has three segments.
- New contracts under `contracts/run/`: `run.job-create-request@1` (class from `platform.runtime-class@1`, artifact
  required for `function` and `code`, `inputs` as Media objects pinned by sha256, `limits` wall/cpu/mem as
  `platform.job@1`, `ttl_ms`, `egress` `none | public | openvibe-only` as Node's `worker.egress`,
  `requirements` as `platform.workload-requirements@1`, `idempotency_key`), `run.job-create-result@1`,
  `run.job-read-result@1` (states `queued | placed | running | succeeded | failed | cancelled | expired`, placement node,
  timings, exit, `usage.seconds`, result, error, with per-state rules), `run.job-list-query@1`, `run.job-list-result@1`
  (`next_cursor` pages), `run.job-stream-ticket-result@1` (one-use, two-minute ticket, as Events' realtime ticket) and
  `run.job-stream-event@1` (SSE `output | state | end`).
- New planned events produced by Run: `run.job.queued`, `run.job.started`, `run.job.succeeded`, `run.job.failed`,
  `run.job.cancelled` and `run.job.expired`, projections of the job without args, inputs, result or output.
- `ids.newId('job')` mints `job_<ULID>`, the `platform.job@1` id Run passes to the node, so the metering key stays
  `run:<job id>:<n>`.
- Fixtures: valid and invalid for every new contract; `test/platform-run.test.js` pins the Run job id, artifact,
  limits and egress to `platform.job@1` and Node, and `usage.seconds` to the sum of the job's readings.

## 0.89.0 — 2026-10-03

**Agent tokens and confirmations** (plan T2 step 9; OpenVibe.Network `docs/t2-projects-and-grants.md` §2 gaps 1–3,
§4 and §5). These are the contracts that Network WS-Z2 slices 7–9 wait on. All of it is additive.
- `identity.service-token-claims` 1.3.0: `sub` also accepts `agent:agt_<ULID>` (`ids.principalSub({ type: 'agent' })`)
  and `actor_type` gains `agent`. An agent token must carry `project_id`, `env` and `on_behalf_of` (the owner, `usr_`).
  It may carry `cap_confirm` (capabilities held in confirm mode: each use needs an approved
  `network.confirmation-request@1`, and they never appear in `cap`, so a receiver that does not know agents refuses
  them) and `act` (RFC 8693 actor claim: `{ sub: 'svc:<slug>' | 'app:app_<ULID>' }`, the host, nothing else).
  `if`/`then` rules tie an `agent:` sub to `actor_type: agent` in both directions. Service, app, mod and node
  tokens validate as before.
  Fixtures: valid `agent-service-host` and `agent-app-host-auto-only`; invalid `agent-without-owner`,
  `agent-sub-as-service`, `agent-actor-with-service-sub` and `agent-bad-actor-claim`.
- New capability `network.confirmation.manage` (planned, first-party, listed by `manifests/services/network.json`). It is
  the owning service's side of a confirmation: create one (`POST /internal/confirmations`), read it, consume it once
  with the action's digest, or cancel it. The owner's inbox (`/api/v1/confirmations`: list, approve, deny) runs on the
  owner's own session, and no token holds it. The request and response bodies are Network-local until the routes are
  built.
- New event `network.confirmation.changed@1` (planned, produced by Network), the shape of Network's proposal
  (`docs/contracts-proposal/network.confirmation.changed.v1.json`). Payload: `confirmation_id` (`cnf_`), `agent_id`
  (`agt_`), `project_id`, `capability`, `audience` (the owning service), `state` (`pending | approved | denied | expired
  | cancelled`, the names of `network.confirmation-request@1`) and `change` (`created | approved | denied | expired |
  cancelled | used`), and optional `standing_rule`, `rule_id`, `cancel_reason`, `expires_at` and `changed_at`. `created`
  leaves the state pending, or approved when a standing rule covers it; `used` leaves it approved; every other change
  names its state. `cancel_reason` is required on cancelled and absent otherwise. The event never carries `summary` or
  `details`. Fixtures: valid `requested`, `approved-by-owner`, `approved-by-standing-rule`, `used`, `cancelled` and
  `expired`; invalid `requested-state`, `cancelled-without-reason`, `used-not-approved`, `missing-audience` and
  `with-summary`.

## 0.88.0 — 2026-10-03

**The Fabric ADR and the user-owned trust rule** (plan T1 step 3; T14 S2, the Contracts half). ADR-046 "The universal
adaptive fabric" (Proposed, for the owner) ties `platform.resource-offer@1`, `workload-requirements@1`,
`placement-result@1`, `placement-plan@1`, `provider-state@1`, `rate-card@1`, `cost-snapshot@1`, `telemetry-sample@1`
and `usage-sample@1` to one placer (`openvibe-sdk/placement`), names the five trust classes, the `worker:<class>`
capabilities a Node advertises (`worker:function`, `worker:code`, …) and the plane rule: the data plane keeps running
on the last valid signed plan (`signature`, `epoch`, `expires_at`, checked by `placement.verifyPlan`). It records that
`user-owned` is **not** in the default trust set: a user-owned offer is eligible only for a workload whose requirements
name `user-owned`, so the SDK's default trust list stays the other four (this replaces the 0.87.0 note that the SDK
should route to user-owned nodes by default). Whether a user-owned node may run other users' work, and its consent and
revocation rule, are open questions for the owner.
- `platform.resource-offer@1` `trust` and `platform.workload-requirements@1` `trust` gain descriptions stating that
  rule; the enums (1.1.0 since 0.87.0) are unchanged. Consumers are unchanged.
- Fixtures: `user-owned-node` now also advertises `worker:function`; new invalid `unknown-trust` (an offer with
  `trust: "stranger"`, refused on `/trust` alone). `owned-node` is unchanged.

**Two product manifests** (plan T11 step 1): `manifests/products/openvibe.zone.json` (served by the planned `zone`
service) and `manifests/products/openvibe.work.json` (no repository yet), with name, tagline, pillars and launch taken
from OpenVibe.Sites `sites.json`. The catalog test's Sites snapshot holds 35 domains.

- `network.project.read` is active, implemented by OpenVibe.Network `GET /internal/projects/:project_id`.

**Watch ids** (plan T18, ready now):
- `lib/ids.js`: `PREFIX.watch = 'wch'`, `PREFIX.observation = 'wco'` and `PREFIX.check = 'ckr'`, so `ids.newId('watch')`
  gives the `wch_<ULID>` id the `common.resource-summary` fixture `watch` already carries. None is a subject type or a
  principal.

**Harness capability vocabulary** (plan T17, ready now):
- `platform.harness-offer@1` `capabilities` gains the optional booleans `edit`, `review`, `tools`, `vision`, `browser`
  and `computer_use`, and an optional `runtimes` array (unique; `function`, `code`, `browser`, `linux`, `desktop`,
  `gpu`, the `platform.runtime-class@1` classes). `capabilities` keeps `additionalProperties: false`, and the entry stays
  1.0.0, as it did when 0.86.0 added optional fields. New fixtures `capability-vocabulary` (valid, every new key) and
  `unknown-capability` (invalid, a `gpu` key: a runtime class belongs in `runtimes`). Additive.

**Resource names in the resource index** (plan T13, ready now):
- `common.resource-summary@1` is 1.1.0: an optional `ovrn` (ADR-034 section 2) with the pattern of
  `common.usage-recorded@1` `resource`, naming the summary's own service, project and id. New fixtures `with-ovrn`
  (valid) and `ovrn-without-project` (invalid). Additive.

## 0.87.0 — 2026-10-03

**Host git sources** (plan T12 Stage B): a Host site may name a public Git source — provider, repository URL and branch;
never a credential — and a site with a source also accepts a CI-built deploy at `/sites/:id/source/deploys` naming the
ref and full `commit_sha`. That deploy is always a preview and records the commit as immutable provenance.
- `host.site.manage` gains `GET`, `PUT` and `DELETE /api/v1/sites/:id/source`; `host.deploy.create` gains
  `POST /api/v1/sites/:id/source/deploys`.
- `host.deploy@1`: the `source` enum adds `preview` and `git`, and an optional `git` object carries `provider`,
  `repo_url`, `ref` and a 40-hex `commit_sha`. New valid fixture `git`. Additive: every existing deploy stays valid,
  and the object is present only on `source: git`.

**The Bot service manifest** (plan T15 step 1; ADR-043; supersedes #8). OpenVibe.Bot has run on openvibe-ovh since
2026-10-02 (`openvibe-bot.service`, `/opt/openvibe.bot`), and `ovhost validate` found no `bot` manifest to read its
lifecycle from.
- `manifests/services/bot.json`: status `live` on `openvibe.bot`, internal origin `127.0.0.1:4630`, the five `bot.*`
  events it produces, and all six lifecycle parts. Shutdown is what Bot's `openvibe-sdk/service` `gracefulStop` does:
  stop the job timers and Network key refresh, close the device and operator WebSockets and the outbox relay, drain HTTP
  for up to 4 s, close PostgreSQL and Valkey, exit 0, with a 5 s hard deadline inside the unit's 10 s `TimeoutStopSec`.
  The contracts range `>=0.85.0 <1.0.0` covers the v0.85.0 Bot installs.
- Three active capabilities, each bound to the routes whose guard checks it in the deployed Bot (dae7c59), for a
  Network service token: `bot.robot.read` (list by `?owner=`, a robot, its operators and devices), `bot.robot.manage`
  (create, update, delete, pairing codes, operators, the command audit, clearing the e-stop, rotating and revoking a
  device) and `bot.robot.control` (latching the e-stop, which also needs `bot.robot.read`, and the operator WebSocket,
  which acts for `X-OV-Subject` with that person's role). Their resource constraint is `none`: Bot does not check the
  acting person against the robot for a service token on the REST routes, and the descriptions say so. All are
  first-party, none is a staff capability, and each names an input and an output schema: new `bot.robot@1`,
  `bot.device@1`, `bot.robot-read-result@1`, `bot.robot-manage-request@1`, `bot.robot-manage-result@1` (which includes
  the audit page and `bot.device-connect-result@1`), `bot.robot-control-result@1` and `bot.device-connect-result@1`,
  with valid and invalid fixtures.
- `bot.device.connect` is `planned` (the Bot manifest lists it, as owners list their planned capabilities): Bot
  declares the name but no route checks it, so it names no routes or schemas until one does.
- `openvibe.bot` product: names its service `bot` and repository `OpenVibe.Bot` instead of `noRepo`.
- Presence policy: `bot.robot.online` and `bot.robot.offline` are robot connectivity (ADR-043), not a person's presence,
  and are allowed. Any other `.online`, `.offline` or presence event type is still refused.

**Media placement events** (follow-up of OpenVibe.Media PR #18, "Record placement decisions for replicas and provider
transitions"; ADR-026). Media records every replica move and provider transition in its placement outbox, but the two
provider events used types starting with `provider.`, which OpenVibe.Events can never accept from source `media`: its
prefix gate (`server/config.js` `sourcePrefixes`, `server/api/publish.js`) requires an `event_type` to start with the
source key, so both were permanently rejected (`403 events.type_not_allowed`) and piled up in `event_outbox`. The types
now live in the media namespace (`media.provider.health_degraded`, `media.provider.capacity_warning`), and all six event
types Media emits today gain active payload contracts owned by `media`, listed in its manifest:
- `media.replica.requested`, `media.replica.ready`, `media.replica.draining`, `media.replica.evicted` (Media's
  `server/objects/tiering.js`: the promote/demote decisions, recorded inside the transaction that starts the copy, upserts
  the verified location, starts the delete and removes it).
- `media.provider.health_degraded` and `media.provider.capacity_warning` (Media's `server/placement/providers.js`: the
  healthy→unhealthy flip and the class loss after a completed probe), each emitted once per transition, not per tick.

Each payload is deliberately narrow — the object id and tenant, placement class, action, providers, key/size for a
replica, the class set before and after a loss — never the object's bytes, title or metadata. `media.replica.*` was
already inside the streamable namespace; only the provider types changed. Valid and invalid fixtures for each, and
`test/run.js` asserts every type Media produces starts with `media.`, is owned by `media` and is listed in its manifest.

**User-owned trust class and the estate table** (plan T1 step 3; ADR-034 §5 control plane/data plane; the Fabric ADR,
ADR-046, is still to write). A person's own node or machine is now a trust class of its own in Contracts, between
`first-party` and `partner`. The SDK placement planner's runtime already honours an explicit `trust: ["user-owned"]`
requirement, but its default trust list and its TypeScript `Offer` type omit the value, so the SDK needs code and type
changes as well as a pin to this release to route to user-owned nodes by default.
- `platform.resource-offer@1` 1.1.0 and `platform.workload-requirements@1` 1.1.0 add `user-owned` to their `trust`
  enum, ordered `first-party`, `user-owned`, `partner`, `community`, `external`. Additive: a producer or consumer that
  knows only the previous four values is unchanged, and no existing offer or requirement is invalidated. New valid
  fixtures `user-owned-node` (an offer with `trust: "user-owned"`) and `user-owned-only` (requirements whose `trust` is
  `["user-owned"]`); the existing first-party `owned-node` fixture stays.
- `platform.usage-sample@1`: `route_epoch` and `trace_id` gain descriptions; their types and shape are unchanged.
- `docs/ESTATE.md`: the plan §1.1 estate table as a data-only document (repository, product, authority, runtime,
  database, domain, SDK/Contracts pin, deployment, public/private, current track). Step 2 replaces it with the table
  generated in CI.

**Named object zones for OpenVibe.Zone** (ADR-031 amendment 2026-10-02; plan D37). The amendment maps named Zone buckets
onto Media's S3 surface. A zone is a Media namespace, and Media keeps the one object catalog and the only deletion
path.
- **Ownership:** Zone owns the zone record and Media owns objects, bytes and replicas.
- **Names:** zone `zon_<ULID>`, `ovrn:zone:<project_id>:object-zone/<zone_id>` and Media namespace
  `<environment root>.<zone_id>`.
- **Buckets:** the bucket is the zone name, resolved within the signing key's project and environment. The environment
  root is the zone `default`, so no existing object moves.
- **Grants and quotas:** grants are scoped to a zone's resource name. A per-zone byte quota sits under the environment
  quota.
- **Usage:** Media emits per-zone usage rollups that name the zone's resource name in a new optional `resource` field
  of `common.usage-recorded@1` 1.1.0 (additive; existing producers are unchanged) and its id as `dimension`.
  `contracts.usage.checkUsageRecorded` refuses a rollup whose `resource` names another project than `project_id`, and
  `contracts.zones.checkObjectZoneUsage` a usage answer whose `ovrn` names another zone than `zone_id`.
- **Deletion:** one lifecycle for every door, the one `media.object.delete` already promises: a held object's deletion
  is refused, a tombstone is restorable until the retention period ends, and the purge then erases every replica, B2
  file versions included, within 24 hours. Zone deletion tombstones with no restore window and answers `409 zone.held`
  while an object is held.
- **No name reuse:** a `deleting` or `deleted` zone's name is retired in its environment (`409 zone.name_retired`; `provisioning`
  and `active` answer `409 zone.name_taken`), so a signature,
  which covers the key and the bucket name, always names one zone id, whatever signing time it carries.
  `contracts.zones.checkObjectZoneList` refuses a list in which two zones of one environment share a name.
- **List query:** `limit` is 1 to 200 as an integer or as a query-string value.
- **Migration:** Media backfills a key derived from each object's namespace and `med_` id, legacy child namespaces
  included, before S3 accepts writes. The default zone's access is `per-object`, so existing public and unlisted
  objects keep their URLs and cached copies.
- **Control API:** a planned Zone service manifest (`manifests/services/zone.json`) with six planned capabilities, one per
  route. The capabilities enter `generated/openapi` when they turn active.
- **Contracts:** new `zone.object-zone@1` and its create, update, list, list-query, delete-query and usage contracts,
  all `planned`, with fixtures. `contracts.zones.checkObjectZone` also checks that a zone's OVRN and Media namespace
  name its own project and id. Additive; no active contract changes.

**Reserved worker capability names for OpenVibe.Node** (plan T14 groundwork, additive): a Node advertises its runtimes
as `worker:` capabilities in `platform.resource-offer@1`. The names are reserved in the contract now, not only by the
`capabilities` pattern: `platform.resource-offer@1` gains `$defs.reservedWorkerCapabilities`, the six names
`worker:function`, `worker:code`, `worker:browser`, `worker:linux`, `worker:desktop` and `worker:gpu` — one per
`platform.runtime-class@1` class (`worker:` + the class) — and both the `capabilities` description and
`platform.runtime-class@1` say so. A node advertises the name of each class it runs, so `worker:function` today and
`worker:code` when the `code` class ships. Additive to validation: every existing offer stays valid, and other
`worker:` names (`worker:ffmpeg`, `worker:ai-gpu`) stay ordinary capability names. New valid fixture `worker-classes`
(an offer advertising all six reserved names). Four new valid fixtures for `platform.runtime-class@1` (`code`,
`browser`, `linux`, `desktop`) complete its six `const` classes.

## 0.86.0 — 2026-10-03

**Harness offers for Fabric routing** (plan T16 step S5): OpenVibe.Codes publishes its harness catalog as
`platform.resource-offer@1` offers of kind `harness` whose `detail` is a `platform.harness-offer@1`; the envelope keeps
`trust`, `health`, `latency_ms`, `pricing` and `capabilities`.
- `platform.harness-offer@1` gains four optional fields: `task_capabilities` (unique; `edit`, `review`, `browse`,
  `run`, `test`, `plan`), `runtime_needs` (unique runtime names such as `git`, `node`, `python`, `docker`; pattern
  `^[a-z][a-z0-9.-]*$`, at most 40 characters), `byo_key` (the caller supplies their own provider key) and
  `success_rate` (0 to 1, the measured share of routed tasks that finished green). The example carries them; fixtures
  `fabric-routing` (valid), `unknown-task-capability` and `success-rate-over-1` (invalid).
- `platform.resource-offer@1`: no schema change. The `capabilities` description names the harness convention:
  `task:edit`, `task:review`, `task:browse`, `task:run`, `task:test`, `task:plan`, `harness:mcp`, `harness:resume`,
  `harness:host-access`, `harness:long-autonomy`. New valid fixture `harness-task-routing`. Additive.


**Run jobs and their metering** (plan T14 lane G, follow-up 1 of the Node gap audit):
- New `platform.runtime-class@1`: the classes `function`, `code`, `browser`, `linux`, `desktop` and `gpu`, names
  only; `function` is the first one implemented.
- New `platform.job@1`: `id` (`job_<ULID>`, the idempotency and ack key), `class`, `artifact` {`name`, `version`}
  (required for `function`), `args`, `ttl_ms`, `limits` {`wall_ms`, `cpu_ms`, `mem_bytes`} and `net` (only `deny`,
  the default).
- New `platform.job-frame@1`: the job frames on the device control link, in its `v`/`seq`/`ts` envelope. Server to
  device: `job`, `job_cancel`, `job_exit_ack`. Device to server: `job_started`, `job_stdout` (`chunk_seq`, because
  `seq` is the envelope's), `job_usage`, `job_exit` (`reason`, `code`, `result`, `usage`).
- Metering, documented in `job_usage` and `job_exit`: one `platform.usage-sample@1` reading per wall-clock second,
  `run:<job id>:<second>`, service `run`, operation `function.invoke`, unit `s`, quantity 1, or the fraction for the
  partial last second, which only `job_exit` reports. Every field comes from the job and the second, so resends and
  the `job_exit` backfill replay in Billing instead of being billed twice. The link's terminator (Bot now) writes the
  readings. `usage-sample` gains a description sentence, a `function` example and two fixtures; no field changed.
- `test/platform-run.test.js` checks the derivation. Additive.

## 0.85.0 — 2026-10-02

**Billing records usage readings** (plan T5 lane F): the capability `billing.usage.record` (active, internal,
`billing:usage`, resource constraint `none`, quota class `ledger-write`), released from OpenVibe.Billing's proposal and
listed by `manifests/services/billing.json`. `POST /api/v1/usage` takes one `platform.usage-sample@1` reading (its
`inputSchema`) and stores it without moving money; the reading's `idempotency_key` deduplicates retries (same reading:
200 with the stored row; a different one under the same key: 409 `billing.usage_key_reused`). Listing all readings
(`GET /api/v1/usage`) stays under `billing.ledger.admin`. New `billing.usage-record-result@1` (its `outputSchema`):
`{ record }` with the stored row's `id`, `idempotency_key`, `project`, `subject`, `service`, `at`, `received_at`,
`principal` and the `reading` itself; fixtures `recorded` (valid) and `reading-without-idempotency-key` (invalid).
Network grants for the usage producers follow this release. Additive.

**Node principals, node capabilities and per-kind resource offers** (plan T1 lane A, the contracts brief of
OpenVibe.Network `docs/t2-cells-and-node-principal.md` §9.1):
- `lib/ids.js`: `PREFIX.node = 'nod'`; `principalSub({ type: 'node', id })` gives `node:nod_<ULID>`. A node is a
  principal only: `node` is not a `SUBJECT_TYPES` entry nor an `identity.subject-ref@1` type.
- `identity.service-token-claims`: `sub` also accepts `node:nod_<ULID>` and `actor_type` gains `node`, so
  `verifyServiceToken` accepts a node token and still rejects a malformed node id. Fixtures `node-token` (valid) and
  `node-bad-id` (invalid).
- New capabilities `network.node.manage` (a service mints pairing codes and reads or revokes the node principals it
  paired; `nodes:pair`, `nodes:read`, `nodes:revoke`), `network.node.self.manage` (a paired machine presents its own
  capabilities and rotates its own credential; `nodes:self`) and `network.resource.report` (a source reports its
  complete set of `platform.resource-offer@1`; `resources:write`), all active, internal and listed by
  `manifests/services/network.json`. Their bodies are Network-local, so they name no schemas and are recorded in
  `compatibility/capability-schema-gaps.json`. `network.node.report` is also implemented by
  `POST /internal/registry/instances/report`.
- `platform.resource-offer`: `kind` gains `storage`, `delivery`, `runtime`, `agent` and `harness`; the new
  optional `detail` is required for those kinds and validated by the kind's own `platform.<kind>-offer@1`, and is
  forbidden for `node` and `provider`. Fixtures `storage`, `delivery`, `runtime`, `agent`, `harness` (valid, beside
  `owned-node` and `provider`), `storage-without-detail` and `node-with-detail` (invalid).
- Optional fields: `platform.service-instance` `route_weight` (integer 0-1000); `platform.node-capabilities`
  `capabilities` (resource-offer capability form), `agent_version` (at most 40 characters) and `updated_at`
  (date-time); `network.node` `cell` (`^[a-z]{2,8}-[0-9]{1,3}$`). Fixtures `route-weight`, `agent-report` and
  `with-cell` (valid), `route-weight-over-1000`, `bad-capability` and `bad-cell` (invalid).

Additive.

## 0.84.0 — 2026-10-02

Add nine public `platform.*@1` schemas: usage and telemetry samples; node capabilities and
service instances; runtime, storage, delivery, agent, and harness offers. Each has valid and
invalid fixtures. ADR-034 is proposed. Generated types and bundle include all nine.

`platform.usage-sample@1` can carry all 15 plan T5 usage fields in one reading (lane F). It gains four optional
fields: `free_allowance_used` (non-negative number in the reading's own `unit`, at most `quantity`),
`vibes_charged` (non-negative integer count of vibes-bits, Billing's ledger minor unit; absent means not rated),
and `route_epoch` and `trace_id` (same types as in `platform.telemetry-sample@1`). Readings without these fields
still validate. New fixtures: `all-fifteen-fields` and `minimal` (valid); a fractional or negative `vibes_charged` and
a negative `free_allowance_used` (invalid). Additive.

The OpenVibe.Sites catalog (`sites.json`, 33 domains) moves into Contracts so Sites can be deleted. Additive.
- `registry.service-manifest` 1.1.0: `site` gains the optional `tld`, `accent`, `description`, `pillars`, `faq`,
  `keywords`, `vision`, `highlight`, `launch` and `relationships` (`service`, `plannedRepo`, `noRepo`, `linksLead`,
  `links`, `meanwhile`, `statusApi`), defined once in `registry.product@1`'s `$defs`. Filled from the catalog for the
  ten services whose site presents their catalog domain: news, reviews, tips, vip, trade, host, deals, coupons,
  openre (openre.stream) and space.
- `registry.product@1` (new) and `manifests/products/<domain>.json` for the other 23 catalog domains, with no
  invented service manifests: the Network sub-domains (auth, api, admin, themes), the media-hub brands (video, pics,
  download), ai.openvibe.network (moved) and ai.openvibe.services, realtime (closed), status, openvibe.events and the
  planned products (food, quest, rent, homes, services, run, website, help, bot, watch, actor).
  `relationships.service` names the manifest that serves a domain when one does.
- `contracts.products` (`manifests`, `get`, `siteDomain`, `catalog()`); `test/product-catalog.test.js` asserts each
  of the 33 snapshotted Sites domains has exactly one home and every home validates.

## 0.83.0 — 2026-09-29

**Host site configuration** (plan T12 J3): the capability `host.site.config` (active, first-party, `host:write`, project
role checked by Host) with `host.site-config@1`, `host.site-config-request@1` and `host.site-config-result@1` and their
fixtures, listed by `manifests/services/host.json`. GET, PUT and DELETE `/api/v1/sites/:id/config` read, replace and
reset a site's response headers (the platform's security, routing, caching, scope and transport headers and every
X-Forwarded-* are refused), its local-only redirects and its SPA fallback. Additive.

## 0.82.0 — 2026-09-29

**Space and the media hub: the forum moves off Community and the three new products register** (plan T10, D1–D4).
- Two service manifests, both `status: placeholder` / `exposure.state: placeholder` (the schema has no `planned`; a
  placeholder is "charter only", which is what these are until each serves): `manifests/services/space.json`
  (OpenVibe.Space, `openvibe.space`) and `manifests/services/media-hub.json` (OpenVibe.MediaHub). The media hub carries
  all three brand domains in one manifest (`domains: [openvibe.video, openvibe.pics, openvibe.download]`, the same list
  mechanism Network/Live/OpenRe/Games already use); the per-brand nav entry awaits the ADR-039 brand mechanism (T11).
- The forum capabilities are renamed off Community: `community.space.read` → `space.forum.read` (active),
  `community.space.manage` → `space.forum.manage` (planned), `community.thread.read` → `space.thread.read` (active),
  `community.post.create` → `space.post.write` (active), plus the new planned `space.thread.write` and
  `space.pulse.read`. The four old capability manifests stay loadable with `status: deprecated` and are still listed by
  `community` until their window closes.
- The seven forum contracts are re-owned under `space.*` (`space.forum-space/thread/post`, `space.forum-read-result`,
  `space.thread-read-result`, `space.post-write-request/result`) with fixtures; the `community.*` originals go
  `deprecated` in the catalog and get a `compatibility/deprecations.json` record naming the replacement and window
  (compat vs v0.80.0: no breaking changes). Contracts only exist for the three active capabilities.
- The smallest honest set for the media hub, all planned: `video.vod.read`, `video.playlist.read`,
  `video.playlist.manage`; `pics.image.read`, `pics.image.upload`, `pics.album.read`, `pics.album.manage`;
  `download.file.read`, `download.file.upload`, `download.share.create`. No media-hub capability is active, so none has
  a request/result contract yet.

## 0.81.0 — 2026-09-29

**Opaque cursors beside the global seq** (plan T7, ADR-042, additive).
- `events.publish-result@1` gains an optional `cursor` per stored event; `events.read-result@1` gains `cursor` per
  event, `next_cursor` per page and `cursor` on a single event. A cursor is opaque (a position plus a retention epoch):
  hand it back as `after=` or `Last-Event-ID`, never parse it. Events returns both `seq` and `cursor` for one release,
  then `seq`, `next_after_seq`, `latest_seq` and the global-order promise go.
- ADR-042 (the events fabric) is recorded in docs/adr.

## 0.80.0 — 2026-09-29

**`chat.moderation.read`: how Live reads the chat tables Chat owns** (plan T3, the six staged tables).
- New internal capability (owner `chat`, active): `GET /internal/moderation/channels/:channelId` (a channel's moderation
  settings, every `channel_moderation_settings` column with Live's defaults when there is no row, and its moderator ids),
  `GET /internal/moderation/users/:userId/channels` (the channels a person moderates) and
  `GET /internal/moderation/channels/:channelId/emote-count`. Loopback only, service token.
- Result contracts with fixtures: `chat.channel-moderation-result@1`, `chat.moderated-channels-result@1`,
  `chat.emote-count-result@1`. Chat's manifest lists the capability.

## 0.79.0 — 2026-09-29

**Service-token capabilities for every internal call that still used X-Internal-Key** (plan T2, register C-50–C-58).
- New internal capabilities, each with request/result contracts and fixtures: `network.avatar.write` (a site reports an
  avatar change to Network), `network.registry.read` (the resolved URL registry), `network.coins.read` (OpenCoins totals,
  never balances of named people), `live.avatar.write` (Network pushes an avatar to Live), `live.url_registry.refresh`,
  `live.analytics.read` (aggregate totals for Network's navigation), `media.avatar.ingest` (Network asks Media to import
  an avatar), `tools.analytics.read` (the Tools gateway's and tool sites' aggregate analytics).
- Avatar URLs in the avatar requests must be on `https://openvibe.media/`.
- The owning services' manifests list them.

## 0.78.0 — 2026-09-29

**OpenVibe.Realtime is gone from the estate** (plan T0).
- **The `realtime` service manifest is removed** (`manifests/services/realtime.json`). ADR-005 (accepted 2026-09-22) closed OpenVibe.Realtime: browser realtime is a delivery plane inside OpenVibe.Events, and the service was never built, so the estate described something that does not exist. The ADR-005 contracts it did define are unaffected and stay: `identity.realtime-ticket-claims@1`, `network.realtime-ticket-result@1` and `network.notification.created@1` are all first-party Network contracts. No capability, event, namespace or contract referenced the service, so nothing else changes. Reopening it, as ADR-005 says (measured connection counts or fan-out latency that need an independently scaled process), would be a new ADR and a new manifest.

## 0.77.0 — 2026-09-28

**Agents, confirmations, the adaptive fabric and the resource index** (roadmap section 4C: WS-Z1, WS-Z2, WS-Z3, WS-Z7, WS-Z9).
- `identity.subject-ref@1` gains the **agent** subject (`agt_<ULID>`): an agent (OpenVibe.Actor, or a developer app's agent) acting under grants its owner delegated. `ids` knows the `agt` and `cnf` prefixes; `principalSub` accepts agents (`agent:agt_…`).
- `events.event-envelope@1`: optional `on_behalf_of`, the person or project an agent or app acted for.
- `capabilities.capability@1`: optional `sensitive`. Sixteen capabilities with external side effects are marked (money movement, publishing, sending messages, deleting): an agent needs its owner's confirmation for them unless a standing rule covers it.
- `network.confirmation-request@1`: a sensitive action waiting for its owner (pending, approved, denied, expired, cancelled; once, session, until, always).
- `events.delivery-policy@1`: an event type's delivery class (realtime_ephemeral … webhook), durability, per-key ordering, latency targets, retention tiers, routing objective, batching, residency and a payload ceiling of 64 KB.
- The fabric (`platform.*`, first-party): `resource-offer@1` (a node's or provider's capabilities, multidimensional capacity, latency, health, pricing), `workload-requirements@1`, `placement-result@1` (the explain answer), `placement-plan@1` (signed, expiring route plans), `rate-card@1` (a provider price in its real unit, with its free allowance, source and verification date), `provider-state@1` (usage, forecast, reserve), `cost-snapshot@1` (with counterfactuals), `capacity-snapshot@1`.
- The resource index: `common.resource-summary@1` and `common.resource-list-result@1` (GET /api/v1/resources in every service); `common.resource-cost@1` (a charge in weighted cost units with an idempotency key).
- Fixtures for each, and the regenerated OpenAPI and JSON Schema bundle.

## 0.76.0 — 2026-09-28

**The node registry** (ADR-034 section 12; roadmap WS-X1).
- `network.node@1`: one machine of the platform as the registry lists it: its roles (web, app, data, media-worker, ingest, edge-probe, edge-relay, edge-cache, gpu, staging, ci), region-level location (region, country, optional city and coordinates), provider, an HTTPS beacon clients time for their round trip, and health. No addresses, capacity or secrets are public.
- `network.node-report-request@1` and `network.node.report` (internal, held by Host): `POST /internal/nodes/report` sends the complete set of nodes one inventory knows. A node absent from a later report of the same source is marked down, never silently deleted.
- `network.node-list-result@1`: `GET /api/v1/nodes` (public, `?role=`, `?region=`), the input of openvibe-sdk/geo's `nearest()`.

## 0.75.0 — 2026-09-28

**Per-streamer AI budgets are AI quotas** (roadmap WS-O task 2).
- `ai.quota.attribution.manage` (first-party): a service caps what runs attributed to one of its own entities may cost or request per hour or day (`PUT /api/v1/attribution-quotas/{attribution}`, `ai.attribution-quota-put@1`, optionally only for workflows under a prefix). It reads the cap with what the window has used (`ai.attribution-quota@1`) or removes it. The attribution's service must be the caller: Live caps `live:user:<id>`, a streamer's daily AI-viewer budget. A run over the cap is refused 429 `quota.exceeded` before any provider is called.

## 0.74.0 — 2026-09-28

- `ai.credential-put@1`: `api_key` is optional after the first put. The stored key is kept for a change of models or budget, but must be entered again to change `provider` or `base_url`, so a key never follows a new endpoint on its own (400 `credential.key_required` otherwise). Roadmap WS-O task 2.

## 0.73.0 — 2026-09-28

**A person's own provider key lives in OpenVibe.AI** (roadmap WS-O task 2).
- `ai.credential.manage` (first-party): the service that holds a person's consent (Live, for a streamer's AI viewers) stores their key at `PUT /api/v1/credentials/{subject}` (`ai.credential-put@1`: provider openai or anthropic, an https `base_url`, the key, models per role, and an optional `budget_usd_per_day`). It reads it back without the key (`ai.credential@1`, a four-character hint and today's spend) or deletes it. Only the storing service uses or changes a credential.
- `ai.run-request@1` gains the optional `credential { subject }`. The run calls that provider with that key only: no fallback, never cached, the shared paid budget untouched, and the credential's own daily budget enforced. Chat operations only.

## 0.72.0 — 2026-09-27

**Mod principals in Network** (roadmap WS-M task 3, ADR-013).
- `mods.grant.manage` is active. A runtime (OpenVibe.Games) registers an install's principal `mod:<mod_id>` (`POST /internal/mods`, `network.mod-install-request@1`: the manifest, and the subset staff approved at install; the rest stays pending). It then approves or revokes one capability (`POST /internal/mods/{mod_id}/grants`, `network.mod-grant-change@1`) or revokes the install (`POST /internal/mods/{mod_id}/revoke`). It reads them with `GET /internal/mods[/{mod_id}]`. Only the owning runtime or Network staff (`staff.games.manage`) change a mod.
- `network.mod-principal@1`: the principal with requested, approved, pending and revoked capabilities, and a revision.
- `network.mod.grants_changed@1` (internal): after every change, the complete approved set (by revision), the change, and whether the runtime or staff made it. The owning runtime sets its copy to it. Games lists it as consumed.

## 0.71.0 — 2026-09-27

**Account export and deletion** (roadmap WS-B task 7, ADR-033).
- `network.account.export_requested@1` (internal): a person asked for a copy of their data. Each service that keeps data about people pushes its part to `POST /internal/account-exports/{export_id}/parts` (`network.account-export-part@1`: JSON files of the subject's own rows, at most 20 MB) with the new capability `network.account.export.contribute`, before the deadline (30 minutes).
- `network.account.deleted@1` (internal): the 30-day grace ended and Network erased what it owns. Each service erases its rows once per `deletion_id`, as follows:
  - authored content goes, except items with others' replies, which stay as authorless tombstones;
  - votes go, and counts are recomputed;
  - money rows stay, pseudonymised, and held media stays.

  It then confirms at `POST /internal/account-deletions/{deletion_id}/confirmations` (`network.account-deletion-confirmation@1`, counts only) with `network.account.deletion.confirm`. `aliases` names subjects merged into the account earlier.
- `network.account-export@1` (the job the person sees: pending, ready, partial, expired or failed, with each service's state), `network.account-deletion@1` (scheduled, cancelled or deleted), and `network.account-data-receipt@1` (Network's answer to a part or confirmation).
- Live, Chat, Community, Media and Games list both events as consumed.

## 0.70.0 — 2026-09-27

**Account merge, the revocation reason and module policy** (roadmap WS-B task 5, ADR-029).
- `network.user.token_valid_after` gains the reason `account_merged`: a folded-in account's tokens end when it merges (its sessions moved to the survivor). Consumers treat every reason the same.
- `modules.namespace@1`'s description follows ADR-029. When both accounts have a record in a namespace, the survivor keeps its own and gains only the top-level fields it lacks; its values always win. Before, the absorbed record was simply dropped.

## 0.69.0 — 2026-09-27

**Account merge** (roadmap WS-B task 5, ADR-029).
- **`network.subject.merged@1`** (event, first-party, visibility internal): `{ merge_id, from, into, merged_at, initiated_by, split_until? }`. `from` is now an alias of `into`. Network has moved what it owns (providers, sessions, OAuth grants, developer projects, OpenCoins, user modules) in the transaction that queues it. Each service repoints its own rows from `from` to `into`; a row it cannot move keeps the survivor's and drops the other, counted. Apply once per `merge_id`. Listed in Network's manifest `eventsProduced`.
- **`network.account-merge-result@1`**: the answer of a merge, what Network moved as counts, and `replayed` for a retried merge.
- **Staff map 1.2.0: `staff.identity.merge`** (owner, since 1.2.0): an account-recovery merge with a written reason and an audit row. People merge their own accounts without it, signed in to both. An owner token issued from map 1.1.0 holds it by role.

## 0.68.0 — 2026-09-26

**Creator analytics from events** (roadmap WS-E task 6).
- **`live.stream.ended` gains an optional `stats` object:** peak and average viewers, unique chatters, messages and watch minutes. It holds counts only, never who.
- **New schema** `network.creator-analytics-result@1`: a creator's daily and per-stream analytics, built on Network from `live.stream.ended`.
- **New capability** `network.analytics.creator.read` (first-party): the full figures for Live's creator dashboards. Streams, minutes and peak viewers are public.

## 0.67.0 — 2026-09-26

**Products write follows on a person's behalf** (ADR-030 step 4).
- **New capability** `network.follows.write` (first-party, never for apps): PUT and DELETE `/internal/follows/:type/:target` on Network, with the follower named in the request.
- **New schema** `network.follow-write-request@1` (`follower`, `notify_email?`, `notify_push?`). Live's follow buttons use it, and Live keeps its table as a projection of `network.follow.*`.

## 0.66.0 — 2026-09-26

**Incidents and maintenance on the status page** (roadmap WS-N task 12).
- **New schemas** `network.status-incident@1` (an incident or maintenance window: kind, title, severity, state, services, start and end, updates), `network.status-incident-list@1` (public: `active` and the last 30 days' `recent`) and `network.status-incident-request@1` (open one, or add an update).
- **New capability** `network.status.incident` (internal, never for apps). It covers POST /api/v1/status/incidents and /:id/updates, for staff admins and the Host principal (`ovhost incident`, `ovhost maintenance`).
- ADR-032 (containers for platform services) is accepted: services stay systemd units.

## 0.65.0 — 2026-09-26

**The follow graph on Network** (roadmap WS-E task 4, ADR-030).
- **New event types** `network.follow.created` and `network.follow.deleted` (subject visibility for the follower). Their payloads carry `follower`, `target_type` (`channel` today: a Live channel named by its owner's subject), `target_id`, the notify flags, a per-pair `revision`, and for a delete a `reason`. Products keep projections they can rebuild.
- **New schemas** `network.follow-status-result@1` (the public follower count, plus the caller's own follow when signed in) and `network.follow-list-result@1` (a page of follows, never public).
- **New capability** `network.follows.read` (first-party, never for apps): who follows a target, for notifications and projections.

## 0.64.0 — 2026-09-26

**Wiki VIP spaces and pages** (roadmap WS-K task 8).
- **`vip` joins Wiki's visibilities** (between `members` and `private`). It covers `wiki.space@1`, `wiki.page@1`, `wiki.space-write-request@1`, `wiki.page-write-request@1` and the `wiki.page.updated`, `wiki.page.published`, `wiki.page.unpublished`, `wiki.page.deleted` and `wiki.space.updated` payloads.
- **Who reads it:** a `vip` space or page is read by the space's roles and by the viewers OpenVibe.VIP admits as members of the space owner. OpenVibe.Wiki asks `vip.resource.policy.evaluate` with the resource `wiki/page/<id>` when the page itself is VIP-only (else `wiki/space/<id>`), and the fallback `{ requirement: 'member', binding: 'wiki:gated_page' }`.
- **Where it never appears:** in search, sitemaps or feeds (its index document is a tombstone, like `members`).
- **Official spaces** have no VIP owner, so Wiki refuses `vip` there.
- Widening only: every earlier value stays valid.

## 0.63.0 — 2026-09-26

**Project usage rollups** (roadmap WS-N task 4, ADR-014): what feeds the per-project dashboards on OpenVibe.Codes.
- **New `common.usage-recorded@1`**: one closed window (an hour or a day) of one developer project's use of one capability in one environment, as the owning service counted it: `project_id`, `env`, `capability`, an optional `dimension` (a job type or tool id), `unit`, `window`, `window_start`, `window_end`, `quantity`, `errors`, `error_codes` (up to 20) and `samples` (up to 10 recent failures: time, code, status, trace id and a job, event, run or object id), plus `revision`. Totals, not deltas: a later rollup with the same key replaces the earlier one. It never names who did the work (no subject, app, address, session, input or message), and no producer emits one per request.
- **New event types `tools.usage.recorded`** (a Tools satellite's hour of a project's jobs, unit `jobs`, per `tools.job.create` or `tools.tool.run` and job type or tool) **and `events.usage.recorded`** (Events: `events.app.publish` in `events`, refusals as errors; `events.app.subscribe` in `deliveries`, failed webhook attempts as errors). Both payloads are `common.usage-recorded@1`; envelope subject `{ type: project, id: <project_id> }`, visibility `internal`, priority `low`. The Tools and Events manifests produce them; Network consumes both.
- **New `network.project-usage-result@1`**: what `GET /api/v1/projects/:project/usage?days=&env=` on Network answers a project's owner, admins and staff: daily rows and range totals per service, capability, unit and environment, the project's recorded quotas with what their current window used, and errors by code with the recent sampled failures.
- `npm test` checks that each `<service>.usage.recorded` is the common payload, owned by its service and consumed by Network, and that a rollup carries no identity and at most ten samples.

Additive.

## 0.62.0 — 2026-09-26

**Operator alerts** (roadmap WS-H task 11; the delivery path that Host's Prometheus alerts lacked).
- **New capability `network.operator.alert`** (internal, owner network), implemented by `POST /internal/operator/alerts` on OpenVibe.Network and granted to the Host principal. The request is the complete set of alerts firing now at one source (`prometheus`). Network pages the operator (the owner account) as a critical or high `admin` notification when an alert opens, reminds once a day while it stays open, and sends a resolved notice when it drops out of the set. Being an `admin` notification, it reaches the bell, web push and the realtime topic, and no block hides it.
- **New schemas** `network.operator-alerts-request@1` (source, sent_at, up to 200 alerts: fingerprint, name, severity, summary, description, service, started_at; no free-form labels) and `network.operator-alerts-result@1` (firing, opened, reminded, resolved, notified).

## 0.61.0 — 2026-09-26

**A person's realtime topic and realtime tickets** (roadmap WS-E task 3, WS-F task 1; ADR-005 amendment 2).
- **New event type `network.notification.created`**, payload `network.notification.created@1`. Network writes it to its outbox in the transaction that stores a notification. Envelope: subject `{ type: user, id: <recipient usr_> }`, visibility `subject`, actor `system:network`. The payload is the id, type, category, priority, service, `created_at` and the recipient's unread count; never the title, message, link or sender. The Network manifest produces it. "`user:<id>`" in the roadmap is this event type plus subject visibility: a browser subscribes to `network.notification.*` and receives its own events only.
- **New `identity.realtime-ticket-claims@1`**: the two-minute, single-use RS256 ticket with which a browser opens Events' `/realtime/stream?ticket=…`. Its claims are `iss <network issuer>/realtime`, `sub <usr_>`, `aud [openvibe.events]`, `typ realtime`, `purpose realtime`, `iat`, `exp` and `jti rtk_…`. Three rules each keep it from passing for a session: the issuer, `typ` and the audience.
- **New `network.realtime-ticket-result@1`**: what `POST /api/v1/realtime/ticket` answers. That is the ticket, `expires_at`, `expires_in` (at most 300), `stream_url`, `topics` (Events patterns only, never `user:…`) and `subject`.
- The Events manifest's notes name the ticket. There are fixtures for all three contracts, and `npm test` checks that the event never carries notification text or the sender, and that a ticket never has a session's issuer or claims.

Additive.

Also in this release, ADR-007 amendment 2026-09-26: SQLite recorded as the reviewed store for every service, with Events', Chat's and Billing's measured production load and the thresholds that would move a service to PostgreSQL (WS-S task 1). Documentation only.

## 0.60.0 — 2026-09-26

**Release manifest 1.2.0** (`registry.release-manifest`, roadmap WS-P task 7, ADR-016 amendment 2). Three optional fields:
- `client_generation`: the generation of the client this release serves.
- `min_client_generation`: a tab below it reloads at the next safe moment (reason `required`).
- `shell`: `{ version, components }`. A tab whose shell differs is prompted, never updated in place.

Fixtures cover a full 1.2.0 manifest, a negative generation and a bad shell version. Additive.

## 0.59.0 — 2026-09-26

**Media namespaces and grants** (roadmap WS-G task 2). Media's grants are five verbs, each one capability checked per namespace: read (`media.object.read`), list, write (`media.object.upload`), delete and transform (`media.derivative.create`).
- **New capabilities**, public and active, namespace-scoped: `media.object.list` (object, job, namespace and v1 file lists; answers `media.object-list@1`) and `media.object.delete` (soft delete, restore, v1 file delete; answers `media.object@1`, announces `media.object.deleted`). The Media manifest lists them. Media keeps accepting the older ids for them: `media.object.read` lists and `media.object.upload` deletes and transforms, unless a namespace's policy is `strict_verbs`.
- **New contracts** `media.object@1` (an object of the v2 object API, with its `namespace`) and `media.object-list@1` (a page of the object list), with fixtures.
- `media.derivative.create` stays planned: its description now says Media accepts it as the transform verb (checked for the job's object's namespace), and it lists the cancel route. `media.lifecycle.read` and `media.lifecycle.transition` say which verbs guard their routes today.
- `identity.service-token-claims@1` (description only): a developer app token's `ns` carries its `project_id` and `app.<project_id>.*`; on Media `app.<project_id>` and `app.<project_id>.sandbox` are the project's namespaces. New valid fixture `app-project-namespaces`.

Additive.

## 0.58.0 — 2026-09-26

**Release notifications** (roadmap WS-P task 9, ADR-016 amendment 1). A new event type, **`host.release.published`**, with the payload contract `host.release.published@1` (catalog visibility public). It means a network service's release went live.
- **Who publishes it.** OpenVibe.Host's operator plane: `ovhost deploy|rollback`, and `ovhost announce` for services deployed by their own scripts.
- **Envelope.** Subject `{ type: release, id: <service>:<release> }` and visibility public. Signed-out browsers get it over Events realtime, and openvibe-shared release-watch (1.17.0, `topics=host.release.published`) checks `/release.json` at once.
- **Payload.** `service`, `release` (the `/release.json` release id, with the release manifest's pattern), `commit` or null, `origin` (an http(s) origin) or null, `deployed_at`, and optionally `components` (kind and version only, at most 32) and `rollback: true`. Identifiers only.

`host.deploy.activated` also gets its payload contract, `host.deploy.activated@1` (first-party), which is what Host's Stage B already emits for a tenant site's activation: `project_id`, `site_id`, `site`, `deploy_id`, `previous_deploy_id`, `rollback`. It has subject `deploy` and visibility internal. The two types never share a payload, and fixtures check that neither passes for the other. The host manifest lists `host.release.published` in `eventsProduced`. Additive.

## 0.57.2 — 2026-09-26

**Three decisions** (documentation only): ADR-029 account merge (WS-B task 5), ADR-030 follow graph (WS-E task 4), ADR-031 S3-compatible surface for Media (WS-N task 8). Each is accepted with its acceptance tests; the implementations follow in Network, Live and Media.

## 0.57.1 — 2026-09-26

**ADR-024 amendment 1** (roadmap WS-E task 2): the theme preference stays Network's own data (not a user module); community themes are reviewed before they are public; theme names and values are allow-listed (shared tokens; colours, numbers, lengths and shadows only); themes import and export as `openvibe-theme@1` files. Documentation only.

## 0.57.0 — 2026-09-26

**Chat rooms on the realtime plane** (roadmap WS-I task 9). Two event types OpenVibe.Chat produces, with payload contracts:
- `chat.room.message.created` — a message in a **public** room, visibility public, so browsers subscribed to `chat.room.*` get it over Events realtime (replay capped by the public window). Private rooms and DMs never emit it; they stay on Chat's WebSocket.
- `chat.room.message.deleted` — ids only, with `redacts` (subject_type `chat_room_message`), when a public room's messages are deleted or the room turns private or is archived, so the text stops being replayable.

## 0.56.1 — 2026-09-26

**ADR-005 amendment 1: presence** (roadmap WS-F task 2). Presence is ephemeral and lives in Chat's delivery plane: room user lists over Chat's WebSocket, and `GET /api/chat/online?users=` for other products; no Events topic carries it, and people hidden by `chat.presence_prefs` (or whose preference is unknown) read as offline. `test/presence-policy.test.js`: no presence event type in any manifest. Documentation and a test; no schema change.

## 0.56.0 — 2026-09-26

**Loyalty summary and the loyalty-is-never-money test** (roadmap WS-K task 9).
- New user-module namespace `live.loyalty` (owner live, private): `channel_points_total`, the top ten `channels` by points (`channel`, `points`), `arena_level`, `arena_xp`, `computed_at`. A summary Live writes; Live's `channel_points` and `arena_trash_levels` stay the truth.
- `test/loyalty-policy.test.js` (run by `npm test`): loyalty namespaces are private and carry no money-like field; no `network.coins.*` or loyalty capability withdraws, cashes out, converts or prices loyalty; no `billing.*` capability takes or pays loyalty; the OpenCoins request bodies carry no price. The OpenCoins transfer grant stays revoked in Network (`REVOKED_GRANTS`, ADR-012 rule 5).

## 0.55.1 — 2026-09-26

**Lifecycle declarations follow the shutdown and fencing fixes** (WS-P task 1 follow-ups). Manifest text only; no schema change.
- `tools`: every process, the gateway included, stops through a shared graceful stop: timers, pollers and job workers first, then the HTTP drain (4 s, Connection: close, event streams closed), usage flush, databases and pools, exit 0 within the 5 s already declared. The note about the gateway having no SIGTERM handler is gone.
- `games`: `deadlineSeconds` 0 → 10 (the unit allows 30). The stop now refuses new connections and upgrades, stops the simulation and timers, closes every game and editor socket with 1012 after announcing the restart (each close saves that character), saves the world, lets requests finish, awaits the mirror, the progress summaries and the outbox, then closes world.db.
- `community`: the Pulse subscription retries, the profile and search-document scans, the Discord relay and the events outbox are now stopped (the work in flight awaited) before community.db closes, within 5 s.
- `media`: `leases.claims[0].fencing` is a real fence now: a claim's random `lease_token`, matched by renew, checkpoint, succeed, fail and cancel; a stale holder is refused and counted (`media_job_stale_completions_total`).
- `network`: the timers, pollers and the event relay are stopped on SIGTERM, analytics and network.db are closed; requests in flight get Connection: close (8 s at most).
- `ai`: the ai.run.* outbox relay is stopped after the runs drain, before the database closes.

## 0.55.0 — 2026-09-26

**Lifecycle declarations** (roadmap WS-P task 1). `registry.service-manifest@1` gains an optional `lifecycle` block, and every one of the 31 manifests fills it from its service's code and systemd units:
- `liveness`: the endpoint (the manifest's `health`) and what a 200 from it proves;
- `shutdown`: `signal`, `deadlineSeconds` (the longest the process takes from the signal to exiting, as its own forced-exit timer bounds it), `drains` in order, optional `workers` (worker units that drain on their own, OpenRe's) and a `note` for gaps (the Tools gateway has no SIGTERM handler; Games and Community drain almost nothing);
- `startupRecovery.resumes`: what the next start picks up, each as outbox, jobs, sessions, consumer, schedule or state;
- `rollback`: `conditions` (automatic and manual), `window` and `blockers` (forward-only migrations, table rebuilds, authority switches);
- `contracts.range`: the openvibe-contracts versions accepted, the same as `contractRanges`;
- `leases.claims`: what is claimed, by whom, when it lapses and how a stale holder is fenced.

A part that does not apply is `{ "none": "<why>" }` (libraries, the Examples repository, retired Realtime, static Sites). `npm test` checks that every manifest declares all six, that a running service's liveness endpoint is its `health` and its shutdown is concrete, that a library declares none for liveness, shutdown and recovery, that `contracts.range` matches `contractRanges`, and that every lifecycle field has a description. `ovhost validate` (OpenVibe.Host) refuses a host service whose lifecycle lacks a field or whose deadline exceeds its unit's TimeoutStopSec. Additive.

## 0.54.0 — 2026-09-26

**`media.moderation.action`** (ADR-022, WS-D task 1): Media's staff actions on someone else's media, which are retention holds placed or released and staff deletions or visibility changes. The payload is common.moderation-action@1, produced by media and consumed by network.

## 0.53.0 — 2026-09-26

**Moderation audit events for ten more producers** (ADR-022, roadmap WS-D task 1). **`common.moderation-action@1`** (owner network, public) is one staff or moderator action on someone else's content or account, modelled on `community.moderation.action`: `action` (a short verb id such as `post.hidden`), `target { type, id, owner_subject? }` and `actor_subject` are required; `reason` and `details` are optional; it never carries the content. Events requires an event's prefix to match its source, so each producer gets its own type, a thin schema over the shared one: **`tools.moderation.action`**, **`games.moderation.action`**, **`wiki.moderation.action`**, **`blog.moderation.action`**, **`news.moderation.action`**, **`reviews.moderation.action`**, **`deals.moderation.action`**, **`coupons.moderation.action`**, **`trade.moderation.action`** and **`codes.moderation.action`**. Each service manifest produces its type, and the network manifest consumes all ten into the moderation audit log. Fixtures for each; `npm test` checks that every one is the shared payload and that Network consumes every `*.moderation.action`. Additive.

## 0.52.0 — 2026-09-26

**`common.config-snapshot@1`** (roadmap WS-C task 7, the configuration model): one immutable revision of one service's configuration namespace (`live.site_settings`, `network.site_settings`, `media.storage_tier`), as `openvibe-shared/config` keeps it and `/api/admin/config` shows it. It carries service, namespace, a revision that grows per namespace and the previous one, a state (`proposed`, `active`, `superseded`, `rejected`, `rolled_back`), the values with every secret-class key as `{ redacted: true, fingerprint }` (an HMAC-SHA256 of the value under a secret key the service keeps per namespace: equal fingerprints within a namespace mean the value did not change, and the value cannot be recovered or guessed offline without the key), a `public`/`internal`/`secret` classification per key, a sha256 checksum over the canonical JSON of the values as shown (secrets as their markers, so anyone can check it and it reveals nothing more), who created and activated it and when, a reason, the rejection error, and `copied_from` for a rollback. A rejected revision names its error; an active, superseded or rolled-back one names when it became active. Fixtures for an active revision with a redacted secret, an imported first revision, a rejected tiering change, a rollback and a proposal; an unkeyed `sha256` marker is invalid. Additive.

## 0.51.0 — 2026-09-25

**OpenAPI 3.1 per service** (roadmap WS-C task 6): `generated/openapi/<service>.json` for each of the 24 services that own an active capability, 450 operations in all, plus `generated/openapi/index.json`. `lib/openapi.js` (`openapi.buildOpenApi()`, `openapi.index()`, `openapi.document(id)`) builds them from each capability's `implementedBy` routes and its input and output schemas:
- one operation per route, listing the capabilities it performs (`x-openvibe-capabilities`, visibility and quota class), with a bearer token as its security;
- a JSON, multipart or binary request body, or query parameters on reads;
- a `2XX` response from the output schema, and `application/problem+json` errors;
- every schema reached, as a component.

The documents are validated as OpenAPI 3.1 in `npm test` (`test/openapi.test.js`, dev dependency `@seriousme/openapi-schema-validator`), and `generate --check` keeps them current.

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
