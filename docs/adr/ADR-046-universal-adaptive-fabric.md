# ADR-046: The universal adaptive fabric — offers, requirements, placement, trust classes and signed plans

**Status:** Proposed 2026-10-03 (plan track T1 step 3, for the owner's review). Builds on ADR-034 §5 (control plane
and data plane; cells) and ADR-042 (the events fabric, the first placed workload class).

## Context and current evidence

- ADR-034 §5 splits the platform into a control plane (identity, projects, grants, registry, billing, deploy) and a
  data plane (Media bytes, Events streams, Chat rooms, Search indexes, AI runs), and scales the data plane by cells. It
  does not say how a piece of work is matched to the machine, provider or runtime that runs it.
- There is one placement implementation, `openvibe-sdk/placement`: `plan()` filters offers by hard constraints
  (`excluded()`), then ranks the rest by cost and latency with hysteresis, and explains the choice. `signPlan`,
  `verifyPlan` and `createPlanHolder` sign and check route plans. ADR-042 places event deliveries with it, and Media's
  fabric uses the same shape. No service is to write its own placer.
- The Fabric vocabulary already exists as 20 active `platform.*` contracts, all owned by `network`. What was missing
  was the trust class for a person's own machine (added in 0.87.0) and a written rule tying the contracts together.

## Decision

### 1. Offers, requirements, a result and a plan

- **`platform.resource-offer@1`** — what a capacity holder offers: `kind` (`node`, `provider`, `storage`, `delivery`,
  `runtime`, `agent`, `harness`), region and cell, `trust`, `capabilities` (`<namespace>:<name>`), capacity, latency,
  `health`, `pricing`. Offers are facts reported by their holders; they never claim a placement.
- **`platform.workload-requirements@1`** — what a piece of work needs: `kind` (e.g. `ai.run`, `media.transcode`),
  `mobility` (`request`, `job`, `session`, `stateful-partition`), `latency_class`, `objective` (`cheapest`,
  `lowest-latency`, `balanced`, `private`, `local-only`, `first-party-only`, `high-reliability`, `correctness`), and
  optional limits: latency, deadline, cost, durability, residency, the allowed `trust` classes, region, capabilities.
- **`platform.placement-result@1`** — one decision: the `selected` offer, the objective, `reasons`, the ranked
  `candidates` and the `plan_epoch` it was made under. It is the explanation a person or an operator reads.
- **`platform.placement-plan@1`** — the control plane's routing table for the data plane: `routes` with their targets,
  a monotonically increasing `epoch`, `issued_at`, `expires_at`, `issuer`, `key_id` and an Ed25519 `signature` over the
  canonical JSON of every other field.

Every placer is `openvibe-sdk/placement`. A service states requirements and reads results; it does not rank offers.

### 2. Health and cost

- **`platform.provider-state@1`** — a provider's usage in its billing period, forecast, reserve and health.
- **`platform.rate-card@1`** — a verified price: provider, metric, unit size and price, free allowance and its reset
  period, region, effective window, `source` and `verified_at`, so every price the placer uses names where it came
  from and when it was last checked.
- **`platform.cost-snapshot@1`** — actual cost per target over a window, with the counterfactual cost of the
  alternatives, so the placer's savings are measured, not assumed (ADR-034 §10).

An offer whose health is neither `up` nor `degraded` is excluded before ranking (`excluded()`); provider state and rate cards then price
the remaining candidates (`marginalCost`, `forecast`).

### 3. Telemetry and usage

- **`platform.telemetry-sample@1`** — one observation with the universal dimensions (service, project, subject,
  resource, provider, node, cell, region, operation, latency, queue delay, TTFB, throughput, bytes, status, cache
  status, cost estimate, `route_epoch`, `trace_id`). It feeds offers' latency and health; it is never billing.
- **`platform.usage-sample@1`** — one idempotent unit of metered use (`id`, `idempotency_key`, quantity, unit,
  source), with the same dimensions plus free allowance used and vibes charged. It is the input to metering
  (ADR-034 §9). Both carry `route_epoch`, so any sample can be traced to the plan that routed it.

### 4. Trust classes

`resource-offer.trust` is one of five classes, in this order; `workload-requirements.trust` lists the classes allowed
to run the work:

| Class | Meaning |
| --- | --- |
| `first-party` | Hosts and accounts the OpenVibe network operates itself (its own servers and provider accounts). |
| `user-owned` | A person's own node or machine (an OpenVibe.Node they run), offered for their own workloads. |
| `partner` | An organisation under a written agreement with the network, bound by its data and uptime terms. |
| `community` | Capacity volunteered by community members, without a contract; best effort, no private data. |
| `external` | A third-party provider used through its public API under its own terms (a cloud or AI vendor). |

**`user-owned` is not in the default trust set.** When a requirement names no `trust`, the eligible classes are
`first-party`, `partner`, `community` and `external` (the SDK's `TRUST_ORDER`). A `user-owned` offer is eligible only
for a workload whose requirements list `"user-owned"` explicitly. Adding the class to the contracts therefore widens
no existing caller's eligible set, and the SDK must not add it to its default list.

### 5. Worker capability names a Node advertises

An OpenVibe.Node that runs jobs advertises one `worker:<class>` capability in its `resource-offer.capabilities` for
each `platform.runtime-class@1` class it runs: `worker:function` (a declared function artifact) and `worker:code`
(submitted code in a sandbox) today, and `worker:browser`, `worker:linux`, `worker:desktop` and `worker:gpu` as Node
gains them. These six names are reserved for the Node job worker (`$defs.reservedWorkerCapabilities` in
`platform.resource-offer@1`); every other `worker:` name (`worker:ffmpeg`, `worker:ai-gpu`) is an ordinary capability.
A requirement asks for a class by listing the same name in its `capabilities`.

### 6. Control plane and data plane

- The **control plane** collects offers, provider state and rate cards, runs the placer, and issues signed
  `placement-plan@1` documents, each with a higher `epoch` than the last.
- The **data plane** routes by the plan it holds. It accepts a new plan only when `openvibe-sdk/placement.verifyPlan`
  passes (known `key_id`, valid signature, `expires_at` in the future) and the plan's `epoch` is newer than the current
  one (`createPlanHolder`). A plan that fails is rejected and logged.
- **The data plane keeps running on the last valid signed plan.** A control-plane outage, a bad signature or a stale
  epoch never stops delivery; it only stops change. A plan past its `expires_at` is never accepted, and a data plane
  holding one keeps routing by it, reports itself stale, and does not invent routes of its own.

### 7. The reference consumer

T6 (OpenVibe.AI) is the reference consumer: it states `ai.run` requirements, places each run across first-party
nodes, external AI providers and, when the request names it, the person's own `user-owned` node, and records a
placement result, telemetry and usage samples for every run. Other services adopt the fabric after it.

## Consequences

- One vocabulary and one placer for every placed workload; a new kind of capacity is a new offer, not new code.
- Routing survives the control plane: plans are signed, epoch-ordered and verified where they are used.
- A person can run their own work on their own machine without that machine joining anyone else's default pool.
- The SDK placer, the T2 resource registry and OpenVibe.Node must agree on the trust rule; this ADR is that rule.

## Open questions for the owner

1. May a `user-owned` node run **other users'** workloads (as a community-style contributor), or only its owner's?
   Until answered, only its owner's, and only when the requirement names `user-owned`.
2. What is the consent and revocation rule for a `user-owned` node: how its owner opts each workload class in, how
   they withdraw (immediately, or after running jobs drain), and what the placer does with work in flight when consent
   is revoked?

## What this ADR does not claim

- No producer emits `user-owned` offers yet, and no service places across user-owned nodes today.
- Cells, the plan issuer and its key distribution are not built; ADR-034's phasing (roadmap WS-W) still applies.
