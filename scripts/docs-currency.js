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
 * <root>/OpenVibe.Search). A manifest with status "placeholder" is one the roadmap has named but not built, so an
 * absent checkout is skipped (not a gap); a placeholder that does have a checkout is checked like any other. A
 * "retired" service (Sites, 2026-10-14) has no running code to document and is skipped too. For
 * each checkout:
 *
 *   README.md has a level-2 heading for each of: Purpose, Owns, Does not own, Depends on, Capabilities or Grants,
 *   Acceptance (or Tests), Security, Deploy (or Deployment, Running it in production). "What works" is read from
 *   STATUS.json's features. A heading counts when it starts with the word (## Owns, ## Owns and serves …).
 *
 *   STATUS.json exists and has repository (matching the manifest), stage, deployed, contracts, features and updated;
 *   `contracts` names the openvibe-contracts tag package.json pins; `updated` is no older than the newest commit that
 *   touched package.json's pins (so a bump without a STATUS refresh is caught): checked by the date only.
 *
 * Every other checkout under the root named OpenVibe.* (a client or repository with no service manifest, such as
 * OpenVibe.Node or OpenVibe.Extensions) needs a STATUS.json with repository, stage, deployed, features and updated, so
 * the estate does not show it blank; its README is not held to the service headings. One whose STATUS `stage` is
 * closed, retired or archived (OpenVibe.Realtime, closed by ADR-005) is skipped.
 *
 * Facts, for every checkout checked (structure and dates alone passed 44/44 on 2026-10-22 while STATUS versions,
 * pins and consumer lists were months stale):
 *
 *   version     STATUS.json `version` equals package.json's `version`; without a package.json, the newest vX.Y.Z tag
 *               on the checkout's HEAD. So does a release the README's status line states after the stage
 *               ("**Status:** alpha, v0.75.0").
 *   pins        every "openvibe-contracts|sdk|shared|publishing vX.Y.Z" in STATUS.json's contracts, sdk, shared,
 *               publishing and packages fields is a tag some package.json in the checkout pins (the root's, or a
 *               nested app's such as apps/server or examples/<name>, at most three levels down, never node_modules);
 *               a package nothing pins to an exact tag is not checked. The same for the README's
 *               `<!-- versions:start -->` block (openvibe-shared's docs-status writes it).
 *   consumers   a STATUS.json `consumers` list (a library's) names every checkout under the root that pins the
 *               package, names none that does not, and any version an entry states is the one that consumer pins.
 *   deployed    a service whose manifest's exposure is "live" does not say `deployed: false`.
 *   links       a relative link or image in README.md (outside code) resolves to a file or directory in the
 *               checkout, as GitHub would resolve it.
 *   paths       a path in a STATUS.json string that names a file (`server/x.js`) or directory (`server/x/`) under one
 *               of the checkout's own top-level directories exists; and a migration named by number
 *               ("migration 0012", `migrations/0012_x.sql`) in STATUS.json or the README is in migrations/. A string or
 *               line that names another repository (OpenVibe.Live, Live's …) is about that repository and is not read
 *               for paths.
 *
 * Nothing is fetched and nothing is written; git is read locally (log -1 on package.json, tags on HEAD).
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
/** A checkout with no service manifest (a client, a repository) is held to these. */
const REPOSITORY_FIELDS = ['repository', 'stage', 'deployed', 'features', 'updated'];
const CLOSED_STAGES = new Set(['closed', 'retired', 'archived']);
const LIBS = ['openvibe-contracts', 'openvibe-sdk', 'openvibe-shared', 'openvibe-publishing'];
const PIN_FIELDS = ['contracts', 'sdk', 'shared', 'publishing', 'packages'];
const DEP_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
const MENTION = /\b(openvibe-(?:contracts|sdk|shared|publishing))(?:\s+|@)(v?\d+\.\d+\.\d+)\b/g;
const SKIP_DIRS = new Set(['node_modules', 'vendor', 'dist', 'build', 'coverage']);
const PACKAGE_DEPTH = 3;

const readText = (file) => { try { return fs.readFileSync(file, 'utf8'); } catch { return null; } };
const readJson = (file) => { const s = readText(file); if (s === null) return null; try { return JSON.parse(s); } catch { return null; } };
const isDir = (p) => { try { return fs.statSync(p).isDirectory(); } catch { return false; } };
const vTag = (v) => (String(v).startsWith('v') ? String(v) : `v${v}`);
const plain = (v) => String(v).replace(/^v/, '');
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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

/** An exact release a dependency spec pins (a codeload tag or a bare x.y.z), else null: a range pins nothing. */
function exactTag(spec) {
    const s = String(spec || '').trim();
    const m = /refs\/tags\/(v?\d+\.\d+\.\d+)$/.exec(s) || /^v?(\d+\.\d+\.\d+)$/.exec(s);
    return m ? vTag(m[1]) : null;
}

/** package.json files of a checkout: the root's first, then nested ones up to PACKAGE_DEPTH levels down. */
function packageFiles(dir) {
    const out = [];
    const walk = (d, depth) => {
        const f = path.join(d, 'package.json');
        if (fs.existsSync(f)) out.push(f);
        if (depth >= PACKAGE_DEPTH) return;
        let entries = [];
        try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
        for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
            if (!e.isDirectory() || e.name.startsWith('.') || SKIP_DIRS.has(e.name)) continue;
            walk(path.join(d, e.name), depth + 1);
        }
    };
    walk(dir, 0);
    return out;
}

/**
 * Every exact openvibe-* tag any package.json in the checkout pins: Map name → Set of tags. A library's own package
 * in a nested template (Shared's templates/site) is not a pin of the library.
 */
function pinSets(dir) {
    const any = new Map();
    const own = (readJson(path.join(dir, 'package.json')) || {}).name;
    for (const file of packageFiles(dir)) {
        const pkg = readJson(file);
        if (!pkg) continue;
        for (const field of DEP_FIELDS) {
            for (const [name, spec] of Object.entries(pkg[field] || {})) {
                if (!LIBS.includes(name) || name === own) continue;
                const tag = exactTag(spec);
                if (!tag) continue;
                if (!any.has(name)) any.set(name, new Set());
                any.get(name).add(tag);
            }
        }
    }
    return any;
}

/** The STATUS strings that state pins: [{ field, name, tag }]. */
function statusPinMentions(status) {
    const out = [];
    for (const field of PIN_FIELDS) {
        const v = status[field];
        const texts = Array.isArray(v) ? v.filter((x) => typeof x === 'string') : (typeof v === 'string' ? [v] : []);
        for (const t of texts) for (const m of t.matchAll(MENTION)) out.push({ field, name: m[1], tag: vTag(m[2]) });
    }
    return out;
}

/** The README's `<!-- versions:start -->` block: [{ name, tag }]. */
function versionsBlock(readme) {
    const m = /<!--\s*versions:start\s*-->([\s\S]*?)<!--\s*versions:end\s*-->/.exec(readme || '');
    if (!m) return [];
    const out = [];
    for (const x of m[1].matchAll(/\b(openvibe-(?:contracts|sdk|shared|publishing))\b\s*[:@]?\s*(v?\d+\.\d+\.\d+)/g)) out.push({ name: x[1], tag: vTag(x[2]) });
    return out;
}

/**
 * README lines outside fenced code. Inline code is removed (a link inside code is an example, not a link), or with
 * keepCode only its backticks are (a migration named in code is still named).
 */
function proseLines(readme, keepCode = false) {
    let fence = null;
    return String(readme || '').split('\n').map((line) => {
        const f = /^\s*(```+|~~~+)/.exec(line);
        if (f) {
            if (!fence) fence = f[1][0];
            else if (f[1][0] === fence) fence = null;
            return '';
        }
        if (fence) return '';
        return keepCode ? line.replace(/`/g, ' ') : line.replace(/`[^`]*`/g, '``');
    });
}

/** Relative link and image targets in the README's prose: [{ line, target }]. */
function relativeLinks(readme) {
    const out = [];
    proseLines(readme).forEach((line, i) => {
        const targets = [...line.matchAll(/\]\(\s*<?([^)\s>]+)>?(?:\s+["'(][^)]*)?\)/g)].map((m) => m[1]);
        const ref = /^\s{0,3}\[[^\]]+\]:\s*<?(\S+?)>?(?:\s|$)/.exec(line);
        if (ref) targets.push(ref[1]);
        for (const t of targets) {
            if (/^[a-z][a-z0-9+.-]*:/i.test(t) || t.startsWith('#') || t.startsWith('/') || t.startsWith('{')) continue;
            const clean = t.replace(/[#?].*$/, '');
            if (!clean) continue;
            let decoded = clean;
            try { decoded = decodeURIComponent(clean); } catch { /* keep it as written */ }
            out.push({ line: i + 1, target: decoded });
        }
    });
    return out;
}

/** Every string in a parsed STATUS.json, with the top-level field it sits under. */
function statusStrings(status) {
    const out = [];
    const walk = (v, field) => {
        if (typeof v === 'string') out.push({ field, text: v });
        else if (Array.isArray(v)) for (const x of v) walk(x, field);
        else if (v && typeof v === 'object') for (const x of Object.values(v)) walk(x, field);
    };
    for (const [k, v] of Object.entries(status || {})) walk(v, k);
    return out;
}

/** A regex that matches text naming another repository than `self` (OpenVibe.Live, Live's, …). */
function otherRepoPattern(self, names) {
    const own = new Set([self, self.replace(/^OpenVibe\./, '')]);
    const words = new Set();
    for (const n of names) {
        if (own.has(n)) continue;
        words.add(n);
        const short = n.replace(/^OpenVibe\./, '');
        if (short && !own.has(short)) words.add(short);
    }
    if (!words.size) return null;
    return new RegExp(`(^|[^A-Za-z0-9_.-])(${[...words].sort((a, b) => b.length - a.length).map(escapeRe).join('|')})(?![A-Za-z0-9_-])`);
}

/** Path-shaped tokens naming a file (`a/b.js`) or directory (`a/b/`) under one of the checkout's top-level dirs. */
function pathTokens(text, topDirs) {
    const out = [];
    for (const m of String(text).matchAll(/(?:^|[\s(`'"[,;=])((?:[A-Za-z0-9_-][A-Za-z0-9_.-]*\/)+(?:[A-Za-z0-9_-][A-Za-z0-9_.-]*\.[A-Za-z0-9]{1,6})?)(?=$|[\s)`'",;:\]]|\.(?:\s|$))/g)) {
        const t = m[1];
        const segs = t.split('/');
        if (!topDirs.has(segs[0])) continue;
        const fileLike = /\.[A-Za-z0-9]{1,6}$/.test(segs[segs.length - 1]);
        if (!fileLike && !t.endsWith('/')) continue;
        out.push(t);
    }
    return out;
}

/** Migrations named by number: "migration 0012", "migrations 0012_x", and (unless asPath is false) `migrations/0012_x.sql`. */
function migrationMentions(text, asPath = true) {
    const out = [];
    const re = asPath ? /\bmigrations?(?:\s+|\/)`?(\d{3,4})(?:_[A-Za-z0-9_]+)?(?![A-Za-z0-9-])/gi : /\bmigrations?\s+`?(\d{3,4})(?:_[A-Za-z0-9_]+)?(?![A-Za-z0-9-])/gi;
    for (const m of String(text).matchAll(re)) out.push(Number(m[1]));
    return out;
}

function lastPinChange(dir) {
    try {
        const out = execFileSync('git', ['-C', dir, 'log', '-1', '--format=%cI', '--', 'package.json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
        return out ? out.slice(0, 10) : null;
    } catch { return null; }
}

/** The newest vX.Y.Z tag on the checkout's HEAD (a repository with no package.json releases by tag), else null. */
function headTag(dir) {
    if (!fs.existsSync(path.join(dir, '.git'))) return null;
    try {
        const out = execFileSync('git', ['-C', dir, 'tag', '--merged', 'HEAD', '--sort=-v:refname', '--list', 'v[0-9]*.[0-9]*.[0-9]*'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
        return out.split('\n').map((s) => s.trim()).find(Boolean) || null;
    } catch { return null; }
}

/**
 * What the root holds, read once: the checkout names, each one's pins, and the manifests' repositories. `checkRepo`
 * builds a one-off context when it is called without one (tests).
 */
function estateContext(root, manifests = []) {
    const names = isDir(root) ? fs.readdirSync(root, { withFileTypes: true })
        .filter((e) => !e.name.startsWith('.') && (e.isDirectory() || (e.isSymbolicLink() && isDir(path.join(root, e.name)))))
        .map((e) => e.name).sort() : [];
    const pins = new Map();
    const pinsOf = (name) => {
        if (!pins.has(name)) pins.set(name, pinSets(path.join(root, name)));
        return pins.get(name);
    };
    // The repositories a text may name: the checkouts, the given manifests and every service manifest this package ships.
    const repoNames = new Set(names);
    const known = path.join(__dirname, '..', 'manifests', 'services');
    const shipped = isDir(known) ? fs.readdirSync(known).filter((f) => f.endsWith('.json')).map((f) => readJson(path.join(known, f))).filter(Boolean) : [];
    for (const m of manifests.concat(shipped)) { const n = String(m.repository || '').split('/').pop(); if (n) repoNames.add(n); }
    return { root, names, pinsOf, repoNames: [...repoNames] };
}

/** The fact checks (see the header) for one checkout. */
function factGaps(dir, name, status, ctx, manifest) {
    const gaps = [];
    const pkg = readJson(path.join(dir, 'package.json'));
    const readme = readText(path.join(dir, 'README.md'));
    const topDirs = new Set(isDir(dir) ? fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory() && !e.name.startsWith('.')).map((e) => e.name) : []);
    const other = otherRepoPattern(name, ctx.repoNames);
    const aboutOther = (text) => Boolean(other && other.test(text));

    // version
    if (status && typeof status.version === 'string') {
        const actual = pkg && pkg.version ? pkg.version : (headTag(dir) ? plain(headTag(dir)) : null);
        const source = pkg && pkg.version ? 'package.json says' : 'the newest tag on HEAD is';
        if (actual && plain(status.version) !== plain(actual)) gaps.push(`STATUS.json: version ${status.version}, ${source} ${actual}`);
    }
    // The README's status line states the release right after the stage ("**Status:** alpha, v0.75.0").
    const statusLine = readme === null ? null : /^\*\*Status:\*\*\s*[A-Za-z-]+,\s*\**v?(\d+\.\d+\.\d+)\b/m.exec(readme);
    if (statusLine && pkg && pkg.version && statusLine[1] !== plain(pkg.version)) gaps.push(`README: the status line says ${statusLine[1]}, package.json says ${pkg.version}`);

    // pins
    const pins = ctx.pinsOf(name);
    const pinList = (lib) => [...(pins.get(lib) || [])].sort().join(' or ');
    if (status) {
        for (const { field, name: lib, tag } of statusPinMentions(status)) {
            if (pins.has(lib) && !pins.get(lib).has(tag)) gaps.push(`STATUS.json: ${field} names ${lib} ${tag}, package.json pins ${pinList(lib)}`);
        }
    }
    for (const { name: lib, tag } of versionsBlock(readme)) {
        if (pins.has(lib) && !pins.get(lib).has(tag)) gaps.push(`README: the versions block names ${lib} ${tag}, package.json pins ${pinList(lib)}`);
    }

    // consumers
    if (status && Array.isArray(status.consumers) && pkg && LIBS.includes(pkg.name)) {
        const lib = pkg.name;
        const pinning = new Map();
        for (const n of ctx.names) {
            if (n === name) continue;
            const s = ctx.pinsOf(n).get(lib);
            if (s && s.size) pinning.set(n, s);
        }
        const entries = status.consumers.filter((x) => typeof x === 'string');
        const named = (n) => {
            const short = n.replace(/^OpenVibe\./, '');
            const re = new RegExp(`(^|[^A-Za-z0-9_.-])(${escapeRe(n)}|${escapeRe(short)})(?![A-Za-z0-9_-])`);
            return entries.find((e) => re.test(e)) || null;
        };
        for (const [n, tags] of pinning) {
            const entry = named(n);
            if (!entry) { gaps.push(`STATUS.json: consumers leaves out ${n}, which pins ${lib} ${[...tags].sort().join(' or ')}`); continue; }
            for (const m of entry.matchAll(/\bv(\d+\.\d+\.\d+)\b/g)) {
                if (!tags.has(vTag(m[1]))) gaps.push(`STATUS.json: consumers says ${n} is on v${m[1]}, it pins ${[...tags].sort().join(' or ')}`);
            }
        }
        for (const e of entries) {
            const m = /^\s*(OpenVibe\.[A-Za-z0-9]+|OpenRestream)\b/.exec(e);
            if (m && ctx.names.includes(m[1]) && !pinning.has(m[1])) gaps.push(`STATUS.json: consumers names ${m[1]}, which pins no ${lib}`);
        }
    }

    // deployed
    if (status && status.deployed === false && manifest && manifest.exposure && manifest.exposure.state === 'live') {
        gaps.push('STATUS.json: deployed false, the service manifest\'s exposure is "live"');
    }

    // links
    if (readme !== null) {
        const seen = new Set();
        for (const { line, target } of relativeLinks(readme)) {
            if (seen.has(target)) continue;
            seen.add(target);
            const abs = path.resolve(dir, target);
            if (abs !== dir && !abs.startsWith(dir + path.sep)) gaps.push(`README:${line}: links to ${target}, outside the repository`);
            else if (!fs.existsSync(abs)) gaps.push(`README:${line}: links to ${target}, which is not in the checkout`);
        }
    }

    // paths and migrations
    const migDir = path.join(dir, 'migrations');
    const migrations = isDir(migDir) ? fs.readdirSync(migDir) : null;
    const numbers = migrations ? new Set(migrations.map((f) => /^(\d+)(?:[_.-]|$)/.exec(f)).filter(Boolean).map((m) => Number(m[1]))) : null;
    const missingMigration = (num) => Boolean(numbers) && !numbers.has(num);
    if (status) {
        const reported = new Set();
        for (const { field, text } of statusStrings(status)) {
            if (aboutOther(text)) continue;
            for (const t of pathTokens(text, topDirs)) {
                if (reported.has(t) || fs.existsSync(path.join(dir, t.replace(/\/$/, '')))) continue;
                reported.add(t);
                gaps.push(`STATUS.json: ${field} names ${t}, which is not in the checkout`);
            }
            // A migrations/ path is a path token above; here only "migration 0012" in prose.
            for (const num of migrationMentions(text, false)) {
                if (reported.has(`m${num}`) || !missingMigration(num)) continue;
                reported.add(`m${num}`);
                gaps.push(`STATUS.json: ${field} names migration ${num}, which is not in migrations/`);
            }
        }
    }
    if (readme !== null && migrations) {
        const reported = new Set();
        proseLines(readme, true).forEach((line, i) => {
            if (!line || aboutOther(line)) return;
            for (const num of migrationMentions(line)) {
                if (reported.has(num) || !missingMigration(num)) continue;
                reported.add(num);
                gaps.push(`README:${i + 1}: names migration ${num}, which is not in migrations/`);
            }
        });
    }
    return gaps;
}

function checkRepo(root, manifest, ctx) {
    const name = String(manifest.repository || '').split('/').pop();
    const dir = path.join(root, name);
    const gaps = [];
    // A retired service has nothing running to document, whether or not an old checkout is still around.
    if (manifest.status === 'retired') return { id: manifest.id, repository: manifest.repository, skipped: 'retired', gaps: [] };
    if (!name || !fs.existsSync(dir)) {
        // A placeholder service (status "placeholder": named by the roadmap, not built) has no repository to check
        // yet; report it as skipped rather than a gap. A placeholder that does have a checkout falls through and is
        // checked normally.
        if (manifest.status === 'placeholder') return { id: manifest.id, repository: manifest.repository, skipped: 'placeholder', gaps: [] };
        return { id: manifest.id, repository: manifest.repository, missing: true, gaps: ['no checkout under the root'] };
    }
    const context = ctx || estateContext(root, [manifest]);
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
    gaps.push(...factGaps(dir, name, status, context, manifest));
    return { id: manifest.id, repository: manifest.repository, gaps };
}

/**
 * A checkout with no service manifest (OpenVibe.Node, OpenVibe.Extensions): it needs a STATUS.json the estate can
 * read, and its facts are checked; the service README headings are not asked of it.
 */
function checkCheckout(root, name, ctx) {
    const dir = path.join(root, name);
    const id = name.replace(/^OpenVibe\./, '').toLowerCase();
    const statusPath = path.join(dir, 'STATUS.json');
    if (!fs.existsSync(statusPath)) return { id, repository: `OpenVibers/${name}`, kind: 'repository', gaps: ['STATUS.json missing (the estate shows the repository blank)'] };
    const status = readJson(statusPath);
    if (!status) return { id, repository: `OpenVibers/${name}`, kind: 'repository', gaps: ['STATUS.json is not JSON'] };
    if (CLOSED_STAGES.has(String(status.stage || '').toLowerCase())) return { id, repository: status.repository || `OpenVibers/${name}`, kind: 'repository', skipped: 'closed', gaps: [] };
    const gaps = [];
    for (const f of REPOSITORY_FIELDS) if (status[f] === undefined) gaps.push(`STATUS.json: no "${f}"`);
    if (status.repository && status.repository !== `OpenVibers/${name}`) gaps.push(`STATUS.json: repository ${status.repository}, the checkout is ${name}`);
    const changed = lastPinChange(dir);
    if (changed && status.updated && String(status.updated).slice(0, 10) < changed) gaps.push(`STATUS.json: updated ${status.updated}, package.json changed ${changed}`);
    gaps.push(...factGaps(dir, name, status, ctx || estateContext(root), null));
    return { id, repository: status.repository || `OpenVibers/${name}`, kind: 'repository', gaps };
}

/** Every result for a root: the services in manifest order, then the other OpenVibe.* checkouts (`only`: ids). */
function collect(root, manifests, only) {
    const ctx = estateContext(root, manifests);
    const results = manifests.filter((m) => !only || only.has(m.id)).map((m) => checkRepo(root, m, ctx));
    const covered = new Set(manifests.map((m) => String(m.repository || '').split('/').pop()).filter(Boolean));
    for (const name of ctx.names) {
        if (covered.has(name) || !name.startsWith('OpenVibe.')) continue;
        if (only && !only.has(name.replace(/^OpenVibe\./, '').toLowerCase())) continue;
        results.push(checkCheckout(root, name, ctx));
    }
    return results;
}

/** The summary line: skipped placeholders and retired services are counted apart from the checkouts actually checked. */
function summarize(results) {
    const placeholders = results.filter((r) => r.skipped === 'placeholder').length;
    const retired = results.filter((r) => r.skipped === 'retired').length;
    const closed = results.filter((r) => r.skipped === 'closed').length;
    const checked = results.length - placeholders - retired - closed;
    const bad = results.filter((r) => r.gaps.length).length;
    return `${checked - bad}/${checked} current${placeholders ? `, ${placeholders} placeholder skipped` : ''}${retired ? `, ${retired} retired skipped` : ''}${closed ? `, ${closed} closed skipped` : ''}`;
}

function main(argv) {
    const root = argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--only');
    if (!root) { console.error('usage: docs-currency.js <root with the checkouts> [--json] [--only id,id]'); process.exit(2); }
    const onlyArg = argv.indexOf('--only');
    const only = onlyArg >= 0 ? new Set(String(argv[onlyArg + 1] || '').split(',').filter(Boolean)) : null;
    const dir = path.join(__dirname, '..', 'manifests', 'services');
    const manifests = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')))
        .sort((a, b) => a.id.localeCompare(b.id));
    const results = collect(path.resolve(root), manifests, only);
    if (argv.includes('--json')) console.log(JSON.stringify(results, null, 2));
    else {
        for (const r of results) {
            if (r.skipped) console.log(`– ${r.id.padEnd(12)} ${r.skipped === 'retired' ? 'retired, nothing to document' : r.skipped === 'closed' ? 'closed, nothing to document' : 'placeholder, no repository yet'}`);
            else console.log(`${r.gaps.length ? '✗' : '✓'} ${r.id.padEnd(12)} ${r.gaps.length ? r.gaps.join('; ') : 'current'}`);
        }
        console.log(summarize(results));
    }
    process.exit(results.some((r) => r.gaps.length) ? 1 : 0);
}

if (require.main === module) main(process.argv.slice(2));
module.exports = {
    checkRepo, checkCheckout, collect, estateContext, factGaps, headings, contractsPin, exactTag, pinSets, statusPinMentions,
    versionsBlock, relativeLinks, pathTokens, migrationMentions, summarize, REQUIRED, STATUS_FIELDS, REPOSITORY_FIELDS,
};
