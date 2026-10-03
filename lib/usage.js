'use strict';
/**
 * Usage rollup helpers (roadmap WS-N task 4). common.usage-recorded@1 holds every rule JSON Schema can
 * express; this check adds the one that compares two fields, so the producer (before it writes its
 * outbox) and OpenVibe.Network (before it adds a rollup up) hold a rollup to the same bar:
 *
 *   contracts.usage.checkUsageRecorded(u) -> { valid, errors: [{ path, message }] }
 *                                            and a resource names a resource of the rollup's own project_id
 */
const registry = require('./registry');

function checkUsageRecorded(u) {
    const r = registry.validate('common.usage-recorded@1', u);
    if (!r.valid) return r;
    // ovrn:<service>:<project_id>:<type>/<id>: usage is attributed to project_id, so the resource must be one of its own.
    const errors = [];
    if (u.resource !== undefined && u.resource.split(':')[2] !== u.project_id) errors.push({ path: '/resource', message: `must name a resource of project ${u.project_id}` });
    return { valid: errors.length === 0, errors };
}

module.exports = { checkUsageRecorded };
