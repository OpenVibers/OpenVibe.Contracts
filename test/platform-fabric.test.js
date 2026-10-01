'use strict';
const assert = require('assert');
const contracts = require('..');

const names = [
    'usage-sample', 'telemetry-sample', 'node-capabilities', 'service-instance',
    'runtime-offer', 'storage-offer', 'delivery-offer', 'agent-offer', 'harness-offer',
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
console.log(`platform fabric: ${checks} example and required-field checks passed`);
