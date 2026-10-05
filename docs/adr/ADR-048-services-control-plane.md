# ADR-048: The Services control plane — authority aggregation, OVRN and one control-operation contract

**Status:** Accepted 2026-10-04 (plan track T13, step 1). Builds on ADR-034 §2 (one resource name) and §5 (control plane
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
| Resource index | answers `GET /api/v1/resources` with `common.resource-summary@1` | fans out, merges and paginates |
| Projects, apps, keys, nodes | OpenVibe.Network | shows and calls Network's control API like any other authority |

The project segment of every OVRN is the tenancy boundary: a control request's `resource` must be a resource of its
`project_id`, and `contracts.resources.checkControlRequest` refuses one that is not.

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
- Three-letter id prefixes still to be chosen before the step-8 sweep (Events queues, Codes repositories).

## Consequences

- Additive only: three new catalog ids at 1.0.0. No existing schema changes.
- A Services outage stops console changes, never a service's own API or data plane.
- Rollback: consumers pin the previous release tag. Nothing reads these contracts until T13 step 2.
