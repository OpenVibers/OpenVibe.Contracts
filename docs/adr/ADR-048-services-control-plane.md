# ADR-048: The Services control plane — authority aggregation, OVRN and one control-operation contract

**Status:** Accepted 2026-10-04 (plan track T13, step 1). Amended 2026-10-05: the resource index owns
`GET /api/v1/resources` and OpenVibe.Network's T2 Fabric offer registry, whose public routes are currently at
`/api/v1/resources`, moves them to `/api/v1/offers` in Network's release; the resource-kind catalog below records the
id prefixes Events and Codes still owe, plus the prefixes not yet in `lib/ids.js`. Amended 2026-10-07 (step 8, the
Contracts half): only Network lists projects, Media lists objects alone, Events waits for a stored queue row, Codes
hosts no repositories, the person-owned kinds are step 8 phase 2, and the chosen prefixes joined `lib/ids.js`. No
contract schema changes.
Builds on ADR-034 §2 (one resource name) and §5 (control plane
and data plane) and on ADR-046 §6 (the data plane keeps running without the control plane). Contracts:
`common.resource-name@1`, `common.resource-control-request@1`, `common.resource-control-result@1`; helpers in
`contracts.resources` (`lib/resources.js`).

## Evidence

- **ADR-034 §2** decided that every resource belongs to a project and has one name,
  `ovrn:<service>:<project>:<type>/<id>`, used in grants, audit, events, usage records, bills and the console. The
  pattern already lives inline in `common.usage-recorded@1` `resource` and `common.resource-summary@1` `ovrn`, but no
  contract names it and no helper parses it.
- **ADR-034 §5** puts identity, projects, grants, registry, billing and deploy in a small control plane, and Media bytes,
  Events streams, AI runs and the rest in a data plane partitioned by project.
- **ADR-046 §6**: a control-plane outage stops change, never delivery. A console that writes into other services'
  databases would break that rule, because their data plane would depend on the console's writes.
- **Plan T13**: OpenVibe.Services (`openvibe.services`, reserved in `manifests/services/services.json`) is the developer
  console over every service: projects, apps, keys, grants, usage, runs, events, deploys and health. The resource index
  (`common.resource-summary@1`, `common.resource-list-result@1`, `GET /api/v1/resources`) is how it lists resources it
  does not own. Nothing yet says how it changes one.

## Decision

1. **Services aggregates authorities and owns no other service's rows.** It reads each authority's resource index and
   events and keeps at most a read model it can rebuild from them. It never opens, writes or migrates another service's
   database, and its outage leaves every authority serving its own API.
2. **Every control operation is a call to the owning authority.** Create, update, delete, start, stop, suspend, resume,
   resize, rotate, pair, grant, revoke and archive are sent as a `common.resource-control-request@1` to the control API
   of the service named by the resource, and answered with a `common.resource-control-result@1`. The authority checks
   the caller's grant, decides, applies and emits its own events; Services only shows the answer. Actor's Console and
   any other operator surface use the same contract.
3. **OVRN is the one cross-service resource name**: `ovrn:<service>:<project_id>:<type>/<id>`
   (`common.resource-name@1`), for example `ovrn:media:prj_01J…:object/med_01K…`.
   - `service` is the authority that owns the resource; `project_id` its tenancy boundary.
   - `type` is the second half of the resource summary's `kind` (`<service>.<type>`), `id` the summary's typed ULID,
     whose prefix is exactly three letters. So a name composes from any summary (`contracts.resources.nameOf`).
   - It names resources only: never a person, an app as an actor, a request, a session or an event.
   - `contracts.resources.parse` and `format` are the only parser and formatter; no service splits on `:` itself.
   - A project is addressed by its bare `prj_` id. It is not given a self-referential OVRN.

## Authority boundaries

| Concern | The authority (owning service) | OpenVibe.Services |
|---|---|---|
| Rows and bytes | owns, writes, migrates, exports and erases them | never holds them; at most a rebuildable read model |
| Grants and policy | checks the caller's capability and the `on_behalf_of` subject's grant on every control call | asks; never decides for an authority |
| Sensitive-action gate | decides which actions need confirmation and refuses until one is approved | shows the confirmation, collects the owner's approval, retries |
| Events and audit | emits the resource's events and audit rows | consumes them for its index and activity views |
| Resource index | owns `GET /api/v1/resources`, answering `common.resource-summary@1` for every resource it holds; no other public catalog is to mount that path once Network's offers move to `/api/v1/offers` (today they still share `/api/v1/resources`) | fans out, merges and paginates |
| Resource offers (T2 Fabric) | OpenVibe.Network's offer registry (`server/registry/offers.js`), currently public at `GET /api/v1/resources` and moving to `GET /api/v1/offers` (`/:offer_id` for detail, `/:offer_id/beacon` for the probe) in Network's release; reported at `POST /internal/resources/report` | shows and calls Network's control API like any other authority |
| Projects, apps, keys, nodes | OpenVibe.Network | shows and calls Network's control API like any other authority |

The project segment of every OVRN is the tenancy boundary: a control request's `resource` must be a resource of its
`project_id`, and `contracts.resources.checkControlRequest` refuses one that is not. Authorities other than Network
never list projects; every summary carries `project_id`.

**The index owns `/api/v1/resources`; the offers move to `/api/v1/offers` in Network's release.** That path belongs
to the resource index above, so OpenVibe.Network's T2 Fabric offer registry (`server/registry/offers.js`, mounted in
`server/index.js:484-485`, designed in `docs/t2-resource-registry.md`) **currently serves its public routes at**
`GET /api/v1/resources`, `GET /api/v1/resources/:offer_id` and `GET /api/v1/resources/:offer_id/beacon`, and **moves
them in a Network release** to `GET /api/v1/offers`, `GET /api/v1/offers/:offer_id` and
`GET /api/v1/offers/:offer_id/beacon`. Until that release lands, the claim that no other public catalog mounts
`/api/v1/resources` is not yet true — Network's offers still share the path. The machine report keeps
`POST /internal/resources/report`, and the internal reads keep their `/internal/resources` paths and the
`network.resource.report` guard. Moving a public route is a release-note change: OpenVibe.Network's release must name
the old and new paths.

The move has consumers outside `server/registry/offers.js` itself, which the Network release note must update with it:

- the **discovery index key** `resources: '/api/v1/resources'` in `server/registry/ecosystem.js:329` (documented at
  `:31`);
- the **public read API tables and worked examples** in `docs/t2-resource-registry.md:136-138,254`; and
- the **cutover runbook probe** in `docs/cutover-t14-user-owned-trust.md:158`.

**Resource kinds and three-letter id prefixes.** Every summary's `kind` is `<service>.<type>` and its id carries the
same three-letter prefix its OVRN uses (`lib/ids.js`). The catalog the step-8 index sweep starts from; every prefix
below is in `lib/ids.js` except `act`, `run` and `zon`, which are proposed and not yet chosen there:

| Service | Kind | Id prefix |
|---|---|---|
| Actor | `actor.actor` | `act` (proposed, not in `lib/ids.js`) |
| Codes | `codes.manifest` | `mfs` |
| Codes | `codes.release` | `rel` |
| Events | `events.queue` | **future: when Events stores queues** |
| Events | `events.subscription` | `sub` |
| Media | `media.object` | `med` |
| Run | `run.sandbox` | `run` (proposed, not in `lib/ids.js`; collides with the existing `run_` AI run ids, `contracts/ai/run.v1.json`) |
| Watch | `watch.watch` | `wch` |
| Zone | `zone.object-zone` | `zon` (proposed, not in `lib/ids.js`; today only a usage-recorded description field `<zon_id>`) |

Codes hosts no repositories, so `codes.repo` is gone. Media's index lists only its objects; its v1 vods and clips are
projections over objects (bigint ids) and are never listed. The person-owned resources — Bot robots and devices, Chat
rooms, Community spaces, OpenRe.Stream streams and Games characters — are step 8 phase 2, served like Network's
user-owned node principals: no OVRN, owner = user.

Events' `queue` is future until Events stores a queue row; `act`, `run` and `zon` are proposed but are not in
`lib/ids.js` either. `run` cannot simply be added: `run_` is already OpenVibe.AI's run-id
pattern (`contracts/ai/run.v1.json`), so a `run.sandbox` id would collide with an AI run id. The step-8 sweep chooses
every missing prefix, resolves the `run_` collision and adds them to `lib/ids.js` before those services answer
`GET /api/v1/resources`. No contract schema carries this catalog: it is prose, and recording it changes no schema.

## Idempotency and confirmations

- Every control request carries an `idempotency_key` (8–200 characters). The authority stores the first answer per
  (caller, project, key) and returns it for a repeat, so a retry after a timeout never applies an action twice. A key
  reused with a different request body is refused.
- `create` names `resource_kind` (`<service>.<type>`), because the name does not exist yet. Every other action names
  `resource`. A request never carries both.
- `dry_run: true` asks the authority to decide and explain without applying.
- **Confirmations (roadmap WS-Z2).** A sensitive action (money, publishing, deleting, physical control) is answered
  `state: refused` with `confirmation_required: { confirmation_id, reason }`. Once the resource's owner approves, the
  caller repeats the request with that `confirmation_id`. The authority issues and checks confirmation ids; Services
  never mints one.
- **Result states** describe the outcome, not the resource's own state:
  - `done`: applied.
  - `pending`: accepted; completion follows on the authority's events.
  - `refused`: carries a `problem` or `confirmation_required`.
  - `failed`: carries a `problem` (`errors.problem@1`).

  `confirmation_required` appears only on `refused`, and `done` and `pending` carry no problem.
  `contracts.resources.checkControlResult` enforces these rules.

## Out of scope

- The console surfaces, the Services repository and its deploy (T13 steps 3, 9, 15).
- The SDK client (`openvibe-sdk/resources`, step 2) and each service's resource index (steps 5 and 8).
- Each authority's action-specific `params` and `result` shapes. They stay in the authority's own contracts and are never
  redefined here.
- How a confirmation is approved (WS-Z2), billing of control calls, and moving `common.usage-recorded@1` `resource` to
  a `$ref` of `common.resource-name@1`.
- The three-letter id prefix of `events.queue` (unchosen until Events stores queues) and the
  proposed-but-not-in-`lib/ids.js` prefixes `act`, `run` and `zon`, including the `run_` collision with AI run ids, all
  still to be settled before the step-8 sweep (the resource-kind catalog under Authority boundaries).

## Consequences

- Additive only: three new catalog ids at 1.0.0. No existing schema changes.
- A Services outage stops console changes, never a service's own API or data plane.
- Rollback: consumers pin the previous release tag. Nothing reads these contracts until T13 step 2.
