# Agent work and effort

Sources produce immutable `agent.trigger@1` events with source-local actor identities,
receiving scopes, thread ids and original text. Correlation adds context; subscriptions
route follow-ups without granting authority. A deterministic gate precedes assessment.
`agent.decision@1` records accept, stop, ignore or unavailable, explicit/inferred strength,
quoted direction evidence and per-rule assessments. Proactive inferred work defaults to
observe: record ignore with `would_accept: true`; only auto mode may launch it.

An accepted trigger creates one `agent.ticket@1`. Its immutable mandate records policy
version, scope, strength, matched rules, actor, source scope and budget in USD, tokens
and wall minutes. Zero is a real zero budget. Policy changes notify live work instead
of cancelling it. Before resuming ended work, revalidate the mandate. Only human
messages resume ended tickets; CI and bots cannot. Executors never widen a mandate.

`agent.report@1` has exactly progress, waiting, ready, blocked, failed and dropped.
Opening a PR alone is not readiness; draft PRs are blocked. Reports retain tests and
risks and may ask exactly one `human_action.question`, forwarded unchanged.
`agent.attention@1` stores that question and its resolution. Independent authorized
work can continue while it is outstanding.

## Open ticket stage

`agent.stage@1` is a closed enum. Evaluate this table from top to bottom and stop at
its first matching row. Do not infer attention from report prose. Ended tickets retain
the last stage for history; the table applies only while open.

| Value | Condition | Label |
| --- | --- | --- |
| person/delivery | An input delivery failed and has not cleared | Input undelivered |
| person/answer | An open attention exists | Awaiting answer |
| person/review | Latest report is ready | Awaiting review |
| person/blocked | Latest report is blocked, with no subsequent human input | Blocked |
| person/failed | Latest report is failed, with no subsequent human input | Failed |
| working/queued | No assignment, or assignment pending | Queued |
| idle | Latest report waiting, or assignment ended | Waiting for a trigger |
| working | Everything else | Working |

A successful delivery, new assignment or ticket end clears delivery failure. Human
input releases blocked/failed work to the next matching stage. Table semantics follow
[dsh-superagent execution](https://github.com/deepseek-ai/dsh-superagent/blob/8c32a9d/docs/003-execution.md).

## Portable effort and receipts

`ai.effort@1`: auto, low, medium, high, max. Auto selects the concrete effort in ai.task-defaults@1, then the workflow default, then medium. An explicit agent_role selects that role default. A provider
without a supported control ignores the request and records `effort_applied: null`.
`ai.run-request@1` accepts effort and optional ladder_id/rung. `ai.run@1` adds optional
`effort_requested`, `effort_applied`, zero-based `effort_rung`, `ladder_id`, and `ladder`
entries `{model, effort, cost_usd, outcome}`. Existing receipts remain valid. Applied
is the portable level actually used, never auto; a clamped control records the clamped
level. Ladder costs account for attempts, including failures, without exposing another
person's receipts. These contracts specify data, not automatic permission to escalate.

Actor will produce/consume the agent fabric and consume effort receipts. AI consumes
effort requests and produces receipts; it does not authorize tickets. The service
manifests describe that intended boundary without claiming live event publication.
