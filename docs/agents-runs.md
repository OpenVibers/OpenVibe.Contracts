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
