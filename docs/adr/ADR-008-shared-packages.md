# ADR-008: Shared package publication and release manifests

**Status:** Accepted 2026-09-22; implementation in progress (OpenVibe.Shared)

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
