'use strict';
/**
 * Object zone helpers (ADR-031 amendment 2026-10-02). zone.object-zone@1 holds every rule JSON Schema
 * can express; these checks add the ones that compare two fields, so Zone (before it stores or returns
 * a record) and Media (on every provision call) hold a zone's identity to the same bar:
 *
 *   contracts.zones.checkObjectZone(z)      -> { valid, errors: [{ path, message }] }
 *   contracts.zones.checkObjectZoneList(l)  -> the same for a zone.object-zone-list@1 answer, every item included,
 *                                              and no name held by two zones of one project environment
 *   contracts.zones.checkObjectZoneUsage(u) -> the same for a zone.object-zone-usage@1 answer: its ovrn names its zone_id
 *   contracts.zones.identity(z)             -> { ovrn, media_namespace } derived from project_id, env, id and default
 */
const registry = require('./registry');

/** The OVRN and Media namespace a zone must carry, derived from the fields that define it. */
function identity(z) {
    const root = `app.${z.project_id}${z.env === 'sandbox' ? '.sandbox' : ''}`;
    return { ovrn: `ovrn:zone:${z.project_id}:object-zone/${z.id}`, media_namespace: z.default ? root : `${root}.${z.id}` };
}

/** Every rule for one zone record: the schema's, then that ovrn and media_namespace name this zone. */
function checkObjectZone(z) {
    const r = registry.validate('zone.object-zone@1', z);
    if (!r.valid) return r;
    const want = identity(z);
    const errors = ['ovrn', 'media_namespace'].filter(k => z[k] !== want[k]).map(k => ({ path: `/${k}`, message: `must be ${want[k]}` }));
    return { valid: errors.length === 0, errors };
}

function checkObjectZoneList(list) {
    const r = registry.validate('zone.object-zone-list@1', list);
    if (!r.valid) return r;
    const errors = [];
    list.zones.forEach((z, i) => { for (const e of checkObjectZone(z).errors) errors.push({ path: `/zones/${i}${e.path}`, message: e.message }); });
    // A name belongs to one zone of its environment for ever, deleted or not: that is what binds a signed request to one zone id.
    const owner = new Map();
    list.zones.forEach((z, i) => {
        const k = `${z.project_id}/${z.env}/${z.name}`;
        if (owner.has(k) && owner.get(k) !== z.id) errors.push({ path: `/zones/${i}/name`, message: `is retired: it belongs to ${owner.get(k)} in this environment` });
        else owner.set(k, z.id);
    });
    return { valid: errors.length === 0, errors };
}

/** Every rule for a zone's usage answer: the schema's, then that ovrn names the zone the answer is for. */
function checkObjectZoneUsage(u) {
    const r = registry.validate('zone.object-zone-usage@1', u);
    if (!r.valid) return r;
    const errors = u.ovrn.endsWith(`:object-zone/${u.zone_id}`) ? [] : [{ path: '/ovrn', message: `must name zone ${u.zone_id}` }];
    return { valid: errors.length === 0, errors };
}

module.exports = { checkObjectZone, checkObjectZoneList, checkObjectZoneUsage, identity };
