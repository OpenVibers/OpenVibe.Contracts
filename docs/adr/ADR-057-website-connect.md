# ADR-057: Website Connect — a QUIC edge for Share, a private mesh for Connect, Events for hooks

**Status:** Accepted 2026-11-02 with the OQ-13 review below, which decides what v0 ships (proposed 2026-10-29, CON-1; plan 2026-10-28 §5.9b; research
`research-2026-10-29/website-connect.md` §3.3, §4.3, §4.4 and §4.12). For the owner's review. Builds on ADR-053
(the Website/Host boundary), ADR-045 (the Link is the universal runtime), ADR-042 (the events fabric), ADR-048 (one
authority per resource) and ADR-056 (project secrets: write-only, used by name).

## Context and evidence

- **The product is bigger than a site builder.** openvibe.website today is a product/redirect manifest
  (`manifests/products/openvibe.website.json`, `kind: "moved"`) that opens OpenVibe.Space. Plan 2026-10-28 §5.9b adds
  the other ways to put something on the web: a local port at a stable HTTPS name (Share), a private mesh of the
  person's machines (Connect), policies and audit (Protect), custom domains through Domains, and durable webhooks
  through Events. It is explicitly P1 and its first proof is the owner's agent portal on a phone over 5G.
- **The reuse study is CON-0.** `research-2026-10-29/website-connect.md` checked the candidates on 2026-10-29:
  headscale/`tsnet` (BSD-3), NetBird (client BSD-3, management AGPL-3), zrok/OpenZiti (Apache-2.0), frp (Apache-2.0),
  sish (MIT), Pangolin (mixed AGPL-3/commercial), boringproxy, bore, wstunnel, `quic-go` (MIT) and cloudflared. Its
  verdict is one path per pillar: build a focused relay on `quic-go` for Share, adopt headscale + `tsnet` with a
  tenant boundary for Connect, build the policy/abuse layer on top of Cloudflare and Network identity, and extend
  Events for hooks. §3.3 and §3.4 name what to build and what not to reuse.
- **The data plane is Go; the control plane is Node.** The Link agent is Go (ADR-045). QUIC, HTTP/3, datagrams,
  half-close and backpressure are native there and awkward in Node.js. The control API can stay Node/Express, like
  every other network service. The edge is a separate, exposed, bandwidth-heavy tier and must not share a host with
  the control plane (research §4.1).
- **Node already has a principal.** Network owns node principals (`nod_…`, `ids.newId('node')`) and pairs machines;
  `network.node.revoked` already exists in Network's manifest. Connect must reuse that principal, not mint a second
  machine identity. Network also owns OIDC, project membership and grants; Domains owns DNS proposals; Events owns
  durable delivery and v2 signatures (ADR-042); Report and Billing consume usage.
- **Space already uses `<name>.openvibe.website`.** A single-label name is in use for tenant sites. A new share cannot
  silently take the same label: the name registry must be shared (or the share namespace reserved) before public
  launch. Research §4.3 recommends one registry and single-label share names for v1, with a reserved list
  (`www`, `api`, `app`, `agents`, `hooks`, `edge`, `share`, `status`, `admin`, `mail`, `space`).
- **Universal SSL covers one label, not two.** The existing wildcard certificate covers
  `agents-alice.openvibe.website`; it does **not** cover `agents.alice.openvibe.website`. A deep-label design needs
  a separately provisioned certificate (`*.agents.openvibe.website` via Advanced Certificate Manager/Total TLS, or
  Cloudflare for SaaS) and a namespace decision. The first proof must use the single label and does not wait for it.
- **The PSL is a launch gate, not a follow-up.** Until `openvibe.website` is on the Public Suffix List, host-only
  `__Host-` cookies, no `Domain=.openvibe.website`, and the cross-share cookie test are mandatory. Public shares stay
  closed until the entry lands (research §4.3, §4.12; plan §5.9b CON-21).
- **The contracts are the first deliverable.** CON-1 is the ADR plus the additive v1 contracts and the service
  manifest. No service exists yet: this ADR registers the shape, not a deployment. `contracts/catalog.json` gains
  `website.share@1`, `website.share-create-request@1`, `website.share-connect-request@1`, `website.policy@1`,
  `connect.device@1`, `connect.policy@1`, `events.hook@1`, `events.hook-delivery@1` and
  `website.audit-entry@1`; the service manifest (`manifests/services/connect.json` since the review) lists none of the 20 planned capabilities as served. Nothing is granted.

## Decision

1. **Share is a focused Go edge relay, `openvibe-edge`, plus a Link `connect` core in OpenVibe Link.** The relay is
   built on `quic-go` (MIT): one QUIC connection per Node, ALPN `ovconnect/1`, TLS 1.3, streams for HTTP/WebSocket/TCP,
   datagrams for UDP, and an HTTP/2 + WebSocket fallback on 443 for networks that block UDP. It routes by SNI/Host to a
   `share_id` from Connect's name registry, never from a user-controlled header, checks the signed policy, and then
   opens a stream to the Node. It does not own users, shares, policies or audit. No frp, sish, zrok, Pangolin or
   cloudflared code is forked or embedded.
2. **The control API is a new Node service, OpenVibe.Connect.** It owns shares, share policies, devices, mesh policies,
   hooks, the name registry, abuse holds, audit and quota counters in `ov_connect` PostgreSQL; it mints tunnel tokens
   and signs the short-lived policy cache the edge reads. It is a peer of Domains, Events, Network, Report and Billing,
   not a module of Bot. Bot keeps robots, the device link and command safety (ADR-043); Connect keeps shares, the mesh,
   policies and hooks.
3. **Connect mesh is headscale + embedded `tsnet`, with a tenant boundary that must be proven before consumer
   multi-tenancy.** v1 maps one workspace to one headscale tenant: a person's own network for a personal account, a
   project's network for a team. Node embeds `tsnet` (userspace, no root, no TUN) for the private mesh; the public
   ingress stays Share. headscale does not implement Funnel or Serve and Connect must not promise Funnel-compatible
   behaviour. The tenant-isolation proof must cover: no cross-tenant MagicDNS resolution, no cross-tenant route or
   exit-node leak, no shared pre-auth key, and revocation in one tenant leaving the others untouched. If the proof
   fails, the fallback is a dedicated control plane per paying tenant or NetBird's management (AGPL, heavier), decided
   before "unlimited devices for everyone" is promised. Mobile clients: the official Tailscale apps may not accept a
   custom control server on every platform; for v1 the phone reaches services through Share in a browser, and Connect
   is for PCs, NAS and servers. DERP is self-hosted (`derper`) so relay traffic stays on OpenVibe infrastructure;
   Live's TURN is for WebRTC and is not a WireGuard relay.
4. **Identity and the tunnel handshake use two credentials, both checked.** The Link presents a Network
   client-credentials token whose subject is its node principal (`node:nod_…`) and whose audience is
   `openvibe.website`; the request body is `website.share-connect-request@1` with the `share_id`, the same `node_id`
   and a short-lived, single-use, share-scoped `tunnel_token` minted by Connect. The edge validates the token against
   Network's JWKS, requires the subject to equal `node:<node_id>` (for example `node:nod_…`), redeems the
   tunnel token with Connect exactly once and binds the connection to that share. One credential is never
   enough. The tunnel token is sent once over TLS and is
   never stored, logged, audited or published in an event. OIDC at the share host uses Authorization Code + PKCE
   against Network; the session is a host-only `__Host-ov_session` (Secure, Path `=`, no `Domain`) carrying
   `share_id`, `sub` and `policy_version`.
   `POST /api/v1/shares` returns only `website.share@1`; its response has no tunnel token. The Link obtains the
   short-lived, single-use token through a separate authenticated credential exchange before connecting. CON-5
   defines that exchange's endpoint, request and response schemas, authorization, and delivery to the Node.
5. **Revocation is immediate and has one owner per trigger.** `DELETE /api/v1/shares/:id` writes
   `website.share.revoked`, closes the edge route and tunnel, removes the DNS route if Connect added one and makes the
   public host return 410 within the 5-second budget. `network.node.revoked` closes every share bound to that node.
   A policy change bumps `policy_version`, so the edge's cached signed policy is stale on the next request. Removing a
   device revokes its mesh key at the control plane. No capability, route or cached policy survives a revoked share.
6. **Policy is enforced at the edge, authored and audited by Connect, and fronted by Cloudflare.** Cloudflare
   terminates TLS for HTTP/WS and applies DDoS/WAF/bot rules; the edge performs share lookup, auth, the
   `website.policy@1` decision (public, signin, named, password, one_time, expiry, IP/CIDR, country, rate limits, bot
   check, WAF preset, posture), request size/timeouts and audit; the Link restricts the local target to the owner's
   chosen loopback/LAN port and never proxies arbitrary hosts. Connect owns ownership, policy CRUD, abuse review,
   quotas and revocation. Passwords are Argon2id hashes stored beside the policy and never in the contract; audit
   entries never carry bodies, headers, cookies, tokens, query strings or passwords. Public shares require a
   signed-in creator and pass the abuse screen (Vision UI/look-alike plus Safe Browsing/Web Risk) before activation.
   Exit nodes never become public proxies, and a public share may not target an exit node.
   `expiry` means public access only until `expires_at`; `expires_at` can also cap any other mode. Password and
   one-time policies remain inactive until their credential or link is configured. CON-5 defines the credential/link
   API and activation rules; neither the password nor the link secret belongs in `website.policy@1`.
7. **Hooks are owned by Events and only managed by Connect.** Connect creates a per-hook subscription whose endpoint is
   the hook's own share host (`https://<share>/__ov/hook/<id>`), never an arbitrary URL, and mints a `whsec_…` secret
   shown once. `hooks.openvibe.website/h/<id>` is a thin ingress: size cap, rate limit, optional provider signature
   check, raw body stored at rest by reference, and an event published; Events stores the event, signs every attempt
   with v2, retries for up to seven days while the laptop is offline, dead-letters and replays. The Link verifies the
   signature and 300-second timestamp tolerance, dedupes on `event_id`, acks 2xx and may buffer locally; a 503 asks
   Events to retry. Events produces `events.hook.received|delivered|dead`; Connect writes none of them. No smee or
   Hookdeck is adopted.
8. **The SDK stays MIT and thin.** `openvibe-sdk` (MIT) gets at most a thin `openvibe-sdk/connect` client that talks
   to the local Node daemon over HTTP/Unix socket and to the control API over HTTP. The QUIC data plane, the mesh
   (`tsnet`) and the policy engine stay in the AGPL Node/Connect/edge code. No AGPL/GPL tunnel code is copied into the
   SDK or `openvibe-shared` (MIT). This keeps the permissive client boundary and the copyleft in the agent.
9. **Naming and the first proof use one label.** The first proof is the owner's agent portal at
   `https://agents-<owner>.openvibe.website` (single label), behind OpenVibe sign-in, opened on a phone over 5G with a
   working microphone (secure context) and WebSocket. Cloudflare Universal SSL does not cover
   `agents.owner.openvibe.website`; the two-label form, a `*.agents.openvibe.website` certificate or Cloudflare for
   SaaS is deferred to CON-2. Deep labels do not gate the proof. Public shares remain blocked until the PSL entry, the
   abuse queue and the DMCA/runbook gates land (CON-21).
10. **The contracts are additive v1 and the manifest claims nothing yet.** The nine schemas above are public or
    first-party as noted in the catalog; the 20 capabilities in `manifests/services/website.json` (now `connect.json`, see the review) are `planned`, owned
    by `website`, and listed in the manifest so consumers see the shape. No token is granted, no service is deployed,
    and no DNS record changes. The separate product/redirect manifest `manifests/products/openvibe.website.json` is
    preserved as the domain's product home and still points at Space; `website.json` has `domains: []` and
    `exposure.state: placeholder`. The service repository is `OpenVibers/OpenVibe.Connect`; the edge may be a second
    repository (`openvibe-edge`) under CON-3.

## Service boundaries

| Concern | Owner | Not this service |
|---|---|---|
| Share record, name registry, policy, tunnel token, inspector metadata, audit | OpenVibe.Connect (Node control API, `ov_connect`) | the edge keeps active session state and a signed policy cache only |
| Public QUIC/HTTP/WS/SSE/TCP/UDP ingress, routing, edge policy check, rate limits | `openvibe-edge` (Go, `quic-go`) | it does not own users, shares, policies, audit or hooks |
| Node tunnel, local forwarding, `ov share`, `tsnet` | OpenVibe Link (`internal/connect`) | it does not decide policy or open arbitrary hosts |
| Account, node principal, OIDC, grants, revocation event | OpenVibe.Network | Connect never mints identity |
| DNS proposal, TXT/CNAME, certificate path | OpenVibe.Domains | Connect never writes DNS or holds a provider credential |
| Durable event store, v2 signature, retries, DLQ, replay | OpenVibe.Events | Connect creates the subscription; the edge does not queue |
| Usage, abuse analytics, billing | OpenVibe.Report / OpenVibe.Billing | Connect emits usage; it does not price or bill |
| Firewall helper, local posture read | OpenVibe Link, local approval | no remote "open this port" API |
| Thin client for apps | `openvibe-sdk/connect` (MIT) | no tunnel or mesh code in the SDK |

## Rejected reuse paths

| Path | Why not |
|---|---|
| frp as the product | Great data plane, wrong abstraction: static proxies and a server-wide token; per-user policy/audit would be a fork. |
| sish | MIT and simple, but SSH-first UX, no UDP and no per-share policy model. |
| zrok / OpenZiti | Right feature list, but operating the OpenZiti controller/router/edge is a second platform. |
| NetBird wholesale | Complete mesh and reverse proxy, but the management stack is AGPL and heavy, Reverse Proxy is beta, and it duplicates Share. |
| Pangolin | Strong SASE, but mixed AGPL/commercial files and a full product to reskin; not embeddable without a file-by-file audit. |
| cloudflared | Apache-2.0 client, but the protocol is tied to Cloudflare's edge; it is not a self-hostable relay. |
| rathole / bore / wstunnel | Good minimal transports with no identity, policy, control API or multi-tenancy. |
| Tailscale SaaS | Excellent product, but a competitor cannot be built on its control plane; headscale + `tsnet` is the reusable path. |
| smee / Hookdeck | smee is development-only (unauthenticated channels, no storage); Hookdeck is closed and per-event priced. Events already has the store, signatures, retries, DLQ and replay. |

## Consequences

- **Positive:** the exposed data plane is small and Go-native; the control plane reuses Network identity, Domains
  proposals, Events delivery and the existing operational stack; the SDK stays MIT; every contract is additive and
  consumers can build against it before the service exists.
- **Negative:** a new service and a new edge fleet to run; a headscale/`derper`/PostgreSQL/ValKey footprint; a public
  ingress that will attract abuse, so quotas, the abuse queue and the PSL gate are launch blockers; deep-label URLs
  wait for CON-2; the TCP/UDP port pool and DDoS capacity are real cost.
- **Compatibility:** all nine contracts are new v1 files; no existing contract changes. The manifest is new. The
  generated TypeScript/bundle and OpenAPI outputs are regenerated; no existing route changes. Consumers pin the next
  release tag (v0.279.0) when they start.
- **Rollback:** remove the new catalog rows, schemas, fixtures, capabilities and manifest, and regenerate. No deployed
  service or grant exists to roll back in CON-1; CON-3/CON-5 must add expand/migrate/contract rules before their first
  deploy (ADR-028).
- **Tests:** every schema has a valid and an invalid fixture; the catalog `$id`/path/major checks, manifest and
  capability validation, capability-schema resolution and OpenAPI generation run in `npm test`. The narrow service
  check is `npx openvibe-contracts-check --service website`; because no service checkout exists yet it can only prove
  the manifest resolves and the installed contracts satisfy its range, not that routes enforce the capabilities.
  CON-3/CON-5 add the code check with `--src`.

## Contracts and capabilities added

| Contract | Visibility | Purpose |
|---|---|---|
| `website.share@1` | public | the share record: owner, project, node, label, host, protocol, local target, status, policy version, region/edge, timestamps |
| `website.share-create-request@1` | public | name, protocol, local target and an inline policy constrained to caller-owned fields; project scope comes from the token |
| `website.share-connect-request@1` | first-party | `share_id`, `node_id`, single-use `tunnel_token`, transport, node version, region |
| `website.policy@1` | public | mode and rules; no password hash; version for the signed edge cache |
| `website.audit-entry@1` | first-party | one decision row with subject/IP/country/UA/method/path/status/bytes and no bodies or secrets |
| `connect.device@1` | public | one device in one tenant, with self-reported posture and routes |
| `connect.policy@1` | first-party | one tenant's grants, default deny, exit node and subnet routes |
| `events.hook@1` | public | a durable hook: share, ingress, topics, filters, retry, v2 signature, `secret_set` (never the secret) |
| `events.hook-delivery@1` | public | one attempt: status, code, latency, size, hash, next attempt, dead/replay; never the body |

The 20 planned capabilities are the exact §4.4 set: `website.share.create|read|update|delete|connect|inspect|replay`,
`website.policy.read|write`, `connect.device.read|manage`, `connect.policy.read|write`,
`events.hook.manage|read`, `website.abuse.report|review`, `website.domain.manage` and the internal
`website.admin.read|manage`. The §4.4 wildcard `website.admin.*` is expanded into those two exact ids because a
capability id is concrete; `website.abuse.review` stays the moderator queue. None is active and none is granted.

## Open questions for CON-2 / CON-3

- **CON-2 (namespace, TLS, DNS, PSL):** one shared name registry with Space vs a reserved share namespace; the exact
  reserved-label list; `*.agents.openvibe.website` via ACM/Total TLS vs Cloudflare for SaaS; the PSL submission and
  the cross-share cookie test; whether TCP/UDP use `game.openvibe.website` or per-region `edge-<region>` records and
  which port ranges each region owns. The first proof needs only the single label and the existing wildcard.
- **CON-3 (edge v0):** the QUIC stream framing and fallback mux; whether the signed policy cache is a JWT or a
  Connect-signed document and its TTL; the edge's DERP/relay relationship; the exact ready/health contract and the
  region pinning/reconnect budget; how the edge proves a tunnel token was redeemed only once without a round trip per
  request.
- **CON-5 (control API):** the abuse report request/response bodies (deliberately left out of CON-1), the
  authenticated tunnel credential exchange and password/one-time credential/link setup API, the
  `share-access`/role model, the name-registry table owner, and the `website.share.accessed|blocked` sampling policy
  (per request would be too high-volume for Events).
- **Owner:** the free-tier limits (shares, devices, bandwidth, hooks), whether custom domains are free at launch,
  and the DMCA agent/takedown runbook owner (CON-21).

## Sources

- `research-2026-10-29/website-connect.md` §1.1–1.7, §3.2–3.4, §4.1–4.13 (checked 2026-10-29).
- `OpenVibe_New_Domains_Plan_2026-10-28.md` §5.9b and the CON-1…CON-21 ledger.
- ADR-053 (Website/Host boundary), ADR-045 (Node runtime), ADR-042 (events fabric), ADR-043 (Bot devices), ADR-048
  (control plane), ADR-056 (project secrets), ADR-028 (expand/migrate/contract).
- `manifests/products/openvibe.website.json` (the distinct product/redirect manifest, preserved), ADR-005 (realtime),
  `manifests/services/events.json` and `manifests/services/network.json` (node revocation and hook events).

## Review (OQ-13, 2026-11-02): what v0 ships

Re-derived from the owner's ask (a port on your machine at a stable HTTPS name, opened on a phone over 5G, behind
OpenVibe sign-in) and from what the network runs on today: one host, every name proxied by Cloudflare.

1. **v0's data plane is the WebSocket fallback, inside OpenVibe.Connect.** A QUIC edge needs UDP to the origin.
   Cloudflare proxies HTTP and WebSockets, not QUIC to an origin, so the edge would need a DNS-only record that shows the
   host's address, and Decision 1 also wants it on a host of its own. Neither exists, and neither is needed for the
   first proof. The relay ships as `server/edge/` in OpenVibe.Connect: the computer opens one WebSocket to
   `wss://connect.openvibe.website/tunnel` through Cloudflare on 443 (`ovconnect-ws/1`: JSON control messages, binary
   data frames per stream, per-stream backpressure), and a visitor's request on a share host goes nginx → Connect →
   that WebSocket → `localhost:<port>`. WebSocket upgrades become a byte pipe to the local port; server-sent events
   stream. The edge module is separate from the control code so CON-3 can move it to a QUIC edge on its own host
   without changing the client's view of a share.
2. **Names: `<label>--<user>.openvibe.website`.** One label, so the existing wildcard certificate covers it (Decision
   9). The person's handle is part of the name, so names are per person and nobody can take another's. OpenVibe.Space's
   site names are `[a-z0-9]` with single hyphens (`server/domain/sites.js` NAME_RE), so no Space site can ever contain
   "--", and no shared name registry is needed: nginx sends `~^[a-z0-9-]+--[a-z0-9-]+\.openvibe\.website$` to
   Connect, and Space's server_name leaves those hosts out. `connect` is reserved in Space.
3. **The computer's credential in v0 is a share-scoped connect key** (`ovc_` + 32 random bytes, stored as a SHA-256
   hash, shown once, replaced on demand, which disconnects the old computer). Decision 4's two credentials (a node
   principal token plus a single-use tunnel token) need the OpenVibe Link plugin (CON-4); the standalone client cannot
   hold a node principal. The key opens one share's tunnel and nothing else.
4. **The gate is Connect's, and every cookie is host-only.** `/grant` on connect.openvibe.website signs the visitor
   in with OpenVibe, checks the share's policy, and hands the share host a one-time code (60 s, one use, bound to the
   share); the share host sets `__Host-ovc`, HMAC-signed and bound to the share and its `policy_version`. A Set-Cookie
   from the shared app loses its Domain attribute (the PSL entry is not in yet), the app never sees the gate's cookie,
   and nothing a share sends may be kept by Cloudflare's cache (`Cloudflare-CDN-Cache-Control: no-store`, private
   Cache-Control): a cached copy would be served past the gate.
5. **Modes in v0: owner, named, and signin (staff-first).** Public is refused until CON-9 and CON-21, as Decision 6
   says. Because anyone can make an OpenVibe account, "anyone signed in" is nearly public, so it is open to OpenVibe
   staff (Network role admin) until the abuse check, as Space's public publishing is.
6. **The service is `connect`.** One id everywhere: the repository OpenVibe.Connect, ovhost `connect` (port 5240),
   database `ov_connect`, OAuth client `connect`, `manifests/services/connect.json` (domain connect.openvibe.website,
   live), owning the `website.*` and `connect.*` namespaces. The 20 capabilities stay `planned` and owned by
   `connect`; v0's API is a person's own (session or Network user token) and serves none of them. The share API's
   shapes are Connect's own in v0; `website.share@1` conformance comes with CON-5.
7. **What waits:** the QUIC edge (CON-3), the Link plugin and node principals (CON-4), custom domains (CON-7), the
   inspector (CON-8), the abuse gate (CON-9), TCP/UDP shares (CON-11/12), the mesh (CON-13; the headscale tenant proof
   stands), hooks (CON-15) and the launch gate for public shares (CON-21).
