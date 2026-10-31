'use strict';
// actor.wait@1 (plan A2): a wait is a record, not a running loop. The schema is the record's shape; the
// rules the schema cannot say are checked here: one kind of "until", a bounded matcher, a line the person
// can read, and an id of the wait's own kind.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const c = require('..');

const ROOT = path.join(__dirname, '..');
const fx = (kind, f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'fixtures', 'actor.wait', kind, f), 'utf8'));

const wait = fx('valid', 'event-wait.json');
const r = c.validate('actor.wait@1', wait);
assert.ok(r.valid, 'a wait validates: ' + JSON.stringify(r.errors));
assert.ok(c.validate('actor.wait', wait).valid, 'the bare id resolves to the newest major');

// The id a wait carries is its own kind, and the contract says so.
assert.match(c.ids.newId('wait'), /^wai_[0-9A-HJKMNP-TV-Z]{26}$/, 'a wait id is wai_<ULID>');
assert.match(wait.id, /^wai_/, 'the fixture id is a wait id');

// One kind of "until": a topic, a Watch target or a time — never two.
assert.ok(c.validate('actor.wait@1', { ...wait, until: { topic: 'codes.task.*' } }).valid, 'a topic waits');
assert.ok(c.validate('actor.wait@1', { ...wait, until: { watch_id: 'wch_01K6R3A1B2C3D4E5F6G7H8J9KF' } }).valid, 'a watch waits');
assert.ok(c.validate('actor.wait@1', { ...wait, until: { at: '2026-10-30T22:00:00.000Z' } }).valid, 'a time waits');
assert.ok(!c.validate('actor.wait@1', { ...wait, until: { topic: 'codes.task.*', at: '2026-10-30T22:00:00.000Z' } }).valid, 'two kinds of until is refused');

// The matcher is a matcher, not a query.
const nine = {};
for (let i = 0; i < 9; i++) nine['payload.k' + i] = 'v';
assert.ok(!c.validate('actor.wait@1', { ...wait, filter: nine }).valid, 'at most eight filter clauses');
assert.ok(c.validate('actor.wait@1', { ...wait, filter: { 'payload.repo': 'OpenVibers/OpenVibe.Actor' } }).valid, 'one clause is fine');
assert.ok(!c.validate('actor.wait@1', { ...wait, filter: { 'payload.repo': { nested: true } } }).valid, 'a clause is a plain value');
assert.ok(c.validate('actor.wait@1', { ...wait, filter: { 'payload.state': ['succeeded', 'failed', 'cancelled'] } }).valid, 'a list of values means one of them');
assert.ok(!c.validate('actor.wait@1', { ...wait, filter: { 'payload.state': ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm'] } }).valid, 'a list of values is bounded too');

// The person reads the line: it is there, and it is short.
assert.ok(!c.validate('actor.wait@1', { ...wait, line: '' }).valid, 'an empty line is refused');
assert.ok(!c.validate('actor.wait@1', { ...wait, line: 'x'.repeat(201) }).valid, 'a line longer than 200 characters is refused');

// The record never carries the event's payload: only the event that woke it.
assert.ok(!('payload' in wait), 'the fixture carries no payload');
assert.ok(c.validate('actor.wait@1', { ...wait, woken_by: { event_id: 'evt_1', event_type: 'codes.task.succeeded', at: '2026-10-30T16:12:00.000Z' } }).valid, 'woken_by names the event');
assert.ok(!c.validate('actor.wait@1', { ...wait, woken_by: { event_id: 'evt_1', event_type: 'codes.task.succeeded', at: '2026-10-30T16:12:00.000Z', payload: { text: 'hi' } } }).valid, 'woken_by never carries a payload');

// The fixtures the catalog gate reads are the ones this file checks.
for (const f of ['no-line.json', 'two-kinds-of-until.json']) {
    const bad = fx('invalid', f);
    assert.ok(!c.validate('actor.wait@1', bad).valid, 'the invalid fixture ' + f + ' is refused');
}

console.log('actor.wait@1: the wait record validates');
