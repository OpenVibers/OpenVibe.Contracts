'use strict';
// Ask 354: validate AG-UI 1.0 event family fixtures and the OpenVibe metadata extension.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const contracts = require('..');
const root = path.join(__dirname, '..', 'fixtures', 'agent.ui-event');
execFileSync(process.execPath, [path.join(__dirname, '..', 'scripts', 'generate.js'), '--check'], {
    cwd: path.join(__dirname, '..'), stdio: 'pipe',
});
for (const kind of ['valid', 'invalid']) {
    for (const file of fs.readdirSync(path.join(root, kind)).filter((name) => name.endsWith('.json'))) {
        const event = JSON.parse(fs.readFileSync(path.join(root, kind, file), 'utf8'));
        const result = contracts.validate('agent.ui-event@1', event);
        assert.equal(result.valid, kind === 'valid', `${kind}/${file}: ${JSON.stringify(result.errors || [])}`);
    }
}
const schema = contracts.schema('agent.ui-event@1');
assert.ok(schema.allOf.some((rule) => rule.required && rule.required.includes('timestamp')), 'every OpenVibe event has the AG-UI epoch timestamp');
console.log('agent.ui-event: valid and invalid fixtures pass across the eight AG-UI families');
