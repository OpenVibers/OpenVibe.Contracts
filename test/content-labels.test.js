'use strict';
// common.content-labels@1 and network.label-prefs@1 (L1, labels and choices, 2026-10-31). The schemas carry the
// shapes; the rules they cannot say are checked here: one label list everywhere (contracts, prefs and the JS
// helper), one choice list, the AI's suggestion stored as suggested and never applied, and the fixtures.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const c = require('..');

const ROOT = path.join(__dirname, '..');
const schema = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'contracts', f), 'utf8'));
const fx = (id, kind, f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'fixtures', id, kind, f), 'utf8'));

const LABELS = ['nudity', 'language', 'graphic', '18+', 'flashing', 'spoilers'];
const CHOICES = ['show', 'blur', 'hide'];

const content = schema('common/content-labels.v1.json');
const prefs = schema('network/label-prefs.v1.json');

// One label list in every contract, and the same list in the package's helper, so a service reads it from one place.
assert.deepStrictEqual(content.$defs.label.enum, LABELS, 'content-labels lists the six labels');
assert.deepStrictEqual(content.properties.labels.items.$ref, '#/$defs/label', 'labels are the shared enum');
assert.deepStrictEqual(content.properties.suggested.items.$ref, '#/$defs/label', 'suggested is the same enum');
assert.deepStrictEqual(Object.keys(prefs.properties.prefs.properties), LABELS, 'label-prefs has one choice per label');
assert.deepStrictEqual(prefs.properties.prefs.required, LABELS, 'label-prefs always answers all six');
assert.deepStrictEqual(prefs.$defs.choice.enum, CHOICES, 'the choices are show, blur and hide');
assert.deepStrictEqual(c.labels.LABELS, LABELS, 'the helper lists the same labels');
assert.deepStrictEqual(c.labels.CHOICES, CHOICES, 'the helper lists the same choices');
assert.deepStrictEqual(c.labels.INFO.map((x) => x.id), LABELS, 'the plain words cover every label');
assert.deepStrictEqual(c.labels.defaults(), Object.fromEntries(LABELS.map((l) => [l, 'show'])), 'the web default is show');

// A suggestion changes nothing: the fixture keeps the label out of `labels`, and an unknown label or choice never validates.
const ai = fx('common.content-labels', 'valid', 'ai-suggestion.json');
assert.ok(ai.suggested.includes('nudity') && !ai.labels.includes('nudity'), 'the AI suggestion is stored as suggested, never applied');
assert.strictEqual(c.validate('common.content-labels@1', ai).valid, true, 'an AI suggestion is a valid content-labels');
assert.strictEqual(c.validate('common.content-labels@1', { labels: ['nudity', 'nudity'], suggested: [] }).valid, false, 'a label is listed once');
assert.strictEqual(c.validate('network.label-prefs@1', { prefs: { ...c.labels.defaults(), nudity: 'hide' } }).valid, true, 'hide is a choice');

// The fixtures: each valid one validates, each invalid one does not.
for (const id of ['common.content-labels', 'network.label-prefs']) {
    for (const kind of ['valid', 'invalid']) {
        for (const f of fs.readdirSync(path.join(ROOT, 'fixtures', id, kind))) {
            const r = c.validate(`${id}@1`, fx(id, kind, f));
            assert.strictEqual(r.valid, kind === 'valid', `${id} ${kind}/${f}: ${JSON.stringify(r.errors)}`);
        }
    }
}

// The catalog lists both contracts, and the enum is the same shape in the package a service pins.
assert.ok(c.catalog.some((x) => x.id === 'common.content-labels' && x.version === '1.0.0'), 'the catalog lists common.content-labels@1');
assert.ok(c.catalog.some((x) => x.id === 'network.label-prefs' && x.version === '1.0.0'), 'the catalog lists network.label-prefs@1');

console.log('common.content-labels@1 and network.label-prefs@1: one label and choice list, suggestions never applied, fixtures');
