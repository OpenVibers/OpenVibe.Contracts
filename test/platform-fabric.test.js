'use strict';
const assert = require('assert');
const contracts = require('..');

const names = [
    'usage-sample', 'telemetry-sample', 'node-capabilities', 'service-instance',
    'runtime-offer', 'storage-offer', 'delivery-offer', 'agent-offer', 'harness-offer', 'job',
];

let checks = 0;
for (const name of names) {
    const id = `platform.${name}`;
    const entry = contracts.resolve(`${id}@1`);
    assert.strictEqual(entry.visibility, 'public');
    assert.strictEqual(entry.version, '1.0.0');
    assert.strictEqual(entry.adr, 'ADR-034');
    const schema = contracts.schema(id);
    assert.strictEqual(schema.additionalProperties, false);
    assert.ok(schema.examples.length > 0, `${id} has examples`);
    for (const example of schema.examples) {
        assert.strictEqual(contracts.validate(id, example).valid, true, `${id} example validates`);
        checks++;
        for (const field of schema.required) {
            const missing = { ...example };
            delete missing[field];
            assert.strictEqual(contracts.validate(id, missing).valid, false, `${id} requires ${field}`);
            checks++;
        }
    }
}
// One usage reading carries all 15 plan T5 fields; the money fields are strict, and readings
// from before they existed still validate.
const usage = contracts.schema('platform.usage-sample');
const planFields = [
    'project', 'subject', 'service', 'operation', 'provider', 'resource', 'region', 'quantity', 'unit',
    'cost_estimate', 'free_allowance_used', 'vibes_charged', 'route_epoch', 'trace_id', 'at',
];
const full = usage.examples.find(e => planFields.every(f => f in e));
assert.ok(full, 'a usage-sample example carries all 15 plan fields');
checks++;
assert.strictEqual(contracts.validate('platform.usage-sample', full).valid, true);
checks++;
for (const [field, value] of [['vibes_charged', 1.5], ['vibes_charged', -1], ['free_allowance_used', -1]]) {
    assert.strictEqual(contracts.validate('platform.usage-sample', { ...full, [field]: value }).valid, false, `${field} ${value} is refused`);
    checks++;
}
const telemetry = contracts.schema('platform.telemetry-sample').properties;
for (const field of ['route_epoch', 'trace_id']) {
    const { description, ...shape } = usage.properties[field];
    assert.deepStrictEqual(shape, telemetry[field], `${field} has the telemetry-sample shape`);
    checks++;
}
const legacy = Object.fromEntries(Object.entries(full).filter(([k]) => !['free_allowance_used', 'vibes_charged', 'route_epoch', 'trace_id'].includes(k)));
assert.strictEqual(contracts.validate('platform.usage-sample', legacy).valid, true, 'a reading without the new fields validates');
checks++;
const minimal = Object.fromEntries(usage.required.map(k => [k, full[k]]));
assert.strictEqual(contracts.validate('platform.usage-sample', minimal).valid, true, 'a reading with only the required fields validates');
checks++;

// The five Fabric trust classes (plan §2.1.13): user-owned sits between first-party and partner in both
// schemas, an offer or requirement carrying it is accepted, and an unknown class is refused.
const trustClasses = ['first-party', 'user-owned', 'partner', 'community', 'external'];
assert.deepStrictEqual(contracts.schema('platform.resource-offer').properties.trust.enum, trustClasses, 'resource-offer trust classes');
checks++;
assert.deepStrictEqual(contracts.schema('platform.workload-requirements').properties.trust.items.enum, trustClasses, 'workload-requirements trust classes');
checks++;
const userOffer = {
    offer_id: 'off_user_node_1', kind: 'node', region: 'home', trust: 'user-owned',
    capabilities: ['node:http'], health: { status: 'up' }, pricing: { model: 'free-allowance' },
    updated_at: '2026-10-03T00:00:00Z',
};
assert.strictEqual(contracts.validate('platform.resource-offer', userOffer).valid, true, 'a user-owned offer validates');
checks++;
assert.strictEqual(contracts.validate('platform.resource-offer', { ...userOffer, trust: 'other' }).valid, false, 'an unknown offer trust is refused');
checks++;
const userRequirement = { kind: 'ai.run', mobility: 'job', latency_class: 'background', objective: 'private', trust: ['user-owned'] };
assert.strictEqual(contracts.validate('platform.workload-requirements', userRequirement).valid, true, 'a user-owned-only requirement validates');
checks++;
assert.strictEqual(contracts.validate('platform.workload-requirements', { ...userRequirement, trust: ['other'] }).valid, false, 'an unknown requirement trust is refused');
checks++;

console.log(`platform fabric: ${checks} example and required-field checks passed`);
