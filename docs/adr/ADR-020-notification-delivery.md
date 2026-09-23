# ADR-020: Notification delivery ownership

**Status:** Accepted 2026-09-23. Wave 3 follow-through.

## Context and current evidence

Network is the only notification store (`server/notifications`, with email via Resend).

Producers push directly:
- Live calls `POST /internal/notifications/push` and `push-bulk`.
- Since Wave 1, Live holds a service token for these calls, with the internal key kept as a fallback.
- A failed push is lost.

OpenVibe.Events now provides durable, signed, retried delivery.

## Decision

- **Network keeps authority:** addressing, preferences, digests, read state and the notification store.
- **Events owns durable transport.** Producers emit *domain* events through their outbox (for example `live.stream.started`, `community.comment.created`). Network subscribes and decides who is notified, using an inbox so a redelivery never notifies twice.
- **Direct push stays** for transactional messages that have no domain event (sign-in email). Those calls use service tokens only.
- **No notification text in events.** Producers never put rendered notification text in events; Network renders it.

## Alternatives considered

- Keep direct pushes: rejected, because a Network restart loses notifications.
- Move notifications into Events: rejected. Events is transport, and user preferences belong with identity.

## Migration consequences

- Go-live notifications move first: Live emits `live.stream.started` (live since 2026-09-23), and Network's consumer replaces `golive-notify.js`'s call.
- **Precondition found on 2026-09-23:** the recipients are Live's followers (`follows` in Live's database), which Network cannot read. The consumer can only replace the call once follows are readable by Network, either migrated into Network's follow graph (D09) or exposed through a capability-guarded Live read. Until then Live keeps calling `/internal/events/stream-live`, now with its service token (`network.notifications.push`) and the internal key only as fallback.
- The two paths run side by side, deduplicated by event id, until parity is shown; then the push call is removed.

## Rollback

Re-enable the direct push; the consumer's inbox prevents a double notification during the overlap.

## Acceptance tests

- A Network restart during a go-live loses no notification.
- A redelivered event produces one notification.
