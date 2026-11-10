'use strict';
// The owner's regrouping (2026-11-10, plan ask 274): every site manifest names one of the eight current groups, and
// no group carries more than seven tiles. The three merged sections keep the group they appear in, but have no tile:
// Media is Video's API (watch), Homes is Rent's for-sale search (shop, no manifest of its own) and Bench is Report's
// AI section (read); Play is Games' game-services API (play). Network's frame/sites.js GROUPS is the list itself.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const GROUPS = ['watch', 'talk', 'play', 'read', 'shop', 'tools', 'make', 'build'];
const MERGED = new Set(['media', 'bench', 'play']);
const DIR = path.join(__dirname, '..', 'manifests/services');
const sites = fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).map((f) => {
    const m = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
    return m.site ? { id: f.replace(/\.json$/, ''), site: m.site } : null;
}).filter(Boolean);

assert.ok(sites.length >= 50, `every site manifest has a site block (${sites.length})`);
const ids = new Set();
for (const { id, site } of sites) {
    assert.ok(!ids.has(site.icon), `${id}: icon ${site.icon} is a unique site id`);
    ids.add(site.icon);
    assert.ok(GROUPS.includes(site.neighbourhood), `${id}: neighbourhood ${site.neighbourhood} is one of the eight current groups`);
}
for (const g of GROUPS) {
    const tiles = sites.filter(({ id, site }) => site.neighbourhood === g && !MERGED.has(id));
    assert.ok(tiles.length > 0, `${g}: at least one tile`);
    assert.ok(tiles.length <= 7, `${g}: ${tiles.length} tiles, at most seven (${tiles.map((x) => x.id).join(', ')})`);
}
for (const id of MERGED) assert.ok(sites.some((s) => s.id === id), `${id}: the merged entry still names its group`);
console.log(`site neighbourhoods: ${sites.length} manifests in ${GROUPS.length} groups, merged sections listed, at most seven tiles a group`);
