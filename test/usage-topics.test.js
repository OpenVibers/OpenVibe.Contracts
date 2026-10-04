'use strict';
// T5 step 8: *.usage.recorded rollups are counts for dashboards and quotas, never money. Only network, codes and
// zone may consume one; Billing never does (it rates platform.usage-sample readings, billing.usage.record).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { capabilities, services, schema } = require('..');

const dir = path.join(__dirname, '..', 'manifests', 'services');
const MAY_CONSUME = new Set(['network', 'codes', 'zone']);
const isUsageTopic = (t) => /\.usage\.recorded$/.test(t);

const consumers = [];
for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.json')).sort()) {
  const m = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const id = m.id || path.basename(f, '.json');
  const topics = (m.eventsConsumed || []).filter(isUsageTopic);
  if (topics.length) consumers.push({ id, topics });
}

for (const c of consumers) {
  assert.ok(MAY_CONSUME.has(c.id), `${c.id} consumes ${c.topics.join(', ')}: only network, codes and zone may consume a *.usage.recorded topic`);
}
assert.ok(!consumers.some((c) => c.id === 'billing'), 'billing never consumes a *.usage.recorded topic');
assert.ok(consumers.some((c) => c.id === 'network'), 'network consumes the usage rollups it adds up per project');

// The capability the Network default grant names must exist, be owned and listed by Billing, and be the
// estate's ONE money input: a second capability taking a platform.usage-sample reading, or a route added
// for it, is a change of who rates, not a new endpoint. The rollup payload carries no money field.
const record = capabilities.get('billing.usage.record');
assert.ok(record && record.owner === 'billing' && record.status === 'active', 'billing.usage.record exists as an active Billing capability');
assert.ok(services.get('billing').capabilities.includes('billing.usage.record'), 'the Billing manifest lists billing.usage.record');
assert.strictEqual(record.inputSchema, 'platform.usage-sample@1', 'the money input is a platform.usage-sample@1 reading');
const moneyInputs = capabilities.manifests.filter((c) => c.inputSchema === 'platform.usage-sample@1');
assert.deepStrictEqual(moneyInputs.map((c) => c.id), ['billing.usage.record'], 'billing.usage.record is the only capability that takes a usage reading');
const billing = services.get('billing');
assert.ok(!(billing.eventsProduced || []).some(isUsageTopic) && !(billing.eventsConsumed || []).some(isUsageTopic), 'Billing neither produces nor consumes a *.usage.recorded topic');
const props = Object.keys(schema('common.usage-recorded').properties);
assert.ok(!props.some((p) => /cost|price|amount|currency|money|charge|vibes|usd/i.test(p)), 'no field of a usage rollup is money');
console.log(`usage-topics ok: ${consumers.map((c) => c.id).join(', ')} consume a *.usage.recorded topic`);
