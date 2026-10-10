'use strict';
// Documentation currency (roadmap WS-U task 3): a service manifest with status "placeholder" is one the roadmap
// has named but not built, so an absent repository is not a gap — it is skipped. A placeholder that does have a
// checkout is checked like every other service, and the summary counts skipped services apart from the checked ones.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { checkRepo, summarize } = require('../scripts/docs-currency.js');

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
} finally {
    fs.rmSync(root, { recursive: true, force: true });
}
console.log(`docs-currency: ${checks} checks passed`);
