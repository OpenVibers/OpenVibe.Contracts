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
