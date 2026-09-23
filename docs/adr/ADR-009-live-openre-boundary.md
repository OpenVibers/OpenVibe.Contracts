# ADR-009: Live versus OpenRe boundary

**Status:** Accepted 2026-09-23. Gates Wave 7 (OpenRe.Stream).

## Context and current evidence

- Live runs every transport in its own process: RTMP ingest (`node-media-server`, `server/streaming/rtmp-server.js`), WHIP (`whip-handler.js`, werift), the WebRTC SFU (`webrtc-sfu.js`, mediasoup), JSMPEG (`broadcast-server.js`, `jsmpeg-relay.js`), restreaming (`restream-manager.js`) and the Media-backed recorder (`recorder.js`).
- Restarting Live drops every live RTMP/WHIP/WebRTC session (hazard H1). Deploys wait for idle (`deploy.sh --wait-idle`) as a workaround, not a fix.
- Stream keys live in `managed_streams.stream_key`; some were exposed before 2026-09-17 and still need rotating.

## Decision

- **OpenRe.Stream owns transport:** stream definitions and keys, ingest sessions (RTMP, WHIP, WebRTC/SFU, JSMPEG), worker generations, restream destinations with health and logs, key rotation (`openre.key.rotate`), recording *requests* to Media, and the segment timeline.
- **Live owns presentation:** channels, discovery, watch pages, creator UX, chat embedding and moderation surfaces. Live asks OpenRe for sessions and playback descriptors; it never touches an encoder, socket or RTP port.
- **Media owns recordings:** finalisation, storage and VOD objects stay in Media (ADR-006).
- Transport runs in worker processes separate from the OpenRe API. An API deploy starts a new worker generation for *new* sessions and lets old workers drain; no deploy of Live or the OpenRe API ends a live transport.
- Lifecycle is published as events (`openre.session.started|ended`, `openre.output.failed`), not internal POSTs.

## Alternatives considered

- Keep ingest in Live and make Live restarts graceful: rejected; the product process would still own long-lived transports, and every UI deploy would stay risky.
- One process for API and transport: rejected; the drain guarantee needs the split.

## Migration consequences

OpenRe runs in parallel with Live's ingest and takes one protocol at a time (RTMP → WHIP → JSMPEG → SFU), each behind a per-channel switch. Each switch waits for a maintenance window agreed with the active broadcasters. Every stream key is rotated at the RTMP cutover.

## Rollback

Per protocol: flip the channel switch back to Live's in-process ingest. Live's ingest code stays until the last protocol has run on OpenRe for two weeks without a regression.

## Acceptance tests

- Deploying Live during a broadcast does not interrupt transport or recording.
- Deploying the OpenRe API does not end worker-owned transports.
- A failed restream destination never ends the source session.
- Every stream key that existed before the cutover has been rotated.
