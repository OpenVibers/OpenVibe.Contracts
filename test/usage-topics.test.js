'use strict';
// T5 step 8: *.usage.recorded rollups are counts for dashboards and quotas, never money. Only network, codes and
// zone may consume one; Billing never does (it rates platform.usage-sample readings, billing.usage.record).
const assert = require('assert');
const fs = require('fs');
const path = require('path');

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
console.log(`usage-topics ok: ${consumers.map((c) => c.id).join(', ')} consume a *.usage.recorded topic`);
