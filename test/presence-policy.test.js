'use strict';
// ADR-005 amendment 1: people's presence is ephemeral, in Chat's delivery plane.
// ADR-043 records robot connectivity in Events; it is not a person's presence.
const assert = require('assert');
const c = require('..');
const produced = c.services.manifests.flatMap((m) => m.eventsProduced || []);
const robotConnectivity = new Set(['bot.robot.online', 'bot.robot.offline']);
const presenceEvents = produced.filter((t) => /presence|\.online|\.offline/i.test(t) && !robotConnectivity.has(t));
assert.ok(presenceEvents.length === 0, `no person presence event type: ${presenceEvents}`);
console.log('presence policy: all checks passed');
