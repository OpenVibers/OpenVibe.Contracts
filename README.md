# OpenVibe.Contracts

> Machine-readable contracts for the whole OpenVibe network.

**Status:** alpha, v0.2 (Wave 1). Schemas, manifests and helpers are real and tested; no service validates against them in production yet.  
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

Manifests: `manifests/services/` (the 7 running services plus the 21 charter repos as `placeholder`), `manifests/capabilities/` (first set: Media upload/read, chat send, paste create, coins credit/debit, notifications push, subject resolve, Community post). Each active capability names the route that implements it today.

**Ids.** Subjects use prefixed ULIDs: `usr_`, `gst_`, `app_`, `mod_`. Services and system actors use slugs (`live`, `media`). Events use `evt_` and Media objects `med_`.

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
