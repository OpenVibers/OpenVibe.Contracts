'use strict';
// Loyalty is never money (ADR-012; roadmap WS-K task 9): the catalog cannot describe a way to withdraw,
// cash out or convert OpenCoins, channel points or other loyalty into money or Vibes, and loyalty
// records carry no money fields. A change that adds one fails here and has to argue with ADR-012.
const assert = require('assert');
const c = require('..');

const MONEY_WORDS = /(^|_)(usd|cents?|currency|price|payout|cashout|withdraw\w*|vibes|bits|fiat|money)(_|$)/i;
const LOYALTY = /coins?|points?|loyalty|xp|level/i;

// 1. Loyalty namespaces: no money-like field anywhere in their schema.
const loyaltyNamespaces = c.modules.namespaces.filter((n) => /loyalty/.test(n.namespace));
assert.ok(loyaltyNamespaces.some((n) => n.namespace === 'live.loyalty'), 'live.loyalty is declared');
function fields(schema, out = []) {
    for (const [k, v] of Object.entries((schema && schema.properties) || {})) { out.push(k); fields(v, out); if (v.items) fields(v.items, out); }
    return out;
}
for (const n of loyaltyNamespaces) {
    for (const f of fields(n.schema)) assert.ok(!MONEY_WORDS.test(f), `${n.namespace}.${f} looks like money`);
    assert.deepStrictEqual(n.publicFields, [], `${n.namespace} is private`);
}

// 2. No capability converts, withdraws or cashes out loyalty, and none moves it into money.
for (const cap of c.capabilities.manifests) {
    const id = cap.id;
    if (/^network\.coins\./.test(id) || LOYALTY.test(id.split('.').slice(1).join('.'))) {
        assert.ok(!/withdraw|cashout|cash_out|payout|convert|redeem_money|to_vibes|purchase/i.test(id), `${id} would turn loyalty into money`);
        assert.ok(!/\b(usd|cash out|cashout|withdraw|payout|real money)\b/i.test(cap.description || '') || /never money|not money|never withdraw/i.test(cap.description || ''),
            `${id}'s description talks about money: ${cap.description}`);
    }
    if (/^billing\./.test(id)) {
        assert.ok(!/coins?|channel.?points|loyalty/i.test(`${id} ${cap.description || ''}`), `${id}: Billing never takes or pays loyalty`);
    }
}

// 3. The OpenCoins request bodies carry an amount of coins and nothing that prices them.
for (const id of ['network.coins-change-request@1', 'network.coins-transfer-request@1']) {
    const s = c.resolve(id);
    if (!s) continue;
    for (const f of fields(s)) assert.ok(!MONEY_WORDS.test(f), `${id}.${f} prices loyalty`);
}
console.log('loyalty policy: all checks passed');
