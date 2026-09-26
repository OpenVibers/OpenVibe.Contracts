# ADR-032: Containers for platform services

**Status:** Accepted 2026-09-26 (roadmap WS-N task 12). Revisit on any trigger below.

## Context and current evidence

- Every OpenVibe service runs as a systemd unit on one host, each as its own Unix user, deployed by
  `ovhost deploy <service>` (OpenVibe.Host) or a per-repository `deploy.sh`. That is 25 services on 2026-09-26.
- Deploys are checkout moves with dependency install, readiness polling and automatic rollback. Live
  uses a release layout (`releases/<time>-<sha>`, `current` symlink) and **systemd socket activation**,
  so a restart never refuses a connection (`127.0.0.1:3000` held by pid 1).
- Units already carry hardening: `ProtectSystem`, `NoNewPrivileges`, `PrivateTmp` and `ReadWritePaths`
  per data directory. `ovhost validate` checks each unit against the service's `lifecycle` declaration
  (Contracts 0.55.0).
- Backups, restore drills, the browser check and the alert relay are systemd timers that `ovhost` drives.
- Stage C of Host (sandboxed **user** code) will need isolation stronger than a Unix user. It is not
  started, and it has its own isolation ADR.
- The host has 15 GB of memory and 11 GB available at peak; no service has asked for a system dependency
  that conflicts with another's.

## Decision

- **Platform services stay systemd units.** There is no container runtime for first-party services. The
  isolation they need comes from what systemd gives per unit: a dedicated user, a read-only system,
  private /tmp, capability and syscall filters where a unit can take them, and slices for memory and
  CPU limits.
- **ovhost keeps one deploy adapter: systemd.** The inventory's service entry keeps `unit` and `socket`,
  and a future `runtime` field is reserved: an absent value means `systemd`. A container adapter, if one
  is ever added, is a second strategy behind the same deploy, readiness, rollback and lifecycle checks,
  never a separate path.
- **Tenant and user code (Stage C) is out of scope here.** Running untrusted code needs a sandbox
  (gVisor, Firecracker or equivalent), with budgets, egress policy and kill/revoke. That is the Stage C
  isolation ADR, and it may well use containers or micro-VMs.

## Alternatives considered

- **Docker (or Podman) Compose for every service.** Rejected for now:
  - it rewrites deploy, rollback, backups and readiness for no measured gain;
  - socket activation, which gives zero-downtime restarts, would need re-engineering;
  - it adds a daemon (Docker) or a new unit model (Podman quadlets) to operate;
  - image builds and registries add a supply chain and storage we do not need on one host.
- **Kubernetes.** Rejected: one host, no scheduling problem to solve.
- **Containers for some services only.** Rejected until a service needs it: two runtimes double the
  operator's surface.

## Revisit when any of these is measured

- A second host joins, and services move between hosts: portability then pays for images.
- A service needs a system dependency or runtime version that conflicts with another's on the host.
- Stage C lands. Its sandbox runtime may be reused for platform workers that process untrusted media,
  such as ffmpeg on uploads.
- A unit cannot be hardened enough under systemd, for example it needs its own network namespace with
  an egress policy that systemd's `IPAddressAllow`/`RestrictAddressFamilies` cannot express.

## Consequences

- Deploy tooling stays as it is (`ovhost deploy`, Live's release layout, socket activation).
- New services ship a unit, a `lifecycle` block and `ReadWritePaths`, never a Dockerfile.
- WS-N task 11 (`ovhost` absorbs the per-repository `deploy.sh` scripts) proceeds as systemd strategies.

## Acceptance

- `ovhost validate` passes for every service with `runtime` absent, which means systemd.
- No first-party repository carries a Dockerfile or compose file that production uses.
