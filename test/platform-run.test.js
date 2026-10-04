'use strict';
// Plan T14 Run: runtime classes, the job and its link frames, and how a running `function` job maps onto
// platform.usage-sample@1. The derivation below is the one platform.job-frame@1 `job_usage` describes; the
// checks hold it to the billing contract: one reading per second, identical however often it is derived.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const contracts = require('..');

let checks = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); checks++; };
const fixture = (id, kind, name) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fixtures', id, kind, `${name}.json`), 'utf8'));

// Runtime classes: the six names, `function` first; each has a one-line description.
const classes = contracts.schema('platform.runtime-class').oneOf;
assert.deepStrictEqual(classes.map(c => c.const), ['function', 'code', 'browser', 'linux', 'desktop', 'gpu']);
for (const c of classes) ok(c.description && !c.description.includes('\n'), `runtime class ${c.const} has a one-line description`);
ok(contracts.schema('platform.job').properties.class.$ref === 'runtime-class.v1.json', 'a job names its class from platform.runtime-class@1');

// Each runtime class maps to one reserved Fabric capability name in platform.resource-offer@1: `worker:` + the
// class. The offer contract lists them in $defs.reservedWorkerCapabilities (Node advertises one per class it runs);
// this pins the two lists together and holds each name to the offer's capabilities pattern.
const offerSchema = contracts.schema('platform.resource-offer');
const reserved = offerSchema.$defs.reservedWorkerCapabilities.enum;
assert.deepStrictEqual(reserved, classes.map(c => `worker:${c.const}`), 'the reserved worker capability names are one per runtime class');
checks++;
for (const name of reserved) ok(new RegExp(offerSchema.properties.capabilities.items.pattern).test(name), `${name} matches the offer capabilities pattern`);

// A frame's job id is a platform.job@1 id.
const frame = contracts.schema('platform.job-frame');
assert.strictEqual(frame.$defs.job_id.pattern, contracts.schema('platform.job').properties.id.pattern);
checks++;

// The writer's derivation: everything comes from the job, the second and the dispatcher's own record.
const record = { project: 'prj_01JAB2C3D4E5F6G7H8J9K0MNPQ', subject: 'user:usr_01JAB2C3D4E5F6G7H8J9K0MNPQ', node: 'dev_01J8Z4M2Q0R7T9YV3K6N8P1W2X' };
function reading(id, startedMs, n, quantity) {
    const key = `run:${id}:${n}`;
    return {
        id: key, idempotency_key: key, service: 'run', project: record.project, subject: record.subject, resource: id,
        node: record.node, operation: 'function.invoke', quantity, unit: 's', at: new Date(startedMs + n * 1000).toISOString(),
        source: 'openvibe-node.worker',
    };
}
const fromUsage = (f) => reading(f.id, f.started_ms, f.second, 1);
function fromExit(f) {
    const { started_ms: startedMs, wall_ms: wall } = f.usage;
    const out = [];
    for (let n = 0; n < Math.floor(wall / 1000); n++) out.push(reading(f.id, startedMs, n, 1));
    if (wall % 1000 > 0) out.push(reading(f.id, startedMs, Math.floor(wall / 1000), (wall % 1000) / 1000));
    return out;
}

const usage = fixture('platform.job-frame', 'valid', 'job-usage');
const exit = fixture('platform.job-frame', 'valid', 'job-exit');
const fromFrames = fromExit(exit);
for (const r of fromFrames) ok(contracts.validate('platform.usage-sample', r).valid, `${r.idempotency_key} is a valid usage reading`);
ok(new Set(fromFrames.map(r => r.idempotency_key)).size === fromFrames.length, 'one reading per second: keys are unique');
ok(fromFrames.reduce((s, r) => s + Math.round(r.quantity * 1000), 0) === exit.usage.wall_ms, 'the readings add up to wall_ms, partial last second included');
ok(fromFrames.slice(0, -1).every(r => r.quantity === 1) && fromFrames.at(-1).quantity === 0.35, 'full seconds are 1; only the last is partial');
// A job_usage and the job_exit backfill of the same second are the same reading (Billing replays, never 409s).
assert.deepStrictEqual(fromUsage(usage), fromFrames[usage.second]);
// A resend (new envelope seq and ts after a reconnect) derives the same readings.
assert.deepStrictEqual(fromUsage({ ...usage, seq: 1, ts: usage.ts + 30000 }), fromUsage(usage));
assert.deepStrictEqual(fromExit({ ...exit, seq: 1, ts: exit.ts + 30000 }), fromFrames);
checks += 3;
// A job that never started bills nothing.
ok(fromExit(fixture('platform.job-frame', 'valid', 'job-exit-never-started')).length === 0, 'a job that never ran has no readings');
// The usage-sample example and fixtures for a function job are exactly what the writer derives.
const example = contracts.schema('platform.usage-sample').examples.find(e => e.service === 'run');
assert.deepStrictEqual(example, fromFrames[0]);
assert.deepStrictEqual(fixture('platform.usage-sample', 'valid', 'run-function-second'), fromFrames[0]);
assert.deepStrictEqual(fixture('platform.usage-sample', 'valid', 'run-function-last-partial-second'), fromFrames.at(-1));
checks += 3;
// job_usage only ever stands for a full second: it has no quantity of its own.
ok(!contracts.validate('platform.job-frame', { ...usage, quantity: 0.5 }).valid, 'a job_usage frame cannot carry a partial quantity');

// OpenVibe.Run's job API (T14 R1): Run mints the platform.job@1 id, so its job ids, artifacts and limits are the
// job's own; a job's usage seconds are the sum of its readings; every run.* capability and event is Run's.
const create = contracts.schema('run.job-create-request');
const job = contracts.schema('platform.job');
ok(contracts.schema('run.job-read-result').properties.id.pattern === job.properties.id.pattern, 'a Run job id is a platform.job@1 id');
assert.deepStrictEqual(create.$defs.artifact.properties, job.properties.artifact.properties);
assert.deepStrictEqual(create.$defs.limits.properties, job.properties.limits.properties);
assert.deepStrictEqual(create.$defs.egress.enum, ['none', 'public', 'openvibe-only']);
checks += 3;
ok(contracts.ids.newId('job').match(job.properties.id.pattern), 'newId(job) mints a platform.job@1 id');
const succeeded = fixture('run.job-read-result', 'valid', 'succeeded');
ok(succeeded.usage.seconds === fromExit(exit).reduce((s, r) => s + r.quantity, 0) && succeeded.usage.wall_ms === exit.usage.wall_ms, 'usage.seconds is the sum of the job\'s readings');
const run = contracts.services.get('run');
ok(run && run.status === 'placeholder' && contracts.products.get('openvibe.run').relationships.noRepo === true, 'run is a placeholder service and openvibe.run still has no repository');
for (const id of ['run.job.submit', 'run.job.read', 'run.job.list', 'run.job.cancel', 'run.job.stream', 'run.job.admin']) {
    const c = contracts.capabilities.get(id);
    ok(c && c.owner === 'run' && c.status === 'planned' && c.description.startsWith('PLANNED') && run.capabilities.includes(id), `${id} is a planned capability Run serves`);
}
ok(contracts.capabilities.get('run.job.admin').visibility === 'internal', 'run.job.admin is internal');
for (const s of ['queued', 'started', 'succeeded', 'failed', 'cancelled', 'expired']) ok(run.eventsProduced.includes(`run.job.${s}`), `run produces run.job.${s}`);

console.log(`platform run: ${checks} job, frame and metering checks passed`);
