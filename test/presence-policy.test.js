'use strict';
// ADR-005 amendment 1: presence is ephemeral, in Chat's delivery plane; no Events topic carries it.
const assert = require('assert');
const c = require('..');
const produced = c.services.manifests.flatMap((m) => m.eventsProduced || []);
assert.ok(!produced.some((t) => /presence|\.online|\.offline/i.test(t)), `no presence event type: ${produced.filter((t) => /presence|online/i.test(t))}`);
console.log('presence policy: all checks passed');
