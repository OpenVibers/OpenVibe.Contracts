# ADR-060: Skills that run code — never on our server, always in a sandbox

- **Status:** Proposed 2026-11-08 (plan track HO, wave 3: HO8), for Opus's security review.
- **Owner:** OpenVibe.Actor (the registry and the `skill.run` step) and OpenVibe.Node (the runner).
- **Contracts:** `actor.skill@2`, `actor.skill-listing@2`; `skill.run` joins the HO1 approval kinds.
- **Supersedes:** ADR-058 decision 2's "no code" for `runs: "sandbox"`. `actor.skill@1` stays valid and is still
  what a prompt-only skill publishes.

## Evidence

- The Hermes/OpenClaw study (`plan-state-2026-10-22/hermes-openclaw-2026-11-07.md`) found the "magic moment" is an
  agent that learned something and used it later: a skill. Both projects quickly want that skill to *do* the thing,
  not only describe it, and both show the danger: OpenClaw's ClawHub needed a scan and a trust envelope because a
  skill that steals credentials is what people fear.
- OpenVibe already has the trust spine: HO1 gives every consequential act a kind and an approval, HO2 made a skill a
  document whose `requires` grants nothing, and Run already executes a registered artifact as a job on a Node with
  pinned input bytes and per-job network egress.
- What OpenVibe did not have is a way to run a person's (or an agent's) code without putting it on our servers or
  trusting the person's laptop. A Node that declares the skill runner, and Run's `function` class, is that place.

## Decision

1. **The rule.** A skill's code never runs on an OpenVibe server, never on the person's machine outside a sandbox,
   and never sees a secret. It runs as a Run job of class `function` on a Node that declared the skill runner, with
   the network denied unless the skill declared otherwise and the person approved it, and with the exact bytes the
   registry scanned.
2. **The contracts.** `actor.skill@2` adds:
   - `runs`: `prompt` (exactly @1) or `sandbox`;
   - `tools` (1 to 5, only when `runs: "sandbox"`): `name` (`^[a-z][a-z0-9_]{0,31}$`), a `description` the agent
     reads before it calls (≤ 200), `language: "javascript"` (the only one in v1), `entry` naming one of the skill's
     resources, `args` as a JSON Schema subset (an object whose properties are string, number, integer, boolean or
     an array of those, with `enum`, `maxLength` and `pattern` at most 200 characters; no `$ref`, no nested object),
     `net` (`deny` by default, `openvibe-only`, `public`) and `limits` (`wall_ms` ≤ 30000, default 10000;
     `mem_bytes` ≤ 268435456, default 134217728);
   - code as an ordinary text resource (`.js`, `text/javascript`, ≤ 64 KiB each), so it is in the same integrity
     hash as the instructions and resources; there are no binaries, no install recipes and no dependencies;
   - `requires.kinds` gains `skill.run` when `runs` is `sandbox`, and a prompt skill may not declare it.
   `actor.skill-listing@2` carries, per code resource, `{ name, media_id, sha256 }`, so the bytes that run are the
   bytes that were scanned, and its scan findings may name the `tool` they are about. `actor.skill@1` and
   `actor.skill-listing@1` are unchanged.
3. **The Node runner** (`openvibe-skill-runner@1.0.0`, a declared function like `openvibe-codes@1.0.0`):
   - off unless the owner turns it on (`worker.functions`, `openvibe node skills on`);
   - takes `{ tool, entry, input }` and the code as job `inputs` (Media objects pinned by sha256; a mismatch ends the
     job before anything runs);
   - runs `node --permission --allow-fs-read=<the job's input dir>` with no child process, no worker, no addons and
     `--disallow-code-generation-from-strings`, inside the function sandbox Node already has (its own root, limits,
     no credential, network per `net`);
   - the input arrives on stdin as JSON; the tool writes one JSON value (≤ 64 KiB; more fails the job `limit`);
     stderr is kept for the person (≤ 16 KiB).
4. **The Actor registry and the run.**
   - Publishing a sandbox skill stores each code resource in Media (Actor's tenant, private) and puts its id and
     sha256 on the listing. The scan reads the code and never runs it; it fails a skill that reads `process.env`,
     spawns, loads `vm`/`worker_threads`/`child_process`/`fs` writes, uses `eval`/`Function`, reaches the network
     when the tool says `deny` or names non-OpenVibe hosts under `openvibe-only`, carries long base64/hex, a
     minified one-liner over 2 KB or anything that decodes to code; it flags any network use, timers over 5 s and
     big loops over input.
   - Running a tool is a step of the new kind `skill.run` (label: "running a skill's code in a sandbox"), target
     `<slug>@<version> <tool>` plus ` · internet` when `net` is `public`. "Always allow" covers exactly that skill
     version's tool, so a new version asks again.
   - Actor submits the Run job as the person (`X-OV-Subject` + `X-OV-Project`): class `function`, artifact
     `openvibe-skill-runner@1.0.0`, the pinned inputs, `net` as declared (never wider), limits as declared (never
     above the caps), `ttl_ms` 120000. Placement is the person's own Link machines that run the skill runner
     first, then OpenVibe's pool when one offers it; never Actor's server. No node means the step says so and
     offers "Run it on my machine" (Link setup), never a fallback that runs elsewhere.
   - Billing is Run's per-second metering on the person's Balance, inside HO7's per-agent allowance when the agent
     acts alone. The result is data: the JSON goes back to the agent as an untrusted tool result, never as
     instructions; the step records the job id, wall time and exit.
5. **The person sees it** on the skill's card and install page: "Runs code in a sandbox on your machine or
   OpenVibe's", the tools with their `net` in plain words ("no internet", "OpenVibe sites only", "the internet"),
   and the scan's findings per tool. A `flagged` code skill installs only after reading them; a `failed` never.

## Alternatives

- **Run the code on Actor's server.** Rejected: Actor holds every person's agent, token and registry record; one
  skill's mistake would be a registry-wide incident, and the design rule forbids it outright.
- **A container on the host that publishes the skill.** Rejected: the host is someone's machine, and a container
  boundary we do not control is not a sandbox promise we can make to every site. Node already has the sandbox, the
  limits, the egress policy and the placement; running there needs no second runtime.
- **Python and npm in v1.** Deferred: both widen the runtime surface (packages, install recipes, dependency
  resolution) before the scan and the sandbox have a release behind them. Each needs its own review, as does
  persistent state, a tool calling another tool, files written back to the person, and GPU.

## Migration and rollback

Both new contracts are additive majors; nothing parses `actor.skill@2` until Actor's registry and Node's runner
ship, and @1 keeps working for every existing prompt skill. The only data a sandbox listing adds is the Media
objects that hold the code; they are private to Actor's tenant and can be deleted with the listing. Rollback is
retiring the @2 listing and turning the runner off: no prompt skill is affected, no job can be submitted without
the `skill.run` kind, and nothing ever ran on our servers, so there is no server-side state to unwind.

## Tests

`test/run.js`:
- every valid fixture carries the hash of its own canonical content, including code resources and tools, and an
  edited instruction, code or `net` no longer matches it;
- `runs` is `prompt` or `sandbox`; `tools` has 1 to 5 entries and only a sandbox skill carries them;
- a sandbox skill declares `skill.run` in `requires.kinds`; a prompt skill does not;
- `language` is `javascript`, the tool `name` shape is the one above, and `entry` names a code resource (the
  cross-field rule a JSON Schema cannot state: the fixtures and the registry check it);
- `net` is `deny`, `openvibe-only` or `public` with `deny` the default; `limits` stay at or under the caps and
  default to 10000 ms and 134217728 bytes;
- a resource is text (no binary), code is `.js` with `text/javascript` and at most 64 KiB, and no field is named
  `secret`, `token`, `env` or `key`;
- a @2 listing pins each code resource's Media id and sha256, the pinned sha256 is the document's own bytes, and a
  sandbox listing without code is invalid.
Node's own tests (in OpenVibe.Node) prove the runner: a tool cannot read env, spawn, write a file, open a socket
under `deny`, or exceed its output.
