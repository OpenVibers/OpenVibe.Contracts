# Changelog

## 0.299.0 — 2026-11-06

- Add `live.agent-stream-step@1`: one step of the work an agent is doing on an agent stream (the Agent Streams plan, S2). It carries `at` (when the step began), `title` (at most 120 characters), `status` (`started`, `passed`, `failed` or `skipped`), the optional `detail` (at most 500 characters), the optional `tests` (`passed` and `failed`) and the optional `cost_usd`. The step is plain text: the house text filters have already run over it before Live stores it.
- Add `live.agent-stream-step-request@1`: the body of `POST /api/streams/agent/:id/steps` on OpenVibe.Live, which answers 201 with the step it stored. The publisher posts with its publish ticket, and Codes and Actor post through their service tokens with `live.agent_stream.publish` for the person; the capability is the one S1 named, so no new capability is introduced.
- Additive: nothing that exists changes. Valid and invalid fixtures cover both, so a missing title, a title over 120 characters, a detail over 500 characters or a status outside the list fails the run.

## 0.298.0 — 2026-11-06

- Add `live.agent-stream@1`: an agent's own stream on OpenVibe.Live (the Agent Streams plan, S1). It is a `managed_streams` row of kind `agent` with an `ags_<ULID>` id, no stream key and no normal slot; it carries the owner, the channel, the task it is doing (`codes`, `actor`, `desk` or `node`), the visibility (`private`, `unlisted`, `public`), the mode (`watch` in S1), the state, the curtain, the viewers, the worked seconds, the last frame, the VOD and the page. The card stays after the stream ends.
- Add the four request/result schemas: `live.agent-stream-create-request@1` (title, task, visibility, the optional `allow_sites`), `live.agent-stream-publish@1` (`whip_url`, the one-time publish ticket `wpt_…`, `expires_at`), `live.agent-stream-state@1` (viewers, `encode`, the curtain and `ends_at`, what the desk polls) and `live.agent-stream-curtain-request@1` (`up` and the reason).
- Add the event `live.agent_stream.changed` (`started`, `ended`, `visibility`, `curtain`, never the reason) and the capability `live.agent_stream.publish`, and name both in Live's service manifest. The stream's contract ids keep the design's hyphen (`live.agent-stream@1`); the capability and the event type carry an underscore because `identity.service-token-claims@1`'s `cap` pattern and `events.event-envelope@1`'s `event_type` pattern allow letters, digits and underscores only. The capability's description records the design's `live.agent-stream.publish` name and why it is written `live.agent_stream.publish`. `identity.service-token-claims@1`'s `on_behalf_of` description now says a node token names its owner on the audience where the machine acts for them (Live's), so a receiver knows where to read the stream's owner.
- Valid and invalid fixtures cover the stream, the create request, the publish part, the state, the curtain request and the event payload, so a missing field, a bad id or a reason outside the list fails the run.

## 0.297.0 — 2026-11-06

- Add `identity.subject-assertion-claims@1`: the claims of a short-lived ES256 assertion signed by OpenVibe.Network that says a person allowed one service to act for them on another service — `sub` (the person), `aud` (the service it is for), `act` (the service it was minted for), optionally `for` (the services that may carry it), `jti`, `iat`, `exp`. Network mints one only from the person's own access token (`POST /internal/subject-assertions`), so a service that merely knows a person's id cannot say the person allowed anything; the key is published in Network's JWKS (`kid ov-network-assertion-1`). The money routes of Billing and Tips check it against the person they act for, and refuse the old "the service vouches for its person" way once `BILLING_REQUIRE_SUBJECT_ASSERTION` / `TIPS_REQUIRE_SUBJECT_ASSERTION` is on. Only a service token Network issued for its own API (`openvibe.network`) mints one. See the ADR-003 amendment of 2026-11-06.

## 0.296.0 — 2026-11-06

- Sharing learns locked items. `share.update-request@1` gains `envelope`: a `locker.envelope@1`, base64, the content re-sealed for the people who stay, sent with the members that remain when someone is removed from a people-locked item. The service stores it before it drops the member; it never opens it.
- `share.transfer-request@1` gains `key_slot` (that recipient's people slot), required for a people-locked item and checked against the recipient's current key from the key directory.
- `share.member@1` gains `key_fingerprint` and `fingerprint_changed` (owner-only): the member's current eight-word fingerprint and whether it is still the key their slot was made for, so the share sheet can warn and re-wrap.
- Additive: every new field is optional and old documents stay valid. Fixtures cover the locked member, the locked member input, the re-seal request and a locked transfer, and a malformed slot is refused.

## 0.295.0 — 2026-11-06

- Add `sources.category@1`: one category of the sources registry and how long OpenVibe.Sources keeps its items (roadmap §3 F). The `retention` field is either `{ days, reason }` — the window an item lives after it was last current (its last fetch while live, its removal once removed) — or `"keep"`, for reference data that is never pruned by age (Sources keeps the newest row per source key and prunes only the rows a newer value replaced).
- The categories are the ones `sources.source@1` and `sources.item@1` already use; the three lists are compared in `test/run.js`, so a category added to one of them without the others fails the run. No existing schema changes: `sources.source@1`'s `category` and `sources.item@1`'s `category` keep their shape, so a consumer that reads them is unaffected.
- Valid and invalid fixtures cover a windowed category (`news`), a kept category (`housing`), an unknown category, a missing rule and a zero-day window.

## 0.294.0 — 2026-11-06

- Add the unsafe-image review capabilities: `vision.image.review` (Media, Community and Live sort an image or AI text into fine, sex acts or sexual content involving a minor), `vision.review.read` and `vision.review.decide` (the staff queue and an operator's decision), `media.object.review.view` (Vision's 60-second logged evidence view of a hidden or quarantined object) and `media.object.review.decide` (Vision applies an operator's overruling category and releases Media's evidence hold). The Vision and Media service manifests name them.

## 0.292.0 — 2026-11-06

- Add `locker.envelope@1`: the header of a sealed item — the suite (AES-256-GCM), the chunk size (1 MiB), the padded size, the counter nonce base, the lock kind and one key slot per way in. The content key is never in the header; it is wrapped in a people slot (ECDH P-256 + HKDF-SHA-256, bound to the recipient's key by its RFC 7638 thumbprint), a password slot (PBKDF2-SHA-256, 600000 iterations, the parameters in the header so they can be raised, and bounded above at 10000000 so a hostile header cannot freeze a reader) or a link slot (empty: the key travels in the link's fragment).
- The padded size is padded with Padmé (PoPETs 2019): at most about twelve per cent over the real size, never below 256 bytes, and it leaks O(log log n) bits. Every chunk but the last is a whole chunk; the last holds the rest.
- Add the key directory contracts: `locker.public-key@1`, `locker.public-keys@1`, `locker.keys-put-request@1`, `locker.key-backup@1` and `locker.key-change@1`, with the eight-word fingerprint (sixty-four bits, in two groups of four) and the signature that proves a person owns their signing key.
- `share@1` and `share.update-request@1` gain `lock` (`none`, `people`, `password`, `link`), and a share member may carry that member's key slot, so a member and its slot are saved together. Additive: the fields are optional and old documents stay valid.
- Valid and invalid fixtures cover every new contract, and the new fields of the sharing contracts. The format is written down in [docs/locker.md](docs/locker.md).

## 0.291.0 — 2026-11-05

- Add `share@1`: resource refs, audiences, members and member inputs, transfers, access requests, uniform API requests and responses. Transfers are recipient-bound, last seven days, and default to removing the former owner's membership.
- The uniform response names people: `share.person@1` on the owner, members, a pending transfer's `to` and each pending request; plus `share.you@1`, pending `requests` (`share.access-request-view@1`), the pending transfer view, and the service's `describe()` fields (`title`, `link`, `roles`, `audiences`, `transferable`). Add `share.people-lookup@1` for the exact-name people endpoint.
- PUT accepts `notify` (default true); access requests can be `dismissed`; a transfer request accepts `{ name }` or `{ subject }`.
- Add the five `share.*` event payloads with strict ids-only fields; Network owns the model, adopting services produce events using their own source. Valid and invalid fixtures cover every new contract. No existing schema changes.


## 0.290.0 — 2026-11-05

- **A comma-separated body, and an identity from several columns** (OpenVibe.Food's USDA ERS fruit and vegetable
  prices). An api endpoint of `sources.source@1` and `sources.source-write-request@1` may say `"format": "csv"`: a
  comma-separated file with RFC 4180 quoting (a UTF-8 BOM, a quoted field holding commas, doubled quotes and line
  breaks), whose first line names the columns, read as an array of records keyed by those names (`items_path` is "").
  `"identity_fields"` names two to eight columns whose values, joined in order with " | ", are the record's identity,
  for a table where no single column is unique (USDA ERS prices each product in several forms); it requires
  `items_shape` array and cannot be given with `fields.identity`. Additive: the existing formats, `duplicates` and
  `fields.identity` are unchanged, and an older reader ignores the new field. Valid fixture:
  `fixtures/sources.source/valid/api-csv-identity-fields.json`.

## 0.289.1 — 2026-11-04

- **`billing.credit-hold@1` answers a personal hold.** `project_id` is no longer required and its type is
  `[string, null]`, so the hold Billing sends after a personal `billing.credit-hold-create-request@1` (no
  `project_id`) validates. A project hold still carries its `prj_` id and an app subject still always names one.
  `compatibility/corrections.json` records the change against v0.289.0 because the compat gate treats the widened
  type as a retype; the string-only rule never described a personal hold's answer, since that case could not be
  produced validly. Valid fixture: `fixtures/billing.credit-hold/valid/personal-hold.json`.

## 0.289.0 — 2026-11-04

- **Balance and Vibes Pay (AI Exchange D12, MONEY.md build order step 1).**
  - **Vibes Pay schemas:** `billing.vibes-charge@1` (id `vch_<ULID>`, app, project_id, `amount` in whole Vibes,
    a 1–140 description, the app's reference, status pending|paid|refunded|expired|cancelled, pay_url, return_url,
    the timestamps and sandbox), `billing.vibes-charge-create-request@1` (`amount`, `description`, `reference` — the
    app's idempotency key — and an optional `return_url`) and `billing.vibes-charge-refund-request@1` (an optional
    `reason`; a refund is always for the whole charge).
  - **Vibes Pay events:** `billing.vibes.charge.paid@1` and `billing.vibes.charge.refunded@1` are also the signed
    webhook bodies (HMAC-SHA256, retried with backoff): the charge fields plus an opaque `payer_ref` that is stable
    per app, and deliberately no person id and no email. Billing's manifest lists both in `eventsProduced`.
  - **Balance:** `billing.balance@1` gains the D12 Balance branch — `owner` (user or project), `balance_nano_usd`,
    `held_nano_usd`, `available_nano_usd` and an optional `sandbox`, with money as integer nano-USD decimal strings
    (D1, never a float) — answered by `GET /api/me/balance`. The contract id is permanent, so the Vibes wallet body
    that `billing.balance.read` already answered stays as the second branch; both branches are closed with
    `additionalProperties: false`, and new code sends the Balance branch.
  - **Balance requests:** `billing.balance-transfer-request@1` (`to_project_id`, positive `amount_nano_usd`,
    `idempotency_key`) for moving a person's Balance to a project's, and
    `billing.vibes-purchase-from-balance-request@1` (`vibes` as a whole positive integer, `idempotency_key`) for
    Get Vibes with Balance.
  - **Vibes read:** `billing.vibes-wallet@1` is the person's own Vibes — credit, creator payable and bits_per_usd,
    never a Balance — answered by `GET /api/v1/vibes/me`.
  - **Capabilities:** `billing.vibes.charge` (public, grantable to apps, a sandbox app included, which charges
    sandbox Vibes only) implemented by `POST /api/v1/vibes/charges`, `GET /api/v1/vibes/charges/:id` and
    `POST /api/v1/vibes/charges/:id/refund`; `billing.vibes.read` (public, a person-delegated read of their own
    Vibes for an app they approved) implemented by `GET /api/v1/vibes/me`.
  - **Personal holds:** `billing.credit-hold-create-request@1` no longer requires `project_id`; without it the hold
    is personal and spends the subject's own Balance. An `app` subject must still name its project (`if`/`then`),
    so the accepted set only grows and the compat gate stays green.
  - Valid and invalid fixtures cover both Balance branches, whole-number Vibes, D1 decimal-string money, a personal
    hold, an app subject without a project, a partial-refund body, and webhook payloads with a person id or an
    email-shaped payer reference.

## 0.288.0 — 2026-11-04

- **Configuration contracts (AI Exchange D11, S1), built on openvibe-shared/config:
  `common.config-namespace@1`, `common.config-change@1` and `common.config-secret-put@1`** (internal).
  - `common.config-namespace@1` is the shape `openvibe-shared/config`'s `summary()` returns (`service`, `namespace`,
    `revision`, `values`, `classification`, `active`, `last_known_good`), plus `sealed`, `pins` and `schema`: whether
    a KEK seals secret values, the keys pinned by their `x-env` variable, and the namespace's JSON Schema so a client
    can draw the form. The annotations `title`, `description`, `x-group`, `x-env`, `x-danger`, `x-bind` and `x-unit`
    (`nano_usd`, `ms`, `bps`) are allowed.
  - A secret-class value in `values` is a marker (`redacted: true`, a keyed 64-hex `fingerprint`, and the optional
    four-character `hint`, `set_at`, `set_by` and `bound_to`); a marker that carries `value` is invalid, so a
    summary never carries a secret.
  - `common.config-change@1` is `{ values, reason, merge?, unset? }`; a secret value is refused by the store
    (`422 config.secret_write_only`) and is written only through the secret route.
  - `common.config-secret-put@1` is `{ value, reason }`; the answer is the marker.
- **Nine internal capabilities, one per service:** `ai`, `billing`, `services`, `watch`, `bench`, `report`, `host`,
  `codes` and `actor` each gain `<svc>.config.manage` (owner that service, active, internal, never grantable to apps),
  implemented by `GET /internal/config`, `GET|POST /internal/config/:namespace` and
  `PUT|DELETE /internal/config/:namespace/secrets/:key`. Only Network's admin proxy, acting for the owner, holds them;
  Network uses its own admin config routes.
- Contracts keeps no default-grants list: Network's seeded default grants live in OpenVibe.Network, so granting
  these nine to the network service is that repository's change.

## 0.287.0 — 2026-11-04

- **`billing.credit.settled@1`** (AI Exchange money, D1 and D9).
  - OpenVibe.Billing emits it from the settle transaction of a Credits hold (`server/ops/credits.js` `settleHold`);
    OpenVibe.Report consumes it for aggregate analytics.
  - It carries `settlement_id`, `hold_id`, the hold's `service`, `settled_at`, the answering attempt's
    `deployment_id` (`<provider>:<model>`, nullable) and `provider_access` (nullable), `rate_version`, the four
    `usage` token counts, `charge_nano_usd`, `supply_cost_nano_usd`, `shortfall_nano_usd`, `released_nano_usd`,
    `byok` and `sandbox`.
  - Deliberately no `subject`, no `project_id` and no account id: the event is for aggregates, while per-person
    statements are read from Billing.
  - Money is integer nano-USD as decimal strings (D1); a number amount and a subject field are invalid fixtures.
  - Billing's manifest lists the event in `eventsProduced`; Report's lists it in `eventsConsumed`.
- **`sandbox` on Credits holds: `billing.credit-hold@1` and `billing.credit-hold-create-request@1`** (D10, additive).
  - An optional boolean `sandbox` (default false) says the hold draws on that person's sandbox credit for the project
    (account kind `usd_credit_sandbox`, owner `subject:project`), never on real Credits; a real hold never draws on
    sandbox credit.
  - `billing.credit-sandbox-grant-request@1` now says its grants land in that sandbox account.
  - Valid fixtures cover `sandbox: true`; `sandbox: "yes"` is invalid.

## 0.286.0 — 2026-11-04

- **Provider-rate evidence events: `watch.rate.changed@1`, `watch.rate.approved@1`, `watch.rate.rejected@1`**
  (OpenVibe.Watch #205, plan P6, flag `WATCH_PROVIDER_RATES` off by default).
  - `watch.rate.changed` is raised when a provider's official price document states a new value for one model and
    token class. It carries `change_id`, `source_key`, `provider`, `model`, `token_class` (`input`, `cached_read`,
    `cache_write`, `output`), `from_nano_usd_per_m` (null for a first price), `to_nano_usd_per_m`, `currency`,
    `region`, `effective_date`, `source_url`, `fetched_at` and `approval_required`.
  - `watch.rate.approved` and `watch.rate.rejected` are the same change plus `state`, `decided_by` (a person's
    `usr_` id; Watch refuses a service or an agent), `decided_at` and `applied` (always false).
  - Money is integer nano-USD per million tokens as decimal strings (D1); all three schemas refuse numbers and floats.
  - Evidence only: Watch writes no rate card. An approval is dated evidence for OpenVibe.AI's catalog operator, who
    alone changes the supply rate card through AI's own path.
  - Watch's service manifest now lists the three events in `eventsProduced`. OpenVibe.AI consumes no events yet
    (`eventsConsumed` is empty), so it is not registered as a consumer.

## 0.285.0 — 2026-11-03

- **`ai.inference.create` is retired** (AI Exchange D8′).
  - It duplicated `ai.app.run`, the public capability developer apps already use to call OpenVibe AI (ADR-014, on
    `/v1/chat/completions` and `/v1/messages`).
  - It was added in 0.284.0, and was never granted or served.

## 0.284.0 — 2026-11-03

- **AI Exchange contract foundation (D1-D4, D8)**:
  - `ai.model@1` extended to a catalog entry with optional `id`, `family`, `variant`, `quant`, `revision`, `sha256`, `license`, `context`, `capabilities`, `modalities`, `retail_rate` (nano-USD per million tokens) and `availability`; existing provider-model documents stay valid.
  - New schemas: `ai.model-artifact@1`, `ai.inference-deployment@1`, `ai.route-explain@1`, `ai.model-list@1`, `ai.model-read-result@1`.
  - New Billing inference subledger schemas: `billing.credit-hold@1`, `billing.credit-settlement@1`, plus internal route contracts for `POST /internal/credits/holds`, `/holds/:id/extend`, `/holds/:id/settle` and `/holds/:id/release`.
  - `platform.rate-card@1` compatibly extended with optional `side` (`supply`|`retail`), `version` and `effective_to`; existing documents stay valid.
  - New public capability `ai.inference.create` for developer-app inference on `POST /v1/chat/completions` and `POST /v1/messages`, and public capability `ai.model.read` for `GET /v1/models` and `GET /v1/models/:id`.
  - All new schemas ship valid and invalid fixtures, including wrong money type and float money value examples.

## 0.283.0 — 2026-11-03

- **`chat.timeline-result@1` buckets may say how many people wrote** (`people`, optional): a signed-in user, an
  anonymous viewer or a relayed name each count once. OpenVibe.Live's VOD clip cutter reads it as "a reacted room"
  (item 151, C08: 12+ messages from 3+ people before an AI clip can be public); without it the count is unknown and the
  clip stays unlisted. The description now says what Chat already does since Chat #338: Live's own AI viewers
  (`source_platform` ai) are not counted. Optional, so older readers and writers are unaffected.

## 0.282.0 — 2026-11-03

- **`connect.hook.received@1`** (OpenVibe Connect, CON-15, ADR-057 decision 7): a webhook reached a share's hook at
  `https://connect.openvibe.website/h/<hook_id>`. Connect keeps the request (body and headers, 7 days) by reference and
  publishes only a pointer (`body_ref`, method, size, content type), never a body, header or address. Events keeps the
  event and retries Connect's own subscription for up to seven days, so the request reaches the person's computer once
  it is back. Connect's manifest now produces it and consumes it, along with the account events it already handled.

## 0.281.0 — 2026-11-03

- **Two legal profiles: `public` and `service`** (`registry.service-manifest@1` and `registry.product@1`
  `legalProfile`, openvibe-shared 4.107.0). `public` is an open, read-only site with no account. `service` is a personal
  tool or API that keeps what you make with your account. Ten sites served no `/terms`, `/privacy` or `/dmca` because
  no profile told the truth about them (the 11-02 sweep). Their manifests move:
  - `public`: Domains, Report and Search;
  - `service`: AI, Bench, Design, Events, OpenRestream, Surf and Watch (and AI's product manifest).

## 0.280.0 — 2026-11-02

- **`today.agenda.read`** (first-party, owner today; plan L48 V3, "plan my day"): a first-party service names a
  person with X-OV-Subject and reads that person's own agenda (`GET /api/v1/me/agenda`), the same one they see at
  openvibe.today/me. Read-only. OpenVibe.Chat's Vibe reads the day before suggesting a plan, and sets nothing until
  the person says yes. Schemas `today.agenda-request@1` (the `days` query) and `today.agenda@1` (from, to, days,
  events, follows_unavailable), with fixtures.

## 0.279.0 — 2026-11-02

- **Website Connect v0: OpenVibe Connect is live** (CON-1 landed with the OQ-13 review; ADR-057 accepted). The nine
  CON-1 contracts join the catalog, all additive: `website.share@1`, `website.share-create-request@1`,
  `website.share-connect-request@1`, `website.policy@1`, `website.audit-entry@1`, `connect.device@1`,
  `connect.policy@1`, `events.hook@1` and `events.hook-delivery@1`, with valid and invalid fixtures. Id prefixes
  `shr`, `dev`, `hok`, `pol` and `aud`.
- **`manifests/services/connect.json`** (live, connect.openvibe.website, port 5240, ov_connect, site position 51 in
  "make") replaces CON-1's placeholder `website.json`: one id, `connect`, for the repository, ovhost, the database and
  the OAuth client. It owns `website.*` and `connect.*`; the 20 capabilities stay `planned`, now owned by `connect`,
  and none is served or granted.
- **ADR-057's review** decides v0: the WebSocket fallback through Cloudflare inside Connect (no UDP, no DNS-only
  record), names `<label>--<user>.openvibe.website` (Space names never contain "--"), a share-scoped connect key until