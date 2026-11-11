'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { validate } = require('..');

for (const kind of ['valid', 'invalid']) {
    const dir = path.join(__dirname, '..', 'fixtures', 'codes.model-plan', kind);
    for (const file of fs.readdirSync(dir)) {
        const value = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
        assert.equal(validate('codes.model-plan@1', value).valid, kind === 'valid', file);
    }
}

const base = { repo: 'https://github.com/OpenVibers/OpenVibe.Codes', prompt: 'Improve the task' };
const pair = require('../fixtures/codes.model-plan/valid/pair.json');
assert.equal(validate('codes.task-start-request@1', { ...base, plan: pair }).valid, true);
assert.equal(validate('codes.task-start-request@1', { ...base, preset: 'Balanced' }).valid, true);
assert.equal(validate('codes.task-start-request@1', { ...base, plan: pair, preset: 'Balanced' }).valid, false);

console.log('codes.model-plan@1: valid modes, invalid role, effort and ladder fixtures, task plan or preset');
