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

// ── Generated output and compatibility gate ──────────────────────────────
execFileSync(process.execPath, [path.join(ROOT, 'scripts/generate.js'), '--check'], { stdio: 'inherit' });
execFileSync(process.execPath, [path.join(ROOT, 'scripts/compat.js')], { stdio: 'inherit' });

console.log(`openvibe-contracts: ${n} checks passed`);
