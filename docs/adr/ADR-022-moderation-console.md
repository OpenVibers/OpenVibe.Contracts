# ADR-022: Moderation and policy console

**Status:** Accepted 2026-09-23. Revisited at Wave 12 (2026-09-24): the decision stands, with no moderation service; next revisit at Wave 22 or when the trigger below is met.

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

## Revisit at Wave 12 (2026-09-24): outcome

Wave 12 (Games and mods) was the named revisit point, because mods could have made moderation a
multi-product workflow. **Outcome: the decision stands.** Network stays the staff directory and
the moderation audit log, enforcement stays with each owner, and no moderation service is created.

Evidence:

- **No cross-product workflow exists.** Each moderated thing has one owner:
  - Chat moderates chat (channel-scoped bans, deletions; it emits `chat.moderation.action`).
  - Community moderates pastes, threads and comments (`community.*.moderate`).
  - Tips moderates interactions (`tips.interaction.moderated`).
  - Billing logs staff money actions (`billing.staff.action`).
  - Games installs, grants and revokes mods itself: installing is staff-only, audited in its own
    `mod_audit`.

  No queue, appeal or case spans two of them.
- **Mods did not change that.** Games' mods are declarative packs installed by staff. There is no
  self-service publishing, so there is no review queue. Mod signing and review are open owner
  decisions (ADR-013 amendment of 2026-09-24).
- **What is still missing is inside this decision, not a reason to change it.**
  - Network does not consume `*.moderation.action` yet (requirement D05-R2), so the audit log has
    no entries.
  - Services still check raw roles. v0.34.0 adds the staff capability map
    (`manifests/policy/staff-roles.json`): `user < streamer < global_mod < admin < owner` and the
    `staff.*` capabilities each role holds. Network issues it as claims, and Live, Chat and
    Community replace their raw checks with it.

**Trigger for the next revisit** (at Wave 22 at the latest): the first workflow that no single
owner can host, for example:

- an appeal that crosses products;
- one report queue for Chat, Community and Media;
- a public mod marketplace with review.
