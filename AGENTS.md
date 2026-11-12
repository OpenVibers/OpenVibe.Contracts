# AGENTS.md — OpenVibe.Contracts

## Project overview

The machine-readable contract layer of the whole OpenVibe network: schemas, ids, the HTTP/error
envelope, capability checks, service/namespace/topic manifests, the staff capability map and the
compatibility aliases. A **library**, not a service: no runtime, no database, no ports, no deploy.

- Package `openvibe-contracts`, `main` [index.js](index.js), version in [package.json](package.json)
  (currently `0.410.0`, released as the git tag `v0.410.0`).
- Every service pins a release tarball and verifies service/app tokens with `serviceAuth` in
  production; the service repositories run `openvibe-contracts-check` and the pin-drift check in CI.
- Scale at this release: 1261 schemas in [contracts/catalog.json](contracts/catalog.json), 67 service
  manifests, 523 capability manifests, 14 namespace manifests and the staff map.

## What it owns

- Contract IDs, semantic versions, owners, visibility and deprecation state.
- `SubjectRef` (`user|guest|service|app|mod|system` + stable id) and the legacy identity map shape.
- The request/error envelope: `traceparent`, `X-OpenVibe-Request-Id`, `Idempotency-Key`, RFC 9457
  problem details, resource `revision`/ETag.
- The capability contract (id, owner, input/output schema, permissions, resource constraints, quota
  class, events), namespace and topic manifests, and compatibility aliases/deprecations.
- Service manifests (what each service runs, its routes and events) and the staff capability map.
- Generated JSON Schema, TypeScript and OpenAPI artifacts, and the estate map.

Not owned: any runtime behaviour, a database, identity issuance (Network), or the implementation of a
capability (the owning service).

## How a service consumes it

```js
const contracts = require('openvibe-contracts');
contracts.validate('identity.subject-ref@1', { type: 'user', id: 'usr_…' }); // { valid, errors }
contracts.ids.newId('user');                       // usr_<ULID>
contracts.http.problem(403, 'capability.denied');  // RFC 9457 body
contracts.capabilities.check(claims, 'media.object.read', { namespace: 'live' });
contracts.resource.parse('ovrn:media:prj_…:object/med_…');
```

`serviceAuth.requireCapability(...)` judges a request that presents a Bearer token **on that token
alone**; a bad token is never rescued by a legacy header. It verifies RS256, issuer, audience and
expiry, and grants a capability only by exact id or a `family.*` grant. Production services must use it.

## Repository map

- **Public API:** [index.js](index.js) — `catalog`, `resolve`, `validate`, `assertValid`, `schema`,
  `ids`, `http`, `capabilities`, `services`, `products`, `serviceAuth`, `modules`, `tools`, `zones`,
  `usage`, `resources`, `staff`, `openapi`.
- **Implementation:** [lib/](lib/) — `registry.js` (catalog loading/resolution), `ids.js`, `http.js`,
  `capabilities.js`, `services.js`, `products.js`, `service-auth.js`, `modules.js`, `tools.js`,
  `zones.js`, `usage.js`, `resources.js`, `staff.js`, `openapi.js`, `money-reasons.js`.
- **Schemas:** [contracts/](contracts/) grouped by area (`actor/`, `agent/`, `ai/`, `bench/`, `billing/`,
  `blog/`, …), indexed by [contracts/catalog.json](contracts/catalog.json).
- **Fixtures:** [fixtures/](fixtures/) — each contract has `valid/` and `invalid/` examples.
- **Manifests:** [manifests/](manifests/) — services, capabilities, namespaces, topics, policy
  (`manifests/policy/staff-roles.json` is the one source for staff gates).
- **Compatibility:** [compatibility/](compatibility/) — `aliases.json`, `deprecations.json`,
  `corrections.json`, `capability-schema-gaps.json`, `compat.js`.
- **Generated:** [generated/](generated/) — `json-schema/`, `typescript/`, `openapi/`; never hand-edit.
- **Scripts:** [scripts/generate.js](scripts/generate.js), [scripts/compat.js](scripts/compat.js),
  [scripts/estate.js](scripts/estate.js), [scripts/docs-currency.js](scripts/docs-currency.js).
- **Service check:** [bin/check-service.js](bin/check-service.js) → `openvibe-contracts-check`.
- **Governance/ADRs:** [governance/](governance/), [docs/adr/](docs/adr/), [docs/](docs/).

## Commands

```bash
npm ci
npm test                       # every check in test/ (schemas, fixtures, manifests, compatibility, docs)
npm run generate               # regenerate generated/json-schema, generated/typescript, generated/openapi
npm run estate                 # regenerate docs/ESTATE.md and manifests/repositories/
node scripts/estate.js --check # fail on drift against the estate checkouts
node scripts/docs-currency.js <root>  # check every checkout's README/STATUS against its code
node --check <file.js>
```

The repository is consumed, never started; there is nothing to `npm start`.

## Adding or changing a contract (the release round)

1. Add the schema under the owning area in [contracts/](contracts/) with its `$id`, version, owner and
   `@1`/next-version id, and add it to [contracts/catalog.json](contracts/catalog.json).
2. Add [fixtures/&lt;id&gt;/valid/](fixtures/) and `invalid/` examples; the suite validates both.
3. Add or update the capability/namespace/service manifest if the change introduces a capability.
4. `npm run generate` and commit the regenerated files together with the schema (never by hand).
5. Raise `package.json`'s version above main's newest version, add the CHANGELOG entry, commit and tag
   `vX.Y.Z`. `scripts/compat.js` bases its comparison on `git describe HEAD^`, so a release needs its
   **own commit after the merge** — do not tag a merge commit that main has moved past.
6. Consumers bump their pinned tarball tag; a new capability id must ship here **before** the service
   that uses it, or the service refuses every caller (unknown ids fail closed).

## Versioning and compatibility

- Schemas and capabilities are semver'd: additive fields/ids are a minor, a breaking shape is a new
  `@2` contract (never an edit to `@1`), with a migration path and a deprecation entry.
- [compatibility/](compatibility/) records aliases, deprecations and corrections; the suite checks them
  against the catalog.
- A released tag is immutable: do not rewrite or re-tag it, and do not edit a released schema in place.

## Security

- `serviceAuth` verifies the token alone (no legacy header rescue), RS256, issuer, audience and expiry;
  capabilities are exact-id or `family.*`.
- The staff capability map ([manifests/policy/staff-roles.json](manifests/policy/staff-roles.json)) is
  the single source for staff gates; do not duplicate it in a service.
- Schemas carry no secrets and no personal data; fixtures use fake values, and gitleaks scans history
  in CI. Dependencies are `ajv` and `ajv-formats` only — adding one needs a reason.

## Tests

`npm test` runs [test/run.js](test/run.js), which loads every `test/*.test.js` check (the run aggregates
sub-scripts for schema validation, fixtures, capability schemas, manifests, compatibility, changelog
history, docs currency, estate). It is plain Node `assert`, no framework. A check that cannot run
prints `<label>: skipped (<why>)`; `--strict` (or `OV_TEST_STRICT=1`) makes a skip fail. `npm run
estate` and `node scripts/docs-currency.js <root>` are separate drift checks used in CI. `ov test` runs
the harness's shard.

## Pitfalls

- **Never hand-edit [generated/](generated/).** Run `npm run generate`; a generated diff you cannot
  reproduce is a bug.
- **Every schema needs fixtures and a catalog entry.** A schema outside `catalog.json` does not exist to
  consumers; a fixture-less schema is untested.
- **Do not reuse or renumber an id.** Consumers key on the exact id and version; a change is a new
  version, a deprecation and an alias where needed.
- **Do not tag before the release commit.** `scripts/compat.js` looks at `HEAD^`; tag after the version
  commit, and bump in the same commit as the generated output.
- **A capability must be released before a service guards a route with it**; an unknown id is refused,
  never allowed.
- **`docs/ESTATE.md` and `manifests/repositories/` are generated from the estate checkouts**; run
  `npm run estate` and commit the result, or `--check` fails.
- **`scripts/docs-currency.js` trusts the checkouts it is given**; run it with the estate root, not a
  single repository, when checking a pin round.
- **`serviceAuth` is deliberately strict.** Do not add a compatibility shim that accepts an unsigned or
  wrong-audience token to make an old caller work.

## Documentation

- [README.md](README.md) — the API, contract groups, versioning and purpose.
- [docs/ESTATE.md](docs/ESTATE.md) — the generated estate map.
- [docs/adr/](docs/adr/) — every architecture decision (ADR-012 money, ADR-019 publishing, ADR-035
  data, ADR-043 Bot, ADR-044 Actor, ADR-050 Codes, ADR-057 Connect, …).
- [docs/sharing.md](docs/sharing.md), [docs/locker.md](docs/locker.md),
  [docs/space-problem-codes.md](docs/space-problem-codes.md).
- [governance/](governance/) — contract governance process.
