#!/usr/bin/env node
'use strict';
/**
 * The estate (plan T1 step 3): every repository checked out under the estate root as one machine-readable
 * record, and docs/ESTATE.md as the same records in the plan §1.1 table.
 *
 *   node scripts/estate.js                       # refresh docs/ESTATE.md and manifests/repositories/*.json
 *   node scripts/estate.js <root>                # from another checkout tree (default ~/OpenVibers)
 *   node scripts/estate.js --check               # exit 1 when either generated file is stale
 *   node scripts/estate.js <root> --out <dir>    # write/check under <dir> (tests)
 *
 * A checkout is a directory under the root holding `.git`, `package.json` or `STATUS.json`. For each one:
 *
 *   package.json   version, engines.node and the openvibe-contracts/-sdk/-shared/-publishing pins
 *   STATUS.json    repository, stage, runtime, domain, database, deployed and wave
 *   migrations/    the count and the dialect the SQL declares
 *   this repository's manifests/services|products/*.json   the service or product the checkout is
 *
 * The records are the source of truth for docs/ESTATE.md, so the document is a projection, never edited by
 * hand. `--check` re-reads the checkouts and compares both; when there is no checkout root (CI), it checks
 * docs/ESTATE.md against the committed manifests/repositories and says so. Nothing is fetched.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PIN_NAMES = ['openvibe-contracts', 'openvibe-sdk', 'openvibe-shared', 'openvibe-publishing'];
const MARKERS = ['.git', 'package.json', 'STATUS.json'];
const DASH = '—';

const readText = (file) => { try { return fs.readFileSync(file, 'utf8'); } catch { return ''; } };
const readJson = (file) => { const s = readText(file); if (!s) return null; try { return JSON.parse(s); } catch { return null; } };
const isDir = (p) => { try { return fs.statSync(p).isDirectory(); } catch { return false; } };

/** Every service and product manifest this checkout of Contracts ships, keyed for lookup by repository. */
function manifestIndex() {
    const load = (sub) => {
        const dir = path.join(ROOT, 'manifests', sub);
        if (!isDir(dir)) return [];
        return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()
            .map((f) => readJson(path.join(dir, f))).filter(Boolean);
    };
    return { services: load('services'), products: load('products') };
}

/** The checkout directory a manifest names: its `repository`, else a product's `relationships.plannedRepo`. */
function checkoutOf(manifest) {
    const repo = manifest.repository || (manifest.relationships && manifest.relationships.plannedRepo);
    if (!repo) return null;
    const s = typeof repo === 'string' ? repo : repo.url;
    return s ? String(s).split('/').pop().replace(/\.git$/, '') : null;
}

/** A pin as published: the release tag when it is one, otherwise the range or URL as written. */
function normalizePin(spec) {
    if (!spec) return null;
    const m = /refs\/tags\/(v?\d+\.\d+\.\d+)/.exec(String(spec));
    if (m) return m[1].startsWith('v') ? m[1] : `v${m[1]}`;
    const bare = String(spec).trim();
    return /^[~^]?v?\d+\.\d+\.\d+$/.test(bare) ? (bare.replace(/^[~^]/, '').startsWith('v') ? bare.replace(/^[~^]/, '') : `v${bare.replace(/^[~^]/, '')}`) : bare;
}

function pinsOf(pkg) {
    const out = {};
    if (!pkg) return out;
    const deps = { ...(pkg.dependencies || {}), ...(pkg.peerDependencies || {}), ...(pkg.devDependencies || {}) };
    for (const name of PIN_NAMES) if (deps[name]) out[name] = normalizePin(deps[name]);
    return out;
}

function migrationFiles(dir) {
    const mig = path.join(dir, 'migrations');
    if (!isDir(mig)) return [];
    return fs.readdirSync(mig).filter((f) => /\.(sql|js|cjs|mjs)$/.test(f)).sort();
}

/** The database the checkout runs on: what STATUS.json states, else what migrations/ or the drivers say. */
function databaseOf(dir, status, pkg, exposure) {
    if (status && typeof status.database === 'string' && /^\s*none\b/i.test(status.database)) return 'none';
    if (['library', 'repository', 'retired'].includes(exposure)) return null;
    const text = `${(status && status.database) || ''} ${(status && status.runtime) || ''}`;
    if (/postgres|pglite/i.test(text)) return 'PostgreSQL';
    if (/sqlite/i.test(text)) return 'SQLite';
    const sql = migrationFiles(dir).slice(0, 3).map((f) => readText(path.join(dir, 'migrations', f))).join('\n');
    if (/postgres|plpgsql|jsonb|bigserial|timestamptz/i.test(sql)) return 'PostgreSQL';
    if (/sqlite/i.test(sql)) return 'SQLite';
    const deps = { ...((pkg && pkg.dependencies) || {}), ...((pkg && pkg.devDependencies) || {}) };
    if (deps.pg || deps.postgres || deps['@electric-sql/pglite']) return 'PostgreSQL';
    if (deps['better-sqlite3'] || deps.sqlite3) return 'SQLite';
    return null;
}

/** The domains the checkout serves: its manifest's, then every hostname STATUS.json's prose names. */
function domainsOf(status, manifest) {
    const out = [];
    const add = (d) => { const s = String(d).trim().toLowerCase().replace(/^["']|["']$/g, ''); if (s && !out.includes(s)) out.push(s); };
    if (manifest) for (const d of manifest.domains || []) add(d);
    for (const d of String((status && status.domain) || '').match(/\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/g) || []) add(d);
    return out;
}

/** The openvibe-* release tags a checkout pins: package.json's, filled in from STATUS.json's prose. */
function pinTag(text, name) {
    const m = new RegExp(`${name.replace(/[.]/g, '\\.')}\\s+(v?\\d+\\.\\d+\\.\\d+)`).exec(String(text || ''));
    return m ? (m[1].startsWith('v') ? m[1] : `v${m[1]}`) : null;
}

function estatePins(pkg, status) {
    const pins = pinsOf(pkg);
    if (status) for (const name of PIN_NAMES) if (!pins[name]) {
        const tag = pinTag(`${status.contracts || ''} ${status.sdk || ''}`, name);
        if (tag) pins[name] = tag;
    }
    return pins;
}

/** One record for one checkout. Every field is present; a null means no source states it. */
function recordFor(name, dir, index) {
    const pkg = readJson(path.join(dir, 'package.json'));
    const status = readJson(path.join(dir, 'STATUS.json'));
    const service = index.services.find((m) => checkoutOf(m) === name) || null;
    const product = !service && index.products.find((m) => checkoutOf(m) === name || m.name === name) || null;
    const manifest = service || product;
    const exposure = service ? (service.exposure && service.exposure.state) || null : (product ? 'product' : null);
    const runtime = status && typeof status.runtime === 'string' && status.runtime.trim()
        ? status.runtime.split(/[,;]/)[0].trim()
        : (pkg && pkg.engines && pkg.engines.node ? `node ${pkg.engines.node}` : null);
    const repository = (status && status.repository) || (pkg && (typeof pkg.repository === 'string' ? pkg.repository : pkg.repository && pkg.repository.url)) || null;
    return {
        name,
        repository: repository ? String(repository).replace(/^git\+/, '').replace(/\.git$/, '') : null,
        service: service ? service.id : null,
        product: service ? ((service.site && service.site.name) || service.name) : (product ? product.name : (status && status.product) || null),
        stage: (status && status.stage) || null,
        version: (pkg && pkg.version) || null,
        runtime,
        database: databaseOf(dir, status, pkg, exposure),
        migrations: migrationFiles(dir).length,
        authority: service ? ((service.namespacesOwned || []).length ? service.namespacesOwned.slice() : [service.id]) : [],
        domains: domainsOf(status, manifest),
        pins: estatePins(pkg, status),
        deployed: status ? (status.deployed === undefined ? null : status.deployed) : null,
        exposure,
        track: (status && status.wave) || null,
    };
}

/** Every checkout under the root, sorted by name. */
function checkouts(root) {
    return fs.readdirSync(root, { withFileTypes: true })
        .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
        .map((e) => e.name)
        .filter((n) => MARKERS.some((m) => fs.existsSync(path.join(root, n, m))))
        .sort();
}

function buildRows(root) {
    const index = manifestIndex();
    return checkouts(root).map((n) => recordFor(n, path.join(root, n), index));
}

function readRows(out) {
    const dir = path.join(out, 'manifests', 'repositories');
    if (!isDir(dir)) return null;
    return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()
        .map((f) => readJson(path.join(dir, f))).filter(Boolean);
}

const cell = (v) => String(v === null || v === undefined || v === '' ? DASH : v).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
const list = (v) => (v && v.length ? v.join(', ') : DASH);
const pinText = (pins) => [['openvibe-contracts', 'contracts'], ['openvibe-sdk', 'sdk'], ['openvibe-shared', 'shared'], ['openvibe-publishing', 'publishing']]
    .filter(([n]) => pins && pins[n]).map(([n, label]) => `${label} ${pins[n]}`).join(', ') || DASH;
const deployText = (d) => (d === true ? 'deployed' : d === false ? 'not deployed' : d == null ? DASH : String(d));

/** docs/ESTATE.md: the records as the plan §1.1 table. */
function renderDoc(rows) {
    const head = [
        '# The estate',
        '',
        'Generated by `scripts/estate.js` from the repositories checked out under the estate root (default `~/OpenVibers`): each',
        "checkout's `package.json` pins, `STATUS.json`, `migrations/`, and this repository's `manifests/services/` and",
        '`manifests/products/`. Data only. Refresh with `npm run estate`; `node scripts/estate.js --check` fails on drift.',
        '',
        `\`${DASH}\` means the sources do not state it. **Authority it owns** is the service manifest's \`namespacesOwned\` (or the`,
        'service id); **Runtime** is `STATUS.json.runtime`; **Database** is inferred from `STATUS.json`, `migrations/` and',
        '`package.json`; **Deployment** is `STATUS.json.deployed`; **Public/private** is the manifest `exposure.state`;',
        '**Current track** is `STATUS.json.wave`.',
        '',
        '| Repository | Product | Authority it owns | Runtime | Database | Domain | SDK/Contracts pin | Deployment | Public/private | Current track |',
        '|---|---|---|---|---|---|---|---|---|---|',
    ];
    const body = rows.map((r) => `| ${cell(r.name)} | ${cell(r.product)} | ${cell(list(r.authority))} | ${cell(r.runtime)} | ${cell(r.database)} | ${cell(list(r.domains))} | ${cell(pinText(r.pins))} | ${cell(deployText(r.deployed))} | ${cell(r.exposure)} | ${cell(r.track)} |`);
    return `${head.concat(body).join('\n')}\n`;
}

const manifestString = (record) => `${JSON.stringify(record, null, 2)}\n`;

function parseArgs(argv) {
    const opts = { check: false, root: null, out: null };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--check') opts.check = true;
        else if (a === '--out') opts.out = argv[++i] || null;
        else if (a === '--root') opts.root = argv[++i] || null;
        else if (!a.startsWith('-') && !opts.root) opts.root = a;
    }
    return opts;
}

function main(argv) {
    const opts = parseArgs(argv);
    const root = opts.root || process.env.OPENVIBE_ESTATE_ROOT || path.join(os.homedir(), 'OpenVibers');
    const out = opts.out ? path.resolve(opts.out) : ROOT;
    let rows;
    let fromManifests = false;
    if (isDir(root)) rows = buildRows(root);
    else if (opts.check) {
        rows = readRows(out);
        if (!rows) { console.log(`estate: skipped (no checkout root at ${root} and no manifests/repositories/)`); process.exit(0); }
        fromManifests = true;
    } else {
        console.log(`estate: skipped (no checkout root at ${root})`);
        process.exit(0);
    }
    const doc = renderDoc(rows);
    const files = new Map(rows.map((r) => [`${r.name}.json`, manifestString(r)]));
    const docRel = path.join('docs', 'ESTATE.md');

    if (opts.check) {
        const drift = [];
        if (!fromManifests) {
            const dir = path.join(out, 'manifests', 'repositories');
            const disk = isDir(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')) : [];
            for (const [f, s] of files) if (readText(path.join(dir, f)) !== s) drift.push(path.join('manifests', 'repositories', f));
            for (const f of disk) if (!files.has(f)) drift.push(path.join('manifests', 'repositories', f));
        }
        if (readText(path.join(out, docRel)) !== doc) drift.push(docRel);
        if (drift.length) {
            for (const p of drift) console.error(`estate drift: ${p} is stale (run npm run estate)`);
            console.error(`estate drift: ${drift.length} file(s) out of date`);
            process.exit(1);
        }
        console.log(`estate: current${fromManifests ? ` (docs checked against manifests/repositories; no checkout root at ${root})` : ''}`);
        process.exit(0);
    }

    const dir = path.join(out, 'manifests', 'repositories');
    fs.mkdirSync(dir, { recursive: true });
    for (const f of fs.readdirSync(dir)) if (f.endsWith('.json') && !files.has(f)) fs.rmSync(path.join(dir, f));
    for (const [f, s] of files) fs.writeFileSync(path.join(dir, f), s);
    fs.mkdirSync(path.join(out, 'docs'), { recursive: true });
    fs.writeFileSync(path.join(out, docRel), doc);
    console.log(`estate: ${rows.length} repositories; docs/ESTATE.md and manifests/repositories/ written`);
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { buildRows, checkouts, renderDoc, recordFor, manifestIndex, normalizePin, databaseOf, pinsOf, estatePins, domainsOf, parseArgs };
