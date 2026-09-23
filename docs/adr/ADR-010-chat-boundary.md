# ADR-010: Chat versus Live/Community boundary

**Status:** Accepted and executed 2026-09-23 (cutover 02:03 UTC). Governs Wave 6.

## Context and current evidence

Before the cutover, Live's chat was one of its largest subsystems, all in-process: the `/ws/chat` WebSocket server, DMs, history, TTS, soundboard, moderation, the word filter and the deploy-notice card, plus about 20 tables. It was used every day by the most active streamer. Community already owned pastes and discussion (ADR-011).

## Decision

- **OpenVibe.Chat owns conversation.** That covers:
  - the chat socket protocol, messages, DMs and DM blocks;
  - TTS voice overrides and channel sounds;
  - relay users, the IP-approval queue and first chats;
  - the chat moderation log.

  These twelve tables are Chat's. Chat stores the Network subject next to Live's legacy ids.
- **Live keeps the channel product:**
  - channel moderators and settings, emotes, user tags and chat-AI tables. Chat stages copies and reads the live values; they move when their writers move.
  - the media-request queue (every writer is Live's queue).
  - stream presence and discovery.
- **Community keeps threaded discussion.** Comments on entities, the forum and Pulse stay in Community (ADR-011). Chat is real-time conversation, not threads.
- **Interfaces:**
  - Chat reads Live's chat context through `/internal/chat-context/*` (`live.chat_context.read`).
  - Chat asks Live for effects through `/internal/chat-effects/*` (`live.chat_effects.write`), and Live re-checks every effect it performs for a person.
  - Chat mirrors its rows back to Live's read copy (`live.chat_mirror.write`).
  - Live's remaining chat writers forward to Chat (`chat.live_bridge.write`).
  - All of these are service tokens, and all refuse traffic that came through nginx.
- **Browsers are unchanged.** nginx routes the chat paths of `openvibe.live` to Chat, so no client change was needed.
- **Events:** `chat.message.created` (public), `chat.dm.created` (the subject only, never the text) and `chat.moderation.action` (internal).

## Alternatives considered

- Rewriting chat as a new service with a new protocol: rejected, because it would break every open client and the overlays.
- Moving the channel tables in the same wave: rejected, because their writers (the dashboard and emote uploads) have not moved.

## Migration consequences

- Live's chat tables stay a read mirror, so home stats, recaps, AI context and `/api/mod` keep working. The mirror retires in a later wave.
- Side effects that used to be in-process now reach Live over HTTP, so they arrive after the broadcast. These are coin replies, AI-viewer reactions, translations, and arena and media replies.

## Rollback

1. Remove the nginx include.
2. Drain Chat's mirror to Live.
3. Remove `CHAT_AUTHORITY` and restart Live.

Live's tables are complete through the mirror. The steps are in OpenVibe.Chat's `docs/cutover.md`.

## Acceptance tests

- Read parity was checked at the cutover: 15 of 15 paths identical, and the second import pass held nothing.
- The chat socket joins through the public URL.
- A Live restart does not end chat sessions; Chat keeps serving from its cache.
- A DM event never carries the message text.
