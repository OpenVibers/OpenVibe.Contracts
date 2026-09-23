# ADR-013: Mod manifest, trust and sandbox/resource model

**Status:** Accepted 2026-09-23. Gates Wave 12 (mods) and Wave 21 Stage C (sandboxed user code).

## Context and current evidence

OpenVibe.Games has an authoritative world with Network SSO but no mod platform. Source.OpenVibe.Games has its own scripting runtime. Nothing in the platform can install, grant, revoke or sandbox third-party code (D39).

## Decision

- **Manifest in Contracts:** a mod is described by `mods/mod-manifest.v1` in OpenVibe.Contracts: id `mod_<ULID>`, version, publisher subject, target runtime (`games.browser`, `games.source`, `live.overlay`, …), requested capabilities, resource budget (CPU ms per tick, memory, storage, outbound hosts), assets as Media object ids, and a compatibility range.
- **Grants in Network:** installing a mod creates a principal (`mod` subject) whose grants are the *approved subset* of its requested capabilities. A grant can be revoked at once, and revoking it ends the mod's effect on the next tick or request.
- **Trust tiers are metadata** (`unreviewed`, `reviewed`, `first-party`). A tier changes defaults and discovery, but never the grant check.
- **Sandbox in Host:** execution, isolation, budgets and metering belong to OpenVibe.Host (Stage C). Until then, mods run only as data plus runtime-provided scripting inside each game's own sandbox.
- **No simulation sharing:** the browser and Source runtimes keep separate simulation code. Only platform services (identity, Media, Events, grants) are shared.

## Alternatives considered

- A separate mods service: rejected. Its pieces belong to Contracts, Network and Host.
- Trust tiers as permissions: rejected. A tier label must never bypass a grant.

## Migration consequences

None today: no mods exist. Games adopts the manifest when it adds its first mod hook.

## Rollback

Revoke the grants; the manifest schema stays.

## Acceptance tests

- A capability the mod was denied cannot be reached from its scripted runtime.
- A revoked mod stops affecting the world.
- Install, grant, use and revoke all appear in the audit log.
