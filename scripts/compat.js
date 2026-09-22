#!/usr/bin/env node
'use strict';
/**
 * Backward-compatibility gate: compares every contract with the same file at the previous release
 * tag (or the ref given as argv[2]) and fails on changes that would break an existing producer or
 * consumer of the same major version:
 *   - a property removed, or its type changed
 *   - a property newly required
 *   - an enum/const value removed
 *   - additionalProperties tightened to false
 *   - a catalog entry removed without a deprecation record
 * A breaking change belongs in a new major (<name>.v2.json) with the old file deprecated.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const git = (...a) => { try { return execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; } };
const base = process.argv[2] || git('describe', '--tags', '--abbrev=0', 'HEAD^');
if (!base) { console.log('compat: no previous release tag, nothing to compare'); process.exit(0); }

const readAt = (ref, rel) => { const s = git('show', `${ref}:${rel}`); return s ? JSON.parse(s) : null; };
const problems = [];

function compare(id, a, b, at) {
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return;
    const ta = JSON.stringify(a.type), tb = JSON.stringify(b.type);
    if (a.type !== undefined && ta !== tb) problems.push(`${id} ${at}: type ${ta} -> ${tb}`);
    for (const k of ['enum']) if (Array.isArray(a[k])) for (const v of a[k]) if (!(b[k] || []).includes(v)) problems.push(`${id} ${at}: enum value ${JSON.stringify(v)} removed`);
    if ('const' in a && JSON.stringify(a.const) !== JSON.stringify(b.const)) problems.push(`${id} ${at}: const changed`);
    if (a.additionalProperties !== false && b.additionalProperties === false) problems.push(`${id} ${at}: additionalProperties tightened`);
    for (const r of b.required || []) if (!(a.required || []).includes(r)) problems.push(`${id} ${at}: "${r}" newly required`);
    for (const [k, v] of Object.entries(a.properties || {})) {
        if (!(b.properties || {})[k]) problems.push(`${id} ${at}: property "${k}" removed`);
        else compare(id, v, b.properties[k], `${at}.${k}`);
    }
    if (a.items && b.items) compare(id, a.items, b.items, `${at}[]`);
    (a.oneOf || []).forEach((s, i) => compare(id, s, (b.oneOf || [])[i], `${at}|${i}`));
}

const oldCat = readAt(base, 'contracts/catalog.json');
const newCat = JSON.parse(fs.readFileSync(path.join(ROOT, 'contracts/catalog.json'), 'utf8'));
const deprecated = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, 'compatibility/deprecations.json'), 'utf8')).deprecations.map(d => d.id));
for (const entry of (oldCat ? oldCat.contracts : [])) {
    const now = newCat.contracts.find(c => c.id === entry.id);
    if (!now) { if (!deprecated.has(entry.id)) problems.push(`${entry.id}: removed from the catalog without a deprecation`); continue; }
    if (now.schema !== entry.schema) continue;  // new major file; old one must still be listed separately
    compare(entry.id, readAt(base, `contracts/${entry.schema}`), JSON.parse(fs.readFileSync(path.join(ROOT, 'contracts', entry.schema), 'utf8')), '');
}
if (problems.length) { console.error(`compat vs ${base}: ${problems.length} breaking change(s)\n  ${problems.join('\n  ')}`); process.exit(1); }
console.log(`compat vs ${base}: no breaking changes`);
