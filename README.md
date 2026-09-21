# OpenVibe.Contracts

> Machine-readable contracts for the whole OpenVibe network.

**Status:** placeholder — planning only, no runnable code yet.  
**Plan:** OpenVibe End-to-End Realignment & Implementation Plan, revision 3 (20 Sep 2026), §3.1 and §18.11.  
**License:** AGPL-3.0 (same as every OpenVibe service).

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
