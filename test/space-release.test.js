'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const contracts = require('..');
const root = path.join(__dirname, '..');
const fixture = (id, kind, name) => JSON.parse(fs.readFileSync(path.join(root, 'fixtures', id, kind, name), 'utf8'));

test('Space launch serves its grants and retires Community forum grants', () => {
    const space = contracts.services.get('space');
    const community = contracts.services.get('community');
    assert.equal(space.exposure.state, 'live');
    assert.equal(space.exposure.publicSite, 'service');
    assert.deepEqual(space.capabilities, ['space.forum.read', 'space.forum.manage', 'space.thread.read', 'space.post.write']);
    assert.equal(contracts.capabilities.get('space.forum.manage').status, 'active');
    assert.ok(contracts.capabilities.get('space.post.write').implementedBy.includes('POST /api/v1/spaces/:space/threads'));
    for (const id of ['space.thread.write', 'space.pulse.read']) {
        assert.equal(contracts.capabilities.get(id).status, 'planned');
        assert.ok(!space.capabilities.includes(id));
    }
    for (const id of ['community.space.read', 'community.space.manage', 'community.thread.read', 'community.post.create']) {
        assert.equal(contracts.capabilities.get(id).status, 'retired');
        assert.ok(!community.capabilities.includes(id));
        assert.equal(contracts.capabilities.check({ cap: [id] }, id).code, 'capability.unknown');
    }
});

test('Space event payloads validate and match the producer', () => {
    const space = contracts.services.get('space');
    for (const id of ['space.thread.created', 'space.post.created', 'space.moderation.action']) {
        assert.ok(space.eventsProduced.includes(id));
        assert.equal(contracts.catalog.find(c => c.id === id).owner, 'space');
        const dir = path.join(root, 'fixtures', id);
        for (const kind of ['valid', 'invalid']) for (const name of fs.readdirSync(path.join(dir, kind))) {
            const payload = fixture(id, kind, name);
            assert.equal(contracts.validate(`${id}@1`, payload).valid, kind === 'valid', `${id} ${kind}/${name}`);
            if (kind === 'valid') {
                const envelope = { event_id: 'evt_01JAB2C3D4E5F6G7H8J9K0MNPQ', event_type: id, version: 1, source: 'space', actor: { type: 'service', id: 'space' }, timestamp: '2026-10-07T00:00:00.000Z', subject: { type: 'thread', id: '1' }, payload };
                assert.equal(contracts.validate('events.event-envelope@1', envelope).valid, true, `${id} envelope`);
            }
        }
    }
    for (const id of ['community.thread.created', 'community.post.created']) {
        assert.equal(contracts.catalog.find(c => c.id === id).status, 'retired');
        assert.ok(!contracts.services.get('community').eventsProduced.includes(id));
    }
});

test('Space blocked response uses the shared problem contract', () => {
    const blocked = fixture('errors.problem', 'valid', 'space-blocked.json');
    assert.equal(contracts.validate('errors.problem@1', blocked).valid, true);
    assert.equal(blocked.code, 'space.blocked');
    assert.equal(blocked.status, 403);
});
