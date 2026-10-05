# ADR-045: The Node is OpenVibe's universal runtime

**Status:** Proposed 2026-10-05 (plan §8: *"ADR-045 (Node; **revise: Node is the universal runtime, not a
Bot/Actor helper**)"*; plan T14, lines 575–579). For the owner's review. Builds on ADR-043 (Bot — devices, pairing,
control and safety), ADR-046 §5 (the `worker:<class>` capability names) and ADR-048 (OVRN and authority boundaries).
ADR-043 stays the robot/device half of the same Node; this record is the runtime half.

## Context and current evidence

- **The plan revises ADR-045.** Plan §8 (line 986) calls ADR-045 written but to be revised: *"Node is the universal
  runtime, not a Bot/Actor helper"*. `origin/main` has no ADR-045 file in any repository, so the revision is unstated
  in the contract repository.
- **What the plan says the Node is.** Plan T14, lines 575–579: *"**Node runtime** (ADR-045 revised: Node is the
  universal runtime, not a Bot/Actor helper). **Core built on `origin/main`:** one signed binary, pairing, control
  link, WHIP publisher, plugin runtime, the Adeept and Cozmo plugins, installer and CI. Still to add for its other
  roles: computer control (terminal, files, screen, input, browser) under control levels, local kill switch and
  recording (Actor's need, T17); execution-worker capability (Run's need); cache/storage/delivery capability (Media's
  need, T4). **Local policy always overrides cloud commands.**"*
- **Products bind capabilities, not device code.** Plan lines 321–324: *"Node identity is a Network principal.
  Network owns the node/device principal and pairing credentials. Services manages the resource; Node presents
  capabilities (T14); Bot binds robot resources to Node capabilities (T15); Actor binds computer control (T17); Run
  binds execution workers (T14); Media binds cache/storage (T4). Bot keeps robots, robot profiles, operators, command
  leases and physical safety — not universal device identity."*
- **What the code already does** (OpenVibe.Node, `origin/main`): one Go static binary per platform — pairing
  (device credential or a Network node principal), one outbound WebSocket to `wss://openvibe.bot/device`, heartbeats
  and a deadman, owner limits clamped before any driver sees a value, a persisted e-stop and a local kill switch, a
  plugin supervisor, WHIP video publishing (pion), and the system service (systemd, launchd, Windows). Plugins are
  separate processes over JSON lines: `dryrun`, `adeept_adr036`, `cozmo`. The job worker runs `platform.job@1`
  `function`/`code` jobs from locally declared artifacts only, with namespaces, a seccomp allowlist, CPU/memory/wall
  caps and per-second `job_usage` (`docs/worker.md`, `docs/protocol.md`). Its `status.capabilities.worker` lists the
  reserved `worker:<class>` names it runs; Run maps that descriptor to Fabric offers
  (`docs/protocol.md:303–321`).
- **The capability names are already agreed.** ADR-046 §5 reserves `worker:function`, `worker:code`,
  `worker:browser`, `worker:linux`, `worker:desktop` and `worker:gpu` for the Node job worker, one per
  `platform.runtime-class@1` class, in `platform.resource-offer@1.$defs.reservedWorkerCapabilities`.
- **The control levels are plan wording.** Plan lines 745–747: *"each Node has a control level set on the device
  (Observe / Ask / Trusted / Full control), a local indicator, a local kill switch, optional container/VM
  confinement, replayable transcripts and file changes, and local secrets used through handles."* Of that, the local
  kill switch (the persisted stop latch) exists; the four named levels and recording do not.
- **Media's need is stated too.** Plan lines 366–368: *"Node is a storage/delivery candidate too
  (`media.cache`, `storage.hot`, prepaid disk and bandwidth), so the placement engine can use unused capacity on
  already-paid OpenVibe nodes before buying CDN traffic."*

## Decision

### 1. One Node, the universal runtime

The Node is OpenVibe's universal runtime — one agent for a person's computers, servers, Raspberry Pis, phones and
robots. It is **not** a Bot helper or an Actor helper: Bot, Actor, Run and Media are all clients of the same Node,
and each binds the capabilities it needs. ADR-043 remains the robot/device half (robots, pairing, device credentials,
operator safety); this ADR is the runtime half.

### 2. One signed binary, one pairing, one control link, one local policy

- The core is one signed, updatable static binary per platform with one pairing path and one outbound control link.
  A role is **a capability the Node advertises plus local configuration**, never a second agent or a second install.
- The Node is a Network principal (its node/device principal and pairing credentials are Network's), and its resource
  is named by OVRN (ADR-048). Network owns identity; Node presents capabilities.

### 3. Execution worker (Run's need)

- The Node advertises one `worker:<class>` capability per `platform.runtime-class@1` class it runs, per ADR-046 §5,
  and refuses every class it does not advertise. `function` (the first class implemented) and `code` are the classes
  the worker declares; `browser`, `linux`, `desktop` and `gpu` are reserved names.
- Run places jobs on the Node by converting its descriptor into `platform.resource-offer@1` /
  `platform.runtime-offer@1` (OpenVibe.Node `docs/protocol.md:310–321`) and calling `openvibe-sdk/placement` `plan()`.
  The Node runs only locally declared artifacts, at an exact version, for the class they declare; nothing is fetched
  and no path comes from the server.
- Metering, TTL, cancel, limits, egress and stdout streaming are the job worker's own behaviour (`docs/worker.md`),
  and are the Run guarantees ADR-036 states.

### 4. Computer control (Actor's need, T17)

- The Node exposes terminal, files, screen, input and browser control to an authorised client under **control levels
  set on the device** (the plan names Observe / Ask / Trusted / Full control), with a local indicator, a **local kill
  switch**, optional container/VM confinement, replayable transcripts and file changes, and local secrets used
  through handles.
- This control is off by default and approved per app (plan line 713); Actor reaches a person's own devices only
  through the Node under a delegated grant.

### 5. Cache/storage/delivery (Media's need, T4)

- The Node is a storage/delivery **candidate**: it may offer `media.cache`, `storage.hot` and prepaid disk and
  bandwidth as Fabric offers, so placement can use unused capacity on already-paid nodes before buying CDN traffic.
- This makes the Node an offer holder, not a second byte authority: Media keeps the object catalog, the location
  policy and the only deletion path (ADR-031/ADR-046).

### 6. Local policy always overrides cloud commands

- The device's own configuration decides which roles are enabled, which artifacts and classes run, which control
  level applies, which egress is allowed, and whether the stop latch is set. A cloud command can never widen local
  policy.
- The egress rule is the model the other roles follow: a job asking for `public` or `openvibe-only` is placed only on
  a node whose `worker.egress` allows it, and a worker whose host policy is stricter runs the stricter one
  (`run.job-create-request@1`; OpenVibe.Node `docs/protocol.md`).

## Alternatives considered

- **Node as a Bot-only helper (the plan's earlier framing):** rejected by the revision. Bot, Actor, Run and Media
  would each grow a device agent, and an owner would install and pair several.
- **A separate agent per product (an Actor agent, a Run worker, a Media cache daemon):** rejected. One binary, one
  control link and one local policy are what make a single device safe to reason about; capabilities distinguish the
  roles.
- **Cloud-authoritative control levels:** rejected. The device enforces local policy and the kill switch; generalising
  ADR-043's device-authoritative safety is the point of the runtime half.
- **The Node as a second resource authority:** rejected. Products own their resource rows; the Node presents
  capabilities and local policy (plan lines 321–324, ADR-048).

## Consequences

- One device surface for every product; a new role is a capability plus local configuration, not a new agent.
- Local policy is the security boundary: no cloud command can enable a role, widen egress or clear the stop latch.
- The Node class work (`worker:<class>`, ADR-046 §5) and the future Actor and storage/delivery capabilities follow
  these semantics, so they need no separate device model.
- Bot keeps robots, robot profiles, operators, command leases and physical safety (ADR-043); the Node keeps execution,
  computer control and cache/storage/delivery.

## Open questions for the owner

1. **Control levels.** Whether the set is exactly Observe / Ask / Trusted / Full control, how each maps to a local
   indicator and to recording, and the capability names they use, is plan wording; the contract is open.
2. **One principal or many.** Whether a Node serving several products/projects is one Network principal with scoped
   grants or one principal per project is Network's decision and is open (ADR-048 OVRN).
3. **Cache/storage contracts.** Which offer contracts carry the Node's cache/storage role — the existing
   `platform.storage-offer@1` / `platform.delivery-offer@1` or a Node-specific one — and whether placement policy
   stays Media's, is open.
4. **Other users' workloads.** Whether a Node may run other users' jobs or serve other users' computer control, or
   only its owner's, mirrors ADR-046's `user-owned` question and is open.

## What this ADR does not claim

- Computer control, recording, cache/storage/delivery and the `browser`/`linux`/`desktop`/`gpu` classes are **not
  built**; only the job worker's `function`/`code` classes exist.
- The four control-level names and the local indicator are plan wording; the code today has a local stop latch, not
  the four levels.
- No Actor, Run or Media consumer binds these Node capabilities on `origin/main`; Run is a placeholder service
  (ADR-036).
- The Node worker is reached over the Bot control link today; it is not yet an offer producer, because the Run that
  would convert its descriptor is not built.
