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

console.log(`openvibe-contracts: ${n} checks passed`);
})().catch((err) => { console.error(err); process.exit(1); });
