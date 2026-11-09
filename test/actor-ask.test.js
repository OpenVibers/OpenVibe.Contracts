'use strict';
const assert = require('assert');
const c = require('..');
const pending = require('../fixtures/actor.ask/valid/pending.json');
assert.ok(c.validate('actor.ask@1', pending).valid);
for (const kind of ['approve_action', 'answer_question', 'do_yourself']) assert.ok(c.validate('actor.ask@1', { ...pending, kind }).valid);
for (const key of ['id', 'actor', 'goal', 'kind', 'text', 'options', 'created', 'answered']) {
    const bad = { ...pending }; delete bad[key];
    assert.ok(!c.validate('actor.ask@1', bad).valid, key + ' is required');
}
assert.ok(c.validate('actor.ask@1', { ...pending, answered: { at: pending.created, decision: 'decline' } }).valid);
assert.ok(!c.validate('actor.ask@1', { ...pending, owner: 'another person' }).valid);
assert.ok(!c.validate('actor.ask@1', { ...pending, options: Array(13).fill('yes') }).valid);
console.log('actor.ask@1: pending, answered, declined and bounded');
