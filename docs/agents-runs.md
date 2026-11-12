# One agent run: `agents.run@1`, `agents.step@1`, `agents.approval@1`

2026-11-12. One run schema for OpenVibe.Actor, OpenVibe.Codes and OpenVibe.Run (design
`~/openvibe/research-2026-11-12/one-agent-system.md` §1, stage 2). The contracts are the wire shape, not a new
store: each product keeps its own tables and serves the same shape.

- `agents.run@1` — one run: `id`, `owner` (a `subject-ref`), `agent` (`{ id, name?, product? }`), `parent_run`,
  `budget` (`usd`, `tokens`, `seconds`, `steps`), `status` (`planning | running | waiting | done | failed |
  stopped`), `created_at`, `updated_at`, `result_summary`, `cost`.
- `agents.step@1` — one entry of a run's append-only log: `run_id`, `seq`, `kind` (`think | tool | message |
  approval | child | file`), `text`, `tool_call` (`{ name, input }`), `result`, `cost`, `started_at`, `ended_at`
  and, on a child, `child_run`.
- `agents.approval@1` — one ask: `run_id`, `step_seq`, `what`, `options` (`[{ id, label }]`), `decided_by`,
  `decided_at`, `answer`.
- `agents.step.appended` (event, `@1`) — the appended step as the payload, published on OpenVibe.Events. The
  namespace is `agents`, hyphen-free because an event type cannot carry a hyphen (`hyphenated-event-namespaces`).

`GET /api/v1/runs`, `GET /api/v1/runs/:id` and `GET /api/v1/runs/:id/steps?after=` serve the run and its steps;
`openvibe-sdk/agents` (`runs`, `approvals`, `events`) reads them. Actor serves the first read-only version: `/:id`
answers this shape when the reader sends `Accept: application/vnd.openvibe.agents.run+json` (what the SDK sends) or
`?shape=agents.run@1`, because the older `agent.run@1` snapshot stays the default at that path for its own callers.

## Actor: `tasks` → `agents.run@1`

Actor's task **is** the run. `GET /api/v1/runs` lists the person's own tasks, `/:id` reads one (with the media type
above) and `/:id/steps` reads its task events. The person's `user:usr_…` requester is the owner, so no other person's run is readable.

| `agents.run` | Actor (`tasks`, `task_events`) |
|---|---|
| `id` | `tasks.id` (`tsk_…`) |
| `owner` | `identity.subject-ref` made from `tasks.requester` (`user:usr_…` → `{ type: "user", id: "usr_…" }`) |
| `agent.id` | `tasks.agent_id` (the contact, `agt_…`), else `tasks.agent` (the pinned system slug), else `openvibe-runtime` |
| `agent.name` | `actor_agents.name` for `agent_id`; otherwise the catalog's name for `tasks.agent` |
| `agent.product` | `actor` |
| `parent_run` | `tasks.parent_id` (a follow-up or fork's parent), else null |
| `budget.usd` | `tasks.budget_task` |
| `budget.seconds` | `tasks.timeout_ms / 1000`; absent for a row from before migration 0014 |
| `budget.tokens`, `budget.steps` | absent: Actor has no per-task token or step cap |
| `status` | `queued` → `planning`; `running`, `verifying` → `running`; `needs_you` → `waiting`; `succeeded` → `done`; `failed` → `failed`; `cancelled` → `stopped` |
| `created_at` | `tasks.created_at` |
| `updated_at` | the newest `task_events.at`, else `finished_at`, else `created_at` |
| `result_summary` | `result.answer` on `succeeded`; `error_detail` on `failed`; null otherwise |
| `cost.usd` | `tasks.cost_usd` (null before it is metered) |
| `cost.tokens` | absent from the run row (the per-call spans in `actor_spans` carry them) |
| `cost.seconds` | `finished_at - created_at`, or now − `created_at` while open |
| `cost.steps` | `tasks.last_seq`, the number of appended events |

## Codes: `run_tasks` → `agents.run@1`

Codes' task is the run too. A **continuation or a switch is the same task** (an attempt), never a child run:
`parent_run` is null, and the attempts' costs add up on the one run.

| `agents.run` | Codes (`run_tasks`, `codes_attempts`) |
|---|---|
| `id` | `run_tasks.id` (`tsk_…`) |
| `owner` | `{ type: "user", id: run_tasks.subject }` |
| `agent.id` | `run_tasks.agent` (the harness slug), else the newest attempt's `agent`, else `auto` |
| `agent.name` | the harness catalog's name (`server/data/harness-offers.json`) |
| `agent.product` | `codes` |
| `parent_run` | null: an attempt is the same run, not a child |
| `budget` | absent: Codes' limits are the machine and the project policy, not a run column |
| `status` | `queued`, `placed` → `planning`; `running` → `running`; `succeeded` → `done`; `failed`, `expired` → `failed`; `cancelled` → `stopped` |
| `created_at` | `run_tasks.created_at` (bigint ms → ISO) |
| `updated_at` | `run_tasks.updated_at` (bigint ms → ISO) |
| `result_summary` | `result.summary` on `succeeded`; `result.error` or `outcome_note` on `failed`/stopped |
| `cost.usd` | `sum(codes_attempts.cost_usd)` (or `result.cost_usd` for an old task) |
| `cost.tokens` | `sum(codes_attempts.tokens)` |
| `cost.seconds` | `sum(attempt.finished_at - attempt.started_at)` (or `result.duration_ms / 1000`) |
| `cost.steps` | `sum(codes_attempts.steps)` |

## Steps: `task_events` / `codes_session_lines` → `agents.step@1`

Both products already keep an append-only log with a monotonic `seq`. One log entry becomes one step; `seq` is the
product's own and is never renumbered, so `?after=` is the same cursor a reconnect uses.

| `agents.step` | Actor (`task_events.body`) | Codes (`codes_session_lines.body`) |
|---|---|---|
| `run_id` | `task_events.task_id` | `codes_session_lines.task_id` (the task, not the attempt) |
| `seq` | `task_events.seq` | `codes_session_lines.seq` (bigint; event seq × 250000 + line) |
| `kind` | `step: plan`, `check` → `think`; `text` → `message`; `tool_call`, `tool_result` → `tool`; `handoff` (the person took the desk), `trigger`, `trigger-run` → `message` | `t: agent`, `step` → `think`; `t: text`, `note` → `message`; `t: tool`, `tool_progress`, `tool_result` → `tool`; `t: handoff` → `message`; `t: proof` → `file`; `state`, `end`, `usage`, `done` are not steps |
| `text` | `body.text` | `body.text`, or `body.what` / `body.name` |
| `tool_call.name` | `body.tool` on a `tool_call` | `body.name` on `t: tool` |
| `tool_call.input` | `body.input` (the short summary Actor stores) | `body.input` |
| `result` | `body.text` on `tool_result` | `body.text` or `body.output` on `tool_result` |
| `cost` | null: Actor meters per call in `actor_spans`, not per event | `body.cost_usd` / `body.tokens` when the line carries them |
| `started_at` | `body.at` | `codes_session_lines.at` |
| `ended_at` | `body.at` | `codes_session_lines.at` |
| `child_run` | null: a hand-off is a product, not a child run | null |

Actor writes a tool **call** and its **result** as two events with two seqs; both map to `kind: tool`, the call's
entry carries `tool_call`, the result's carries `result`. That keeps `seq` append-only; a reader pairs them by
`tool_call.name` and time, not by changing an earlier step. Codes has the same split for `t: tool` / `t:
tool_result`.

## Approvals: `actor_approvals` / `codes_approvals` → `agents.approval@1`

| `agents.approval` | Actor (`actor_approvals`) | Codes (`codes_approvals`) |
|---|---|---|
| `id` | `id` (`apr_…`) | `id` (`apr_…`) |
| `run_id` | `task_id` | `task_id` |
| `step_seq` | the seq of the `task_events` row whose `ui_approval.id` is this approval | not stored: the adapter matches the `t: tool` line by tool and time, the nearest before `created_at` (lossy) |
| `what` | `summary`, else the event's `ui_approval.question` | `summary` |
| `options` | fixed `approve` / `decline` (Actor's row does not store its actions) | fixed `allow` / `deny` |
| `decided_by` | `owner` when `decided_at` is set | the task's `subject` when `decision` is set |
| `decided_at` | `decided_at` | `decided_at` |
| `answer` | `state`: `approved` → `approve`, `declined` → `decline`, `expired` → null | `decision` (`allow` / `deny`) |

## What does not fit

- **A waiting run is not the same thing on both sides.** Actor has an explicit `needs_you` state and a pending
  approval row; Codes keeps `run_tasks.state = running` while an approval waits, so a Codes run can only be called
  `waiting` by joining `codes_approvals`. Actor's waits (`actor_waits`) are also `waiting`, but a run that waits on
  an event is not waiting for its person; the schema has one `waiting` status for both.
- **No per-step cost.** Actor meters model and tool calls in `actor_spans`; its task events carry no cost. Codes
  carries cost on some session lines (and on the attempt), not on every line.
- **Calls and results are separate log entries.** The schema's one step has `tool_call` and `result`, but both
  products append a call and a result as two entries. The adapter keeps them as two steps rather than rewriting
  the log, so a card pairs them by tool and time.
- **`started_at` is a point, not a span.** Both logs store one `at` per entry. A step's `ended_at` is that same
  time (or null when the product has no end), not a measured duration.
- **Actor's budget is money and time only.** There is no token or step budget on `tasks`; `budget.seconds` comes
  from `timeout_ms` and is absent on old rows. Actor's `budget_day` is a daily ceiling, not the run's own budget.
- **Codes has no run budget and no parent run.** Its limits are the machine and the project/attempt policy; a
  continue or a switch is a new attempt on the same task, so the run tree stays flat (attempts carry the costs).
- **Actor approvals do not store their step seq.** The approval id is on the event (`ui_approval.id`), so the
  adapter finds the seq; Codes does not store either, and its match is lossy.
- **No `child` step fits today.** Actor's delegated work is an assignment tree beside `task_events`, and Codes'
  hand-off is a new attempt on the same task; neither is a child run in the step log. A child run is a new task with
  `parent_run` set, not a step kind that exists in either product yet.
- **Actor approvals are not served by the read-only run API.** `GET /api/v1/runs` returns runs and steps only;
  the approval contract is ready for `approvals.answer` when the engine writes approvals.
- **The event is a contract, not yet a producer.** OpenVibe.Events accepts `agents.step.appended`; Actor's
  read-only API does not publish it yet. The engine that appends the step is the publisher (one producer per run),
  with the run's owner as the subject and the product as the source.

## 0.414.0: the whole run (the agent engine)

Design: `~/openvibe/research-2026-11-12/agent-engine.md`. **Everything a person asks an AI to do on OpenVibe is a run,
and a run is a thread of steps**: a chat with Vibe, a question in a composer, a task for your agent, a coding task, a
job on a machine. The 0.412.0 shapes were the core; 0.414.0 grows them with optional fields only, so every reader and
writer of 0.412.0 stays valid.

- `agents.run@1` (1.1.0) adds:
  - **what it is:** `title`, `kind` (`chat`, `ask`, `task`, `code`, `machine`, `goal`, or a product's own);
  - **where it lives:** `ref` (`<product>:<id>`, its address on the Frame), `url` (its page on its product);
  - **how it runs:** `model` (`id`, `source`, `name`, `effort`), `where` (`openvibe`, `machine`, `runner`,
    `this-computer`), `target` (a code run's: `new`, `openvibe`, or `{ repo }`);
  - **its state for a list:** `doing` (`text`, `glyph`: the icon on its agent's face), `waiting` (`for`: `message`,
    `approval`, `takeover` or `payment`), `preview` (the last line), `counts`, `ended_at`;
  - **around it:** `context` (where it was asked), `outputs` (what it made), `visibility`;
  - **its agent's face:** `agent.glyph`, `agent.hue`, `agent.avatar_url`, `agent.harness`. A chat's persona is that
    run's `agent`.
- `agents.step@1` (1.1.0) adds `from` (`person`, `agent`, `system`, `tool`: a person's own words are steps), `author`,
  `status` (`running`, `done`, `failed`), `title`, `glyph`, `attachments`, `sources`, `ui` (a rich card: `type` and
  `data`; a reader that does not know the type shows `text`) and `desk` (the picture and action, for replay).
- `agents.run-start@1` is what starts a run: only `text` is required.
- `agents.event@1` is one event of a run's stream: `run`, `step`, `delta`, `approval` or `end`.
- `agents.run.updated` (event, `@1`) is the run's snapshot on OpenVibe.Events when what a list draws changed.

**A conversation is a run that is `waiting` for a `message`.** The same status covers an approval (`for: approval`)
and something only the person can do (`for: takeover`), so no reader needs a second model for chats.

### Who asked, what it continues, how several agents share it (0.417.0)

From the agent engine's code study (agent-engine.md §§3-5). Every field is optional.

- `agents.run@1` (1.2.0):
  - **`mandate`:** why a run exists when it came through intake. Its `source` is where the ask was made (the feed, a
    room, comments, git, a composer, notifications, mail, a schedule or goal, a webhook, a machine). Its `thread` is
    where the run answers. `asked_by` says who asked. `strength` is `explicit`, or `inferred`, and an inferred ask
    confirms before it acts. `scope` says in words what the run may do.
  - **`lineage`:** what a run continues. `from` is that run's ref and `at_turn` its turn; `how` is `fork`, `handoff`
    (another harness or model takes it on, with a written summary as its first step) or `regenerate`.
  - **`play` and `role`:** the play a run tree follows, and a child's part in it.
  - **`agent.capabilities`:** what the harness can do: resume, fork, approvals, images, sub-agents, desks, browser,
    web search, MCP, plan mode, files, shell, voice. The Dispatcher chooses by capability, never by name.
  - **`cost.by`:** the spend on each rung of the ladder: `machine` (the person's own computer), `plan` (a signed-in
    plan), `key` (their own key), `allowance` (OpenVibe's free part) and `credits`.
- **`agents.step@1` (1.2.0) adds `turn`.** A person's message opens a turn. Forks and regenerated answers start on a
  turn's boundary.
- **`agents.run-start@1` (1.1.0)** takes a `play`, a `lineage` (to fork or hand off), and, from intake only, a
  `mandate`.
- **`agents.play@1`:** a play as data.
  - Its `roles` say what each does, the size of model it wants (`small`, `strong`, `same`, `other-family`), how many
    run at once, and how often it may be consulted.
  - `phases` run in order, a phase's roles together when it is `parallel`. `checks` say who checks whom against a
    written `bar`, and `stop` says when the play is over (`done`, `passes`, `rounds`, `person`).
  - `budget.split` gives each role its share of the parent's budget.
  - The stock plays: solo, advisor, plan-execute, fan-out, team, grader-loop, research-build, issue-to-pr and watch.
- **`agents.source@1`:** one place where asks are taken in, and how.
  - `who` may ask there: its `owner`, a `list` of people, `followers` or `anyone`. The `rule` says in words what
    counts as an ask.
  - `creates` is the run an ask becomes, with its kind, target, agent and play. `budget` caps each such run.
  - `answer` is how the run speaks back: a `reply`, a `card`, a `notice` or `none`.
  - Intake stores the ask first and acts afterwards.

### The Run API

The same routes on every product (`/api/v1`) and, for every product at once, on the Frame (`/api/frame`, where the id
is the run's `ref`):

| | |
|---|---|
| `GET /runs?kind=&status=&q=&limit=&cursor=` | the caller's runs, newest first: `{ runs, next }` |
| `POST /runs` | start one (`agents.run-start@1`; `Idempotency-Key` returns the first run again): `201` the run |
| `GET /runs/{id}` | one run |
| `GET /runs/{id}/steps?after=&limit=` | its thread: `{ steps, next }` |
| `GET /runs/{id}/events` | its stream (`agents.event@1` as server-sent events; `Last-Event-ID` is a step's seq) |
| `POST /runs/{id}/messages` | say something to it (`{ text, attachments }`): `201` the step |
| `POST /runs/{id}/stop` | stop it |
| `POST /runs/{id}/approvals/{approval}` | answer an approval (`{ answer }`) |

`openvibe-sdk/agents` is the client (`runs`, `approvals`, the desks calls) and the kit a product mounts to serve these
routes from its own store.
