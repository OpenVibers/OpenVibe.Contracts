'use strict';
// Capability schemas (roadmap WS-C task 4): every active capability names an input and an output
// schema that resolve in the catalog, except the recorded gaps in compatibility/capability-schema-gaps.json,
// a list that only shrinks: a new active capability without schemas fails, and so does a listed gap that
// has been filled (take it off the list).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { schema } = require('..');

const ROOT = path.join(__dirname, '..');
const dir = path.join(ROOT, 'manifests', 'capabilities');
const gaps = new Map(JSON.parse(fs.readFileSync(path.join(ROOT, 'compatibility', 'capability-schema-gaps.json'), 'utf8')).gaps.map((g) => [g.id, g.missing]));
const problems = [];
let active = 0, complete = 0;
for (const f of fs.readdirSync(dir).sort()) {
    const c = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    if (c.status !== 'active') continue;
    active++;
    const missing = ['inputSchema', 'outputSchema'].filter((k) => !c[k]);
    for (const k of ['inputSchema', 'outputSchema']) {
        if (c[k] && !schema(c[k])) problems.push(`${c.id}: ${k} ${c[k]} is not in the catalog`);
    }
    const listed = gaps.get(c.id);
    if (!missing.length) { complete++; if (listed) problems.push(`${c.id}: has both schemas now — remove it from capability-schema-gaps.json`); continue; }
    if (!listed) problems.push(`${c.id}: active without ${missing.join(' and ')} (add the schema, or record the gap)`);
    else if (missing.some((k) => !listed.includes(k))) problems.push(`${c.id}: lost its ${missing.filter((k) => !listed.includes(k)).join(', ')}`);
}
for (const id of gaps.keys()) if (!fs.existsSync(path.join(dir, `${id}.json`))) problems.push(`${id}: listed as a gap but no such capability`);
assert.deepStrictEqual(problems, []);
console.log(`capability schemas: ${complete}/${active} active capabilities complete; ${gaps.size} recorded gap(s)`);
