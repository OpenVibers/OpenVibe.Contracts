#!/usr/bin/env node
'use strict';
/**
 * Contract check for a consuming service, run in that service's CI:
 *
 *   npx openvibe-contracts-check --service network --src server [--src lib]
 *
 * Fails when
 *   - the installed openvibe-contracts version is outside the service manifest's contractRanges
 *   - the code guards a capability (requireCapability('x') / guard('x') / capabilities.check(.., 'x') /
 *     { capability: 'x' } route options)
 *     that the contracts don't define, that is retired, or that another service owns
 *   - the code validates against a contract id (validate('x') / assertValid('x')) that doesn't exist
 * Prints what it checked so a green run says something.
 */
const fs = require('fs');
const path = require('path');
const contracts = require('..');
const pkg = require('../package.json');

const args = process.argv.slice(2);
const opt = (name) => { const out = []; args.forEach((a, i) => { if (a === `--${name}`) out.push(args[i + 1]); }); return out; };
const service = opt('service')[0];
const srcDirs = opt('src').length ? opt('src') : ['server'];
if (!service) { console.error('usage: openvibe-contracts-check --service <id> [--src <dir>]...'); process.exit(2); }

const problems = [];
const manifest = contracts.services.get(service);
if (!manifest) problems.push(`no service manifest "${service}" in openvibe-contracts ${pkg.version}`);

// ^x.y.z / >=x.y.z <a.b.c, the only range forms the manifests use.
function satisfies(version, range) {
    const v = version.split('.').map(Number);
    const cmp = (a, b) => { for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; };
    return String(range).split('||').some(alt => alt.trim().split(/\s+/).every(part => {
        const m = part.match(/^(\^|>=|<=|>|<|=)?(\d+)\.(\d+)\.(\d+)$/);
        if (!m) return false;
        const r = [Number(m[2]), Number(m[3]), Number(m[4])];
        const c = cmp(v, r);
        switch (m[1]) {
            case '^': return c >= 0 && (r[0] > 0 ? v[0] === r[0] : v[1] === r[1]);
            case '>=': return c >= 0; case '<=': return c <= 0; case '>': return c > 0; case '<': return c < 0;
            default: return c === 0;
        }
    }));
}
const range = manifest && manifest.contractRanges && manifest.contractRanges['openvibe-contracts'];
if (manifest && range && !satisfies(pkg.version, range)) problems.push(`installed openvibe-contracts ${pkg.version} is outside the manifest range ${range}`);

const files = [];
for (const d of srcDirs) (function walk(dir) {
    let ents; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { problems.push(`--src ${dir} does not exist`); return; }
    for (const e of ents) {
        if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p); else if (/\.[cm]?[jt]s$/.test(e.name) && !/\.(test|spec)\.[cm]?[jt]s$/.test(e.name)) files.push(p);   // tests mint tokens for other owners on purpose
    }
})(d);

const CAP_RE = /\b(?:requireCapability|guard)\(\s*['"]([a-z][a-z0-9_.]+)['"]|capabilities\.check\([^,]+,\s*['"]([a-z][a-z0-9_.]+)['"]|\bcapability:\s*['"]([a-z][a-z0-9_.]+)['"]/g;
const CONTRACT_RE = /\b(?:validate|assertValid)\(\s*['"]([a-z][a-z0-9-]*\.[a-z0-9-]+(?:@\d+)?)['"]/g;
const used = new Map();
const refs = new Map();
for (const f of files) {
    const text = fs.readFileSync(f, 'utf8');
    let m;
    while ((m = CAP_RE.exec(text))) { const id = m[1] || m[2] || m[3]; (used.get(id) || used.set(id, []).get(id)).push(path.relative(process.cwd(), f)); }
    while ((m = CONTRACT_RE.exec(text))) { (refs.get(m[1]) || refs.set(m[1], []).get(m[1])).push(path.relative(process.cwd(), f)); }
}
for (const [id, where] of used) {
    const cap = contracts.capabilities.get(id);
    if (!cap) problems.push(`${where[0]}: capability ${id} is not defined in openvibe-contracts ${pkg.version}`);
    else if (cap.status === 'retired') problems.push(`${where[0]}: capability ${id} is retired`);
    else if (cap.owner !== service) problems.push(`${where[0]}: capability ${id} is owned by ${cap.owner}, not ${service}`);
    else if (manifest && !manifest.capabilities.includes(id)) problems.push(`${where[0]}: ${id} is enforced here but missing from the ${service} manifest`);
}
for (const [ref, where] of refs) {
    try { contracts.resolve(ref); } catch (e) { problems.push(`${where[0]}: ${e.message}`); }
}

console.log(`openvibe-contracts-check ${service}: contracts ${pkg.version}${range ? ` (manifest wants ${range})` : ''}, ${files.length} files, ` +
    `${used.size} capabilities enforced [${[...used.keys()].sort().join(', ')}], ${refs.size} contract ids validated [${[...refs.keys()].sort().join(', ')}]`);
if (problems.length) { console.error(`  ${problems.length} problem(s):\n  - ${problems.join('\n  - ')}`); process.exit(1); }
console.log('  ok');
