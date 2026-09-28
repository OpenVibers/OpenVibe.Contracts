#!/usr/bin/env node
'use strict';
/**
 * Documentation currency (roadmap WS-U task 3): every service repository's README states what the ecosystem needs to
 * know about it, and its STATUS.json matches the code in the same release.
 *
 *   node scripts/docs-currency.js <root>            # <root> holds the checkouts (e.g. ~/OpenVibers); report + exit 1 on gaps
 *   node scripts/docs-currency.js <root> --json     # the same as JSON
 *   node scripts/docs-currency.js <root> --only search,live
 *
 * The services are manifests/services/*.json (their `repository`, e.g. OpenVibers/OpenVibe.Search, is looked up as
 * <root>/OpenVibe.Search). For each checkout:
 *
 *   README.md has a level-2 heading for each of: Purpose, Owns, Does not own, Depends on, Capabilities or Grants,
 *   Acceptance (or Tests), Security, Deploy (or Deployment, Running it in production). "What works" is read from
 *   STATUS.json's features. A heading counts when it starts with the word (## Owns, ## Owns and serves …).
 *
 *   STATUS.json exists and has repository (matching the manifest), stage, deployed, contracts, features and updated;
 *   `contracts` names the openvibe-contracts tag package.json pins; `updated` is no older than the newest commit that
 *   touched package.json's pins (so a bump without a STATUS refresh is caught): checked by the date only.
 *
 * Nothing is fetched and nothing is written; git is read locally (log -1 on package.json).
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REQUIRED = [
    ['purpose', /^purpose\b|^what (it|this) is\b/i],
    ['owns', /^owns\b/i],
    ['does not own', /^does not own\b|^doesn't own\b/i],
    ['depends on', /^depends on\b|^dependencies\b/i],
    ['capabilities', /^capabilities\b|^grants\b|^principal\b/i],
    ['acceptance', /^acceptance\b|^tests?\b|^testing\b/i],
    ['security', /^security\b/i],
    ['deploy', /^deploy|^deployment\b|^running it in production\b|^production\b/i],
];
const STATUS_FIELDS = ['repository', 'stage', 'deployed', 'contracts', 'features', 'updated'];

function headings(readme) {
    return readme.split('\n').filter((l) => /^##\s+/.test(l)).map((l) => l.replace(/^##\s+/, '').replace(/[`*_]/g, '').trim());
}

function contractsPin(pkg) {
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}), ...(pkg.peerDependencies || {}) };
    const spec = deps['openvibe-contracts'];
    if (!spec) return null;
    const m = /refs\/tags\/(v\d+\.\d+\.\d+)/.exec(spec) || /^\^?~?(\d+\.\d+\.\d+)$/.exec(spec);
    return m ? (m[1].startsWith('v') ? m[1] : `v${m[1]}`) : spec;
}

function lastPinChange(dir) {
    try {
        const out = execFileSync('git', ['-C', dir, 'log', '-1', '--format=%cI', '--', 'package.json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
        return out ? out.slice(0, 10) : null;
    } catch { return null; }
}

function checkRepo(root, manifest) {
    const name = String(manifest.repository || '').split('/').pop();
    const dir = path.join(root, name);
    const gaps = [];
    if (!name || !fs.existsSync(dir)) return { id: manifest.id, repository: manifest.repository, missing: true, gaps: ['no checkout under the root'] };
    const readmePath = path.join(dir, 'README.md');
    if (!fs.existsSync(readmePath)) gaps.push('README.md missing');
    else {
        const hs = headings(fs.readFileSync(readmePath, 'utf8'));
        for (const [label, re] of REQUIRED) if (!hs.some((h) => re.test(h))) gaps.push(`README: no "## ${label[0].toUpperCase()}${label.slice(1)}" section`);
    }
    const statusPath = path.join(dir, 'STATUS.json');
    let status = null;
    if (!fs.existsSync(statusPath)) gaps.push('STATUS.json missing');
    else {
        try { status = JSON.parse(fs.readFileSync(statusPath, 'utf8')); } catch { gaps.push('STATUS.json is not JSON'); }
    }
    if (status) {
        for (const f of STATUS_FIELDS) if (status[f] === undefined) gaps.push(`STATUS.json: no "${f}"`);
        if (status.repository && manifest.repository && status.repository !== manifest.repository) gaps.push(`STATUS.json: repository ${status.repository}, the manifest says ${manifest.repository}`);
        let pkg = null;
        try { pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')); } catch { /* no package.json (a docs or static repo) */ }
        const pin = pkg ? contractsPin(pkg) : null;
        if (pin && status.contracts && !String(status.contracts).includes(pin)) gaps.push(`STATUS.json: contracts "${status.contracts}", package.json pins ${pin}`);
        const changed = lastPinChange(dir);
        if (changed && status.updated && String(status.updated).slice(0, 10) < changed) gaps.push(`STATUS.json: updated ${status.updated}, package.json changed ${changed}`);
    }
    return { id: manifest.id, repository: manifest.repository, gaps };
}

function main(argv) {
    const root = argv.find((a) => !a.startsWith('--'));
    if (!root) { console.error('usage: docs-currency.js <root with the checkouts> [--json] [--only id,id]'); process.exit(2); }
    const onlyArg = argv.indexOf('--only');
    const only = onlyArg >= 0 ? new Set(String(argv[onlyArg + 1] || '').split(',').filter(Boolean)) : null;
    const dir = path.join(__dirname, '..', 'manifests', 'services');
    const manifests = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')))
        .filter((m) => !only || only.has(m.id)).sort((a, b) => a.id.localeCompare(b.id));
    const results = manifests.map((m) => checkRepo(path.resolve(root), m));
    if (argv.includes('--json')) console.log(JSON.stringify(results, null, 2));
    else {
        for (const r of results) console.log(`${r.gaps.length ? '✗' : '✓'} ${r.id.padEnd(12)} ${r.gaps.length ? r.gaps.join('; ') : 'current'}`);
        const bad = results.filter((r) => r.gaps.length).length;
        console.log(`${results.length - bad}/${results.length} current`);
    }
    process.exit(results.some((r) => r.gaps.length) ? 1 : 0);
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { checkRepo, headings, contractsPin, REQUIRED, STATUS_FIELDS };
