'use strict';
// ADR-005 amendment 1: people's presence is ephemeral, in Chat's delivery plane.
// ADR-043 records robot connectivity in Events; it is not a person's presence.
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
const presenceEvents = produced.filter((t) => /presence|\.online|\.offline/i.test(t) && !deviceConnectivity.has(t));
assert.ok(presenceEvents.length === 0, `no person presence event type: ${presenceEvents}`);
console.log('presence policy: all checks passed');
