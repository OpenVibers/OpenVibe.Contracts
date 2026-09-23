# ADR-003: Service/app principal authentication and capability grants

**Status:** Accepted, implemented 2026-09-22

## Context and current evidence

First-party services authenticated to each other with one shared `X-Internal-Key` per deployment, with unrestricted reach.

## Decision

- Services obtain 5-minute RS256 tokens from Network's `/oauth/token` with `grant_type=client_credentials` and their existing OAuth client credentials. Claims follow `identity.service-token-claims@1`: `sub svc:<id>`, `aud`, `cap` (exact grants for that audience, optionally narrowed by `scope`), `ns`, `jti`.
- Grants live in Network's `principal_grants` (revocable). Receivers check one capability per route (`requireCapability` / `principals.guard` / `tenantAuth({ capability })`), plus namespace and ownership (`app_id` must be the caller's own).
- A request with a Bearer token is judged only on that token; a bad token is never rescued by a legacy key. New routes refuse the legacy key outright.
- `principal_usage` counts every decision by caller, route and auth method; the key is retired per route once legacy use reaches zero.

## Alternatives considered

- mTLS between services: deferred; one host today and tokens give per-action scope that mTLS alone would not.
- Long-lived per-service API keys: rejected, not scoped to actions and hard to rotate.

## Migration consequences

Guarded routes accept both during migration; callers fall back to the key only when no token can be had.

## Rollback

Remove a grant (new tokens stop carrying it) or stop sending tokens (callers fall back to the key).

## Acceptance tests

`OpenVibe.Network/test/principals.test.js`, `modules.test.js`, Contracts service-auth tests (forged, expired, wrong audience, alg none, tampered, ungranted, namespace, owner), Media `service-token.test.js`. Production smoke: tokens issued, cross-app and cross-namespace calls refused.
