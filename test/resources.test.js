'use strict';
// ADR-048 (plan T13): resource names and the control-operation contract every console action uses.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const c = require('../index.js');
const resources = require('../lib/resources');
const fx = (id, kind, f) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fixtures', id, kind, f), 'utf8'));

const name = fx('common.resource-name', 'valid', 'media-object.json');
assert.strictEqual(c.resources, resources, 'index.js exports lib/resources.js');
const parts = c.resources.parse(name);
assert.deepStrictEqual(Object.keys(parts), ['service', 'project_id', 'type', 'id'], 'a name parses into its four segments');
assert.strictEqual(parts.service, 'media');
assert.strictEqual(c.resources.format(parts), name, 'format is the inverse of parse');
assert.strictEqual(c.resources.parse(fx('common.resource-name', 'invalid', 'not-an-ovrn.json')), null, 'a non-name parses to null');
assert.strictEqual(c.resources.parse(42), null);
assert.strictEqual(c.resources.parse(fx('common.resource-name', 'invalid', 'user-id.json')), null, 'a name whose id is a person parses to null');
assert.throws(() => c.resources.format({ ...parts, project_id: 'usr_01K6R2Z8C4V7M9Q3T5W1X2Y3Z4' }), TypeError, 'format refuses segments that make no name');
for (const f of ['media-object.json', 'zone-object-zone.json', 'run-sandbox.json']) {
    const n = fx('common.resource-name', 'valid', f);
    assert.ok(c.resources.checkName(n).valid && c.resources.parse(n), `${f}: the schema and parse agree`);
}

// A resource summary composes its own name.
const summary = { id: 'wch_01K6R3A1B2C3D4E5F6G7H8J9KA', kind: 'watch.watch', service: 'watch', project_id: 'prj_01K6R2Z8C4V7M9Q3T5W1X2Y3Z4', state: 'active', created_at: '2026-10-04T12:00:00Z' };
assert.strictEqual(c.resources.nameOf(summary), 'ovrn:watch:prj_01K6R2Z8C4V7M9Q3T5W1X2Y3Z4:watch/wch_01K6R3A1B2C3D4E5F6G7H8J9KA');
assert.strictEqual(c.resources.nameOf({ ...summary, service: 'media' }), null, 'a kind of another service names nothing');
assert.strictEqual(c.resources.nameOf({ ...summary, project_id: undefined }), null, 'a summary without a project names nothing');

// Control requests: the schema passes these, the cross-field rules refuse them.
for (const f of ['other-project.json', 'create-with-resource.json']) {
    const q = fx('common.resource-control-request', 'invalid', f);
    assert.ok(c.validate('common.resource-control-request@1', q).valid, `${f} is schema-valid`);
    assert.ok(!c.resources.checkControlRequest(q).valid, `${f} is refused by the cross-field check`);
}
const other = c.resources.checkControlRequest(fx('common.resource-control-request', 'invalid', 'other-project.json'));
assert.ok(other.errors.some((e) => e.path === '/resource' && /must name a resource of project/.test(e.message)), 'a resource of another project is refused');
const del = c.resources.checkControlRequest(fx('common.resource-control-request', 'invalid', 'delete-without-resource.json'));
assert.ok(del.errors.some((e) => e.path === '/resource' && /required for delete/.test(e.message)), 'delete names its resource');
assert.ok(!c.resources.checkControlRequest(fx('common.resource-control-request', 'invalid', 'both-names.json')).valid, 'resource and resource_kind together are refused');

// Control results: problem and confirmation_required fit the state.
for (const f of ['failed-without-problem.json', 'done-with-confirmation.json', 'refused-bare.json']) {
    const r = fx('common.resource-control-result', 'invalid', f);
    assert.ok(c.validate('common.resource-control-result@1', r).valid && !c.resources.checkControlResult(r).valid, `${f}: schema-valid, refused by the state rules`);
}
const pending = fx('common.resource-control-result', 'valid', 'pending.json');
assert.ok(!c.resources.checkControlResult({ ...pending, problem: fx('common.resource-control-result', 'valid', 'failed-problem.json').problem }).valid, 'pending carries no problem');
