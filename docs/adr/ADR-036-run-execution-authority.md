# ADR-036: Run is an execution authority, not a Host detail

**Status:** Proposed 2026-10-05 (plan track T14, "Run is not a Host detail"; plan §8 lists ADR-036 as one of the records
"to write before their code", and Run's own code is owner-blocked). For the owner's review. Builds on ADR-034 §5
(control plane and data plane; cells), ADR-032 (containers: platform services stay systemd units; tenant code
isolation belongs to Stage C) and ADR-046 (offers, requirements, placement, signed plans and trust classes).

## Context and current evidence

- **Plan T14** (lines 559–583): *"Finish line: any workload — a function, code, a browser session, a Linux or desktop
  machine, a GPU job — runs in a sandbox with metering, limits, cancellation and streaming, placed by the Fabric on
  the cheapest capability that works; the Node runtime runs the same workloads on official servers and on users' own
  machines under their trust policy."* And: *"**Run is not a Host detail.** Host deploys persistent applications; Run
  executes isolated jobs/environments. They can share machines; they are separate authorities (ADR-036 rewritten
  around this expanded purpose)."*
- **Plan §8** lists ADR-036 as a rewrite: *"ADR-036 Run (**rewrite** around the expanded Run)"*. The line numbers
  above are from a read of `origin/main`; the file has no ADR-036 today, and the plan's T14 wording is the only
  statement of the decision.
- **What the code already does.** Contracts carry the vocabulary but not the service:
  `platform.runtime-class@1` (exactly six classes, in order: `function`, `code`, `browser`, `linux`, `desktop`,
  `gpu`), `platform.job@1`, `platform.job-frame@1`, and the `run.*` request/result/event contracts plus capabilities
  `run.job.submit`/`read`/`list`/`cancel`/`stream`/`admin` and events `run.job.queued|started|succeeded|failed|cancelled|expired`.
  Every one of those contracts is marked PLANNED, `run` is a `placeholder` service, and `openvibe.run` has no
  repository (`manifests/services/run.json`; `test/platform-run.test.js:90`). No placer call, no Run API.
- **Host is the other authority.** Host already has its own contracts (`host.deploy@1`, `host.site@1`,
  `host.project@1`, `host.domain@1`, and the create/read/manage request and result pairs). Nothing in them executes a
  tenant workload. ADR-032 keeps platform services as systemd units and puts tenant-code isolation in Stage C; that
  isolation is Run's, not Host's.
- **The Fabric half is written down.** ADR-046 defines `platform.resource-offer@1`,
  `platform.workload-requirements@1`, `platform.placement-result@1` and the signed `placement-plan@1`, and reserves
  the `worker:<class>` capability names. `openvibe-sdk/placement` (`plan()`) is the one placer.
  `platform.runtime-offer.v1.json` is the execution-capacity offer (its `kind` is `container`/`process`/`wasm`/`vm`/`function`,
  with `limits`, `price`, `availability` and `constraints`); `platform.resource-offer.v1.json` carries the
  capabilities, trust, latency and health the placer filters and ranks on.
- **The first executor exists.** OpenVibe.Node's job worker runs `platform.job@1` jobs and emits per-second
  `job_usage`, folded into `platform.usage-sample@1` readings keyed `run:<job id>:<n>` (`test/platform-run.test.js`;
  OpenVibe.Node `docs/protocol.md` and `docs/worker.md`). The Node advertises `worker:function` (and `worker:code`)
  in `platform.resource-offer@1.capabilities`.

## Decision

### 1. Run is an execution authority; Host is a deployment authority

- **Host** deploys and operates persistent applications: a project's sites, domains, deploys and their config
  (`contracts/host/*`). Its resources are long-lived and its lifecycle is a deploy.
- **Run** executes isolated jobs and environments: a single run of a function, code, a browser session, a Linux or
  desktop machine, or a GPU job, with its own sandbox, its own metering and its own end states. Its resources are
  jobs and sandboxes, not sites.
- The two are separate authorities: separate service principals, capabilities, contracts, events and data. They **may
  share machines** — a cell's host can run both — but sharing a machine is not sharing authority. A Run outage does
  not stop Host deploys and a Host deploy does not create, own or bill a Run job.
- Run's jobs and sandboxes are the authority's resources: each is named by OVRN and every change goes through a
  `common.resource-control-request@1` call to Run, which appears to Services as an authority like any other (ADR-048).

### 2. Runtime classes

- A job names one `platform.runtime-class@1` class: `function`, `code`, `browser`, `linux`, `desktop` or `gpu`.
  `function` is the first class implemented; the others are reserved names (the class contract says so).
- A worker advertises one reserved Fabric capability per class it runs, `worker:<class>`
  (`platform.resource-offer@1.$defs.reservedWorkerCapabilities`, one name per class, in class order). A class it does
  not advertise is refused (`nack`, `unsupported`); Run places a job only on a node that advertises
  `worker:<class>`, so a class no node runs ends `expired` (`run.job.unplaceable`).

### 3. Provider adapters are Fabric offers, not code paths in Run

The adapters the plan names (T14, lines 567–569) — OpenVibe official worker, OpenVibe Node worker, self-hosted Run
worker, managed browser providers, external sandbox providers, external GPU providers — are **offers**, not branches
inside Run. Each reports:

- `platform.resource-offer@1` for the machine or provider (kind, region/cell, trust, `capabilities`, capacity,
  latency, health, pricing), and
- `platform.runtime-offer.v1.json` for the execution capacity it sells (its `kind`, `limits`, `price`, `availability`
  and `constraints`).

Run states `platform.workload-requirements@1` and reads the `platform.placement-result@1`. Placement is **always**
`openvibe-sdk/placement` `plan()`: hard constraints first, then the objective and hysteresis, with an explanation.
Run writes no placer of its own (ADR-046: "A service states requirements and reads results; it does not rank
offers."). The plan's §2.1.11 cross-reference is the Fabric section as written in ADR-046/T1, not a separate scheme.

**Node descriptor → offers.** When Run turns an OpenVibe.Node into Fabric offers it applies the mapping the Node
protocol already fixes (OpenVibe.Node `docs/protocol.md:310–321`):

| Node descriptor field | Fabric offer | Example |
| --- | --- | --- |
| `capabilities.worker.runtime_classes` | `resource-offer.capabilities` item `worker:<class>` | `worker:function`, `worker:code` |
| `capabilities.worker.max_jobs` | `runtime-offer.limits.concurrency` | 1 |
| `capabilities.worker.max_ttl_ms` | `runtime-offer.limits.duration_seconds` | 600 |
| device `node_id` / cell | `resource-offer.node_id` / `resource-offer.cell` | `node_01H…` / `wnam-1` |
| worker trust (local policy) | `resource-offer.trust` | `user-owned` for a user's own Node |

### 4. The cost ladder

The scheduler always uses the **cheapest capability that works**: API/MCP → HTTP/structured → Playwright/CDP browser
→ AI browser → visual desktop → full machine (plan T14, line 570). This ladder is what keeps a caller such as Actor
cheap. Each rung is a candidate offer class the placer can choose; the objective (`cheapest`, `balanced`,
`lowest-latency`, `private`) decides among offers that pass the hard constraints.

### 5. Run guarantees

Every job, on every adapter, is held to the same guarantees (plan T14, lines 572–574):

- **Per-second metering** — one idempotent `platform.usage-sample@1` per elapsed wall second, keyed
  `run:<job id>:<n>`; a resend derives the same reading. `job_exit.usage` is authoritative and never corrects a
  metered second downward.
- **TTL, idle suspend, cancel, snapshot/resume** — a job has a lifetime from creation (wait plus run); an idle
  environment may be suspended and later resumed; `job_cancel` kills the process group and a job cancelled before it
  starts never starts.
- **Streaming stdout** — stdout is streamed as chunks (`job_stdout` on the Node link; `run.job-stream-event@1` and a
  stream ticket over the API), best effort, bounded.
- **Artifacts via Media** — inputs are Media objects pinned by sha256; outputs are Media objects. Run never fetches a
  caller-chosen URL.
- **Resource limits** — wall, CPU and memory caps, merged stricter with the node's own local caps; a request over the
  project's tier cap is refused, never silently lowered.
- **Network policy** — `none` (default), `public` or `openvibe-only`; a node whose local policy is stricter runs the
  stricter one.
- **Strong isolation** — "container-only isolation is not sufficient for hostile arbitrary code" (plan T14, line 574).
  The class and adapter of the sandbox is Run's to enforce; the exact mechanism is open (see below).

## Consequences

- One execution authority and one placement vocabulary. A new runtime class or provider is a new offer (and, for a
  class, a reserved capability name), not new code in Run.
- Host and Run can share a cell's machines without sharing authority; deleting either leaves the other's rows alone.
- The Node job worker is the first execution worker Run places; its per-second frames are already the metering
  contract Billing consumes.
- The `run.*` contracts are the authority's API; they stay PLANNED until the owner unblocks the service.

## Open questions for the owner

1. **Isolation mechanism.** The plan requires more than a container for hostile arbitrary code but names no
   mechanism. Micro-VM (Firecracker/Kata), a userspace kernel (gVisor) and namespace/seccomp sandboxes are all open;
   the Node worker's current `function` isolation is namespaces plus a seccomp allowlist.
2. **Snapshot/resume backend.** Whether a resumed environment's state lives in Media, a Node-local disk, or a
   provider's own snapshot is open.
3. **Idle-suspend policy.** Who decides to suspend — Run, the node's local policy, or a placement objective — is
   open.
4. **Self-hosted Run workers.** Whether one may run other projects' jobs, or only its owner's, mirrors ADR-046's
   `user-owned` question and is open.
5. **Browser/desktop semantics.** Headed versus headless, and what a session's lifetime is, is deferred to the code
   for those classes.

## What this ADR does not claim

- No OpenVibe.Run repository exists on `origin/main`; `run` is a placeholder service and `openvibe.run` has no
  repository. Every `run.*` contract is PLANNED and nothing serves them.
- Only `function` (and, per the worker's own docs, `code`) exists as a worker class, in OpenVibe.Node; `browser`,
  `linux`, `desktop` and `gpu` are reserved names with no worker.
- Cells are a single host (`cell = wnam-1`) today; O24's second physical cell, the WireGuard mesh and geo placement
  are not built (plan T14, lines 580–581).
- Per-second metering is proven only for Node jobs; no Billing consumer reads Run usage on `origin/main` yet.
- The provider adapters above are the plan's list, not deployed adapters; no managed-browser, external-sandbox or
  external-GPU offer producer exists.
