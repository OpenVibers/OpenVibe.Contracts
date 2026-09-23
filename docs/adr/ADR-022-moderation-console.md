# ADR-022: Moderation and policy console

**Status:** Accepted 2026-09-23. Revisit at Wave 12.

## Context and current evidence

- Moderation is spread across services:
  - Live has roles, bans, IP/CIDR bans and chat moderation;
  - Community has paste and discussion moderation, where services vouch for staff with `X-OV-Staff` and the `community.*.moderate` capabilities;
  - Network has an admin surface.
- Staff actions are audited unevenly.

## Decision

- **Network is the staff directory.** It owns staff roles (`admin`, `global_mod`), the moderation capabilities granted to staff tooling, and a **moderation audit log**. Every service reports staff actions to that log as an event: actor, target reference, action, reason.
- **Enforcement stays with the owner.** Each service enforces moderation on its own entities; Community hides threads, Live bans chatters.
- **Service vouching:** a service asserts that its user is staff only while it holds the matching moderate capability. The vouch is logged.
- **No dedicated moderation service.** It is revisited only if moderation becomes a multi-product workflow (queues, appeals) that no single owner can host.

## Alternatives considered

- A moderation service now: rejected, as there are no cross-product workflows yet.

## Migration consequences

Services emit `<service>.moderation.action` events. Network's admin surface lists them.

## Rollback

The events are additive.

## Acceptance tests

- Every staff action in Live, Community and Chat appears in the audit log with actor and reason.
- A service without the moderate capability cannot vouch for staff.
