# ADR-030: Who owns the follow graph

**Status:** Accepted 2026-09-26 (roadmap WS-E task 4). Migration follows.

## Context and current evidence

- Follows live in OpenVibe.Live's `follows (follower_id, streamer_id, email_notify, push_notify, created_at)`, keyed by Live's integer user ids. On 2026-09-26 it held 62 follows: 12 channels, 46 followers.
- OpenVibe.Network sends the go-live notifications and asks Live for a stream's followers each time (`server/notifications/live-followers.js`).
- Other products will want follows too: Community spaces, Games creators, Blog authors. Today each would have to ask Live.

## Decision

- **Network owns follows, keyed by subjects:** `follows (follower_subject, target_type, target_id, notify_email, notify_push, created_at)`. `target_type` is `channel` (a Live channel owner's subject) for now, and other kinds as products need them, such as `creator` or `space`.
- **Public API** on Network: follow, unfollow, is-following, and paged followers and following. Counts are public; lists are visible to the account itself and to the target's owner. A service token with `network.follows.read` reads them.
- **Events:** `network.follow.created` and `network.follow.deleted` (visibility subject for the follower; counts go out as `public` summaries). Live, and anyone else, keeps a **projection** it can rebuild.
- **Live keeps its table as that projection** for its own reads (channel pages, sort orders), fed by the events. Its follow and unfollow buttons call Network.
- **Notifications stop asking Live**: Network already holds the followers.

## Alternatives considered

- Leave follows in Live and add an API: rejected. It keeps Live as the identity-adjacent authority for a network-wide feature.
- A separate social service: rejected. There is no measured need; Network already owns people and notifications.

## Migration consequences

Expand, migrate, contract (ADR-028):
1. Network adds the table and API.
2. A backfill maps Live follows through the identity resolver (subjects for both sides); a follow whose side has no subject is held and reported, never dropped. Take a backup first.
3. A reconciliation compares counts per channel and the pair sets; it must match before Live's writes move.
4. Live's buttons call Network, and the projection follows the events.
5. Live's table stops being written directly after one release with no drift.

## Rollback

Until step 5 Live's table is complete: switch the buttons back. After it, rebuild Live's table from Network (the projection is derived).

## Acceptance tests

- The backfill preserves all 62 current follows, or reports each one held.
- Counts per channel match after the reconciliation.
- Following and unfollowing are idempotent.
- The events are validated by their contracts.
- Go-live notifications reach the same people as before the move.
