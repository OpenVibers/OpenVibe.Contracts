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
