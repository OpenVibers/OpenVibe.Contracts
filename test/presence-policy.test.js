'use strict';
// ADR-005 amendments 1 and 3: rooms stay ephemeral in Chat's delivery plane; a person's chosen online
// status is Network's `network.presence@1`, announced only as the debounced `network.presence.changed`.
// ADR-043 records robot connectivity in Events; ADR-057 records Connect device connectivity;
// neither is a person's presence.
// The machines hub (plan L34) records the same for a person's machines: a machine coming online is the
// device changing state, never the person being present. Any other `.online`, `.offline` or presence event
// type is still refused.
const assert = require('assert');
const c = require('..');
const produced = c.services.manifests.flatMap((m) => m.eventsProduced || []);
const deviceConnectivity = new Set([
    'bot.robot.online', 'bot.robot.offline',
    'network.machine.online', 'network.machine.offline',
]);
const personPresence = new Set(['network.presence.changed']);
const presenceEvents = produced.filter((t) => /presence|\.online|\.offline/i.test(t) && !deviceConnectivity.has(t) && !personPresence.has(t));
assert.ok(presenceEvents.length === 0, `no other person presence event type: ${presenceEvents}`);
// The one allowed person-presence event is Network's, and it is in the contract catalog (amendment 3).
const network = c.services.manifests.find((m) => m.id === 'network');
assert.ok(network.eventsProduced.includes('network.presence.changed'), 'Network announces its own presence');
assert.ok(c.schema('network.presence.changed@1'), 'network.presence.changed@1 is a contract');
// No per-join or per-leave topic: the event's payload has no connection vocabulary.
const payload = c.schema('network.presence.changed@1');
assert.ok(!Object.keys(payload.properties).some((k) => /join|leave|connect/i.test(k)), 'no connection churn in the payload');
console.log('presence policy: all checks passed');
