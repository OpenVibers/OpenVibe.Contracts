# ADR-034: The platform north star — an open, affordable cloud

**Status:** Proposed 2026-09-28, for the owner's review. The owner's direction: "highly optimized, efficient, modular and fully scalable … powerful and interconnected, with a full SDK and API … the open affordable version of AWS one day … moddable." This ADR turns that into rules that every later decision and implementation follows. It guides roadmap workstream WS-W.

## Context and current evidence

What exists already maps onto the primitives of a cloud:

| Cloud primitive | OpenVibe today | Decisions |
|---|---|---|
| Identity and access (IAM) | Network: subjects, OAuth 2, service and app principals, capability grants, staff maps, revocation | ADR-001, ADR-003 |
| Accounts and tenants | Network projects: members, apps, environments, credentials, grants, quotas; `project_id` in Media, Host, Events | ADR-014 |
| Object storage (S3) | Media: typed objects, namespaces, grants, signed URLs, B2 canonical + R2 hot tier, verification; an S3 subset is decided | ADR-006, ADR-031 |
| Messaging (SNS/SQS/EventBridge) | Events: durable outbox/inbox, v2-signed webhooks, replay, realtime SSE with resume | ADR-004, ADR-005 |
| Hosting and compute | Host: static sites, `ovhost` deploy/rollback/readiness/drills; Stage B for projects; Stage C (untrusted code) undecided | ADR-032 |
| AI (Bedrock) | OpenVibe.AI: versioned workflows and templates, routes, BYO credentials, quotas, local models | ADR-015 |
| Search, ingestion | Search, Sources | ADR-017, ADR-018 |
| Billing and metering | Billing ledger, `common.usage-recorded`, per-actor limits, AI quotas | ADR-012 |
| Developer surface | Codes (portal, apps, playgrounds, docs), openvibe-sdk v0.13, Contracts v0.75 | ADR-002, ADR-008 |
| Extensions | Mods with their own principals, budgets and grants; Tools platform API | ADR-013, ADR-027 |

Everything runs on one host: about 25 Node services, one SQLite database each, as systemd units. Measured load is about 1% of what SQLite handles (ADR-007 amendment, 2026-09-26). Deploys are manual `ovhost deploy` runs.

At a much larger size, the database engine and the orchestrator are not what is expensive to change. The expensive things are **boundaries**: how tenants are separated, how resources are named, how access is decided, what the API contract is, and how usage is counted. Each of those touches every row, every route and every event, so changing it late means migrating everything. Today they are cheap to set.

## Decision

### 1. Boundaries now, infrastructure when measured

Invest now in what is expensive to retrofit: tenancy, resource names, authorization, contracts and metering. Defer what is cheap to change later until a measured trigger says so: PostgreSQL (ADR-007's triggers), more hosts, containers (ADR-032), regions. A trigger turns into a planned move, never a rewrite, because the boundaries were right.

### 2. Every resource belongs to a project and has one name

- The **project** (ADR-014) is the unit of tenancy, quota, keys, billing and export in every service. First-party products are projects too: Live, Games and Tools use the same public APIs, SDK, grants and quotas as an outside developer. The only exceptions are the control plane's own internal routes, and those keep shrinking (C-50 to C-57).
- One **resource name** across services, built from the typed ULIDs that exist:
  `ovrn:<service>:<project>:<type>/<id>`, for example `ovrn:media:prj_01J…:object/med_01K…`.
  It is used in grants, audit logs, events (`resource`), usage records, bills and the console.
- Every row a tenant owns carries its `project_id`. This is what later allows moving a project between cells (section 5) with the export/import machinery of ADR-033.

### 3. One authorization model

- Capabilities (ADR-003) remain the verbs.
- Grants gain a **resource scope**: a resource name or a prefix pattern. They also gain optional **conditions**: environment, source network, time window, fresh sign-in (`auth_time`).
- Explicit deny wins over any allow.
- One SDK function (`openvibe-sdk/policy`) evaluates every decision in every service. No service writes its own check.
- Network answers "why was this allowed or denied?" for the console and the audit log.

### 4. Contracts are the product; SDKs, docs and tools are generated from them

- Every HTTP API and event of every service is described in Contracts. This is already true for events and most results.
- Each Contracts tag publishes an **OpenAPI 3.1** document per service and an **AsyncAPI** document for events, both generated.
- The JavaScript SDK stays hand-written where ergonomics matter, but its types and a thin client are generated from the same schemas. Python and Go clients are generated next.
- A CLI (`ov`) comes from the same descriptions, and later an OpenTofu/Terraform provider for projects, apps, grants, buckets, subscriptions and sites.
- A change that breaks a published contract fails CI, as `compat.js` already enforces.

### 5. Control plane and data plane; cells when one host is not enough

- **Control plane:** identity, projects, grants, registry, billing and deploy. It is small, needs strong consistency, and is replicated first. It holds the first candidates for PostgreSQL when a second host arrives (ADR-007: "a second host or writer").
- **Data plane:** Media bytes, Events streams, Chat rooms, Search indexes and AI runs, all partitioned by project.
- **Cells.** Scale out by adding cells rather than by making one system bigger. A cell is a set of hosts that runs the data-plane services for a set of projects, with its own databases. SQLite per service per cell stays viable because a cell is small by construction.
  - A thin global router (Cloudflare plus the registry) sends each project's traffic to its cell.
  - A failing cell affects only its projects.
  - Moving a project between cells is an export and an import.

### 6. One service kit

Every service is built from the same kit:
- Shared: readiness, metrics, release manifest, test runner, the Frame;
- the SDK: auth, policy, per-actor limits, outbox, events;
- a Contracts manifest.

`create-openvibe-service` generates a new service with readiness, metrics, limits, an outbox, drills, `release.json`, the README and STATUS.json that docs-currency expects, and CI already wired. A new cloud service is then only its domain code.

### 7. Deploys are pulled, gated and ordered by contracts

- The desired state is main at its last green CI commit. A controller on each host reconciles to it. GitHub webhooks are only a hint, verified through the GitHub API; hosts also poll.
- CI builds a signed, content-addressed release package. Hosts verify it and switch a release symlink. A documentation-only commit produces the same package and changes nothing.
- A policy per service decides the path:
  - automatic;
  - automatic behind gates: exact-commit CI, N-1 compatibility, contract ranges, expand-only migrations, no freeze;
  - manual: money paths, contract-phase migrations, Live with streams up.
- Cross-service order comes from the contracts each `release.json` produces and consumes.
- A canary goes first and is judged on error rate, readiness and client release health. A regression rolls back automatically.
- Secrets move out of environment files into encrypted systemd credentials, and rotation becomes an `ovhost` command.

### 8. Extensibility at four levels, one manifest

1. **Events and webhooks** (exist): a project subscribes to whatever its grants allow.
2. **Functions**: project code run on events, schedules or HTTP (the "Lambda" level).
   - It runs in Host Stage C's sandbox: WASM or QuickJS for small functions, micro-VMs for whole containers.
   - Each function has its own principal, and its grants are approved the way a mod's are.
3. **UI extension points**: named slots in the OpenVibe Frame, Live (overlays, chat commands, dashboard widgets), Games (mods) and Community (thread types).
   - Each is declared, permissioned and installable per person, channel or project.
4. **Marketplace**: listings, review tiers (ADR-013 trust), signed packages, install counts, and revenue share through Billing. Paid listings need ADR-025 reopened first.

Mods, bots, functions and integrations are all **extensions**. One `extension-manifest@1`, generalizing `mod-manifest@1`, describes each one: its runtime, entry points, requested capabilities with resource scopes, and budgets.

### 9. Metering is a primitive, and affordable is a design target

- Every billable action emits `common.usage-recorded` with the resource name, project and quantity. Billing rates it against a public price list.
- Budgets and alerts are per project, as AI quotas already work.
- Prices are cost plus a stated margin: storage from B2, egress from R2, compute seconds.
- Free tiers fit on cheap hardware.
- Internal traffic between a project's own resources is never charged.

### 10. Efficiency is measured, not assumed

- Cost per request, per GB and per run is a metric beside latency.
- Idle tenant workloads scale to zero.
- Storage tiering (R2 hot, B2 canonical, local cache) is automatic.
- Local models come first, as `media.analyze` does.
- Heavy work goes through queues sized to the host.

### 11. Observability is part of the product

Every project can see its own traces (`traceparent` exists), metrics and logs, in the console and through the API, with retention per plan.

### 12. Many locations: load balancing, regions, edge nodes and geolocation

There are two kinds of location, because most of what "near the user" buys is cheap to place, while data is not.

**Regions are full cells.**
- Each region runs the data plane for the projects homed there (section 5).
- A project has one home region, where its writes go. Other regions read through caches or replicas.
- Data residency (for example "EU only") is a project setting that pins the home region.
- The control plane is global and small.

**Edge nodes are small, cheap machines in many places.** They run one agent with a few roles and hold no tenant data:
- **probe**: ping, traceroute, DNS, TCP/UDP and HTTP checks toward a target;
- **relay**: TURN for WebRTC calls, and game-server query relays;
- **ingest**: RTMP, SRT and WHIP accepted near the streamer, forwarded over the private network to the home region's OpenRe;
- **cache**: media and page cache in front of R2 and origin.

Edge nodes are listed in the registry with their location (city, country, coordinates, provider), roles, capacity and health. The same deploy controller (section 7) manages them.

**Load balancing has three layers.**
1. **Global, for HTTP and WebSocket.** Cloudflare's anycast proxy with health-checked origin pools and geo steering, as today's proxy already does for one origin.
2. **Global, for protocols Cloudflare does not proxy** (RTMP, TURN, game UDP). Geo-steered DNS picks candidate nodes, and the client confirms with measured round-trip time (below).
3. **Inside a region.** nginx upstreams generated from the registry and checked by `/ready`. They are sticky where state lives in a process (a chat room by room hash, an ingest session by stream key), and plain round-robin elsewhere.

**Geolocation is a platform service, not per-product code.**
- `openvibe-sdk/geo` answers "which nodes with role R are nearest this client?". It uses, in order of trust:
  1. measured round-trip time from the client to node beacons (small HTTPS or WebSocket endpoints on each edge node; the browser or game client times a few requests);
  2. Cloudflare's colo and country headers;
  3. an offline IP-to-region database.
- It stores region-level location only, never a precise position (ADR-021's privacy bounds). A person's measured latencies stay in their session.
- Probes are an API: `POST /api/v1/probes { target, kind, locations }` runs a check from several edge nodes and returns per-location results, streamed over Events realtime.
  - Every probe is metered and limited per actor.
  - Targets pass the egress guard: public addresses only, no internal ranges.
  - Rates are capped per target, so the probe network cannot be used as a flood tool.

**What this enables.** These are examples, not a closed list:
- **Game-server lists** that query each server from the probe node nearest to it (accurate player counts and status). Each player sees the ping from their own nearest location, can sort servers by that, and joins through the closest relay.
- **A ping and network tool** that shows latency, loss and a route from many locations at once, like a public looking glass.
- **Streaming**: a streamer's closest ingest node, with viewers served from the closest cache. Live calls and Chat calls get the nearest TURN relay, as `server/net/turn.js` does today with one server.
- **Games**: matchmaking players into the region where their latencies are lowest together.
- **Operations**: uptime checks of every public site from several continents, feeding the status page and alerts. This makes an outage seen from one place distinguishable from a real one.
- **Tenants**: the same probe and geo APIs, and edge roles, offered to developers (latency-based routing for their own services, synthetic checks, relays) and billed per use (section 9).

## Consequences

- The near-term work is mostly boundary work:
  - resource names in events, audit and usage;
  - resource scopes on grants;
  - `project_id` on every tenant row;
  - generated OpenAPI;
  - the service kit;
  - the deploy controller;
  - the node registry and the geo API, so products are written against "the nearest node with role R" from the start instead of against one host.
- There is no PostgreSQL, Kubernetes or multi-region work until a trigger fires (ADR-007, ADR-032). The boundaries make those moves mechanical when they come.
- First-party products lose their internal shortcuts, a direction already set by the C-50 to C-57 retirement.
- Every later ADR states which section of this one it serves, or why it departs from it.

## Phasing (roadmap WS-W)

1. The deploy controller, phase 1 (automatic deploys for low-risk services). Resource-name and grant-scope schemas in Contracts. Generated OpenAPI and AsyncAPI. The node registry schema (location, roles, capacity) and `openvibe-sdk/geo`, working with one location.
2. Signed release packages and the release layout for every service. The service kit generator. `extension-manifest@1`, with mods migrated onto it. `openvibe-sdk/policy`.
3. The Stage C function sandbox. Metering through Billing with a public price list. Per-project observability. The `ov` CLI. The first edge nodes (probe and relay roles on a few cheap machines on other continents), the probes API, and multi-location uptime checks.
4. Cells, and the control plane's move to PostgreSQL, when a trigger fires. Edge ingest and cache roles. A second region with project home regions and data residency. Geo-steered load balancing for non-HTTP protocols. The marketplace, after ADR-025 is reopened.

## What this ADR does not claim

None of the new parts are running. Only what the context table lists exists today. Each phase reports progress through the roadmap plan and each service's STATUS.json.
