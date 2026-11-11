'use strict';
// live.channel-points-page@1 (ask 273): Live's internal channel-points read answers this shape, and the
// live.channel_points.read capability names its schemas and is listed on the live service.
const assert = require('assert');
const contracts = require('..');

const v = contracts.validate('live.channel-points-page@1', require('../fixtures/live.channel-points-page/valid/page.json'));
assert.equal(v.valid, true, JSON.stringify(v.errors));
assert.equal(contracts.validate('live.channel-points-page@1', require('../fixtures/live.channel-points-page/invalid/delta-string.json')).valid, false);

const caps = require('../manifests/capabilities/live.channel_points.read.json');
assert.equal(caps.id, 'live.channel_points.read');
assert.equal(caps.inputSchema, 'common.no-body@1');
assert.equal(caps.outputSchema, 'live.channel-points-page@1');
const live = require('../manifests/services/live.json');
assert.ok(live.capabilities.includes('live.channel_points.read'), 'the live service lists the capability');
console.log('live-channel-points: page fixtures validate; the capability is registered on live');
