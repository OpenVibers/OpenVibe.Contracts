# ADR-026: Producer redaction of its own events (`payload.redacts`)

**Status:** Accepted 2026-09-23; implemented in OpenVibe.Events (`server/redaction.js`, `server/store.js`,
`test/redaction.test.js`) and used by OpenVibe.Chat (`chat.message.deleted`).

## Context and current evidence

OpenVibe.Events keeps every event for its retention period and serves it again through pull, `GET
/api/v1/events/:id`, SSE replay, queued deliveries and DLQ replays (ADR-004, ADR-005). A public
`chat.message.created` carries the message text and the author. When the message was deleted in Chat,
the stored event stayed replayable, anonymously, for 30 days. Deleting a row in the producer did not
reach the copy in Events, and no consumer could tell that the content was withdrawn.

## Decision

- **Any event may carry `payload.redacts`** (`events.redaction-directive@1`):
  `{ "event_ids": ["evt_…"], "subject_type": "chat_message", "subject_ids": ["123"] }`. `event_ids`
  names events directly. `subject_type` + `subject_ids` (always together) names every stored event of
  the same source about those subjects. Either form or both may be used, with up to 1000 ids each and no
  empty list. Normally the directive rides on the producer's own deletion event (`chat.message.deleted`),
  whose payload carries only ids.
- **A producer may redact only its own events.** A target must have the same `source` as the redacting
  event; for a developer app it must also be in the same project and environment. When an `event_id`
  names another source's event, Events refuses the whole publish batch with **403
  `events.redaction_not_allowed`**. A subject match never reaches another source. No capability is
  needed beyond `events.event.publish` (or `events.app.publish`).
- **A malformed directive is 422 `events.invalid_redaction`**. This covers a non-object, an unknown
  field, a bad or too long id list, `subject_type` without `subject_ids` (or the reverse), and a
  directive that names nothing.
- **Targets become tombstones in the same transaction that stores the directive.** Their payload is
  replaced by `{ "redacted": true, "redacted_at": "<ISO>", "redacted_by": "<redacting event_id>" }`
  (`events.tombstone-payload@1`), and the actor by the producer itself (`service:<source>`, or the app).
  `event_id`, `seq`, `event_type`, `version`, `subject`, `timestamp` and `visibility` stay, so sequences
  have no holes. The old payload is overwritten on disk (`secure_delete`).
- **Every read path serves the tombstone** from then on. First-party consumers receive the tombstone at
  the original seq and then the deletion event. **A consumer checks `payload.redacted === true` before
  validating a payload against its event type's schema.** A tombstone never matches the type's payload
  contract.
- An event that carries a directive is never redacted itself. Redaction applies to what is stored when
  the directive arrives; it does not block later events about the same subject.
- An operator may redact events published before the producer announced deletions
  (`scripts/redact-backfill.js` in OpenVibe.Events, dry run by default). Those tombstones name the
  operator run (e.g. `backfill`) as `redacted_by`.
- **The payload contract lists `redacts` when the producer sends it.** It is `"redacts": { "$ref":
  "../redaction-directive.v1.json" }`, required when every event of that type carries one
  (`chat.message.deleted`). A producer that starts redacting from another event type adds the optional
  property in a minor contract release.

### Public realtime replay window

Browsers (signed out or signed in) are replayed `public` events received in the last
`REALTIME_PUBLIC_REPLAY_SECONDS` only (default **300**), which is enough to ride out a reconnect. An
older cursor gets `event: gap` with `reason: "public_window"` (`from_seq`, `to_seq`, `latest_seq`,
`window_seconds`), so the SSE stream cannot be used to page through a month of public history.
`subject` events addressed to the viewer, and service viewers, keep the whole retention. Redacted
events are replayed as their tombstones.

## Event payload contracts

Each event type's payload has its own contract, named after the event type. The major version is the
envelope `version`. The file is `contracts/events/payloads/<event_type>.v<version>.json`, so a
consumer validates `contracts.validate(`${env.event_type}@${env.version}`, env.payload)` after
checking for a tombstone. The owner is the producing service, and the service manifest lists the type
in `eventsProduced`. Contracts with catalog status `planned` describe events that the owner has not
emitted yet (`tools.job.*` in v0.30.0).

## Alternatives considered

- **Hard delete in Events:** rejected, because it leaves holes in `seq` that break every cursor and
  resume, and consumers could not tell a withdrawal from a lost event.
- **A separate redaction endpoint and capability:** rejected, because the directive has to be atomic with
  the producer's own outbox (the deletion and its announcement commit together). The publish owner rule
  already gives exactly the authority needed.
- **Consumers filtering deleted ids themselves:** rejected, because anonymous replays and deliveries that
  are already queued would still carry the text.

## Migration consequences

Chat publishes `chat.message.deleted` with `redacts` for every delete path. The operator backfill
redacted what Chat had deleted earlier. Other producers adopt the directive on their own `*.deleted` or
`*.removed` events when those carry personal content.

## Rollback

A producer stops sending `redacts`. Tombstones already written stay tombstones, because the original
payload is gone by design.

## Acceptance tests

OpenVibe.Events `test/redaction.test.js`: every read path (pull, GET, anonymous/signed-in/service SSE
replay, queued delivery, DLQ replay) returns the tombstone at an unchanged seq; another source's event
is refused with 403 and the whole batch is not stored; a malformed directive is 422; a directive event
is never redacted. The public window test checks that anonymous replay older than 300 s yields `gap`
`public_window`. Contracts: `events.redaction-directive@1` and `events.tombstone-payload@1` fixtures;
every event payload contract has valid and invalid fixtures.
