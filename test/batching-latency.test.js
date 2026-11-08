'use strict';
// BA3 (plan track BA): the latency classes and the batches contract. The run's options carry the class
// the caller asks for and, for a batch, how long the answer may take; the run's answer carries the class
// it really ran in, the tier it was priced on, and the clamp when the ask was too fast. The batches
// contract is the queue of many prompts that are answered later.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Ajv = require('ajv/dist/2020');
const addFormats = require('ajv-formats');
const c = require('..');

const ROOT = path.join(__dirname, '..');
const load = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, 'contracts', rel), 'utf8'));

// ── The options: the class the caller asks for ────────────────────────────
const req = load('ai/run-request.v1.json');
assert.deepStrictEqual(req.properties.options.properties.latency.enum, ['interactive', 'background', 'batch'],
    'the classes are interactive, background and batch');
for (const cls of ['interactive', 'background', 'batch']) {
    assert.ok(c.validate('ai.run-request@1', { workflow: 'live.rundown.episode', input: { a: 1 }, options: { latency: cls } }).valid,
        'a run may ask for the ' + cls + ' class');
}
assert.ok(!c.validate('ai.run-request@1', { workflow: 'live.rundown.episode', input: { a: 1 }, options: { latency: 'later' } }).valid,
    'a class that does not exist is refused');
assert.ok(c.validate('ai.run-request@1', { workflow: 'live.rundown.episode', input: { a: 1 }, options: { latency: 'batch', deadline_hours: 1 } }).valid,
    'a batch run may ask for one hour');
assert.ok(c.validate('ai.run-request@1', { workflow: 'live.rundown.episode', input: { a: 1 }, options: { latency: 'batch', deadline_hours: 72 } }).valid,
    'a batch run may ask for seventy-two hours');
assert.ok(!c.validate('ai.run-request@1', { workflow: 'live.rundown.episode', input: { a: 1 }, options: { deadline_hours: 0 } }).valid,
    'no hour is not a deadline');
assert.ok(!c.validate('ai.run-request@1', { workflow: 'live.rundown.episode', input: { a: 1 }, options: { deadline_hours: 73 } }).valid,
    'more than seventy-two hours is not a deadline');
assert.ok(!c.validate('ai.run-request@1', { workflow: 'live.rundown.episode', input: { a: 1 }, options: { deadline_hours: 1.5 } }).valid,
    'a deadline is a whole number of hours');

// ── The answer: the class it ran in, the tier it was priced on, the clamp ──
// The run's own document has many parts (a provenance, a requester, a usage), so the three new members are
// checked against the run's schema with the required list dropped: what matters here is that the members
// exist, that they hold the right values, and that a run that does not carry them is still a valid run.
const run = load('ai/run.v1.json');
for (const name of ['latency_class', 'service_tier', 'latency_clamped']) {
    assert.ok(run.properties[name], 'the run answers with ' + name);
    assert.ok(!run.required.includes(name), name + ' is optional: a run that does not carry it stays a valid run');
}
const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);
const member = (name) => ajv.compile(run.properties[name]);
const latencyClass = member('latency_class');
const serviceTier = member('service_tier');
const latencyClamped = member('latency_clamped');
assert.ok(latencyClass('batch'), 'a run may answer with the batch class');
assert.ok(!latencyClass('now'), 'a class that does not exist is refused');
for (const tier of ['standard', 'flex', 'batch', 'offpeak', 'local']) {
    assert.ok(serviceTier(tier), 'the tier ' + tier + ' is a tier');
}
assert.ok(serviceTier(null), 'the tier is unknown until the run answers');
assert.ok(!serviceTier('cheapest'), 'a tier that does not exist is refused');
assert.ok(latencyClamped({ asked: 'interactive', used: 'background' }),
    'a clamped run says which class was asked for and which was used');
assert.ok(!latencyClamped({ asked: 'interactive' }), 'a clamp without the class used is refused');
assert.ok(!latencyClamped({ asked: 'now', used: 'background' }), 'a clamp names a class that exists');

// ── The batches: many prompts, answered later ──────────────────────────────
const batchDoc = {
    id: 'bat_0123456789abcdef01234567', status: 'queued', owner_type: 'user', owner_id: 'usr_1', project_id: null,
    item_count: 2, items: [], discount: '500000', deadline_at: '2026-11-08T22:58:00.000Z',
    created_at: '2026-11-07T22:58:00.000Z', updated_at: '2026-11-07T22:58:00.000Z',
};
assert.ok(c.validate('ai.batch@1', batchDoc).valid, 'a batch is a queue with a deadline');
assert.ok(c.validate('ai.batch-read-result@1', { batches: [batchDoc] }).valid, 'the list of batches answers with batches');
assert.ok(c.validate('ai.batch-read-result@1', { batch: batchDoc }).valid, 'one batch answers with a batch');
assert.ok(!c.validate('ai.batch-read-result@1', { batch: batchDoc, batches: [] }).valid, 'the read answers one way or the other');
assert.ok(c.validate('ai.batch-create-request@1', { items: ['one prompt', { prompt: 'another', model: 'gpt-4o-mini' }] }).valid,
    'a batch carries prompts');
assert.ok(c.validate('ai.batch-create-request@1', { items: ['a prompt'], deadline_hours: 24 }).valid, 'a batch may ask for a day');
assert.ok(!c.validate('ai.batch-create-request@1', { items: ['a prompt'], deadline_hours: 100 }).valid,
    'a batch deadline outside 1 to 72 hours is refused');
assert.ok(!c.validate('ai.batch-create-request@1', { items: [] }).valid, 'a batch without prompts is refused');
assert.ok(c.validate('ai.batch-create-result@1', { batch: batchDoc }).valid, 'opening a batch answers with the batch');

// The contract says what cancelling does: only the prompts that never had a run are cancelled, and a
// prompt that is already with the provider is not told it was not charged.
const cancelDoc = load('ai/batch-create-result.v1.json').description;
assert.match(cancelDoc, /never had a run/, 'cancelling touches only the prompts without a run');
assert.match(cancelDoc, /nobody is told it was not charged/, 'and nobody is told a prompt that goes on was not charged');
assert.match(load('ai/batch-item.v1.json').properties.reason.description, /already sent to the provider/,
    'the item may say that it is already with the provider');
assert.match(load('ai/batch.v1.json').properties.status.description, /nothing is left in flight/,
    'the batch is cancelled only when nothing is left in flight');
// ── The catalog and the grants ─────────────────────────────────────────────
for (const id of ['ai.batch', 'ai.batch-item', 'ai.batch-create-request', 'ai.batch-create-result', 'ai.batch-read-result']) {
    assert.ok(c.catalog.some(e => e.id === id), id + ' is in the catalog');
}
assert.ok(c.capabilities.get('ai.batches.create'), 'the grant that opens a batch exists');
assert.ok(c.capabilities.get('ai.batches.read'), 'the grant that reads batches exists');
assert.ok(c.services.get('ai').capabilities.includes('ai.batches.create'), 'the AI service offers the grant that opens a batch');
assert.ok(c.services.get('ai').capabilities.includes('ai.batches.read'), 'the AI service offers the grant that reads batches');
