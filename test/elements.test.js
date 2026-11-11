'use strict';
// Elements (owner ask 2026-11-11): the four contracts and two events that make a button people
// make. JSON Schema holds most of it; these are the rules it cannot state, and the drift between
// the one action catalog and the capabilities an element declares.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const contracts = require('..');

const ROOT = path.join(__dirname, '..');
let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n++; };
const fixture = (id, kind, file) => JSON.parse(fs.readFileSync(path.join(ROOT, 'fixtures', id, kind, file), 'utf8'));

// ── The action catalog is one list ───────────────────────────────────────
const actions = contracts.schema('ui.action@1');
const variants = actions.oneOf;
const kinds = variants.map((v) => v.properties.kind.const);
ok(new Set(kinds).size === kinds.length, 'every action kind appears once');
const capability = actions.$defs.capability.enum;
ok(JSON.stringify([...capability].sort()) === JSON.stringify([...kinds].sort()),
    'ui.action.$defs.capability is exactly the action catalog (an element cannot declare a kind no action has)');
// The product that authorises each kind is fixed by the catalog, not chosen by the element.
const PRODUCT = {
    'robot.drive_pulse': 'bot', 'robot.head_preset': 'bot', 'robot.headlight': 'bot', 'robot.say': 'bot', 'robot.macro': 'bot',
    'chat.message': 'chat', 'chat.pin': 'chat', 'chat.poll': 'chat',
    'screen.alert': 'live', 'screen.animation': 'live', 'screen.confetti': 'live', 'screen.sound': 'live',
    'screen.tts': 'live', 'screen.counter': 'live', 'screen.state': 'live', 'screen.visibility': 'live',
    'screen.scene': 'live', 'stream.clip': 'live', 'stream.moment': 'live', 'stream.title': 'live',
    'stream.category': 'live', 'webhook.call': 'live',
    'ai.ask': 'ai', 'actor.task': 'actor', 'money.tip_goal': 'billing',
};
ok(Object.keys(PRODUCT).length === kinds.length, 'the product map covers every action kind');
for (const v of variants) {
    const kind = v.properties.kind.const;
    ok(v.properties.product.const === PRODUCT[kind], `${kind} is authorised by ${PRODUCT[kind]}`);
}

// ── The trigger catalog is one list ──────────────────────────────────────
const triggers = contracts.schema('ui.trigger@1').oneOf;
const triggerKinds = triggers.map((v) => v.properties.kind.const);
ok(new Set(triggerKinds).size === triggerKinds.length, 'every trigger kind appears once');
ok(triggerKinds.includes('press') && triggerKinds.includes('chat_command'),
    'stage 1\'s triggers (press, chat_command) are in the catalog');

// ── An element's recipe may only use what it declared ────────────────────
// JSON Schema can compare a capability with an action only inside one document; this is the
// cross-field rule openvibe-sdk/elements' validate() enforces too, checked here on the fixtures.
for (const f of fs.readdirSync(path.join(ROOT, 'fixtures/ui.element/valid')).filter((x) => x.endsWith('.json'))) {
    const el = fixture('ui.element', 'valid', f);
    const declared = new Set(el.capabilities);
    for (const a of el.recipe.actions) ok(declared.has(a.kind), `${f}: ${a.kind} is declared`);
    if (el.mod && el.mod.capabilities) for (const c of el.mod.capabilities) ok(declared.has(c), `${f}: the mod may request only ${c} if the element declared it`);
    const text = JSON.stringify(el);
    ok(!/https?:\/\/|<[a-z!/]/i.test(text), `${f}: an element carries no URL or markup`);
    const state = el.initial_state || {};
    for (const [k, v] of Object.entries(state)) {
        ok(/^[a-z][a-z0-9_]{0,31}$/.test(k), `${f}: state key ${k} is lower-case`);
        ok(v === null || typeof v !== 'object' || Array.isArray(v), `${f}: state ${k} is a value, not an object`);
    }
}

// ── The store is state, not data that can run ────────────────────────────
const state = contracts.schema('ui.element-state@1');
ok(!contracts.validate('ui.element-state@1', { channel: 'ada', element_id: 'el_01JAB2C3D4E5F6G7H8J9K0MNPQ', revision: 0, values: { wheel: { a: 1 } }, updated_at: '2026-11-11T20:00:00.000Z' }).valid,
    'a state value may not be an object');
ok(!contracts.validate('ui.element-state@1', { channel: 'ada', element_id: 'el_01JAB2C3D4E5F6G7H8J9K0MNPQ', revision: 0, values: { ok: 'x'.repeat(201) }, updated_at: '2026-11-11T20:00:00.000Z' }).valid,
    'a state string is at most 200 characters (the product content-checks the text it shows)');
ok(state.properties.values.$ref === '#/$defs/values', 'ui.element-state@1 values are the shared values definition');

// ── The events carry the public facts only ───────────────────────────────
const pressed = contracts.schema('live.element.pressed@1');
for (const k of ['channel', 'element_id', 'element_name', 'presser', 'presser_name', 'trigger', 'at']) {
    ok(pressed.required.includes(k), `live.element.pressed carries ${k}`);
}
ok(!('email' in pressed.properties) && !('ip' in pressed.properties) && !('balance' in pressed.properties),
    'live.element.pressed carries no private account data');
const changed = contracts.schema('live.element.state@1');
ok(JSON.stringify(changed.required) === JSON.stringify(['channel', 'element_id', 'revision', 'values', 'updated_at']),
    'live.element.state names the store and its revision');
for (const id of ['live.element.pressed', 'live.element.state']) {
    const entry = contracts.catalog.find((c) => c.id === id);
    ok(entry && entry.owner === 'live', `${id} is owned by Live`);
}

console.log(`elements: ${n} checks passed`);
