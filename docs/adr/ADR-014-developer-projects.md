# ADR-014: Developer project, tenant and quota model

**Status:** Accepted 2026-09-23. Gates Wave 20 (Codes) and Wave 21 (Host tenants).

## Context and current evidence

- Network has OAuth clients (`oauth_clients`) and, since Wave 1, capability grants (`principal_grants`) and an audit (`principal_usage`).
- Media has per-app tenants with storage quotas; for example, the token-only `community` tenant has 10 GB.
- No developer-facing project exists. The only external integration, PowerChat, is first-party, and several internal calls still use a shared loopback key.

## Decision

- **Projects are owned by Network.** A project has an owner subject, members with roles, apps, environments (`sandbox`, `production`), credentials, grants and quotas.
- **Apps are principals.** Each app is an OAuth client with an `app_<ULID>` subject. Its credentials can be inspected, scoped, rotated and revoked. Grants come only from the capability catalog and never exceed the project's allowance.
- **Quotas are enforced by the owning service.** A quota is expressed per project and capability (for example, Media bytes, Events publish rate, AI tokens). Codes displays quotas; it never enforces them.
- **Tenancy in other services is keyed by project id.** Media tenants, Host static sites and Events subscriptions all carry `project_id`, so one revocation reaches every service.
- **Sandbox is separate.** The sandbox environment gets separate credentials and test-flagged money (ADR-012 rule 9). A sandbox token is refused in production.
- **No internal keys for developers.** No developer-facing path ever accepts `X-Internal-Key`.

## Alternatives considered

- Projects inside Codes: rejected. Codes is a portal; identity and grants must stay in the identity authority.

## Migration consequences

- PowerChat becomes the first project.
- The first-party services keep their service principals, which are separate from projects.

## Rollback

Projects are additive; disabling the Codes portal leaves grants intact.

## Acceptance tests

- A developer reaches a working Media, Events and capability integration using only public docs, the SDK and scoped credentials.
- A playground cannot exceed its project's grants.
- A revoked credential fails everywhere within one token lifetime (5 minutes).
