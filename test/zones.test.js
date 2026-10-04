'use strict';
// ADR-031 amendment 2026-10-02: a zone's identity, retired names, the list query's limit and Media's per-zone usage.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const c = require('../index.js');
const zones = require('../lib/zones');
const usageLib = require('../lib/usage');
const fx = (id, kind, f) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fixtures', id, kind, f), 'utf8'));

const list = fx('zone.object-zone-list', 'valid', 'two-zones.json');
const zone = list.zones[1];
assert.ok(c.zones.checkObjectZone(zone).valid, 'a named zone passes its identity check');
assert.deepStrictEqual(c.zones.identity(zone), { ovrn: zone.ovrn, media_namespace: zone.media_namespace }, 'ovrn and namespace derive from the record');
assert.ok(!c.zones.checkObjectZone({ ...zone, media_namespace: `app.${zone.project_id}.zon_01K2A9C3D5E7F9G1H3J5K7M9N9` }).valid, 'a namespace naming another zone is refused');

// A name belongs to one zone of its environment for ever, so a signature names one zone id.
const reused = c.zones.checkObjectZoneList(fx('zone.object-zone-list', 'invalid', 'retired-name-reused.json'));
assert.ok(!reused.valid && reused.errors.some((e) => /retired/.test(e.message)), 'a deleted zone\'s name never goes to a second zone');
assert.ok(c.zones.checkObjectZoneList(fx('zone.object-zone-list', 'valid', 'same-name-other-env.json')).valid, 'the same name in the other environment is another bucket');
assert.ok(!/may be reused|name is free/.test(c.schema('zone.object-zone@1').description + JSON.stringify(c.schema('zone.object-zone@1').properties.state)), 'no contract text frees a name');

// The query string carries limit as a string: the same 1 to 200 holds.
for (const v of [1, 200, '1', '50', '200']) assert.ok(c.validate('zone.object-zone-list-query@1', { limit: v }).valid, `limit ${JSON.stringify(v)} is accepted`);
for (const v of [0, 201, '0', '201', '999', '050', '']) assert.ok(!c.validate('zone.object-zone-list-query@1', { limit: v }).valid, `limit ${JSON.stringify(v)} is refused`);

// Media's per-zone rollup names the zone's resource name (ADR-034 section 9).
const usage = fx('common.usage-recorded', 'valid', 'media-zone-stored-bytes.json');
assert.ok(c.validate('common.usage-recorded@1', usage).valid, 'a usage rollup carries a resource name');
assert.strictEqual(usage.resource, zone.ovrn, 'the rollup\'s resource is the zone\'s ovrn');
assert.strictEqual(usage.dimension, zone.id.toLowerCase(), 'and its dimension the zone id in lowercase');
assert.ok(usageLib.checkUsageRecorded(usage).valid, 'its resource is a resource of its own project');
const other = fx('common.usage-recorded', 'invalid', 'resource-names-other-project.json');
assert.ok(c.validate('common.usage-recorded@1', other).valid && !usageLib.checkUsageRecorded(other).valid, 'a resource of another project is refused by the cross-field check');
assert.strictEqual(c.catalog.find((e) => e.id === 'common.usage-recorded').version, '1.1.0', 'the optional resource field is a minor version');

// The usage answer's ovrn names its own zone_id.
assert.ok(zones.checkObjectZoneUsage(fx('zone.object-zone-usage', 'valid', 'month-to-date.json')).valid, 'a usage answer naming its zone passes');
const mismatched = zones.checkObjectZoneUsage(fx('zone.object-zone-usage', 'invalid', 'ovrn-names-other-zone.json'));
assert.ok(!mismatched.valid && mismatched.errors[0].path === '/ovrn', 'a usage answer whose ovrn names another zone is refused');
console.log('zones: all checks passed');
