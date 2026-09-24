# ADR-013: Mod manifest, trust and sandbox/resource model

**Status:** Accepted 2026-09-23. Gates Wave 12 (mods) and Wave 21 Stage C (sandboxed user code). Amended 2026-09-24: signing and review are open owner decisions; mod monetization only through Billing; manifest 1.1.0 (read/write grants, billing hooks, dependencies).

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

## Amendment 2026-09-24: open decisions, monetization and manifest 1.1.0

Roadmap §28.3 (m6 and "Mod signing and review") asks for three things this ADR left implicit.

### Open owner decisions: package signing and review

Neither is decided. Both stay **open decisions for the owner**, and nothing may fill them with a
silent default.

1. **Package signing.** Who signs a mod release and with what key: the publisher, the platform at
   review time, or both. Which artifact the signature covers: the manifest, the pack or bundle, and
   the Media asset hashes. Where a runtime checks the signature. What an unsigned release may do.
2. **Review process.** Who reviews, against which checklist, and what a review changes. It may raise
   the trust tier. It never grants anything, because tiers stay metadata. Also open: how a published
   review is withdrawn, and whether the ADR's tier names (`unreviewed`, `reviewed`, `first-party`) or
   the roadmap §15 vocabulary are final (requirement ledger D32).

Until the owner decides, installs stay as they are. Only staff install mods: Games
`POST /api/v1/mods` is staff-only, with the approved capability subset given at install. No
self-service publishing or install exists. Executable mods wait for Host Stage C in any case. The
decision will be recorded as a new amendment here, before any non-staff install path ships.

### Monetization only through Billing

A mod earns money only through Billing and marketplace primitives (ADR-012, ADR-025), never around
them:

- A mod never takes payment, never sees payment details and never holds a balance. Prices, plans and
  entitlements live in Billing and VIP, not in the mod or its manifest.
- A mod may **check an entitlement** that the person holds (`billing.entitlement.check`,
  `vip.entitlement.check`) and may **send the person to a platform checkout**
  (`vip.membership.checkout`, Billing intents). Both need the capability in the install's approved
  grants, like any other call.
- Every paid unlock a mod gates is an ENTITLEMENT (ADR-012). Game state bought with money needs its
  own ADR (ADR-012 rule 7), and so does any creator share for a mod publisher.
- A marketplace for mods is out of scope until ADR-025 is revisited.

### Manifest 1.1.0 (openvibe-contracts v0.34.0)

`mods.mod-manifest@1` gains three optional fields, so every 1.0.0 manifest stays valid:

- `permissions.readGrants` and `permissions.writeGrants` split module and Media namespace access into
  read-only and read-write, each as `{ modules?, mediaNamespaces? }`. A namespace that is only in
  `readGrants` is read-only. The older `permissions.modules` and `permissions.mediaNamespaces` still
  mean read and write.
- `billingHooks`: the entitlement checks and checkouts the mod uses, as `{ kind, key, description? }`.
  `kind` is `entitlement` or `checkout`, and `key` is an entitlement or plan key (`vip.plan:pln_…`).
  These declare intent for review and for the install screen. The capability still has to be
  granted.
- `dependencies`: other mods this release needs, as `{ id: mod_…, version: <semver range>,
  optional? }`. A runtime refuses to enable a mod whose required dependency is not installed, not
  enabled, or outside the range.

Games validates against a local copy of the 1.0.0 schema (`apps/server/src/mods/manifestSchema.ts`).
It adopts 1.1.0 when it bumps its contracts pin.
