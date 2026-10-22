'use strict';
// Documentation currency (roadmap WS-U task 3): a service manifest with status "placeholder" is one the roadmap
// has named but not built, so an absent repository is not a gap — it is skipped. A placeholder that does have a
// checkout is checked like every other service, and the summary counts skipped services apart from the checked ones.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { checkRepo, collect, summarize, exactTag, pathTokens, migrationMentions } = require('../scripts/docs-currency.js');

let checks = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); checks++; };

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ovc-docs-currency-'));
const placeholder = { id: 'parked', repository: 'OpenVibers/OpenVibe.Parked', status: 'placeholder' };
try {
    // A placeholder with no checkout is skipped, not failed.
    const skipped = checkRepo(root, placeholder);
    ok(skipped.skipped, 'a placeholder with no checkout is skipped');
    ok(skipped.gaps.length === 0, 'a skipped placeholder is not a gap');
    ok(/placeholder/.test(skipped.skipped), 'the skip says why');

    // A placeholder that does have a checkout is checked normally: a current checkout is current...
    const dir = path.join(root, 'OpenVibe.Parked');
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, 'README.md'), [
        '# OpenVibe.Parked', '',
        '## Purpose', 'x', '## Owns', 'x', '## Does not own', 'x', '## Depends on', 'x',
        '## Capabilities', 'x', '## Acceptance', 'x', '## Security', 'x', '## Deploy', 'x', '',
    ].join('\n'));
    fs.writeFileSync(path.join(dir, 'STATUS.json'), JSON.stringify({
        repository: 'OpenVibers/OpenVibe.Parked', stage: 'alpha', deployed: false,
        contracts: 'openvibe-contracts v9.9.9', features: [], updated: '2099-01-01',
    }));
    const current = checkRepo(root, placeholder);
    ok(!current.skipped && current.gaps.length === 0, `a placeholder with a current checkout is current: ${current.gaps.join('; ')}`);

    // ...and a gap in that checkout is still reported, because it was checked and not skipped.
    fs.rmSync(path.join(dir, 'README.md'));
    const broken = checkRepo(root, placeholder);
    ok(!broken.skipped && broken.gaps.some((g) => /README\.md missing/.test(g)), 'a placeholder with a checkout reports its gaps');

    // A service with no checkout and no placeholder status is still a gap.
    const missing = checkRepo(root, { id: 'built', repository: 'OpenVibers/OpenVibe.Built', status: 'alpha' });
    ok(!missing.skipped && missing.gaps.some((g) => /no checkout/.test(g)), 'a non-placeholder with no checkout is still a gap');

    // The summary counts skipped services separately and only the checked ones in the ratio.
    ok(summarize([{ gaps: [] }, { gaps: ['x'] }, { skipped: 'placeholder', gaps: [] }]) === '1/2 current, 1 placeholder skipped', 'the summary counts skipped placeholders separately');
    ok(summarize([{ gaps: [] }, { gaps: [] }]) === '2/2 current', 'without a placeholder the summary is unchanged');

    // A retired service (Sites, 2026-10-14) is skipped even when an old checkout with no charter README is around.
    fs.mkdirSync(path.join(root, 'OpenVibe.Gone'));
    fs.writeFileSync(path.join(root, 'OpenVibe.Gone', 'README.md'), '# Gone\n');
    const retired = checkRepo(root, { id: 'gone', repository: 'OpenVibers/OpenVibe.Gone', status: 'retired' });
    ok(retired.skipped === 'retired' && retired.gaps.length === 0, 'a retired service is skipped, checkout or not');
    ok(summarize([{ gaps: [] }, { skipped: 'retired', gaps: [] }]) === '1/1 current, 1 retired skipped', 'the summary counts retired services apart');
} finally {
    fs.rmSync(root, { recursive: true, force: true });
}
// ── Facts (2026-10-22): structure and dates passed 44/44 while versions, pins and consumer lists were stale ──
const facts = fs.mkdtempSync(path.join(os.tmpdir(), 'ovc-docs-facts-'));
const tag = (repo, v) => `https://codeload.github.com/OpenVibers/${repo}/tar.gz/refs/tags/${v}`;
const README = ['# X', '', '## Purpose', 'x', '## Owns', 'x', '## Does not own', 'x', '## Depends on', 'x',
    '## Capabilities', 'x', '## Acceptance', 'x', '## Security', 'x', '## Deploy', 'x', ''].join('\n');
/** A checkout under the facts root: files is { relative path: string, object (written as JSON) or null (a directory) }. */
function checkout(name, files) {
    const dir = path.join(facts, name);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    for (const [rel, body] of Object.entries(files)) {
        if (body === null) { fs.mkdirSync(path.join(dir, rel), { recursive: true }); continue; }
        fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
        fs.writeFileSync(path.join(dir, rel), typeof body === 'string' ? body : JSON.stringify(body, null, 2));
    }
    return dir;
}
const status = (name, extra = {}) => ({ repository: `OpenVibers/${name}`, stage: 'alpha', deployed: true, contracts: 'openvibe-contracts v0.9.0', features: ['x'], updated: '2099-01-01', ...extra });
const service = (id, name, extra = {}) => ({ id, repository: `OpenVibers/${name}`, status: 'alpha', ...extra });
const gapsOf = (r) => r.gaps.join('; ');
try {
    // version: STATUS.json's version is package.json's (Shared said 4.0.3 at 4.7.0).
    checkout('OpenVibe.Lib', {
        'README.md': README,
        'package.json': { name: 'openvibe-lib', version: '4.7.0', devDependencies: { 'openvibe-contracts': tag('OpenVibe.Contracts', 'v0.9.0') } },
        'STATUS.json': status('OpenVibe.Lib', { version: '4.0.3' }),
    });
    let r = checkRepo(facts, service('lib', 'OpenVibe.Lib'));
    ok(/version 4\.0\.3, package\.json says 4\.7\.0/.test(gapsOf(r)), `a stale STATUS version is a gap: ${gapsOf(r)}`);
    checkout('OpenVibe.Lib', {
        'README.md': README,
        'package.json': { name: 'openvibe-lib', version: '4.7.0', devDependencies: { 'openvibe-contracts': tag('OpenVibe.Contracts', 'v0.9.0') } },
        'STATUS.json': status('OpenVibe.Lib', { version: '4.7.0' }),
    });
    r = checkRepo(facts, service('lib', 'OpenVibe.Lib'));
    ok(r.gaps.length === 0, `a current library is current: ${gapsOf(r)}`);
    fs.writeFileSync(path.join(facts, 'OpenVibe.Lib', 'README.md'), `**Status:** alpha, v2.10.1 (every release is a tag), since openvibe-shared v1.0.0.\n\n${README}`);
    r = checkRepo(facts, service('lib', 'OpenVibe.Lib'));
    ok(/the status line says 2\.10\.1, package\.json says 4\.7\.0/.test(gapsOf(r)) && r.gaps.length === 1, `a stale release on the README status line is a gap: ${gapsOf(r)}`);
    fs.writeFileSync(path.join(facts, 'OpenVibe.Lib', 'README.md'), `**Status:** alpha, **4.7.0**: launched (openvibe-contracts 0.2.0).\n\n${README}`);
    r = checkRepo(facts, service('lib', 'OpenVibe.Lib'));
    ok(r.gaps.length === 0, `the current release on the status line is fine: ${gapsOf(r)}`);

    // pins: every openvibe-* release STATUS names is one some package.json pins, nested apps included
    // (Billing's "openvibe-sdk v0.28.0" at v0.60.0; Examples' contracts pin lives in examples/mod-manifest).
    checkout('OpenVibe.Svc', {
        'README.md': `${README}\n<!-- versions:start -->\n- openvibe-sdk: v0.5.0\n<!-- versions:end -->\n`,
        'package.json': { name: 'openvibe-svc', version: '0.1.0', dependencies: { 'openvibe-contracts': tag('OpenVibe.Contracts', 'v0.9.0'), 'openvibe-sdk': tag('OpenVibe.SDK', 'v0.6.0') } },
        'apps/web/package.json': { name: 'web', dependencies: { 'openvibe-shared': tag('OpenVibe.Shared', 'v4.4.0') } },
        'STATUS.json': status('OpenVibe.Svc', { contracts: 'openvibe-contracts v0.9.0 (openvibe-sdk v0.2.8, openvibe-shared v2.13.0)', sdk: 'openvibe-sdk v0.6.0', packages: ['openvibe-shared v4.4.0', 'openvibe-publishing v1.0.0'] }),
    });
    r = checkRepo(facts, service('svc', 'OpenVibe.Svc'));
    ok(/contracts names openvibe-sdk v0\.2\.8, package\.json pins v0\.6\.0/.test(gapsOf(r)), `a stale sdk named in contracts is a gap: ${gapsOf(r)}`);
    ok(/contracts names openvibe-shared v2\.13\.0, package\.json pins v4\.4\.0/.test(gapsOf(r)), `a nested app's pin is the one compared: ${gapsOf(r)}`);
    ok(!/packages names openvibe-shared v4\.4\.0/.test(gapsOf(r)), 'a release a nested app pins is current');
    ok(!/openvibe-publishing/.test(gapsOf(r)), 'a package nothing pins to a tag is not checked');
    ok(/versions block names openvibe-sdk v0\.5\.0, package\.json pins v0\.6\.0/.test(gapsOf(r)), `the README versions block is checked: ${gapsOf(r)}`);
    checkout('OpenVibe.Svc', {
        'README.md': `${README}\n<!-- versions:start -->\n- openvibe-sdk: v0.6.0\n<!-- versions:end -->\n`,
        'package.json': { name: 'openvibe-svc', version: '0.1.0', dependencies: { 'openvibe-contracts': tag('OpenVibe.Contracts', 'v0.9.0'), 'openvibe-sdk': '>=0.1.0' }, devDependencies: { 'openvibe-sdk': tag('OpenVibe.SDK', 'v0.6.0') } },
        'node_modules/x/package.json': { name: 'x', dependencies: { 'openvibe-sdk': tag('OpenVibe.SDK', 'v0.1.0') } },
        'STATUS.json': status('OpenVibe.Svc', { contracts: 'openvibe-contracts v0.9.0 (actor-agent requires v0.1.0)', sdk: 'openvibe-sdk v0.6.0 (peer >=0.1.0)' }),
    });
    r = checkRepo(facts, service('svc', 'OpenVibe.Svc'));
    ok(r.gaps.length === 0, `ranges, node_modules and versions not named after a package are not pins: ${gapsOf(r)}`);

    // deployed: a manifest whose exposure is live is not "deployed: false" (Play, 2026-10-22).
    checkout('OpenVibe.Play', { 'README.md': README, 'STATUS.json': status('OpenVibe.Play', { deployed: false }) });
    r = checkRepo(facts, service('play', 'OpenVibe.Play', { exposure: { state: 'live' } }));
    ok(/deployed false, the service manifest's exposure is "live"/.test(gapsOf(r)), `deployed false against a live manifest is a gap: ${gapsOf(r)}`);
    r = checkRepo(facts, service('play', 'OpenVibe.Play', { exposure: { state: 'library' } }));
    ok(!/deployed false/.test(gapsOf(r)), 'a library may say deployed false');

    // links: a relative README link resolves in the checkout; code, URLs and anchors are not links.
    checkout('OpenVibe.Docs', {
        'README.md': `${README}\nSee [the guide](docs/guide.md#start), [gone](docs/old.md), ![logo](img/logo.png), [up](../ARCHITECTURE.md),\n[site](https://openvibe.network), [here](#purpose) and \`[code](docs/none.md)\`.\n\n[ref]: docs/ref-gone.md\n\n\`\`\`md\n[example](docs/example.md)\n\`\`\`\n`,
        'docs/guide.md': '# Guide\n',
        'img/logo.png': 'png',
        'STATUS.json': status('OpenVibe.Docs'),
    });
    r = checkRepo(facts, service('docs', 'OpenVibe.Docs'));
    ok(/links to docs\/old\.md, which is not in the checkout/.test(gapsOf(r)), `a broken relative link is a gap: ${gapsOf(r)}`);
    ok(/links to docs\/ref-gone\.md/.test(gapsOf(r)), 'a reference-style link is checked');
    ok(/links to \.\.\/ARCHITECTURE\.md, outside the repository/.test(gapsOf(r)), 'a link out of the repository is a gap');
    ok(!/guide\.md|logo\.png|example\.md|none\.md|openvibe\.network|#purpose/.test(gapsOf(r)), `links that resolve, URLs, anchors and code are fine: ${gapsOf(r)}`);
    ok(r.gaps.length === 3, `exactly the three broken links: ${gapsOf(r)}`);

    // paths and migrations a STATUS string or README line names exist; another repository's are not read.
    checkout('OpenVibe.Paths', {
        'README.md': `${README}\nMigration \`0002_more.sql\` adds the index; migration 0009 drops the old table.\nOpenVibe.Live's migration 0011 drops Live's.\n`,
        'migrations/0001_initial.sql': '-- phase: expand\n',
        'migrations/0002_more.sql': '-- phase: expand\n',
        'server/app.js': '',
        'STATUS.json': status('OpenVibe.Paths', {
            features: ['the app (server/app.js)', 'the Arena desk (server/arena/)', 'scores in server/scores.js', 'migrations/0003_scores.sql adds them',
                'Live\'s server/streaming/recorder.js', 'docs at https://example.com/server/x.js', 'workers/status/prune commands'],
        }),
    });
    r = checkRepo(facts, service('paths', 'OpenVibe.Paths'));
    ok(/features names server\/arena\/, which is not in the checkout/.test(gapsOf(r)), `a deleted directory named by a feature is a gap: ${gapsOf(r)}`);
    ok(/features names server\/scores\.js/.test(gapsOf(r)), 'a missing file named by a feature is a gap');
    ok(/features names migrations\/0003_scores\.sql, which is not in the checkout/.test(gapsOf(r)) && !/features names migration 3\b/.test(gapsOf(r)), `a missing migration path named by a feature is one gap: ${gapsOf(r)}`);
    ok(/README:\d+: names migration 9, which is not in migrations\//.test(gapsOf(r)), `a missing migration named in the README is a gap: ${gapsOf(r)}`);
    ok(!/app\.js|recorder|example\.com|workers|migration 2\b|migration 11\b/.test(gapsOf(r)), `present paths, other repositories, URLs and non-paths are fine: ${gapsOf(r)}`);

    // consumers: a library's list names every checkout that pins it, at the release it pins (Publishing missed seven).
    checkout('OpenVibe.Publishing', {
        'README.md': README,
        'package.json': { name: 'openvibe-publishing', version: '1.4.1', devDependencies: { 'openvibe-contracts': tag('OpenVibe.Contracts', 'v0.9.0') } },
        'STATUS.json': status('OpenVibe.Publishing', { version: '1.4.1', consumers: ['OpenVibe.Wiki (v1.3.0; https://openvibe.wiki)', 'OpenVibe.Blog (v1.3.0)', 'OpenVibe.Search (planned)'] }),
    });
    const pinsPublishing = (name, v, nested) => checkout(name, { [nested ? 'apps/server/package.json' : 'package.json']: { name: name.toLowerCase(), dependencies: { 'openvibe-publishing': tag('OpenVibe.Publishing', v) } } });
    pinsPublishing('OpenVibe.Wiki', 'v1.3.0');
    pinsPublishing('OpenVibe.Blog', 'v1.4.1');
    pinsPublishing('OpenVibe.Games', 'v1.4.0', true);
    checkout('OpenVibe.Search', { 'package.json': { name: 'openvibe-search', version: '0.1.0' } });
    r = checkRepo(facts, service('publishing', 'OpenVibe.Publishing'));
    ok(/consumers says OpenVibe\.Blog is on v1\.3\.0, it pins v1\.4\.1/.test(gapsOf(r)), `a consumer's stale version is a gap: ${gapsOf(r)}`);
    ok(/consumers leaves out OpenVibe\.Games, which pins openvibe-publishing v1\.4\.0/.test(gapsOf(r)), `a consumer pinning from a nested app is found: ${gapsOf(r)}`);
    ok(/consumers names OpenVibe\.Search, which pins no openvibe-publishing/.test(gapsOf(r)), 'a listed repository that pins nothing is a gap');
    ok(!/Wiki/.test(gapsOf(r)), 'a consumer listed at its release is fine');
    checkout('OpenVibe.Publishing', {
        'README.md': README,
        'package.json': { name: 'openvibe-publishing', version: '1.4.1', devDependencies: { 'openvibe-contracts': tag('OpenVibe.Contracts', 'v0.9.0') } },
        'STATUS.json': status('OpenVibe.Publishing', { version: '1.4.1', consumers: ['OpenVibe.Wiki (https://openvibe.wiki)', 'OpenVibe.Blog', 'OpenVibe.Games (apps/server)'] }),
    });
    r = checkRepo(facts, service('publishing', 'OpenVibe.Publishing'));
    ok(r.gaps.length === 0, `a consumer list without versions that names every pinning checkout is current: ${gapsOf(r)}`);

    // A checkout with no service manifest: OpenVibe.* needs a STATUS.json; closed ones and other names are skipped.
    const manifests = [service('lib', 'OpenVibe.Lib')];
    checkout('OpenVibe.Node', { 'README.md': '# Node\n', 'go.mod': 'module x\n' });
    checkout('OpenVibe.Realtime', { 'STATUS.json': { repository: 'OpenVibers/OpenVibe.Realtime', stage: 'closed' } });
    checkout('AFResume', { 'README.md': '# CV\n' });
    let all = collect(facts, manifests);
    const byId = (id) => all.find((x) => x.id === id);
    ok(byId('node') && /STATUS\.json missing/.test(gapsOf(byId('node'))), 'an OpenVibe.* checkout without a STATUS.json is a gap');
    ok(byId('realtime') && byId('realtime').skipped === 'closed', 'a closed repository is skipped');
    ok(!all.some((x) => /afresume/i.test(x.id)), 'a checkout not named OpenVibe.* is not the platform\'s');
    ok(byId('wiki') && byId('wiki').gaps.some((g) => /STATUS\.json missing/.test(g)), 'every unmanifested OpenVibe.* checkout is held to a STATUS.json');
    checkout('OpenVibe.Node', { 'README.md': '# Node\n', 'STATUS.json': { repository: 'OpenVibers/OpenVibe.Node', stage: 'alpha', version: '0.13.0', deployed: false, features: ['pairing'], updated: '2099-01-01' } });
    all = collect(facts, manifests, new Set(['node']));
    ok(all.length === 1 && all[0].id === 'node' && all[0].gaps.length === 0, `--only reaches a repository checkout, and a complete STATUS is current: ${JSON.stringify(all)}`);
    checkout('OpenVibe.Node', { 'README.md': '# Node\n', 'STATUS.json': { repository: 'OpenVibers/OpenVibe.Node', stage: 'alpha' } });
    all = collect(facts, manifests, new Set(['node']));
    ok(all[0].gaps.some((g) => /no "features"/.test(g)) && all[0].gaps.some((g) => /no "deployed"/.test(g)), 'a repository STATUS needs deployed and features');
    ok(summarize([{ gaps: [] }, { skipped: 'closed', gaps: [] }]) === '1/1 current, 1 closed skipped', 'the summary counts closed repositories apart');

    // Helpers: exact tags only, and path tokens only under the checkout's own top-level directories.
    ok(exactTag(tag('OpenVibe.SDK', 'v0.60.0')) === 'v0.60.0' && exactTag('1.2.3') === 'v1.2.3' && exactTag('>=0.15.0') === null && exactTag('^1.2.3') === null, 'exactTag reads tags and bare versions, never ranges');
    const tops = new Set(['server', 'docs']);
    const found = pathTokens('see server/a.js, docs/x/ and lib/b.js or server/c (server/d.test.js).', tops);
    ok(JSON.stringify(found) === JSON.stringify(['server/a.js', 'docs/x/', 'server/d.test.js']), `pathTokens: files and directories under own top-level dirs: ${JSON.stringify(found)}`);
    const mig = migrationMentions('migration 0019 and migrations/0003_x.sql, not migration 2026-10-15');
    ok(JSON.stringify(mig) === JSON.stringify([19, 3]), `migrationMentions reads numbers, not dates: ${JSON.stringify(mig)}`);
} finally {
    fs.rmSync(facts, { recursive: true, force: true });
}

console.log(`docs-currency: ${checks} checks passed`);
