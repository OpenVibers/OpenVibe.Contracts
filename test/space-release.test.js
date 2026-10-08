'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const contracts = require('..');
const root = path.join(__dirname, '..');
const fixture = (id, kind, name) => JSON.parse(fs.readFileSync(path.join(root, 'fixtures', id, kind, name), 'utf8'));

test('Community serves its forum grants again and Space keeps no forum', () => {
    const space = contracts.services.get('space');
    const community = contracts.services.get('community');
    assert.equal(community.exposure.state, 'live');
    assert.deepEqual(community.capabilities, [
        'community.paste.create', 'community.paste.write', 'community.paste.moderate', 'community.post.create',
        'community.comment.write', 'community.comment.moderate', 'community.pulse.write',
        'community.space.read', 'community.space.manage', 'community.thread.read',
        'community.vote.set', 'community.pulse.read',
    ]);
    assert.equal(contracts.capabilities.get('community.post.create').status, 'active');
    assert.ok(contracts.capabilities.get('community.post.create').implementedBy.includes('POST /api/v1/spaces/:space/threads'));
    assert.ok(contracts.capabilities.get('community.thread.read').implementedBy.includes('GET /s/:space/t/:slug'));
    for (const id of ['community.space.read', 'community.space.manage', 'community.thread.read', 'community.post.create']) {
        assert.equal(contracts.capabilities.get(id).status, 'active');
        assert.ok(community.capabilities.includes(id));
        assert.equal(contracts.capabilities.check({ cap: [id] }, id).allowed, true, id);
    }
    assert.equal(space.exposure.state, 'live');
    assert.equal(space.exposure.publicSite, 'service');
    assert.deepEqual(space.capabilities, []);
    assert.deepEqual(space.eventsProduced, []);
    for (const id of ['space.forum.read', 'space.forum.manage', 'space.thread.read', 'space.post.write', 'space.thread.write', 'space.pulse.read']) {
        assert.equal(contracts.capabilities.get(id).status, 'retired');
        assert.ok(!space.capabilities.includes(id));
        assert.equal(contracts.capabilities.check({ cap: [id] }, id).code, 'capability.unknown');
    }
    assert.match(space.site.what, /code hosting/i);
    assert.match(space.notes, /forum returned to OpenVibe\.Community \(owner decision 2026-10-08\)/);
});

test('Community event payloads validate and match the producer', () => {
    const community = contracts.services.get('community');
    for (const id of ['community.thread.created', 'community.post.created']) {
        assert.ok(community.eventsProduced.includes(id));
        assert.equal(contracts.catalog.find(c => c.id === id).owner, 'community');
        assert.equal(contracts.catalog.find(c => c.id === id).status, 'active');
        const dir = path.join(root, 'fixtures', id);
        for (const kind of ['valid', 'invalid']) for (const name of fs.readdirSync(path.join(dir, kind))) {
            const payload = fixture(id, kind, name);
            assert.equal(contracts.validate(`${id}@1`, payload).valid, kind === 'valid', `${id} ${kind}/${name}`);
            if (kind === 'valid') {
                const envelope = { event_id: 'evt_01JAB2C3D4E5F6G7H8J9K0MNPQ', event_type: id, version: 1, source: 'community', actor: { type: 'service', id: 'community' }, timestamp: '2026-10-08T00:00:00.000Z', subject: { type: 'thread', id: '1' }, payload };
                assert.equal(contracts.validate('events.event-envelope@1', envelope).valid, true, `${id} envelope`);
            }
        }
    }
    for (const id of ['space.thread.created', 'space.post.created', 'space.moderation.action']) {
        assert.equal(contracts.catalog.find(c => c.id === id).status, 'retired');
        assert.ok(!contracts.services.get('space').eventsProduced.includes(id));
    }
});

test('The retired Space forum contracts name their Community replacements', () => {
    const deprecations = require('../compatibility/deprecations.json').deprecations;
    const moves = [
        ['space.forum-space', 'community.forum-space@1'],
        ['space.forum-thread', 'community.forum-thread@1'],
        ['space.forum-post', 'community.forum-post@1'],
        ['space.forum-read-result', 'community.space-read-result@1'],
        ['space.thread-read-result', 'community.thread-read-result@1'],
        ['space.post-write-request', 'community.post-write-request@1'],
        ['space.post-write-result', 'community.post-write-result@1'],
        ['space.thread.created', 'community.thread.created@1'],
        ['space.post.created', 'community.post.created@1'],
        ['space.moderation.action', 'community.moderation.action@1'],
    ];
    for (const [id, replacement] of moves) {
        const d = deprecations.find(x => x.id === id);
        assert.ok(d, `${id} is recorded`);
        assert.equal(d.replacement, replacement);
        assert.equal(d.since, '0.118.0');
        assert.match(d.reason, /the forum returned to OpenVibe\.Community \(2026-10-08\)/);
        assert.equal(contracts.catalog.find(c => c.id === id).status, 'retired');
        assert.ok(contracts.resolve(replacement), `${id} -> ${replacement} resolves`);
    }
    for (const id of ['community.forum-space', 'community.forum-thread', 'community.forum-post', 'community.thread.created', 'community.post.created']) {
        assert.ok(!deprecations.some(x => x.id === id), `${id} is no longer deprecated`);
    }
});

test('Space blocked response uses the shared problem contract', () => {
    const blocked = fixture('errors.problem', 'valid', 'space-blocked.json');
    assert.equal(contracts.validate('errors.problem@1', blocked).valid, true);
    assert.equal(blocked.code, 'space.blocked');
    assert.equal(blocked.status, 403);
});
