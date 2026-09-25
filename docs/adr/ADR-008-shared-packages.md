# ADR-008: Shared package publication and release manifests

**Status:** Accepted 2026-09-22; implementation in progress (OpenVibe.Shared). Amended 2026-09-25 (one copy: libraries take openvibe-shared as a peer).

## Context and current evidence

`openvibe-shared` lived in Network and was hand-rsynced into four repositories; copies had diverged (Live user-card.js; ov-icons.js in three consumers).

## Decision

- `OpenVibe.Shared` is the canonical package, released by semver tags and consumed by tarball pin, like openvibe-contracts.
- Browser files are served by Network at `/shared/*` from its pinned package (and may be served locally by a site from `node_modules`), so a Network outage cannot blank another site's first paint beyond what the inline critical styles already cover.
- No site edits a copy; vendored copies are removed.
- Release manifests and the active-client update coordinator follow in Track R.

## Alternatives considered

- Keep vendoring with a sync script: rejected, drift already happened.
- A CDN-only global script: rejected by anti-goal 7 (mutable unversioned runtime dependency).

## Migration consequences

Consumers move one at a time, smallest first (Community, Media, Tools, Sites, Live).

## Rollback

A consumer can pin the previous tag.

## Acceptance tests

No repository contains a vendored copy (CI drift check); navbar stays under its size budget.

## Amendment 2026-09-25: libraries take openvibe-shared as a peer (one copy per product)

**Context.** `openvibe-publishing` pinned its own `openvibe-shared` tag, so a product that used both could install two copies. It then had to bump both pins in lockstep, or serve one Frame with another library's helpers.

**Decision.**
- A library that builds on `openvibe-shared` declares it an **optional peer** with a floor (`"peerDependencies": { "openvibe-shared": ">=1.5.0" }`, `peerDependenciesMeta.optional`), never a dependency. `openvibe-publishing` has done so since 0.4.0 (2026-09-24).
- The product that installs the library pins the one `openvibe-shared` tag everything uses. The library resolves it from the product's install.
- A product installs **exactly one** `openvibe-shared` per package root. The shared CI workflow's pin-drift step (`OpenVibe.Shared` `scripts/pin-drift.js`, run from main in every repository after install) counts the installed copies. It covers npm nesting and pnpm's store, with symlinks resolved, and fails when a root has more than one, naming each copy's version and path.

**Consequences.** Bumping Shared is one pin per product. A library that needs a newer Shared raises its peer floor, and the product's CI then fails until it upgrades. It never ends up with a silent second copy. The same rule applies to any future library built on Shared.

**Acceptance.** `test/pin-drift.test.js` in OpenVibe.Shared: a nested second copy fails; one hoisted copy and a pnpm store linked from two places pass. On 2026-09-25 every consumer checked had one copy: Blog, Wiki, Network, and each of the eight Tools apps.
