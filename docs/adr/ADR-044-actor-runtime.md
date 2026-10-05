# ADR-044: The Actor runtime — the task contract, adapter interface, modes, signals, verification and trust

**Status:** Proposed 2026-10-05 (plan track T17). This is the build-order item immediately after the engine: plan
T17's build order puts "the engine first, where it already runs — harness adapter interface in `openvibe-agents` with
the first new adapters (OpenCode, Antigravity CLI), capability-aware routing, vision inputs and a local sandbox
(headless browser + virtual desktop, screenshots)" ahead of "ADR-044 (task contract, adapter interface, modes,
signals, verification, trust)", and the engine's harness work is paused where it stands. Contract: `platform.task@1`.
Builds on ADR-034 §2 (projects and resource names), §5 (control and data plane) and §9 (metering), on ADR-046 (the
placer, its objectives and the five trust classes), on ADR-012 (one Billing authority) and on ADR-043 (Node control
levels and the local kill switch). For the owner's review.

## Context and current evidence

- **Plan T17** describes the product: "one API and one site where any task goes to the best agent system for it, the
  way OpenRouter does it for models — and one console where people command every OpenVibe resource in plain
  language." Its first layer is the task router: "`POST /v1/tasks` with a task, a mode and a budget → the planner
  picks the backend, runs it, verifies the result, escalates or fails over, and answers with the result, the cost and
  the explanation. Streaming progress, cancellation, webhooks."
- **The router has no contract.** `contracts/platform/` holds the Fabric's offers, requirements, placement results,
  rate cards, telemetry and usage samples, and the Run sibling's `platform.job@1` and `platform.job-frame@1`; none of
  them is a task. There is no `task.v1.json`, no route contract for `POST /v1/tasks`, and no adapter shape written
  down.
- **There is no Actor service to own it.** `manifests/services/` holds the estate's service manifests; none is
  Actor's. Actor
  exists only as a product page, `manifests/products/openvibe.actor.json`, with `relationships.noRepo: true` — a
  site description, not an authority. Every `platform.*` contract is owned by `network`, and this one follows them.
- **The engine already runs.** The plan's engine is `openvibe-agents`, the harness that runs coding, research and
  review jobs across cheap agents with review and hand-off. Plan T17 names it as where the harness adapter interface
  is built first; that work is not done, so the decisions below describe an interface the engine does not implement
  yet.
- **The pieces the router composes exist as contracts.** `openvibe-sdk/placement` is the one placer (ADR-046 §1);
  `platform.placement-result@1` is its explanation; `platform.rate-card@1`, `platform.cost-snapshot@1`,
  `platform.telemetry-sample@1` and `platform.usage-sample@1` are the cost and signal vocabulary (ADR-046 §§2–3);
  `platform.runtime-class@1`, `platform.job@1` and `platform.job-frame@1` are Run's execution shape (T14); the
  `agent` subject is already in `identity/subject-ref@1`.
- **Actor's backend classes** are fixed by the plan: "agent platform, OpenVibe runtime, **Codes**, **Node**, **Run**.
  Coding work is exposed to Actor **through Codes** — one coding-harness router in the estate, not two."

## Decision

### 1. One task contract: `platform.task@1`

`contracts/platform/task.v1.json` (PLANNED, owner `network`) is one task at the router: the resource `POST /v1/tasks`
creates and `GET /v1/tasks/{id}` reads. It carries `id` (`tsk_<ULID>`), `project_id`, `requester` (a person or an
`agent` subject), the `task` text, the `mode`, the `budget`, the `state`, `created_at`/`finished_at`, the `result`,
the `cost`, the `explanation` (one or more `platform.placement-result@1`, oldest first, an escalation appending one),
the `progress` descriptor, the `cancel` record and the registered `webhooks`.

- **`POST /v1/tasks` takes the task's creation subset** — `task`, `mode`, `budget`, and optionally `webhooks`. The
  router mints `id`, sets `project_id` and `requester` from the token, and answers `state: queued`.
- **It is the resource, not a device frame.** Run's `platform.job@1` is handed to a worker inside a
  `platform.job-frame@1` link message because the link is OpenVibe.Node's WebSocket. Actor's link is HTTP and
  server-sent events, so the frame vocabulary is not reused as a message type; `progress` and `explanation` carry
  what the frames carry for a job. This is the shape, and whether Actor later needs an explicit stream-event contract
  of its own (as `run.job-stream-event@1` is Run's) is left to the router's implementation.
- **The contract is `status: planned`** until T17 ships: the catalog's not-yet-implemented value (there is no
  `proposed` status), the same as the planned contracts of T14.

### 2. The adapter interface

An adapter is how Actor reaches one agent system, and the plan fixes what it declares: "Each adapter declares
capabilities, limits, a revisioned rate card (never AI-written) and trust class; BYO keys for any backend." So an
adapter has:

- a **capability set** (which task classes it can take, including vision), checked before any mode or budget;
- **limits** (context, concurrency, time, egress) merged stricter with the caller's, as `platform.job@1` limits are;
- a **rate card** (`platform.rate-card@1`) with `source` and `verified_at`, revised by review and never written by an
  AI on its own;
- a **trust class** from ADR-046 §4;
- **BYO key** support, so a caller can point the adapter at their own account and pay it directly.

The plan puts the first adapters in the engine (OpenCode, Antigravity CLI) and demands that "a new agent platform is
one adapter". The concrete interface — its field names, whether it is one manifest or a set of declared contracts,
and how it is registered — is **not fixed by the plan and is left open**; this ADR fixes only what an adapter must
declare, not the wire shape.

### 3. Modes are planner objectives

`mode` is one of `cheapest`, `balanced`, `best`, `fastest`, `private`; `balanced` is the default. The plan is
explicit that "a mode is a planner objective, not a hard-coded list", so a mode is stated to the placer, not
translated into a backend by hand. Four modes map onto ADR-046's `platform.placement-result@1` objectives
directly: `cheapest → cheapest`, `balanced → balanced`, `fastest → lowest-latency`, `private → private`. `best`
does **not** map to `correctness`: the SDK's `correctness` objective only preserves `req.authority` or the current
placement, so for a new task with neither it ranks like `balanced`, and `high-reliability` has no branch either —
`openvibe-sdk/placement` has no quality ranking that expresses "the highest chance of a right answer first time".
What `best` maps to is therefore left as an open question below; the placer may refine the rest, and the exact
tie-breaks inside a mode are left to `openvibe-sdk/placement`.

### 4. Signals and auto-balancing

Auto-balancing goes "through `openvibe-sdk/placement` over live signals per backend × task class; hysteresis keeps a
task class unless another is clearly better; failover is immediate; every decision is stored and explained." The
signals are the ones the Fabric already contracts: rate cards price a backend, `platform.telemetry-sample@1` reports
its latency, health and status, and `platform.cost-snapshot@1` measures what a class actually cost against its
alternatives. A capability the task needs is a hard filter before ranking, as `excluded()` is in the placer. The
explanation is `platform.placement-result@1`, and it is part of the task, so "which agent ran, why it won, what else
was considered and what it cost" survives the request.

### 5. Verification and cascades

"Cheap first, escalate on failure; cross-family checks; the task's own tests when it has them (code: tests; research:
citations; actions: postconditions)." The task therefore has a `verifying` state between `running` and `succeeded`: a
result that exists is checked before it is delivered, by a model family other than the one that produced it, and only
then becomes `result`. A failed check moves the task to a stronger backend and appends a placement result; the plan
puts the full cascade build after the router itself, so the first router may ship with a single check. A task that
never passes ends `failed`; it never returns an unchecked result as `succeeded`.

### 6. Trust

ADR-046 §4's five classes apply unchanged: `first-party`, `user-owned`, `partner`, `community`, `external`, with
`user-owned` eligible only when the task names it. `private` mode narrows the eligible set to backends that keep the
data on OpenVibe — `first-party`, and a `user-owned` node only when the deployment allows it — which the plan
describes as "only agents that keep your data on OpenVibe: its own runtime and open models on its hardware". Local
execution on a person's own machine goes through OpenVibe.Node under ADR-043's control levels (Observe / Ask /
Trusted / Full control), a local indicator and a kill switch the owner holds; Node's local policy always overrides a
cloud command (plan T14).

### 7. Progress, cancel and webhooks

- **Progress** is `progress`: the server-sent-events `stream_url`, the task's own `last_seq`, and the event kinds
  (`output`, `state`, `end`, the same three as `run.job-stream-event@1`). The stream is best-effort, as a job's stdout
  is; the task record is the source of truth.
- **Cancel** is `cancel`: `POST /v1/tasks/{id}/cancel` records who asked and when, the running backend is stopped as
  its own contract allows (a Run job through `run.job.cancel`, a Node task through its link, an external platform
  through its API), and the task ends `cancelled` with `finished_at` set. Cancel is not a promise that money already
  spent is returned.
- **Webhooks** are registered at creation: an HTTPS URL, the state changes to deliver, and an optional `secret_ref`
  naming the project secret used to sign the delivery — the name, never the secret, as
  `community.moderation-request@1` names a `webhook_url_ref` and ADR-043 keeps device credentials. A failed delivery
  is retried with backoff and never delays the task.

### 8. Cost and budgets

`budget.per_task_usd` and `budget.per_day_usd` are hard limits the router never exceeds; a task that cannot be run
inside `per_task_usd` fails (`actor.budget.exceeded`) instead of running, and `per_day_usd` caps the project's tasks
in one UTC day. `cost.usd` is what the task was billed, to the cent, across every attempt, and the plan's money rule
is "one key, one bill (Billing, T5), per-task cost reported to the cent; free tier from the bounded allowance". The
metering is `platform.usage-sample@1`, written through Billing as Run's job seconds are.

## Authority boundaries

Actor plans and routes; it does not become an authority. The plan's own list of what it calls:

| What Actor needs | Whose authority |
|---|---|
| Coding work | Codes (the one coding-harness router) |
| Persistent conditions | Watch |
| Cloud execution | Run (`platform.job@1` / `platform.job-frame@1`) |
| Local execution and computer control | Node (ADR-043 control levels, kill switch) |
| Resource control | Services (`common.resource-control-request@1`, ADR-048) |
| Artifacts | Media |
| Robots | Bot |
| Progress and triggers | Events (ADR-042) |
| Models | AI |

## Out of scope

- The router, the console (T17 layer 3), persistent agents, memory, schedules and the approval inbox.
- The concrete adapter interface and its registration (decision 2 leaves it open).
- Rankings from real traffic, templates, public agents and the MCP server (later T17 steps).
- The Actor service manifest and its deploy: there is no `OpenVibe.Actor` repository yet, so the contract is owned by
  `network` until one registers a service.

## Open questions for the owner

1. **The adapter interface's shape.** One contract with a discriminator, or one small contract per adapter kind? The
   plan fixes what an adapter declares, not the wire shape.
2. **Per-class success as a signal.** ADR-046 contracts telemetry and cost, but not a per-backend × task-class
   success rate. Whether that is a new signal contract or an aggregation of `run.job.*`-style outcomes is open.
3. **Whether a `user-owned` node may take other people's tasks** (ADR-046's own open question), which `private` mode
   depends on.
4. **Webhook delivery guarantees** — retry count, backoff and whether an exhausted webhook surfaces on the task.
5. **Where an escalated task's partial results live** before it succeeds.
6. **What `best` maps to.** No objective in `openvibe-sdk/placement` ranks quality: `correctness` only preserves
   `req.authority` or the current placement and otherwise ranks like `balanced`, and `high-reliability` has no
   branch. Until the placer grows a real quality ranking, `best → <objective>` is undecided.

## Consequences

- One contract for every task, whatever backend runs it; a new backend is an adapter, not a schema change.
- Additive only: one new catalog id at 1.0.0, one id prefix (`tsk`), and a planned contract with no route and no
  capability yet, so nothing in `generated/openapi/` changes.
- The router can be built against a fixed task resource while the adapter interface stays open.
- Rollback: consumers pin the previous release tag; nothing reads `platform.task@1` until T17's router is written.

## What this ADR does not claim

- No Actor service, router, adapter or `POST /v1/tasks` route exists. `platform.task@1` is a contract for work not yet
  built.
- The engine's harness adapter interface is not built; this ADR decides what an adapter declares, not its fields.
- No backend is ranked, verified or metered by these rules yet; the contracts they rest on are themselves active but
  unwired for this use.
