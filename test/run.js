'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const contracts = require('..');
const { ids, http, capabilities, services } = contracts;

const ROOT = path.join(__dirname, '..');
const BASE = 'https://openvibe.network/contracts/';
let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n++; };

// ── Catalog integrity ────────────────────────────────────────────────────
const files = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.v\d+\.json$/.test(e.name)) files.push(path.relative(path.join(ROOT, 'contracts'), p)); } })(path.join(ROOT, 'contracts'));
for (const f of files) ok(contracts.catalog.some(c => c.schema === f), `${f} is in catalog.json`);
for (const c of contracts.catalog) {
    for (const k of ['id', 'version', 'owner', 'schema', 'visibility', 'compatibility', 'status']) ok(c[k], `${c.id} has ${k}`);
    const s = contracts.schema(c.id);
    ok(s.$id === BASE + c.schema, `${c.id} $id matches its path`);
    ok(c.schema.endsWith(`.v${c.version.split('.')[0]}.json`), `${c.id} file major matches version ${c.version}`);
    ok(s.title && s.description, `${c.id} has title and description`);
    ok(/^\d+\.\d+\.\d+$/.test(c.version), `${c.id} semver`);
}
for (const d of contracts.catalog.length ? JSON.parse(fs.readFileSync(path.join(ROOT, 'compatibility/deprecations.json'), 'utf8')).deprecations : []) {
    ok(d.replacement && contracts.resolve(d.replacement), `deprecation ${d.id} names an existing replacement`);
    ok(d.removeAfter, `deprecation ${d.id} has a window`);
}

// ── Fixtures: every contract has examples that pass and counter-examples that fail ──
for (const c of contracts.catalog) {
    for (const kind of ['valid', 'invalid']) {
        const dir = path.join(ROOT, 'fixtures', c.id, kind);
        const list = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.json')) : [];
        ok(list.length > 0, `${c.id} has ${kind} fixtures`);
        for (const f of list) {
            const r = contracts.validate(c.id, JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
            ok(r.valid === (kind === 'valid'), `${c.id} ${kind}/${f}: ${r.valid ? 'passed' : JSON.stringify(r.errors)}`);
        }
    }
}
assert.throws(() => contracts.resolve('identity.subject-ref@2'), /not @2/);
assert.throws(() => contracts.assertValid('identity.subject-ref', { type: 'user', id: '1' }), e => e.code === 'contract.invalid');

// ── Manifests ────────────────────────────────────────────────────────────
const serviceIds = new Set(services.manifests.map(m => m.id));
for (const m of services.manifests) {
    const r = contracts.validate('registry.service-manifest@1', m);
    ok(r.valid, `service manifest ${m.id}: ${JSON.stringify(r.errors)}`);
    for (const cap of m.capabilities) ok(capabilities.get(cap) && capabilities.get(cap).owner === m.id, `${m.id} lists ${cap}, which exists and is owned by it`);
}
for (const cap of capabilities.manifests) {
    const r = contracts.validate('capabilities.capability@1', cap);
    ok(r.valid, `capability ${cap.id}: ${JSON.stringify(r.errors)}`);
    ok(serviceIds.has(cap.owner), `${cap.id} owner ${cap.owner} is a registered service`);
    ok(services.get(cap.owner).capabilities.includes(cap.id), `${cap.owner} manifest lists ${cap.id}`);
    for (const k of ['inputSchema', 'outputSchema']) if (cap[k]) ok(contracts.resolve(cap[k]), `${cap.id} ${k} resolves`);
    ok(cap.status !== 'active' || cap.implementedBy.length > 0, `active ${cap.id} names the route that implements it`);
}
// Developer-app events (v0.28, ADR-014): grantable to apps, owned by Events, project-scoped. The
// existing service-level events.* capabilities stay internal.
for (const id of ['events.app.publish', 'events.app.read', 'events.app.subscribe']) {
    const c = capabilities.get(id);
    ok(c && c.owner === 'events' && c.visibility === 'public' && c.status === 'active' && c.resourceConstraints.includes('project'), `${id} is a public, active, project-scoped Events capability`);
}
for (const id of ['events.event.publish', 'events.event.read', 'events.subscription.manage', 'events.delivery.admin']) {
    ok(capabilities.get(id).visibility === 'internal', `${id} stays internal`);
}
{
    // An app event keeps source and event_type inside the envelope's existing patterns.
    const env = JSON.parse(fs.readFileSync(path.join(ROOT, 'fixtures/events.event-envelope/valid/app-event.json'), 'utf8'));
    ok(contracts.validate('events.event-envelope@1', { ...env, source: `app-${'01JAB2C3D4E5F6G7H8J9K0MNPS'.toLowerCase()}` }).valid, 'app-<lowercased ULID> is a valid source');
    ok(!contracts.validate('events.event-envelope@1', { ...env, source: 'app:app_01JAB2C3D4E5F6G7H8J9K0MNPS' }).valid, 'the raw app subject is not a valid source');
}

// ── Event payload contracts (v0.30, ADR-026) ─────────────────────────────
// A payload contract is named after its event type; its major is the envelope `version`; its owner
// is the producer, which lists the type in eventsProduced. Every valid fixture rides in a valid
// envelope, and a tombstone never passes for a live payload.
{
    const payloads = contracts.catalog.filter(c => c.schema.startsWith('events/payloads/'));
    ok(payloads.length >= 40, `event payload contracts present (${payloads.length})`);
    const tombstone = JSON.parse(fs.readFileSync(path.join(ROOT, 'fixtures/events.tombstone-payload/valid/chat.json'), 'utf8'));
    for (const c of payloads) {
        const major = Number(c.version.split('.')[0]);
        ok(c.schema === `events/payloads/${c.id}.v${major}.json`, `${c.id} lives at events/payloads/<event_type>.v<major>.json`);
        ok(/^[a-z][a-z0-9_]*(\.[a-z0-9_]+){2,}$/.test(c.id), `${c.id} is an event type`);
        ok(services.get(c.owner) && services.get(c.owner).eventsProduced.includes(c.id), `${c.owner} manifest lists ${c.id} in eventsProduced`);
        ok(['active', 'planned'].includes(c.status), `${c.id} status ${c.status}`);
        const s = contracts.schema(c.id);
        ok((s.type === 'object' || s.$ref || s.allOf) && s.title.endsWith('Payload'), `${c.id} is an object payload schema`);
        if (s.properties && s.properties.redacts) ok(s.properties.redacts.$ref === '../redaction-directive.v1.json', `${c.id} redacts uses events.redaction-directive@1`);
        ok(!contracts.validate(c.id, tombstone).valid, `${c.id}: a tombstone is not a valid payload (check payload.redacted first)`);
        const dir = path.join(ROOT, 'fixtures', c.id, 'valid');
        for (const f of fs.readdirSync(dir).filter(n => n.endsWith('.json'))) {
            const payload = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
            const env = { event_id: ids.newId('event'), event_type: c.id, version: major, source: c.owner, actor: { type: 'service', id: c.owner }, timestamp: new Date().toISOString(), subject: { type: 'x', id: '1' }, payload };
            ok(contracts.validate('events.event-envelope@1', env).valid, `${c.id} valid/${f} fits in an envelope`);
            ok(contracts.validate(`${env.event_type}@${env.version}`, env.payload).valid, `${c.id} resolves as <event_type>@<version>`);
        }
    }
    // Every event type a manifest produces and consumes is well formed; consumed types have a producer.
    const produced = new Map();
    for (const m of services.manifests) for (const t of m.eventsProduced) { ok(!produced.has(t), `${t} has one producer`); produced.set(t, m.id); }
    const matches = (pattern, t) => new RegExp(`^${pattern.split('.').map(s => (s === '*' ? '[a-z0-9_]+' : s)).join('\\.')}$`).test(t);
    for (const m of services.manifests) for (const t of m.eventsConsumed) ok([...produced.keys()].some(p => matches(t, p)), `${m.id} consumes ${t}, which some manifest produces`);

    // payload.redacts: what Chat sends, and what Events refuses (403/422 are Events' answers).
    const del = JSON.parse(fs.readFileSync(path.join(ROOT, 'fixtures/chat.message.deleted/valid/two-messages.json'), 'utf8'));
    ok(contracts.validate('events.redaction-directive@1', del.redacts).valid, 'chat.message.deleted carries a valid directive');
    ok(JSON.stringify(del.redacts.subject_ids) === JSON.stringify(del.message_ids.map(String)), 'Chat redacts exactly the deleted ids');
    ok(!contracts.validate('chat.message.deleted@1', { message_ids: del.message_ids }).valid, 'chat.message.deleted without redacts fails');
    const D = (v) => contracts.validate('events.redaction-directive@1', v).valid;
    ok(D({ event_ids: ['evt_01JAB2C3D4E5F6G7H8J9K0MNPQ'], subject_type: 'post', subject_ids: ['p1'] }), 'both forms together pass');
    ok(!D({ subject_ids: ['1'] }) && !D({ subject_type: 'post' }), 'subject_type and subject_ids go together');
    ok(!D({ event_ids: Array.from({ length: 1001 }, () => ids.newId('event')) }), 'more than 1000 ids fail');
    ok(!D({ event_ids: ['evt_1'] }) && !D({ subject_type: 'Chat Message', subject_ids: ['1'] }), 'bad ids and subject types fail');
    ok(!contracts.validate('events.tombstone-payload@1', { redacted: false, redacted_at: tombstone.redacted_at, redacted_by: 'x' }).valid, 'a tombstone is redacted: true');
}

// ── Channel/owner lineage resolver (v0.32, roadmap D20) ─────────────────
// A display name never resolves anything, every resolved answer says which input decided and how
// sure it is, and an unresolved answer carries no channel.
{
    const cap = capabilities.get('live.lineage.resolve');
    ok(cap && cap.owner === 'live' && cap.visibility === 'internal' && cap.inputSchema === 'lineage.resolve-request@1' && cap.outputSchema === 'lineage.resolution@1', 'live.lineage.resolve is Live-internal and names the lineage contracts');
    const Q = (v) => contracts.validate('lineage.resolve-request@1', v).valid;
    const A = (v) => contracts.validate('lineage.resolution@1', v).valid;
    const channel = { id: '12', slug: 'alice', owner_subject: null };
    const resolved = { status: 'resolved', channel, resolved_by: 'slug', rule: 'explicit_slug', confidence: 'exact' };
    ok(Q({ display_name: 'Alice' }), 'a request holding only a display name is well formed, so it gets an explicit answer');
    ok(!Q({ slug: 'Alice Smith' }) && !Q({ slug: 'alice/garage/extra' }), 'a display name is not a slug; nesting is one level');
    ok(A({ status: 'unresolved', reason: 'display_name_only' }), 'display_name_only is an unresolved reason');
    ok(!A({ ...resolved, resolved_by: 'display_name' }), 'a display name can never be what resolved');
    for (const confidence of ['exact', 'derived', 'legacy_map']) ok(A({ ...resolved, confidence }), `confidence ${confidence}`);
    ok(!A({ ...resolved, reason: 'conflict' }), 'a resolved answer has no reason');
    for (const k of ['channel', 'resolved_by', 'rule', 'confidence']) ok(!A({ ...resolved, [k]: undefined }), `a resolved answer needs ${k}`);
    for (const reason of ['no_input', 'display_name_only', 'not_found', 'conflict', 'ambiguous', 'source_unavailable']) ok(A({ status: 'unresolved', reason }), `unresolved: ${reason}`);
    ok(!A({ status: 'unresolved', reason: 'not_found', resolved_by: 'slug' }) && !A({ status: 'unresolved', reason: 'conflict', confidence: 'exact' }), 'an unresolved answer names no decider');
    const inputs = Object.keys(contracts.schema('lineage.resolve-request').properties).filter(k => k !== 'display_name').sort();
    const res = contracts.schema('lineage.resolution').properties;
    ok(JSON.stringify([...res.resolved_by.enum].sort()) === JSON.stringify(inputs), 'resolved_by names exactly the request inputs, never display_name');
    ok(JSON.stringify([...res.checked.items.properties.input.enum].sort()) === JSON.stringify([...inputs, 'display_name'].sort()), 'checked reports every request field, display_name included');
}

// ── Producers' payloads added in v0.32 (Tips moderation, Media jobs, Live, user modules) ──
{
    // Media: one contract per server/events.js JOB_TRANSITIONS entry; the payload is the event projection queue.jobEvent,
    // every field always present. The tenant's params, result, error text, idempotency key and user ids stay behind GET the job.
    const status = { proposed: 'proposed', queued: 'queued', started: 'running', retrying: 'queued', succeeded: 'succeeded', failed: 'failed', cancelled: 'cancelled' };
    const jobFields = ['id', 'app_id', 'object_id', 'type', 'status', 'attempts', 'max_attempts', 'error_code', 'cancel_requested', 'has_result',
        'run_after', 'decided_at', 'created_at', 'updated_at', 'started_at', 'finished_at'];
    const jobTimes = jobFields.filter(k => k === 'run_after' || k.endsWith('_at'));
    for (const [t, st] of Object.entries(status)) {
        const s = contracts.schema(`media.job.${t}`);
        ok(s.properties.status.const === st, `media.job.${t} carries status ${st}`);
        ok(JSON.stringify([...s.required].sort()) === JSON.stringify(Object.keys(s.properties).sort()), `media.job.${t} requires every field it names`);
        ok(JSON.stringify(Object.keys(s.properties)) === JSON.stringify(jobFields) && s.additionalProperties === false, `media.job.${t} is exactly the event projection`);
        ok(['params', 'result', 'error', 'idempotency_key', 'created_by', 'decided_by', 'owner_user_id', 'checkpoint'].every(k => !(k in s.properties)), `media.job.${t} leaves the tenant's data out`);
        ok(jobTimes.every(k => s.properties[k].type === 'null' || (s.properties[k].format === 'date-time' && /Z\$$/.test(s.properties[k].pattern))), `media.job.${t} times are ISO 8601 UTC or null`);
        const outcome = ['succeeded', 'failed', 'cancelled'].includes(t);
        ok(s.properties.finished_at.type === (outcome ? 'string' : 'null'), `media.job.${t} has finished_at ${outcome ? 'always' : 'never'}`);
    }
    const sqliteTime = JSON.parse(fs.readFileSync(path.join(ROOT, 'fixtures/media.job.queued/valid/thumbnail.json'), 'utf8'));
    ok(!contracts.validate('media.job.queued@1', { ...sqliteTime, created_at: '2026-09-23 18:02:11' }).valid, 'a SQLite time is not a media.job time');
    // Live: live.stream.ended is live.stream.started plus ended_at and duration_seconds.
    const started = contracts.schema('live.stream.started'), ended = contracts.schema('live.stream.ended');
    ok(JSON.stringify(Object.keys(ended.properties)) === JSON.stringify([...Object.keys(started.properties), 'ended_at', 'duration_seconds']), 'live.stream.ended = started + ended_at, duration_seconds');
    ok(JSON.stringify(ended.properties.channel) === JSON.stringify(started.properties.channel), 'both stream events describe the channel the same way');
    // Tips: the moderation capability announces its outcome; an erasure takes back the interaction's earlier events.
    const mod = capabilities.get('tips.interaction.moderate');
    ok(mod && mod.owner === 'tips' && mod.events.includes('tips.interaction.moderated'), 'tips.interaction.moderate announces tips.interaction.moderated');
    const erased = JSON.parse(fs.readFileSync(path.join(ROOT, 'fixtures/tips.interaction.erased/valid/erased.json'), 'utf8'));
    ok(erased.redacts.subject_type === 'interaction' && JSON.stringify(erased.redacts.subject_ids) === JSON.stringify([erased.interaction_id]), 'tips.interaction.erased redacts the interaction');
    // User modules: a deleted record never carries values; chat.preferences belongs to Chat since the Wave 6 cutover.
    const M = (v) => contracts.validate('network.module.updated@1', v).valid;
    const upd = { owner: { type: 'user', id: ids.newId('user') }, namespace: 'live.profile', namespace_owner: 'live', schema_version: 1, revision: 2, change: 'updated', reason: 'write', keys: ['followers'], public: { followers: 1 } };
    ok(M(upd) && !M({ ...upd, change: 'deleted', reason: 'delete' }), 'network.module.updated: public values only on a record that still exists');
    ok(!M({ ...upd, merged_from: upd.owner }) && M({ ...upd, change: 'created', reason: 'subject_merged', merged_from: { type: 'guest', id: ids.newId('guest') } }), 'merged_from only on a record moved by a merge');
    ok(contracts.modules.get('chat.preferences').owner === 'chat' && services.get('chat').namespacesOwned.includes('chat.preferences'), 'chat.preferences is owned by chat, and its manifest says so');
}

// ── Tools platform API (v0.33, ADR-027) ──────────────────────────────────
// The descriptor says how every tool may be called; the run API, the SDK and the docs read it. What
// JSON Schema can hold is in tools.tool@1 (and its invalid fixtures); what depends on the id is in
// contracts.tools.checkDescriptor, which the Tools registry runs over every descriptor.
{
    const { tools } = contracts;
    const fixture = (id, kind, f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'fixtures', id, kind, f), 'utf8'));
    const valid = fs.readdirSync(path.join(ROOT, 'fixtures/tools.tool/valid')).filter(f => f.endsWith('.json')).map(f => fixture('tools.tool', 'valid', f));
    const byId = Object.fromEntries(valid.map(d => [d.id, d]));
    const { png, dns, port, yt } = byId;
    const T = (d) => contracts.validate('tools.tool@1', d).valid;
    const D = (d) => tools.checkDescriptor(d).valid;
    for (const d of valid) ok(D(d), `${d.id} passes checkDescriptor: ${JSON.stringify(tools.checkDescriptor(d).errors)}`);

    // api false never has a run endpoint, api true always has its own.
    for (const d of valid) ok(d.api ? d.run && d.run.path === `/api/v1/tools/${d.id}/run` && d.input !== null : d.run === null, `${d.id}: run exists exactly when api is true`);
    ok(yt.api === false && !T({ ...yt, run: { method: 'POST', path: '/api/v1/tools/yt/run', job: null } }), 'yt is page-only: no run endpoint (ADR-027)');
    ok(!D({ ...dns, run: { ...dns.run, path: '/api/v1/tools/whois/run' } }), 'run.path is the tool\'s own');
    ok(!D({ ...dns, run: { ...dns.run, legacy: ['POST /api/v1/tools/dns/run'] } }), 'legacy lists older routes, never the run API');
    ok(!D({ ...dns, input: { $ref: 'https://openvibe.tools/api/v1/tools/whois/schema#/$defs/input' } }), 'an input $ref points at the tool\'s own schema');
    ok(!D({ ...dns, input: { $ref: 'https://openvibe.tools/api/v1/tools/dns/schema#/$defs/output' } }), 'an input $ref points at $defs/input');
    ok(!D({ ...png, files: { ...png.files, min: 2, max: 1 } }), 'files.min <= files.max');
    // Execution: only job tools name a job, and a file result always comes from one.
    for (const d of valid) ok(!d.run || (d.execution === 'job') === !!d.run.job, `${d.id}: names a job exactly when it runs as one`);
    for (const d of valid) ok(!d.api || !['file', 'files'].includes(d.output.kind) || d.execution === 'job', `${d.id}: file output through the API comes from a job`);
    ok(JSON.stringify(tools.jobInput(png, { format: 'jpg', tool: 'crop', width: 10 })) === '{"format":"png","tool":"convert","width":10}', 'a job tool\'s operation and preset win over the caller\'s input');
    ok(tools.jobInput(dns, {}) === null, 'an inline tool submits no job');

    // Egress and auth: a tool that fetches for anonymous callers throttles per target; probes are never anonymous.
    for (const d of valid) if (d.egress) ok(!d.auth.anonymous || d.limits.perTargetPerMinute > 0, `${d.id}: egress needs a non-anonymous caller or a per-target throttle`);
    for (const d of valid) if (d.auth.capability === 'tools.net.probe') ok(d.egress && !d.auth.anonymous, `${d.id}: a probe fetches and is never anonymous`);
    ok(T({ ...dns, auth: { anonymous: false, capability: 'tools.tool.run' }, limits: { timeoutMs: 10000 } }), 'a signed-in-only egress tool may leave the per-target throttle out');
    ok(!T({ ...port, auth: { anonymous: false, capability: 'tools.tool.run' }, execution: 'client' }) && !T({ ...byId.jsonminify, egress: true, limits: { timeoutMs: 1, perTargetPerMinute: 1 } }), 'a client tool never fetches');
    for (const q of ['tools-free', 'tools-anon-run', 'tools-paid-job', 'tools-user', 'tools-pro']) ok(!D({ ...dns, quotaClass: q }), `quota class ${q} names a tier, not the work`);
    for (const d of valid) ok(d.quotaClass.startsWith('tools-') && Number.isInteger(d.cost) && d.cost >= 1, `${d.id}: quota class and cost`);

    // Capabilities: the descriptor names exactly the run capabilities, and they answer the run contracts.
    const capEnum = [...contracts.schema('tools.tool').properties.auth.properties.capability.enum].sort();
    ok(JSON.stringify(capEnum) === '["tools.net.probe","tools.tool.run"]', 'auth.capability is tools.tool.run or tools.net.probe');
    for (const id of capEnum) {
        const c = capabilities.get(id);
        ok(c && c.owner === 'tools' && c.inputSchema === 'tools.run-request@1' && c.outputSchema === 'tools.run@1' && c.implementedBy.some(r => r.startsWith('POST /api/v1/tools/:id/run')), `${id} is the run API`);
    }
    const [readCap, runCap, probeCap] = ['tools.tool.read', 'tools.tool.run', 'tools.net.probe'].map(id => capabilities.get(id));
    ok(readCap.visibility === 'public' && readCap.quotaClass === 'tools-read' && readCap.outputSchema === 'tools.tool@1' && ['GET /api/v1/tools', 'GET /api/v1/tools/:id', 'GET /api/v1/tools/:id/schema'].every(r => readCap.implementedBy.includes(r)), 'tools.tool.read: public registry routes');
    ok(runCap.visibility === 'public' && runCap.quotaClass === 'tools-run', 'tools.tool.run is public');
    ok(probeCap.visibility === 'partner' && probeCap.quotaClass === 'tools-probe', 'tools.net.probe is partner: staff-set allowances only, never a default one');
    const jobCreate = capabilities.get('tools.job.create');
    ok(['POST /api/v1/jobs/:id/retry', 'PUT|DELETE /api/v1/jobs/:id/references/:ref'].every(r => jobCreate.implementedBy.includes(r)) && jobCreate.inputSchema === 'tools.job-request@1', 'tools.job.create covers submit, retry and references');
    ok(['tools.job.create', 'tools.job.read', 'tools.job.cancel'].every(id => capabilities.get(id).outputSchema === 'tools.job@1'), 'the job capabilities answer tools.job@1');
    const svc = services.get('tools');
    ok(svc.ready === '/api/ready' && ['tools.tool.read', 'tools.tool.run', 'tools.net.probe'].every(c => svc.capabilities.includes(c)), 'the tools manifest lists the registry and run capabilities and its ready path');
    for (const t of ['created', 'started', 'succeeded', 'failed']) ok(contracts.resolve(`tools.job.${t}`).status === 'active', `tools.job.${t} is emitted (active)`);

    // Runs and jobs agree: a run's result files are the job's, one idempotency rule, one job type pattern.
    const job = contracts.schema('tools.job'), run = contracts.schema('tools.run'), req = contracts.schema('tools.run-request'), jreq = contracts.schema('tools.job-request');
    ok(JSON.stringify(job.properties.result.properties.files.items) === JSON.stringify(run.oneOf[0].properties.result.properties.files.items), 'a run\'s result files are exactly the job\'s');
    ok(req.properties.idempotency_key.pattern === jreq.properties.idempotency_key.pattern, 'runs and jobs take the same Idempotency-Key');
    const typeRe = job.properties.type.pattern;
    ok([jreq.properties.type.pattern, contracts.schema('tools.tool').properties.run.properties.job.properties.type.pattern, contracts.schema('tools.job.created').properties.type.pattern].every(p => p === typeRe), 'one job type pattern everywhere');
    const done = fixture('tools.job', 'valid', 'succeeded-media-referenced.json');
    ok(contracts.validate('tools.run@1', { state: 'succeeded', tool: done.tool, result: done.result, took_ms: 3000, job: done }).valid, 'a succeeded job\'s result is a run result');
    const payloadFile = Object.keys(contracts.schema('tools.job.succeeded').properties.result.properties.files.items.properties).filter(k => k !== 'index');
    ok(payloadFile.every(k => k in job.properties.result.properties.files.items.properties), 'the tools.job.succeeded event carries a subset of what the job shows its owner');
    ok(!contracts.validate('tools.job@1', { ...done, result: { ...done.result, files: [{ ...done.result.files[0], _path: '/x' }] } }).valid, 'a job never shows server paths');

    // The registry list: every descriptor checked, ids and hosts unique, counts honest.
    const list = fixture('tools.tool-list', 'valid', 'four-tools.json');
    ok(tools.checkList(list).valid, `the list fixture passes checkList: ${JSON.stringify(tools.checkList(list).errors)}`);
    ok(list.tools.every(d => !d.input || d.input.$ref) && list.tools.every(d => !d.output.schema || d.output.schema.$ref), 'the list carries schemas as $ref');
    ok(!tools.checkList({ ...list, count: 5 }).valid, 'count is the number of tools listed');
    ok(!tools.checkList({ ...list, tools: [...list.tools, list.tools[0]], count: list.tools.length + 1 }).valid, 'a tool is listed once');
    ok(!tools.checkList({ ...list, tools: [list.tools[0], { ...list.tools[1], hosts: [list.tools[0].hosts[0]] }], count: 2, families: undefined }).valid, 'a host belongs to one tool');
    ok(!tools.checkList({ ...list, families: [{ id: 'img', name: 'Image Tools', count: 2 }] }).valid, 'family counts are honest');
    ok(!tools.checkList({ ...list, tools: [{ ...list.tools[0], run: { ...list.tools[0].run, path: '/api/v1/tools/jpg/run' } }], count: 1, families: undefined }).valid, 'checkList applies checkDescriptor to every tool');
}

// ── Ids ──────────────────────────────────────────────────────────────────
for (const kind of ['user', 'guest', 'app', 'mod']) {
    const id = ids.newId(kind);
    ok(contracts.validate('identity.subject-ref', { type: kind, id }).valid, `newId(${kind}) is a valid subject id`);
    ok(ids.formatSubject(ids.parseSubject(`${kind}:${id}`)) === `${kind}:${id}`, `${kind} round-trips`);
}
ok(ids.newId('user', 1000) < ids.newId('user', 2000), 'ulids sort by time');
ok(ids.parseSubject('user:42') === null && ids.parseSubject('user') === null && ids.parseSubject('svc:live') === null, 'malformed subjects are rejected');
ok(ids.principalSub({ type: 'service', id: 'live' }) === 'svc:live', 'service principal sub');
assert.throws(() => ids.principalSub({ type: 'user', id: ids.newId('user') }), /principals/);
ok(contracts.validate('media.media-ref', { media_id: ids.legacyMediaId('live', 'vod', 42) }).valid, 'legacyMediaId is a valid MediaRef');
ok(contracts.validate('events.event-envelope', { event_id: ids.newId('event'), event_type: 'network.user.created', version: 1, source: 'network', actor: { type: 'system', id: 'network' }, timestamp: new Date().toISOString(), subject: { type: 'user', id: ids.newId('user') }, payload: {} }).valid, 'newId(event) builds a valid envelope');

// ── Envelope helpers ─────────────────────────────────────────────────────
const tp = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
ok(http.parseTraceparent(tp).traceId === '4bf92f3577b34da6a3ce929d0e0e4736', 'traceparent parsed');
ok(http.parseTraceparent('00-00000000000000000000000000000000-00f067aa0ba902b7-01') === null, 'all-zero trace id rejected');
const ctx = http.requestContext({ traceparent: tp, 'x-openvibe-request-id': 'req_abcdefgh', 'idempotency-key': 'k1' });
ok(ctx.traceId === '4bf92f3577b34da6a3ce929d0e0e4736' && ctx.requestId === 'req_abcdefgh' && ctx.idempotencyKey === 'k1', 'context continues the caller trace');
ok(http.parseTraceparent(ctx.traceparent).traceId === ctx.traceId, 'context traceparent is well-formed');
ok(http.requestContext({ 'x-openvibe-request-id': 'bad id!' }).requestId.startsWith('req_'), 'unsafe request id replaced');
ok(http.parseTraceparent(http.outboundHeaders(ctx).traceparent).traceId === ctx.traceId, 'outbound headers keep the trace');
const body = http.problem(403, 'capability.denied', { detail: 'media.object.upload not granted', ctx });
ok(contracts.validate('errors.problem@1', body).valid && body.error === body.detail, 'problem() output is a valid Problem with the legacy error field');
const res = { headers: {}, setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(b) { this.body = b; } };
http.sendProblem(res, 404, 'subject.not_found');
ok(res.statusCode === 404 && res.headers['content-type'] === 'application/problem+json' && JSON.parse(res.body).code === 'subject.not_found', 'sendProblem writes problem+json');
const req = { headers: {} };
http.middleware()(req, res, () => {});
ok(req.ov && res.headers['x-openvibe-request-id'] === req.ov.requestId, 'middleware attaches and echoes the context');

// ── Capability checks (denial cases first) ───────────────────────────────
const live = { sub: 'svc:live', cap: ['media.object.upload', 'media.object.read'], ns: ['live.*'] };
ok(capabilities.check(live, 'media.object.upload', { namespace: 'live.files' }).allowed, 'granted capability in granted namespace');
ok(capabilities.check(live, 'media.object.upload', { namespace: 'games.maps' }).code === 'capability.namespace_denied', 'other namespace denied');
ok(capabilities.check(live, 'network.coins.credit').code === 'capability.denied', 'ungranted capability denied');
ok(capabilities.check({ cap: [] }, 'chat.message.send').code === 'capability.denied', 'empty grant denied');
ok(capabilities.check(null, 'chat.message.send').code === 'capability.denied', 'no claims denied');
ok(capabilities.check(live, 'media.bucket.delete').code === 'capability.unknown', 'unknown capability denied');
ok(capabilities.check({ cap: ['media.object.*'], ns: ['live'] }, 'media.object.read', { namespace: 'live' }).allowed, 'family grant + exact namespace');
ok(!capabilities.check({ cap: ['media.*'], ns: ['*'] }, 'network.coins.debit').allowed, 'a family grant never crosses owners');
ok(!capabilities.grants(['media.object'], 'media.object.read'), 'a prefix without .* is not a family grant');
ok(!capabilities.namespaceAllowed(['live.*'], 'livestream'), 'namespace wildcard does not match a longer sibling name');

// ── Service tokens: issue, verify, guard, client ─────────────────────────
(async () => {
const { serviceAuth } = contracts;
const kp = require('crypto').generateKeyPairSync('rsa', { modulusLength: 2048 });
const other = require('crypto').generateKeyPairSync('rsa', { modulusLength: 2048 });
const t0 = Math.floor(Date.now() / 1000);
const claims = { iss: 'https://openvibe.network', sub: 'svc:live', actor_type: 'service', aud: ['openvibe.network'], cap: ['network.coins.credit'], ns: ['live'], iat: t0, exp: t0 + 300, jti: 'jti_0123456789' };
const tok = serviceAuth.signServiceToken(claims, kp.privateKey);
const V = (t, o = {}) => serviceAuth.verifyServiceToken(t, { publicKey: kp.publicKey, issuer: 'https://openvibe.network', audience: 'openvibe.network', ...o });
ok(V(tok).ok && V(tok).claims.sub === 'svc:live', 'valid token verifies');
ok(V(serviceAuth.signServiceToken(claims, other.privateKey)).code === 'token.bad_signature', 'foreign key rejected');
ok(V(serviceAuth.signServiceToken({ ...claims, exp: t0 - 120 }, kp.privateKey)).code === 'token.expired', 'expired rejected');
ok(V(tok, { audience: 'openvibe.media' }).code === 'token.wrong_audience', 'wrong audience rejected');
ok(V(tok, { issuer: 'https://evil.example' }).code === 'token.wrong_issuer', 'wrong issuer rejected');
ok(V(serviceAuth.signServiceToken({ ...claims, sub: 'user:42' }, kp.privateKey)).code === 'token.invalid_claims', 'claims must match the contract');
const [h, p] = tok.split('.');
const none = `${Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url')}.${p}.`;
ok(V(none).code === 'token.malformed', 'alg none rejected');
ok(V(`${h}.${Buffer.from(JSON.stringify({ ...claims, cap: ['network.coins.debit'] })).toString('base64url')}.${tok.split('.')[2]}`).code === 'token.bad_signature', 'tampered claims rejected');
ok(V('nope').code === 'token.malformed', 'garbage rejected');
// Developer apps (ADR-014): sandbox tokens are refused unless the receiver opts in.
const appClaims = { ...claims, sub: 'app:app_01J0000000000000000000000Z', actor_type: 'app', project_id: 'prj_01J0000000000000000000000Z', env: 'sandbox' };
const sandboxTok = serviceAuth.signServiceToken(appClaims, kp.privateKey);
ok(V(sandboxTok).code === 'token.sandbox_refused', 'sandbox app token refused by default');
ok(V(sandboxTok, { acceptSandbox: true }).ok, 'sandbox app token accepted when the receiver opts in');
ok(V(serviceAuth.signServiceToken({ ...appClaims, env: 'production' }, kp.privateKey)).ok, 'production app token accepted');
ok(V(serviceAuth.signServiceToken((({ project_id, ...rest }) => rest)(appClaims), kp.privateKey)).code === 'token.invalid_claims', 'an app token needs project_id');
ok(contracts.ids.newId('project').startsWith('prj_'), 'project ids use the prj prefix');

const run = (guard, headers) => new Promise((resolve) => {
    const req = { headers, body: {} };
    const res = { headers: {}, setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(b) { resolve({ status: this.statusCode, body: JSON.parse(b), req }); } };
    guard(req, res, () => resolve({ status: 200, req }));
});
const audit = [];
const opts = { publicKey: kp.publicKey, issuer: 'https://openvibe.network', audience: 'openvibe.network', legacy: (req) => req.headers['x-internal-key'] === 'k', onDecision: (d) => audit.push(d) };
let r = await run(serviceAuth.requireCapability('network.coins.credit', opts), { authorization: `Bearer ${tok}` });
ok(r.status === 200 && r.req.principal.sub === 'svc:live', 'granted capability passes with the principal attached');
r = await run(serviceAuth.requireCapability('network.coins.debit', opts), { authorization: `Bearer ${tok}` });
ok(r.status === 403 && r.body.code === 'capability.denied' && contracts.validate('errors.problem', r.body).valid, 'ungranted capability is a 403 problem');
r = await run(serviceAuth.requireCapability('network.coins.credit', opts), { authorization: 'Bearer garbage', 'x-internal-key': 'k' });
ok(r.status === 401 && r.body.code === 'token.malformed', 'a bad token is not rescued by a legacy key');
r = await run(serviceAuth.requireCapability('network.coins.credit', opts), { 'x-internal-key': 'k' });
ok(r.status === 200 && r.req.principal.legacy === true, 'legacy key still works in compatibility mode');
r = await run(serviceAuth.requireCapability('network.coins.credit', opts), {});
ok(r.status === 403, 'no credentials, no access');
r = await run(serviceAuth.requireCapability('media.object.upload', { ...opts, audience: 'openvibe.network', namespace: () => 'games.maps' }), { authorization: `Bearer ${serviceAuth.signServiceToken({ ...claims, cap: ['media.object.*'], ns: ['live.*'] }, kp.privateKey)}` });
ok(r.status === 403 && r.body.code === 'capability.namespace_denied', 'namespace constraint enforced');
ok(audit.length === 6 && audit.filter(a => a.allowed).length === 2, 'every decision reaches the audit hook');
assert.throws(() => serviceAuth.requireCapability('nope.nope.nope'), /unknown capability/);

let calls = 0;
const fakeFetch = async (url, init) => { calls++; const b = new URLSearchParams(init.body); ok(b.get('grant_type') === 'client_credentials' && b.get('audience') === 'openvibe.network', 'client sends client_credentials'); return { ok: true, status: 200, json: async () => ({ access_token: `t${calls}`, expires_in: 300 }) }; };
const client = serviceAuth.createTokenClient({ tokenUrl: 'http://x/oauth/token', clientId: 'live', clientSecret: 's', audience: 'openvibe.network', fetchImpl: fakeFetch });
const [a1, a2] = await Promise.all([client.getToken(), client.getToken()]);
ok(a1 === 't1' && a2 === 't1' && calls === 1, 'concurrent callers share one fetch');
ok((await client.authHeaders()).Authorization === 'Bearer t1' && calls === 1, 'cached until near expiry');
client.invalidate(); await client.getToken(); ok(calls === 2, 'invalidate forces a refetch');
const failing = serviceAuth.createTokenClient({ tokenUrl: 'x', clientId: 'live', clientSecret: 'bad', audience: 'a', fetchImpl: async () => ({ ok: false, status: 401, json: async () => ({ error: 'invalid_client' }) }) });
await assert.rejects(failing.getToken(), /401: invalid_client/);

// ── User-module namespaces ────────────────────────────────────────────────
{
    const { modules } = contracts;
    ok(modules.namespaces.length >= 6, 'seed namespaces present');
    for (const n of modules.namespaces) {
        ok(contracts.validate('modules.namespace@1', n).valid, `namespace ${n.namespace} matches the contract`);
        ok(serviceIds.has(n.owner), `${n.namespace} owner ${n.owner} is a service`);
        for (const f of n.publicFields) ok(n.schema.properties && n.schema.properties[f], `${n.namespace} public field ${f} is in its schema`);
        ok(n.onOwnerRemoved !== 'delete-after-retention' || Number.isInteger(n.retentionDays), `${n.namespace} deletion has a retention period`);
    }
    ok(modules.validateData('chat.tts_defaults', { voice: 'a', rate: 1 }).valid, 'valid module data passes');
    ok(!modules.validateData('chat.tts_defaults', { rate: 9 }).valid, 'out-of-range value fails');
    ok(!modules.validateData('chat.tts_defaults', { voice: 'a', password: 'x' }).valid, 'unknown field fails');
    ok(!modules.validateData('tools.usage', { recent: Array.from({ length: 30 }, () => ({ tool: 'x'.repeat(80), at: 'y'.repeat(300) })) }).valid, 'over quota fails');
    ok(!modules.validateData('nope.nope', {}).valid && !modules.validateData('chat.preferences', []).valid, 'unknown namespace / non-object fails');
    ok(JSON.stringify(modules.publicView('live.profile', { followers: 3, stream_minutes_30d: 99 })) === '{"followers":3}', 'public view keeps only public fields');
    ok(modules.canWrite('chat.preferences', { type: 'user' }) && !modules.canWrite('live.profile', { type: 'user' }), 'user write follows writers');
    ok(modules.canWrite('live.profile', { type: 'service', id: 'live' }) && !modules.canWrite('live.profile', { type: 'service', id: 'tools' }), 'only the owning service writes');
}

// ── openvibe-contracts-check (the CLI services run in CI) ─────────────────
{
    const os = require('os');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ovc-check-'));
    const bin = path.join(ROOT, 'bin/check-service.js');
    const check = (files, service = 'network') => {
        fs.rmSync(path.join(tmp, 'src'), { recursive: true, force: true });
        fs.mkdirSync(path.join(tmp, 'src'), { recursive: true });
        for (const [n, body] of Object.entries(files)) fs.writeFileSync(path.join(tmp, 'src', n), body);
        try { return { code: 0, out: execFileSync(process.execPath, [bin, '--service', service, '--src', 'src'], { cwd: tmp, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; }
        catch (e) { return { code: e.status, out: String(e.stdout) + String(e.stderr) }; }
    };
    let c = check({ 'a.js': "router.post('/x', guard('network.coins.credit'), h); validate('identity.subject-ref@1', v);" });
    ok(c.code === 0 && /1 capabilities enforced \[network.coins.credit\]/.test(c.out), 'owned capability passes: ' + c.out);
    c = check({ 'a.js': "router.post('/', tenantAuth({ capability: 'media.object.upload' }), h)" }, 'media');
    ok(c.code === 0 && /\[media.object.upload\]/.test(c.out), 'route-option capabilities are checked too');
    c = check({ 'a.js': "requireCapability('network.coins.mint')" });
    ok(c.code === 1 && /not defined/.test(c.out), 'unknown capability fails');
    c = check({ 'a.js': "requireCapability('media.object.upload')" });
    ok(c.code === 1 && /owned by media, not network/.test(c.out), 'another service\'s capability fails');
    c = check({ 'a.js': "assertValid('identity.subject-ref@9', v)" });
    ok(c.code === 1 && /not @9/.test(c.out), 'unknown contract major fails');
    c = check({ 'a.js': '' }, 'nope');
    ok(c.code === 1 && /no service manifest/.test(c.out), 'unknown service fails');
    fs.rmSync(tmp, { recursive: true, force: true });
}

// ── Generated output and compatibility gate ──────────────────────────────
execFileSync(process.execPath, [path.join(ROOT, 'scripts/generate.js'), '--check'], { stdio: 'inherit' });
execFileSync(process.execPath, [path.join(ROOT, 'scripts/compat.js')], { stdio: 'inherit' });
{
    // A $ref with sibling keywords makes json-schema-to-typescript emit SubjectRef1 & co. without declaring them.
    const dts = fs.readFileSync(path.join(ROOT, 'generated/typescript/index.d.ts'), 'utf8');
    const declared = new Set([...dts.matchAll(/^export (?:interface|type) (\w+)/gm)].map(m => m[1]));
    const dangling = [...new Set([...dts.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/\b([A-Z][A-Za-z]*\d+)\b/g)].map(m => m[1]))].filter(n => !declared.has(n));
    ok(dangling.length === 0, `generated types reference undeclared names: ${dangling.join(', ')}`);
}

console.log(`openvibe-contracts: ${n} checks passed`);
})().catch((err) => { console.error(err); process.exit(1); });
