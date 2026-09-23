# ADR-002: Contract repository and compatibility policy

**Status:** Accepted, implemented 2026-09-22 (openvibe-contracts v0.1.0+)

## Context and current evidence

Cross-service contracts lived as prose in CONTRACTS.md and as copied code; nothing validated them.

## Decision

- `OpenVibe.Contracts` is the machine-readable authority: JSON Schema 2020-12 contracts with a catalog (id, semver, owner, visibility, compatibility, status), fixtures for every contract, generated TypeScript types, service/capability/namespace manifests.
- A contract id is permanent; minor versions only add optional fields; a breaking change is a new major file plus a deprecation record with a replacement and window.
- `scripts/compat.js` fails CI on breaking changes against the previous tag; services run `openvibe-contracts-check` in their CI.
- Consumers pin a release tarball (`codeload.github.com/.../tar.gz/refs/tags/vX`), so production installs need no GitHub credentials.

## Alternatives considered

- Publish to the npm registry: deferred; tarball pins are immutable enough and need no registry account.
- OpenAPI-first: rejected as the source of truth; OpenAPI fragments can be generated later from the schemas.

## Migration consequences

Contracts grow additively; each service moves to a new tag by bumping its pin.

## Rollback

A bad release is fixed forward (new patch tag); consumers can pin the previous tag.

## Acceptance tests

Contracts `npm test` (fixtures, catalog integrity, manifests cross-checked, compat gate), CI green on every tag; the compat gate was shown to fail on a deliberate breaking edit.
