'use strict';
// The system map (0.443.0; the owner, 2026-11-16: agents should know "all the different repositories and how they're
// interconnected … the SDK and API … which repositories it needs"): built from the manifests, every service and
// library on it, the repositories a task needs picked with reasons, and the brief an agent reads first.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const contracts = require('..');
const { systemMap, reposFor, markdown } = contracts.systemMap;

const map = systemMap();
const ids = fs.readdirSync(path.join(__dirname, '..', 'manifests', 'services')).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''));
assert.deepStrictEqual(map.services.map((s) => s.id).sort(), ids.sort(), 'every service manifest is on the map');
for (const l of ['OpenVibe.Shared', 'OpenVibe.SDK', 'OpenVibe.Contracts']) assert.ok(map.repositories.some((r) => r.name === l && r.kind === 'library'), `${l} is a library`);
assert.strictEqual(new Set(map.repositories.map((r) => r.repository)).size, map.repositories.length, 'one row per repository');
assert.ok(map.services.every((s) => !('internalOrigin' in s)), 'no internal origins unless asked');
assert.ok(systemMap({ internal: true }).services.some((s) => s.internalOrigin), 'internal origins when asked');
// Domains are the deployed ones (service manifests), never a repository manifest's wish list.
const deployed = new Set(map.services.flatMap((s) => s.domains));
const listed = new Set(JSON.parse(JSON.stringify(map)).services.flatMap((s) => s.domains));
assert.deepStrictEqual([...listed].sort(), [...deployed].sort());

// The owner's own asks of 11-16, each with the repository that owns the fix first.
const first = (task) => reposFor(task, { limit: 4 }).picks[0];
const has = (task, name) => reposFor(task, { limit: 4 }).picks.some((p) => p.name === name);
assert.strictEqual(first('the search box in the menu shows its label twice').name, 'OpenVibe.Shared');
assert.strictEqual(first('owner rank should be able to use more tokens per day').name, 'OpenVibe.Network');
assert.ok(has('owner rank should be able to use more tokens per day', 'OpenVibe.AI'), 'the allowance is AI\'s');
assert.strictEqual(first('sign in to claude code from openvibe.codes on my machine').name, 'OpenVibe.Codes');
assert.ok(has('notifications show under deals and agents tabs at once', 'OpenVibe.Network'), 'notifications are Network\'s');
assert.ok(has('notifications show under deals and agents tabs at once', 'OpenVibe.Shared'), 'their tabs are drawn by Shared');
assert.ok(has('go live in your browser: the camera switch to the back lens fails', 'OpenVibe.Live'));
assert.strictEqual(first('the rocket icon sucks, make openvibe.design tools more powerful').name, 'OpenVibe.Design');
assert.strictEqual(first('Actor shows its bookkeeping as thoughts').name, 'OpenVibe.Actor');
assert.ok(has('a shared node on Link runs the job', 'OpenVibe.Link'), 'Link, though it has no service manifest');
const pick = first('the search box in the menu shows its label twice');
assert.ok(pick.why.length && pick.why.every((w) => typeof w === 'string'), 'each pick says why');
assert.deepStrictEqual(reposFor('', { limit: 3 }).picks, [], 'no task, no picks');

// The brief: the picks with reasons, how it fits, the libraries, every service.
const md = markdown('the search box in the menu shows its label twice');
assert.match(md, /^# OpenVibe: the map for this task/);
assert.match(md, /## The repositories this task likely needs\n\n- \*\*OpenVibe\.Shared\*\*/);
assert.match(md, /\*\*Sign-in:\*\* OpenVibe\.Network/);
assert.match(md, /`openvibe-sdk`/);
for (const id of ids) assert.ok(md.includes(`| ${id} | `), `the brief lists ${id}`);
assert.ok(!/127\.0\.0\.1/.test(md), 'no internal origins in the brief');
assert.ok(md.length < 40000, `the brief stays short (${md.length})`);
console.log(`system-map: ${map.services.length} services, ${map.repositories.length} repositories; a task's repositories picked with reasons`);
