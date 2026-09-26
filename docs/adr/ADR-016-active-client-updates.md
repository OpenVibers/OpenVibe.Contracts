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

## Amendment 1 (2026-09-26): release notifications over the Events realtime plane

Roadmap WS-P task 9.

- **Event.** When a network service's release goes live, OpenVibe.Host publishes `host.deploy.activated`
  with subject `{ type: release, id: <service>:<release> }` and visibility public. The payload contract
  is `host.deploy.activated@1`: `service`, `release`, `commit`, `origin`, `deployed_at`, and optionally
  `components` and `rollback`. It carries identifiers only; what changed stays in `/release.json`.
  - **Sent by:** `ovhost deploy|rollback` after a release went live, and `ovhost announce <service>` for
    services deployed by their own scripts.
  - **Frequency:** one event per service and release.
  - **Delivery:** best effort, and never fails a deploy. Polling is the fallback.
  - **Stage B:** tenant activations share the type, with subject `deploy` and visibility internal.
- **Client.** openvibe-shared `release-watch.js` (1.17.0) opens one anonymous EventSource per tab on
  `topics=host.deploy.activated`.
  - It acts only on events whose `payload.service` is the page's service.
  - It ignores the release it already runs or already knows (a hex prefix counts as the same release),
    and ignores repeats of an event id.
  - It collapses bursts: at most one check per 30 s, after a random 0–20 s delay so tabs do not all
    fetch at once. The check is the usual `/release.json` path: the release window, the update plan and
    the safety rules are unchanged.
  - The stream is public, so a change of account changes nothing and never opens a second stream.
  - A tab hidden for 5 minutes closes its stream; hidden tabs are covered by the poll and the check on
    becoming visible. Errors back off, from 30 s to 15 minutes, and after repeated failures the tab keeps
    only the poll.
- **Rollback.** Stop announcing (`--no-announce`, or remove the credentials): tabs fall back to polling,
  as before.
