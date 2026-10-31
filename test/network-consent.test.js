'use strict';
// network.consent@1 and its family (L24, data and AI by consent, 2026-10-31). Each use of a person's content or likeness
// for AI or data is off until that person turns it on; the record is the proof. The schemas carry the shapes; the
// rules they cannot say are checked here: one list of purposes and kinds everywhere, an id of the choice's own kind,
// and no purpose that sells data (that needs its own contract and a per-deal yes, plan C5).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const c = require('..');

const ROOT = path.join(__dirname, '..');
const schema = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'contracts', f), 'utf8'));
const fx = (id, kind, f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'fixtures', id, kind, f), 'utf8'));

const PURPOSES = ['ai.train', 'data.public', 'face.recognize', 'ai.looks', 'app.data'];
const KINDS = ['streams', 'vods', 'clips', 'voice', 'chat', 'posts', 'pictures', 'code'];

const consent = schema('network/consent.v1.json');
const request = schema('network/consent-check-request.v1.json');
const result = schema('network/consent-check-result.v1.json');
const mine = schema('network/me-consent-result.v1.json');
const changed = schema('events/payloads/network.consent.changed.v1.json');

// One list of purposes and one of kinds in every contract of the family, so a new purpose is added everywhere at once.
for (const [name, list] of [
    ['consent.purpose', consent.properties.purpose.enum],
    ['request.purpose', request.properties.purpose.enum],
    ['result.purpose', result.properties.purpose.enum],
    ['mine.purposes.id', mine.properties.purposes.items.properties.id.enum],
    ['mine.history.purpose', mine.properties.history.items.properties.purpose.enum],
    ['changed.purpose', changed.properties.purpose.enum],
]) assert.deepStrictEqual(list, PURPOSES, `${name} lists the same purposes`);
for (const [name, list] of [
    ['consent.kinds', consent.properties.kinds.items.enum],
    ['request.kind', request.properties.kind.enum],
    ['result.kind', result.properties.kind.enum],
    ['changed.kinds', changed.properties.kinds.items.enum],
]) assert.deepStrictEqual(list, KINDS, `${name} lists the same kinds`);

// Selling is not a purpose: it would need its own contract and a yes for each deal.
assert.ok(!PURPOSES.some((p) => /sell|licen[cs]e|sale/.test(p)), 'no purpose sells data');
assert.strictEqual(c.validate('network.consent@1', { ...fx('network.consent', 'valid', 'ai-train-streams.json'), purpose: 'data.sell' }).valid, false);

// A choice's id is its own kind.
assert.match(c.ids.newId('consent'), /^cns_[0-9A-HJKMNP-TV-Z]{26}$/, 'a consent id is cns_<ULID>');

// The fixtures: each valid one validates, each invalid one does not.
for (const id of ['network.consent', 'network.consent-choice', 'network.me-consent-result', 'network.consent-check-request', 'network.consent-check-result', 'network.consent.changed']) {
    for (const kind of ['valid', 'invalid']) {
        for (const f of fs.readdirSync(path.join(ROOT, 'fixtures', id, kind))) {
            const r = c.validate(`${id}@1`, fx(id, kind, f));
            assert.strictEqual(r.valid, kind === 'valid', `${id} ${kind}/${f}: ${JSON.stringify(r.errors)}`);
        }
    }
}

// The change event names the change, never the content it covers.
assert.strictEqual(changed.additionalProperties, false);
assert.ok(!('content' in changed.properties) && !('text' in changed.properties), 'the event carries no content');

// A check answers at most what it was asked: 500 people a call.
assert.strictEqual(request.properties.subjects.maxItems, 500);
assert.strictEqual(result.properties.allowed.maxProperties, 500);

// The capabilities exist, and the service check is first-party only.
const cap = (id) => JSON.parse(fs.readFileSync(path.join(ROOT, 'manifests', 'capabilities', `${id}.json`), 'utf8'));
assert.strictEqual(cap('network.consent.read').visibility, 'first-party', 'only OpenVibe services ask the check');
assert.deepStrictEqual(cap('network.consent.read').implementedBy, ['POST /internal/consent/check']);
assert.strictEqual(cap('network.consent.manage').visibility, 'public');
const network = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifests', 'services', 'network.json'), 'utf8'));
assert.ok(network.capabilities.includes('network.consent.read') && network.capabilities.includes('network.consent.manage'));
assert.ok(network.eventsProduced.includes('network.consent.changed'));

console.log('network.consent@1: one list of purposes and kinds, cns_ ids, no selling purpose, fixtures, capabilities');
