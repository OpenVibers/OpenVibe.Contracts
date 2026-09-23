# ADR-016: Active client update safety and the supported mixed-version window

**Status:** Accepted 2026-09-23. Governs Track R.

## Context and current evidence

- Live serves content-hashed asset URLs (`server/web/assets.js`) and posts one rolling deploy notice in chat.
- `/shared/*` on Network is served from the pinned OpenVibe.Shared release:
  - plain URLs carry `max-age=300`;
  - `?v=<hash>` and `/shared/v1/*` URLs are immutable for a year.
- Cloudflare currently raises short browser TTLs to 4 hours, a zone setting that needs changing to "respect existing headers".
- Open tabs can run a client built several releases ago against a new server.

## Decision

- **Mixed-version window:** a server supports clients from the current and the previous release of its API contract for at least **24 hours** after a deploy, and never breaks a contract version inside its major (ADR-002).
- **Assets:** every asset a page loads is either content-hash addressed (immutable) or explicitly short-lived. An HTML document never references a mutable URL for code.
- **Release manifest:** each web surface serves `/release.json` (service, release id, contract versions, min supported client release). Clients compare on focus/reconnect. When they have fallen outside the window, they show a non-blocking "new version" prompt, and reload automatically only when idle with no unsent input, upload, call or stream.
- **Protected sessions:** a deploy never ends an upload, a call, a live broadcast or a recording. Host (Wave 21) drains or waits, as Live's `--wait-idle` does today.
- **Shared chrome:** a release of OpenVibe.Shared must not break a page that pinned the previous minor.

## Alternatives considered

- Forced reload on deploy: rejected; it loses input and interrupts sessions.
- Service workers for version pinning: deferred; the release manifest is enough and is simpler to reason about.

## Migration consequences

Live, Network, Community, Media and Tools add `/release.json`. The Cloudflare browser-TTL setting is changed so origin cache headers are respected.

## Rollback

The manifest is advisory; removing it returns clients to today's behaviour.

## Acceptance tests

- A client one release behind keeps working for 24 hours after a deploy.
- A deploy during an upload, call or stream does not interrupt it.
- An outdated tab prompts and does not reload while the user is typing.
