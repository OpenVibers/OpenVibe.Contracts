'use strict';
// The machines hub (plan L34, steps M2 and M4): a person's machines are the network's, Bot stays the registry
// underneath, and a machine's roles come from a catalogue a product declares in its own manifest. The schemas
// carry the shapes; the rules they cannot say are checked here: one catalogue, one id shape everywhere, and a
// role a product declared is always a role the hub accepts.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const c = require('..');

const ROOT = path.join(__dirname, '..');
const schema = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'contracts', f), 'utf8'));
const manifest = (id) => JSON.parse(fs.readFileSync(path.join(ROOT, 'manifests', 'services', `${id}.json`), 'utf8'));
const cap = (id) => JSON.parse(fs.readFileSync(path.join(ROOT, 'manifests', 'capabilities', `${id}.json`), 'utf8'));

const ROLES = {
    'codes.worker': 'codes',
    'desks.host': 'run',
    'ai.host': 'ai',
    'bot.robot': 'bot',
};

// One catalogue: every product that declares a role declares it once, and nobody declares another's.
const declared = new Map();
for (const m of c.services.manifests) {
    for (const role of m.machineRoles || []) {
        assert.ok(!declared.has(role.id), `${role.id} is declared once (${m.id} and ${declared.get(role.id)})`);
        declared.set(role.id, m.id);
        assert.ok(role.name && role.installs && role.shows, `${role.id} says what it is, what it installs and what it shows`);
    }
}
assert.deepStrictEqual(Object.keys(ROLES).sort(), [...declared.keys()].sort(), 'the catalogue holds the four first roles');
for (const [id, owner] of Object.entries(ROLES)) assert.strictEqual(declared.get(id), owner, `${id} is ${owner}'s role`);

// One id shape everywhere: a machine, the catalogue and a request all name a role the same way.
const machine = schema('network/machine.v1.json');
const role = schema('network/machine-role.v1.json');
const roles = schema('network/machine-roles.v1.json');
const put = schema('network/machine-roles-put.v1.json');
const pattern = role.properties.id.pattern;
assert.strictEqual(machine.properties.roles.items.pattern, pattern, 'a machine names its roles the same way');
assert.strictEqual(put.properties.roles.items.pattern, pattern, 'a request names its roles the same way');
for (const id of Object.keys(ROLES)) {
    assert.ok(new RegExp(pattern).test(id), `${id} is a role id`);
    assert.ok(c.validate('network.machine-role@1', { id, name: 'x', installs: 'y', shows: 'z' }).valid, `${id} is a role`);
}

// The catalogue answers with the roles, and only with them.
const catalogue = { roles: [...declared.keys()].map((id) => ({ id, name: 'x', installs: 'y', shows: 'z' })) };
assert.ok(c.validate('network.machine-roles@1', catalogue).valid, 'the catalogue answers with its roles');
assert.ok(!c.validate('network.machine-roles@1', { roles: [] }).valid, 'an empty catalogue is no catalogue');
assert.ok(!c.validate('network.machine-roles-put@1', { roles: ['not-a-role'] }).valid, 'a request names roles that exist as ids');

// A machine is a machine: an id, a kind, whether it is online, its roles and what it does now.
for (const k of ['id', 'kind', 'online', 'roles', 'running']) assert.ok(machine.required.includes(k), `network.machine@1 needs ${k}`);
assert.deepStrictEqual(machine.properties.running.items.properties.kind.enum, ['codes.jobs', 'desks', 'models', 'robots'],
    'a machine says what it does now: its jobs, its desks, its models and its robots');
assert.strictEqual(machine.additionalProperties, false, 'a machine carries nothing else');

// A pairing is a code, an expiry and the command to run; the code is shown once.
for (const k of ['code', 'expires_at', 'installer']) assert.ok(schema('network/machine-pairing.v1.json').required.includes(k), `the pairing needs ${k}`);

// The capabilities: the hub's two are public (an app may hold them with the person's consent), Bot's is not.
assert.strictEqual(cap('network.machines.read').visibility, 'public');
assert.strictEqual(cap('network.machines.read').owner, 'network');
assert.strictEqual(cap('network.machines.manage').visibility, 'public');
assert.strictEqual(cap('network.machines.manage').owner, 'network');
assert.strictEqual(cap('network.machines.manage').sensitive, true, 'revoking a machine is an act with an effect outside');
assert.strictEqual(cap('bot.machine.manage').visibility, 'first-party');
assert.strictEqual(cap('bot.machine.manage').owner, 'bot');

// The manifests say who serves what.
const network = manifest('network');
assert.ok(network.capabilities.includes('network.machines.read') && network.capabilities.includes('network.machines.manage'));
for (const e of ['network.machine.online', 'network.machine.offline', 'network.machine.paired', 'network.machine.roles_changed', 'network.machine.revoked']) {
    assert.ok(network.eventsProduced.includes(e), `network produces ${e}`);
}
assert.ok(manifest('bot').capabilities.includes('bot.machine.manage'), 'bot serves bot.machine.manage');

// The fixtures: each valid one validates, each invalid one does not.
for (const id of ['network.machine', 'network.machine-role', 'network.machine-roles', 'network.machine-roles-put', 'network.machine-pairing',
    'network.machine-list-result', 'network.machine-manage-result', 'bot.machine-manage-request', 'bot.machine-manage-result',
    'network.machine.online', 'network.machine.offline', 'network.machine.paired', 'network.machine.roles_changed', 'network.machine.revoked']) {
    for (const kind of ['valid', 'invalid']) {
        for (const f of fs.readdirSync(path.join(ROOT, 'fixtures', id, kind))) {
            const value = JSON.parse(fs.readFileSync(path.join(ROOT, 'fixtures', id, kind, f), 'utf8'));
            const r = c.validate(`${id}@1`, value);
            assert.strictEqual(r.valid, kind === 'valid', `${id} ${kind}/${f}: ${JSON.stringify(r.errors)}`);
        }
    }
}

console.log('network.machine@1: one catalogue, one role id shape, four roles, public hub capabilities, fixtures');
