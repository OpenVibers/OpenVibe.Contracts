# ADR-005: Realtime topics, cursor/resume and whether OpenVibe.Realtime exists

**Status:** Accepted 2026-09-22: realtime runs inside OpenVibe.Events

## Context and current evidence

The charter for OpenVibe.Realtime was frozen pending this decision. Browser realtime today is five product-local WebSocket servers in Live.

## Decision

- Browser realtime is a delivery plane inside OpenVibe.Events (SSE `/realtime/stream`), authorised per topic and per event visibility (`public`, `subject`, `internal` never to browsers), with `Last-Event-ID` resume and an explicit `gap` message when history is gone.
- `OpenVibe.Realtime` is **not** created now. Revisit only when measured connection counts or fan-out latency need an independently scaled process; the move is mechanical because the protocol is fixed here.
- Media and game traffic never go through this plane.

## Alternatives considered

- Separate Realtime service now: rejected, adds a deploy unit with no measured need.
- WebSockets instead of SSE: SSE suffices for server→browser fan-out and resumes natively; chat keeps its own WebSocket until Wave 6.

## Migration consequences

Live's product WebSockets stay until their domains move (Chat in Wave 6).

## Rollback

SSE is additive; disabling it leaves durable delivery untouched.

## Acceptance tests

Guessed private topic yields nothing; reconnect from a cursor gets the complete authorised sequence or a gap marker.

## Amendment 1 (2026-09-26): presence

**Status:** Accepted (roadmap WS-F task 2).

**Decision.** Presence — who is connected right now — is **ephemeral and lives in Chat's delivery plane**, not in OpenVibe.Events.
- Chat derives it from its open WebSockets (global chat, rooms, DMs). Nothing is stored; a restart forgets it and the next connections rebuild it.
- Within a room, the user list travels over Chat's WebSocket, as it does today (`users-list`).
- Other products ask Chat: `GET /api/chat/online?users=a,b` → `{ users: { a: 'online' | 'offline' }, as_of }`, at most 50 usernames, `Cache-Control: no-store`.
- No Events topic carries joins, leaves or online state. Presence is not an event: it has no durable meaning, and a topic would put who-is-online history into a log that is kept and replayed.
- Privacy is Chat's to enforce. Someone who turned off "show my name in user lists" (`chat.presence_prefs`) is counted in a room and never named, and reads as `offline` to the online read. So does anyone whose preference cannot be read in time: never shown when they may have asked not to be.

**Alternatives considered.**
- Presence as Events realtime topics (`chat.presence.*`): rejected. It makes a durable, replayable trail of when people were online, and fans out a message per join and leave to consumers that only need "is this person here now".
- A separate presence service: rejected. No measured need; Chat already holds the connections.

**Consequences.** A product that shows "online" (a profile, a DM list) calls Chat's read and caches it for seconds at most. When realtime moves out of Events (the original decision's revisit clause), presence stays with whatever holds chat connections.

**Acceptance.** A connected person reads `online`. A hidden person reads `offline` while connected. A person whose preference is unknown reads `offline`. No `chat.presence*` event type exists in the catalog (Chat `test/chat-modules.test.js`, Contracts `npm test`).

## Amendment 2 (2026-09-26): a person's topic, and realtime tickets

**Status:** Accepted (roadmap WS-E task 3, WS-F task 1).

**Decision.**
- **"`user:<id>`" is not a topic name.** A topic is an event type pattern (`topics.js` in Events), and `user:…` is not a valid pattern (400 `realtime.bad_topic`). A person's topic is the pair *event type + subject visibility*. Network publishes **`network.notification.created`** (`network.notification.created@1`) through its outbox, in the transaction that stores the notification. The event has subject `{ type: user, id: <recipient usr_> }`, visibility `subject` and actor `system:network`. Events streams a subject event only to the viewer whose subject is the event's subject or actor, so the actor is never the sender. The notification badge subscribes to `network.notification.*` and receives its own notifications and nobody else's. Another person's stream on the same pattern, a broader pattern (`*`) or a guessed one yields nothing. Later per-person types (`network.notification.read`, a digest) join the same pattern.
- **The payload is what the badge needs, never what it shows.** It carries the id, type, category, priority, service, `created_at` and the unread count after the insert. It never carries the title, message, link or sender. The badge re-reads the count and the newest items from Network's API, which stays authoritative. Events keeps the event for its retention period, so nothing private is put in it.
- **Browsers authenticate with a realtime ticket** (`identity.realtime-ticket-claims@1`). An EventSource cannot send a header, and the `ov_token` cookie of events.openvibe.network is third-party on every other site, where browsers increasingly drop it. So Network mints a ticket for the signed-in person: `POST /api/v1/realtime/ticket` answers `network.realtime-ticket-result@1`. The caller authenticates with a Bearer Network JWT, or the `ov_token` cookie on openvibe.network. The ticket is an RS256 JWT with `iss <network issuer>/realtime`, `sub <usr_>`, `aud [openvibe.events]`, `typ realtime`, `purpose realtime`, a lifetime of 120 s and `jti rtk_…`. The browser opens `/realtime/stream?topics=…&ticket=…`.
- **A ticket is never a session.** Three rules each refuse it as one: its issuer is not the session issuer, it carries `typ`, and its only audience is Events. Events accepts it only as `?ticket=` on the stream, never as Bearer or cookie, and accepts each `jti` once while the ticket is valid. It never logs the ticket. A reconnect asks for a fresh ticket and resumes with `last_event_id`, so a ticket that leaked into a proxy log is spent or expired. Guests get no ticket (403 `realtime.guest`). `REALTIME_TICKETS=off` on Network answers 503 `realtime.disabled`, and every badge stays on polling.
- **The badge** (openvibe-shared `notification-live.js`, loaded by `notification-ui.js` when a site sets `notificationsRealtime: true`) behaves as follows:
  - On a `network.notification.*` event whose subject is its own, it re-reads the count and toasts what is new. On `event: gap` it re-reads the count and the open lists.
  - Errors back off from 2 s to 15 min, with jitter. A tab hidden for 5 min closes the stream and resumes from its cursor when shown.
  - A Content-Security-Policy refusal, or eight failures in a row, leaves polling only.
  - Polling stays the fallback: every 15 s without a stream, and every 2 min while the stream is open, as a safety net for reads made on other sites.

**Alternatives considered.**
- A `user:<id>` topic namespace in Events: rejected. It duplicates what subject visibility already enforces, and it invites exactly the guessing the visibility rule makes useless.
- The session JWT in the URL (`?access_token=`): rejected. It is valid for hours, is accepted as a session everywhere, and URLs end up in logs.
- Cookies on events.openvibe.network with `withCredentials`: kept for pages on openvibe.network itself and for Bearer clients, but not relied on across sites (third-party cookie blocking).
- The notification text in the event: rejected (ADR-020: Network renders, and Events retains).

**Consequences.** Every notification is one more event in Events' log (a go-live to N followers is N events). The outbox relays them in batches of 50, and Events' retention and redaction apply. Where Network's relay is off, the rows wait in `network_event_outbox`. The badge still works by polling.

**Acceptance.**
- A ticket for A never receives B's `network.notification.created`, on any pattern.
- An expired ticket, a ticket for another audience or purpose, a reused ticket and a session JWT passed as a ticket are refused. A ticket passed as Bearer is refused.
- A disconnect resumes from `last_event_id` with the missed events, and a cursor beyond retention gets `event: gap`.
- A stored notification and its event commit together or not at all.

These are Events `test/realtime-tickets.test.js`, Network `test/notification-events.test.js` and Shared `test/notification-live.test.js`.
