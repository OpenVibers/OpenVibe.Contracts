'use strict';
// The changelog keeps every release. On 2026-11-06 a release PR rewrote CHANGELOG.md with only its own entry and the
// one before it, dropping 3,800 lines of history; this catches that before it merges.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const text = fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8');
const pkg = require(path.join(ROOT, 'package.json'));

const versions = [...text.matchAll(/^## (\d+)\.(\d+)\.(\d+)\b/gm)].map((m) => [+m[1], +m[2], +m[3]]);
const [major, minor] = pkg.version.split('.').map(Number);

// Minor versions that were never released (no tag), so they have no entry.
const NEVER_RELEASED = new Set([293]);
const FIRST_MINOR = 30;

assert.strictEqual(major, 0, 'the check counts 0.x minors; update it when 1.0.0 ships');
assert.ok(versions.some(([a, b]) => a === major && b === minor), `CHANGELOG.md has an entry for the current version ${pkg.version}`);
const minors = new Set(versions.filter(([a]) => a === 0).map(([, b]) => b));
const missing = [];
for (let m = FIRST_MINOR; m <= minor; m++) if (!minors.has(m) && !NEVER_RELEASED.has(m)) missing.push(`0.${m}.x`);
assert.deepStrictEqual(missing, [], `CHANGELOG.md lost earlier releases' entries: ${missing.slice(0, 10).join(', ')}${missing.length > 10 ? ` and ${missing.length - 10} more` : ''}`);

// Newest first: each heading's version is below the one above it.
for (let i = 1; i < versions.length; i++) {
    const [a, b] = [versions[i - 1], versions[i]];
    const cmp = a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
    assert.ok(cmp > 0, `CHANGELOG.md is newest first: ${a.join('.')} comes before ${b.join('.')}`);
}
console.log(`changelog history: ${versions.length} entries, 0.${FIRST_MINOR} to ${pkg.version}`);
