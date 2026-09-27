# ADR-033: Exporting and deleting an account

**Status:** Accepted 2026-09-27 (roadmap WS-B task 7). Implementation follows in OpenVibe.Network and each service that keeps data about a person.

## Context and current evidence

- A person's data is spread across services, each owning its rows by subject (ADR-001): Network (account, providers, sessions, OAuth grants, projects, OpenCoins, modules, follows, blocks, notifications), Live (profile, follows projection, channel points, streams, tokens, money until the Billing cutover), Chat (messages, DMs, rooms), Community (pastes, threads, posts, comments, votes), Media (objects), Games (characters).
- Network can already reach every service through one event (ADR-029's `network.subject.merged` is consumed by each owner), and every service already calls Network with a service token (principals, ADR-004).
- The revocation reason `account_deleted` exists in `network.user.token_valid_after` but nothing emits it.
- Money is not erasable: ledgers are kept for the retention the billing policy names (ADR-012), with the person pseudonymised.

## Decision

- **Export is a job the person starts, and each service contributes its own part.**
  - `POST /api/v1/account/export` (signed in) opens a job `exp_…`. One job may be open at a time, and one may be started per day.
  - Network emits `network.account.export_requested { export_id, subject, requested_at, deadline }` (visibility internal).
  - Each service that keeps data about people answers by pushing its part: `POST /internal/account-exports/:export_id/parts`, carrying `network.account-export-part@1` and the capability `network.account.export.contribute`. The token may only speak for its own service. A part is JSON files (the service's rows about the subject, never anyone else's data), at most 20 MB. A second part from the same service replaces the first.
  - Network adds its own part and builds the archive: `network/…`, `<service>/…`, and `README.txt` naming what each service sent. It is built when every expected service has answered, or at the deadline (30 minutes), whichever comes first. The expected services are the principals holding the contribute grant.
  - The job ends `ready`, or `partial` when a service did not answer, which is named in the README and in the status. `GET /api/v1/account/export/:id` answers `network.account-export@1`. `GET /api/v1/account/export/:id/download` serves the zip to the same person for 7 days; after that the archive is deleted.
- **Deletion is scheduled, has a grace period, and every service confirms it.**
  - `POST /api/v1/account/deletion` needs a fresh sign-in (`auth_time` within 10 minutes, as for a merge) and the username typed out. It schedules the deletion 30 days ahead (`del_…`, `network.account-deletion@1`).
  - Until then the account works normally and shows the date. `DELETE /api/v1/account/deletion` cancels it; nothing leaves Network before the date.
  - At the date, one Network transaction erases what Network owns:
    - linked providers, sessions and devices, OAuth tokens, codes and grants;
    - developer projects the person alone owns, with their credentials;
    - user modules, follows both ways, blocks both ways, notifications, preferences, push subscriptions, effects, username history and pending merge intents.
  - The OpenCoins balance is closed with one ledger entry (`reason: account_deleted`); ledger rows stay.
  - The user row becomes a tombstone: the username is released, and the email, password and profile are cleared. The subject is never reused, and it resolves as `deleted`, as do aliases merged into it.
  - Tokens are revoked strictly (`network.user.token_valid_after`, reason `account_deleted`). Network then emits `network.account.deleted { deletion_id, subject, requested_at, deleted_at }` (visibility internal).
  - **Each service erases its own rows about the subject in its own transaction**, once per `deletion_id`:
    - content the person authored is removed, except that an item with other people's replies beneath it stays as an authorless tombstone, so the replies keep their place;
    - likes, votes and reactions go, and cached counts are recomputed;
    - moderation records about the person's actions keep the pseudonymous subject;
    - money and ledger rows stay, pseudonymised (no name, email or free text of the person), for the billing policy's retention;
    - media under a retention hold (ADR-006) is kept and counted as retained.

    It then confirms with `POST /internal/account-deletions/:deletion_id/confirmations`, carrying `network.account-deletion-confirmation@1` and the capability `network.account.deletion.confirm`, with counts of what it erased and retained.
  - Network records each confirmation. Staff see deletions still waiting on a service; Events redelivers until the service answers.
- **Nothing is exported or deleted for anyone but the signed-in person.** Staff do not start either flow. A person who lost access recovers the account first (ADR-029's staff merge, or provider recovery), then uses the same flow.

## Alternatives considered

- **Network calls each service's export endpoint:** rejected. It needs a Network → service credential and a route in every service; pushing parts reuses the service → Network tokens every service already has.
- **Immediate deletion:** rejected. A mistaken or coerced request cannot be undone, and services would erase before a person could change their mind.
- **Deleting ledger rows:** rejected by ADR-012; pseudonymised rows keep the books balanced.

## Migration consequences

Network gains the `account_exports`, `account_export_parts`, `account_deletions` and `account_deletion_confirmations` tables, a users `deleted_at`, and an hourly due-deletion check. Contracts gain two events, four schemas and two capabilities. Every service that stores data about people consumes both events. Until a service does, its export part is missing (the export says so) and its deletion confirmation is outstanding (staff see it).

## Rollback

Stop offering export and deletion (the account page hides both cards). Scheduled deletions can be cancelled by staff before their date. A deletion already carried out is not reversible, by design.

## Acceptance tests

- Export: a job gathers every expected service's part, the zip holds only the person's data, a missing service makes it `partial` and says which one, another person cannot download it, and it expires after 7 days.
- Deletion: it refuses without a fresh sign-in or the typed username, cancellation stops it, and nothing happens before the date.
- At the date, Network's rows are erased, the subject resolves as `deleted`, the old tokens are refused, and the event is emitted once.
- Each service's test erases its rows on `network.account.deleted`, keeps others' replies and money rows pseudonymised, confirms with counts, and applies a redelivery once.
