# ADR-027: Tools platform API

**Status:** Accepted 2026-09-23. Contracts in openvibe-contracts v0.33.0. Tools serves the registry
routes since 2026-09-23, so `tools.tool.read` is `active` in v0.33.1; the run route and
`tools.net.probe` stay `planned` until Tools serves them.

## Context and current evidence

The owner asked on 2026-09-23 for every tool to be open, modular, reachable through an API and the
SDK, efficient, protected against abuse, and used across the other repositories. The survey of
OpenVibe.Tools that day found:

- **169 public tools in 9 families**, listed by the gateway's catalogue (`GET /api/catalog.json`,
  re-served by Network). Each tool is described in three places that nobody reconciles: the gateway
  copy, the satellite's `domain-map.js` and the satellite's `tools/index.js`.
- **Only the jobs API is uniform.** `POST /api/v1/jobs` and the routes under it run only on the img,
  audio and docs satellites (`apps/_shared/jobs/http.js`). Everything else has its own shape:
  `POST /api/process` and `/api/process/direct` answer `{ success, download }` or `{ error }`,
  `GET /api/net/<endpoint>/:target` answers `{ ok, … }`, and the `/api/dev/*`, yt and maps routes
  each do something different. No endpoint states its input schema, its limits or how it runs.
- **Browser-only tools have no API.** About 70 dev and text tools exist only as page JavaScript.
- **Abuse controls are uneven.** Rate limits are in memory and per IP only. The limiter runs before
  sign-in is read, so the signed-in tier never applies. Every first-party server caller shares
  127.0.0.1. The port tool accepts 20 ports a request at 60 requests a minute with no per-target
  limit. myip trusts the first `X-Forwarded-For` entry the client sent. Sync endpoints skip the job
  caps. Nothing records abuse.
- **Some tools promise more than they do.** Six net tools have no implementation. traceroute, mtr
  and latency are a TCP ping. Protect PDF does not encrypt, and PDF to image returns a placeholder.
- **In the contracts,** `tools.job.*` did not list retry or references and had no schemas, and
  nothing enforced a quota class.

## Decision

### One descriptor per tool, one run API

- **`tools.tool@1` describes each tool.** It gives `id` (the catalogue id), `family`, `name`,
  `summary`, `status` (`stable` | `beta` | `preview` | `unavailable`, and `statusReason` when a tool
  is unavailable), `execution` (`client` | `sync` | `job`), `api`, `run`, `input` (JSON Schema),
  `files`, `output`, `limits`, `auth`, `quotaClass`, `cost`, `egress`, `hosts` and `docs`, and
  optionally (v0.33.1) the catalogue's `keywords` and `examples` of runs, each valid against the
  input schema. There is no `planned` status: a planned entry is not a tool and has no descriptor.
  Tools builds the descriptors from each tool's own code, which retires the three copies. The page,
  the run API, `openvibe-sdk/tools`, the OpenAPI document and the docs all read them.
- **Registry routes** (capability `tools.tool.read`, public). `GET /api/v1/tools` answers
  `tools.tool-list@1`, with schemas as `$ref`. `GET /api/v1/tools/:id` answers the descriptor with
  its schemas embedded. `GET /api/v1/tools/:id/schema` answers
  `{ $schema, $id, $defs: { input, output } }`, which the `$ref`s point at.
- **Run route** (capability `tools.tool.run`, public). `POST /api/v1/tools/:id/run` takes
  `tools.run-request@1`, as JSON or as multipart with the same parts the jobs API takes. It answers
  `tools.run@1`:
  - `200` when the run finished: `succeeded` with `result`, or `failed` or `cancelled` with the
    tool's own `error`;
  - `202` with `Location` while a job is still `queued` or `running`, after waiting up to
    `wait_ms`.

  Refusals before the tool runs are problem+json. `run-request.v1.json` lists the codes.
- **Execution modes.** A `sync` tool is answered inline. A `job` tool's run submits a job of
  `run.job.type` whose input is `{ ...input, ...run.job.preset, tool: run.job.operation }`. The
  job, its events, its files, retry and references are the existing jobs API (`tools.job@1`).
  Output that is a file always comes from a job, so a result always has a download URL, an owner
  and an expiry. Inputs can reference files that already exist: a Media object the caller may
  read, or a result file of the caller's own job. That lets one tool's output feed the next
  without a download.
- **The gateway fronts every job route** under `/api/v1/jobs` (a facade over the satellites), so
  callers and the SDK need one base URL.

### Browser-only tools may get server engines

A pure transform whose engine also runs in Node gets an opt-in server engine for the API: JSON,
minify and beautify, case, slug, hash, base64 and the like. Its descriptor then says
`execution: client` and `api: true`. The page stays browser-only, so "nothing leaves your browser"
stays true for people using the page. A tool without such an engine says `api: false`.

### YouTube downloader is page-only

yt stays a page for people. It is not in the run API or the SDK, because of YouTube's terms and the
legal exposure. Its descriptor says `api: false` and `run: null`.

### Callers, tiers and quotas

- **Tiers, lowest first:** `anonymous < session < user < app/service`.
  - **anonymous:** no token and no session. Keyed by IP, IPv6 by its /64.
  - **session:** the browser's `ov_tools_jobs` cookie.
  - **user:** a Network user token or the `ov_token` cookie.
  - **app/service:** a Network client-credentials token for audience `openvibe.tools`.
- **Anonymous API use is allowed:** the tools are open. It gets the lowest allowance. A tool with
  `auth.anonymous: false` (the heavy job types) needs at least a browser session or a token.
  Sandbox app tokens keep their small allowance (ADR-014).
- **Quotas count weight, not requests.** Each run counts its descriptor's `cost` against its
  `quotaClass` (`tools-run`, `tools-job`, `tools-fetch`, `tools-probe`…), with an allowance per
  tier. A 429 carries `Retry-After`, which openvibe-sdk honours.
- **A class name describes the work, never a tier or a price.** Paid tiers are not built now, and
  when they come they add allowances, not class names. `contracts.tools.checkDescriptor` refuses
  a class name containing a tier word.
- **Only one proxy hop is trusted.** Host nginx derives the client IP (`real_ip_header
  CF-Connecting-IP` over the Cloudflare ranges), and every proxied location sets `X-Real-IP`,
  `X-Forwarded-For` and `CF-Connecting-IP` from `$remote_addr`. Express `trust proxy` matches that
  one hop. A client-sent `X-Forwarded-For` entry is never trusted.
- **Challenge hook.** The guard has a no-op challenge hook, so a challenge such as Turnstile can be
  added later without changing the API. None is used now.

### Network probes need `tools.net.probe`

Port checks, ping, traceroute, mtr, latency and bulk header or TLS checks send traffic to a host the
caller chose. Through the API and the SDK they need the capability `tools.net.probe`, whose
visibility is **partner**. Network grants it to a developer project only when staff add it to that
project's allowance by hand, never through a default or sandbox allowance. First-party services
hold it through their own grants. People keep the probe pages, which have a per-target throttle.

A descriptor with `egress: true` either refuses anonymous callers or declares
`limits.perTargetPerMinute`: runs per minute against one target, across all callers. A probe tool
always has `egress: true` and `auth.anonymous: false`. A client tool never fetches.

### Abuse log

Tools records refused and throttled runs, and runs that trip an abuse rule. Each row holds:

- the caller as `HMAC-SHA256(IP, daily salt)`;
- the principal or user subject when there is one;
- the tool, the reason and the time.

**No raw IP is stored anywhere.** The salt rotates daily and is never kept after its day, so an
old hash cannot be tied back to an address, not even by trying every IPv4 address. Rows are kept
**30 days**. Under ADR-021 this is pseudonymous security data, not analytics. Its only use is
acting on abuse: throttling, blocking a token or an app, reporting to the owner. It is never
joined into analytics. Subject ids may appear because acting on a token or an app needs them,
which ADR-021's analytics rule does not cover.

### Legacy endpoints get deprecation headers

`/api/process` (and its `/direct`, `/multi` and `/info` variants), `/api/net/*` and `/api/dev/*`
keep working. Each answer carries:

- `Deprecation: true`
- `Sunset: Thu, 31 Dec 2026 23:59:59 GMT`
- `Link: </api/v1/tools/{id}/run>; rel="successor-version"`

A descriptor lists these routes in `run.legacy`, which gives the mapping. Removing them after the
sunset is a later decision, informed by how much they are still used.

### Honest status

A tool whose engine is missing on the host has status `unavailable`: it is listed, its runs are
refused with `503 tools.tool.unavailable`, and its page says so. PDF protection becomes real
(qpdf, AES-256) and PDF to image uses pdftoppm. They stay `unavailable` until `qpdf` and
`poppler-utils` are deployed. Probe tools that only do a TCP ping describe themselves as that.

## Alternatives considered

- **Keep one API per satellite and document it.** Rejected: the shapes, error bodies and auth
  differ per satellite, and the SDK would need one client per tool family.
- **Jobs only, with no inline runs.** Rejected: a DNS lookup or a JSON minify would cost a job row,
  a poll and a file, for a millisecond of work.
- **Probes open to anonymous API callers.** Rejected: the port tool can already be used to scan
  third parties, and a public API makes that cheap to automate. People keep the pages.
- **The downloader in the API.** Rejected on YouTube's terms and legal exposure.
- **Raw IPs in the abuse log, deleted later.** Rejected: a daily-salted HMAC is enough to link one
  day's abuse, and it never becomes an address list.
- **A challenge (Turnstile) now.** Deferred: it needs owner setup. The hook keeps the option open.

## Migration consequences

In order:

1. Contracts v0.33.0 (this ADR).
2. The Tools registry and descriptors.
3. The shared guard (tiers, quotas, semaphores, upload sniffing, ffmpeg hardening, egress
   throttles, the abuse log), first in report mode.
4. Worker isolation, so pdf-lib and sharp stop blocking the event loop.
5. The run API, the gateway jobs facade and the legacy headers.
6. Network grants and the sandbox allowance.
7. openvibe-sdk `tools` and the jobs client's retry and references.
8. Callers move over: Live kiosk page titles, Chat MP3 conversion, Community "save as paste",
   Codes docs, the Search index, the Network launcher's recent tools.

`tools.tool.read`, `tools.tool.run` and `tools.net.probe` become `active` in the contracts release
after Tools serves their routes.

## Rollback

Every new route is additive. Turning the run API off leaves the pages and the legacy routes as they
were. The guard starts in report mode, and enforcement is a switch. Deprecation headers are
informational. Deleting the abuse log's table removes it completely, and it holds no raw data to
leak.

## Acceptance tests

- openvibe-contracts `test/run.js`:
  - every descriptor fixture passes `tools.tool@1` and `checkDescriptor`;
  - api false never has a run endpoint, and api true has its own path and an input schema;
  - only job tools name a job, and file output through the API comes from one;
  - an anonymous egress tool has a per-target throttle, and a probe is never anonymous;
  - a client tool never fetches;
  - quota classes carry no tier word;
  - a run's result files are exactly the job's;
  - the list's ids, hosts and counts are consistent.
- In Tools, a registry test runs `checkDescriptor` and `checkList` over every tool, and every
  catalogue id has a descriptor.
- Run API tests cover each refusal code, anonymous versus session versus token tiers, and a 429
  with `Retry-After`.
- A probe run without `tools.net.probe` gets 403.
- yt's run answers `404 tools.tool.not_runnable`.
- Legacy routes carry `Deprecation`, `Sunset` and `Link`.
- No raw IP appears in the abuse log, and nothing in it is older than 30 days.
