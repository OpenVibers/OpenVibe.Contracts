# OpenVibe.Contracts

> Machine-readable contracts for the whole OpenVibe network.

**Status:** alpha, v0.33.1 (first released in Wave 1). 95 schemas (66 of them event payloads), 30 service manifests, 176 capability manifests and 6 namespace manifests. 23 repositories run `openvibe-contracts-check` in CI, and deployed services verify service and app tokens with `serviceAuth` in production. Deployed consumers pin different tags (Games v0.8.0, the rest v0.11.0 to v0.29.0); Network, which serves the registry, pins v0.28.0. No N/N-1 compatibility fixtures exist yet.  
**Plan:** OpenVibe Development Roadmap, Wave 1 (implementation plan rev 3, §3.1 and §18.11).  
**License:** AGPL-3.0 (same as every OpenVibe service).

## Using it

Pin a release tag. It's a public repo, so no deploy key is needed:

```json
"dependencies": { "openvibe-contracts": "github:OpenVibers/OpenVibe.Contracts#v0.1.0" }
```

```js
const contracts = require('openvibe-contracts');

contracts.validate('identity.subject-ref@1', { type: 'user', id: 'usr_01JAB2C3D4E5F6G7H8J9K0MNPQ' });  // { valid, errors }
contracts.ids.newId('user');                         // 'usr_01J…' (ULID, time-sortable)
contracts.ids.parseSubject('service:live');          // { type: 'service', id: 'live' }

app.use(contracts.http.middleware());                // req.ov = { traceId, requestId, traceparent, idempotencyKey }
contracts.http.sendProblem(res, 403, 'capability.denied', { detail: 'not granted', ctx: req.ov });

contracts.capabilities.check(tokenClaims, 'media.object.upload', { namespace: 'live.files' });
// { allowed: false, code: 'capability.denied' | 'capability.namespace_denied' | 'capability.unknown', reason }
```

Service principals (v0.2): a caller gets a short-lived token from Network with its OAuth client credentials, and a receiver guards a route with the capability it performs:

```js
const tokens = contracts.serviceAuth.createTokenClient({ tokenUrl: `${NETWORK}/oauth/token`, clientId, clientSecret, audience: 'openvibe.network' });
await fetch(url, { headers: await tokens.authHeaders() });

router.post('/coins/credit', contracts.serviceAuth.requireCapability('network.coins.credit', {
    publicKey, issuer, audience: 'openvibe.network',
    legacy: (req) => req.headers['x-internal-key'] === key,   // old callers keep working during migration
}), handler);
```

A request that presents a Bearer token is judged only on that token; a bad token is never rescued by a legacy header.

Contract check for a service's CI (v0.3): `npx openvibe-contracts-check --service network --src server`. It fails if the installed contracts are outside the service manifest's `contractRanges`, if the code enforces a capability (`requireCapability('…')`, `guard('…')`, `capabilities.check(…, '…')`) that is undefined, retired or owned by another service, or if it validates against a contract id that doesn't exist.

TypeScript types: `generated/typescript/index.d.ts` (`"types"` in package.json). All schemas in one file: `generated/json-schema/bundle.json`.

## What's in v0.1

| Contract | Owner | Purpose |
|---|---|---|
| `identity.subject-ref` | network | `{ type: user\|guest\|service\|app\|mod\|system, id }`: the one actor reference; never a service-local integer |
| `identity.legacy-identity-map` | network | row shape of `identity_legacy_map`: legacy id to subject, kept alongside legacy ids |
| `identity.service-token-claims` | network | client-credentials token for service/app/mod principals (replaces `X-Internal-Key`) |
| `common.entity-ref` | contracts | `{ service, type, id, revision?, label? }`: typed cross-service reference instead of a foreign key |
| `errors.problem` | contracts | RFC 9457 problem details plus stable `code`, `request_id`, `trace_id` and a compatibility `error` field |
| `registry.service-manifest` | network | what a service is, where it lives and what it offers |
| `capabilities.capability` | network | an invokable action: permissions, resource constraints, quota class, events |
| `events.event-envelope` | events | durable event shape for OpenVibe.Events (Wave 3) |
| `media.media-ref` | media | `med_<ULID>` (Wave 4) or transitional `legacy:<app>:<kind>:<id>` |

Manifests: `manifests/services/` (30 services as of v0.30.0: 23 `alpha`, 1 `beta`, 5 `stable` and 1 `placeholder`, realtime; SDK and Shared are released libraries and Examples a repository with CI, none of them a runtime), `manifests/capabilities/` (176 capabilities as of v0.33.0; the v0.1 set was Media upload/read, chat send, paste create, coins credit/debit, notifications push, subject resolve and Community post). Each active capability names the route that implements it today. Where a service is reachable today (public, loopback only, library) is Network's observed overlay (`server/registry/exposure.js` there); manifest notes say whether a service is deployed and launched publicly.

**Ids.** Subjects use prefixed ULIDs: `usr_`, `gst_`, `app_`, `mod_`. Services and system actors use slugs (`live`, `media`). Events use `evt_` and Media objects `med_`.

## User modules (v0.4)

`manifests/namespaces/*.json` define per-subject module namespaces (`modules.namespace@1`): owner, data schema, writers (`owner` service and/or the `user`), public fields, quota and what happens when the owner is retired. OpenVibe.Network stores the records (`modules.module-record@1`, revision-checked writes). `contracts.modules.validateData / publicView / canWrite` apply the same rules everywhere. Modules hold portable preferences and summaries, never domain truth, money or authoritative game inventory.

Every change to a record is announced as `network.module.updated` (v0.32): the revision after the change, the changed field names and only the new values of changed public fields. Removing an account deletes its records; merging two keeps the survivor's record where both have one and moves the rest. `onOwnerRemoved` is about the owning service being retired, not the person.

## Developer-app events (v0.28)

Three `public` capabilities let a developer app (ADR-014) use OpenVibe.Events with a scoped app token, without any first-party `events.*` capability (those stay `internal`):

| Capability | What the app may do |
|---|---|
| `events.app.publish` | publish event types `app.<project_key>.<name>[.<more>]` only |
| `events.app.read` | pull its own project's events (same environment) plus first-party `public` events |
| `events.app.subscribe` | webhook subscriptions in the same scope, to public https endpoints only |

`project_key` is `p` followed by the project's ULID in lowercase (`prj_01JAB…` → `p01jab…`), so it fits an event-type segment. An app event's `source` is `app-` followed by the app's ULID in lowercase (`app:app_01JAB…` → `app-01jab…`), which keeps `events.event-envelope@1` unchanged (its `source` pattern already allows it). OpenVibe.Events enforces the scope, the sandbox separation and per-project quotas.

## Event payload contracts (v0.30)

Every event type has a payload contract, named after the type. The envelope's `version` is the contract's major, and the file is `contracts/events/payloads/<event_type>.v<version>.json`. The owner is the producing service, whose manifest lists the type in `eventsProduced`. Contracts with status `planned` describe events the owner does not emit yet (`ai.run.*`). `tools.job.*` are `active` since v0.33.0, because Tools publishes them.

```js
if (env.payload.redacted === true) return;                               // a tombstone (events.tombstone-payload@1)
const r = contracts.validate(`${env.event_type}@${env.version}`, env.payload);
```

**Redaction (ADR-026).** Any event may carry `payload.redacts` (`events.redaction-directive@1`), shaped `{ event_ids?, subject_type?, subject_ids? }` with up to 1000 ids each, to take back the producer's own earlier events. OpenVibe.Events rewrites each target into a tombstone at its original seq: `{ redacted: true, redacted_at, redacted_by }`, with the producer itself as actor. Naming another source's event refuses the whole batch with 403 `events.redaction_not_allowed`. A malformed directive gets 422 `events.invalid_redaction`. `chat.message.deleted` always carries one. Browsers are replayed only the `public` events of the last `REALTIME_PUBLIC_REPLAY_SECONDS` (default 300); an older cursor gets `event: gap` with reason `public_window`.

## Event delivery signatures

OpenVibe.Events POSTs each webhook delivery as `{ "event": <events.event-envelope@1>, "seq": n }`, keyed with the subscription secret:

| Header | Value |
|---|---|
| `X-OpenVibe-Signature` (v1) | `sha256=<hex HMAC-SHA256 of the raw body>` |
| `X-OpenVibe-Timestamp` | `<unix seconds>` when this attempt was sent (every retry gets a fresh one) |
| `X-OpenVibe-Signature-V2` | `t=<that timestamp>,v2=<hex HMAC-SHA256 of "<t>.<raw body>">` |

v1 covers only the body, so a captured delivery verifies forever (only `event_id` dedupe limits a replay). A consumer checking v2 refuses a timestamp more than **300 s** from its own clock in either direction, compares in constant time, and never falls back to v1 when a v2 header is present but wrong or stale. openvibe-sdk ≥ 0.4.0 does this in `parseDelivery(raw, headers, secret, { requireV2 })` and `verifyDeliveryV2()`; the `openvibe-events` package has `verifyDeliveryV2()`.

Rollout: (1) Events sends v2 beside v1; (2) each consumer moves to SDK 0.4.0, which verifies v2 whenever it is present; (3) each consumer sets `requireV2: true`, so a v1-only (header-stripped) replay fails; (4) once every consumer requires v2, v1 may be dropped. See ADR-004.

## Channel/owner lineage (v0.32)

One resolver answers "which channel, and whose, is this?" for channel, stream, VOD, clip, Pulse and creator-UI callers (roadmap §15.10, D20). OpenVibe.Live implements it at `GET|POST /internal/lineage/resolve` (capability `live.lineage.resolve`, loopback). The request is `lineage.resolve-request@1`, the answer `lineage.resolution@1`.

| Precedence | Input | Rule | Confidence |
|---|---|---|---|
| 1 | `slug` | `explicit_slug` | exact |
| 2 | `slug` `<channel>/<slot>`, `parent_slug` | `nested_slug` | exact |
| 3 | `channel_id` | `channel_id` | exact |
| 4 | `stream_id`, `slot_id` | `stream_lookup` | exact |
| 5 | `clip_id`, `vod_id` | the record's lineage: its stream, its parent VOD (`vod_parent`), the owner recorded on it (`legacy_metadata`) | derived |
| 6 | `media_object_id` | `media_lineage` (`legacy_map` for a `legacy:` reference) | derived / legacy_map |
| 7 | `owner_subject` | `owner_subject` | exact |
| 8 | `legacy_ids` | `legacy_map` | legacy_map |

The first input that resolves decides. Every other input that resolves must name the same channel, or the answer is `unresolved` with reason `conflict`. A clip belongs to the clipped channel, never to the clipper. A display name never resolves anything: a request holding only one is answered `unresolved`, `display_name_only`.

## Tools platform API (v0.33)

Every tool on openvibe.tools gets a descriptor, `tools.tool@1` (ADR-027). The page, the run API,
openvibe-sdk and the docs all read it. It says:

- where the tool runs (`execution`: `client` | `sync` | `job`);
- whether the API exposes it (`api`), and how to call it (`run`);
- its input schema, files, output, limits and auth;
- its quota class and cost;
- whether it fetches hosts the caller chose (`egress`);
- optionally (v0.33.1), its catalogue `keywords`, which `?q=` searches, and `examples` of runs for the
  docs and the OpenAPI document.

| Route (openvibe.tools) | Capability | Contract |
|---|---|---|
| `GET /api/v1/tools`, `/api/v1/tools/:id`, `/api/v1/tools/:id/schema` | `tools.tool.read` (public) | `tools.tool-list@1`, `tools.tool@1` |
| `POST /api/v1/tools/:id/run` | `tools.tool.run` (public); probes need `tools.net.probe` (partner) | `tools.run-request@1` → `tools.run@1` |
| `/api/v1/jobs…` (img, audio, docs; the gateway later) | `tools.job.create`, `.read`, `.cancel` | `tools.job-request@1` → `tools.job@1` |

A run is answered inline, or with its job (202 + `Location`) while a job tool is still working.
Callers are tiered: anonymous < session < user < app/service. Quotas count each tool's `cost` within
its `quotaClass`. yt is page-only (`api: false`). Only real tools have descriptors: there is no
`planned` status, and a planned or mirror id is `404 tools.tool.not_found`. The registry routes are
served on the gateway and every satellite (`tools.tool.read` is `active` since v0.33.1); the run route
and `tools.net.probe` are `planned` until Tools serves them.

`contracts.tools.checkDescriptor(d)` and `checkList(list)` apply the rules that JSON Schema cannot
express, such as `run.path` being the tool's own, and check each example's input against an embedded
input schema. `jobInput(d, input)` builds a job tool's job input.

Tools' problem codes are listed with the routes that answer them (`tools.run-request@1`,
`tools.job-request@1`, `tools.tool-list@1`, `tools.tool@1`). They include `400 tools.query.invalid`,
`404 tools.tool.not_found`, `413 tools.pdf.too_many_pages`, `422 tools.pdf.wrong_password`,
`503 tools.unavailable` (a program or upstream a tool needs is missing), and, with `Retry-After`,
`429 tools.quota.exceeded` and `503 tools.busy`.

## Versioning and compatibility

- A contract id is permanent. Minor versions only add optional fields.
- A breaking change is a new file (`<name>.v2.json`) and catalog entry. The old one is listed in `compatibility/deprecations.json` with a replacement and a `removeAfter` date.
- `scripts/compat.js` runs in `npm test` and CI. It fails on removed or retyped properties, newly required fields, removed enum values, tightened `additionalProperties`, or catalog removals without a deprecation, compared against the previous release tag.
- `generated/` is checked in; `npm test` fails if it is stale (`npm run generate`).
- Every contract ships valid and invalid fixtures under `fixtures/<id>/`.

## Purpose

The canonical, versioned source of every cross-service contract: subject identity, error envelope, service manifests, capability schemas, event envelopes and topics, user-module schemas, media/chat/community/billing/AI/games/jobs/release schemas, plus generated TypeScript types, JSON Schema and OpenAPI fragments. Everything else in the network migrates contract-by-contract instead of through copied prose.

## Owns

- contract IDs, semantic versions, owners, visibility and deprecation state
- `SubjectRef` (`user|guest|service|app|mod|system` + stable id) and the legacy identity map shape
- request/error envelope: `traceparent`, `X-OpenVibe-Request-Id`, `Idempotency-Key`, RFC 9457 problem details, resource `revision`/ETag
- capability contract (`id`, `owner`, input/output schema, permissions, resource constraints, quota class, events)
- service manifests, namespace and topic manifests, compatibility aliases and deprecations

## Does not own

- any runtime process, database or hosted API (the registry API lives in OpenVibe.Network)
- product business logic

## Planned surfaces

- `contracts/<domain>/…` schemas with fixtures and examples
- `manifests/{services,namespaces,capabilities,topics}`
- `generated/{typescript,json-schema,openapi}` published as versioned packages
- `compatibility/aliases.json`, `compatibility/deprecations.json`

## Data (authority tables / families)

- none (artifact repository)

## Capabilities and events

- contract validation CI consumed by Network, Live, Media, Community and every new service

Events: n/a

## Depends on

- OpenVibe.Network (issues subject IDs and service principals)

## Acceptance (must be true before "done")

- every contract carries id, version, owner, schema, visibility, compatibility policy, deprecation state, examples and generated types
- a deprecated contract advertises its replacement and compatibility window
- N/N-1 compatibility fixtures pass across core services

## Bootstrap / extraction source

Derived from the implicit contracts already in the eleven current repositories (workspace `CONTRACTS.md`, Network prose contracts, Media/Live/Community route shapes). First deliverables: subject, errors, service manifest, capability schema, event envelope, media object IDs, service-token claims.

## Launch rule

This repository does not make the product real, and the domain keeps its placeholder page on
[OpenVibers/OpenVibe.Sites](https://github.com/OpenVibers/OpenVibe.Sites) until all of the
following exist here (plan §12.12):

1. an owning runtime with health/readiness endpoints and observability;
2. canonical identity/auth integration (OpenVibe.Network subjects, scoped service principals);
3. server-rendered or static public routes that are useful without JavaScript;
4. real persistence and end-to-end workflows;
5. capability and event registration against `OpenVibe.Contracts`;
6. a migration/seed strategy, a security/threat review, and sitemap/robots/feed behaviour;
7. acceptance tests proving the advertised functionality.

The launch release removes the domain from `OpenVibe.Sites/sites.json`, switches routing and
registers maturity in the ecosystem registry atomically. A placeholder is never counted as an
implemented service.

---

Part of the [OpenVibe network](https://openvibe.network). Built in the open by [OpenVibers](https://github.com/OpenVibers).

## Release note: v0.27.0 and v0.28.0

The `v0.27.0` tag (commit `742db68`) was cut on top of the `0.28.0` developer-app events commit, so its
package reports version `0.28.0` and contains both changes (Codes: `codes.app-manifest@1`,
`codes.release.*`; Events: `events.app.*`). `v0.28.0` points at the same commit. Pin `v0.28.0`; `v0.27.0`
stays for consumers that already pinned it and is identical.
