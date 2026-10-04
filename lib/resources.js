'use strict';
/**
 * Resource-name and control helpers (ADR-048, plan T13). The common.resource-* schemas hold every rule
 * JSON Schema can express; these checks add the ones that compare fields, so OpenVibe.Services (before
 * it sends a control call) and the owning authority (before it acts on one) hold it to the same bar:
 *
 *   contracts.resources.parse('ovrn:media:prj_…:object/med_…') -> { service, project_id, type, id } | null
 *   contracts.resources.format({ service, project_id, type, id }) -> 'ovrn:…'
 *   contracts.resources.nameOf(resourceSummary)                 -> the summary's ovrn, or null
 *   contracts.resources.checkControlRequest(q) -> { valid, errors: [{ path, message }] }
 *                                                  create names resource_kind, every other action a resource,
 *                                                  and the resource's project is project_id
 *   contracts.resources.checkControlResult(r)  -> { valid, errors }   and problem/confirmation_required fit state
 */
const registry = require('./registry');

const OVRN = /^ovrn:([a-z][a-z0-9-]{0,31}):(prj_[0-9A-HJKMNP-TV-Z]{26}):([a-z][a-z0-9-]{0,39})\/([a-z]{3}_[0-9A-HJKMNP-TV-Z]{26})$/;
const KIND = /^([a-z][a-z0-9-]{0,31})\.([a-z][a-z0-9-]{0,39})$/;

/** ovrn:<service>:<project_id>:<type>/<id> -> its four segments, or null when it is not a resource name. */
function parse(name) {
    const m = typeof name === 'string' ? OVRN.exec(name) : null;
    return m ? { service: m[1], project_id: m[2], type: m[3], id: m[4] } : null;
}

/** The four segments -> a resource name; throws when they do not make a valid one. */
function format({ service, project_id, type, id }) {
    const name = `ovrn:${service}:${project_id}:${type}/${id}`;
    if (!OVRN.test(name)) throw new TypeError(`not a resource name: ${name}`);
    return name;
}

/** The name of a common.resource-summary@1: its service, project_id, the second half of its kind and its id. */
function nameOf(summary) {
    const m = KIND.exec(String((summary && summary.kind) || ''));
    if (!m || m[1] !== summary.service) return null;
    const name = `ovrn:${summary.service}:${summary.project_id}:${m[2]}/${summary.id}`;
    return OVRN.test(name) ? name : null;
}

function checkName(name) { return registry.validate('common.resource-name@1', name); }

function checkControlRequest(q) {
    const r = registry.validate('common.resource-control-request@1', q);
    if (!r.valid) return r;
    const errors = [];
    if (q.action === 'create' && q.resource !== undefined) errors.push({ path: '/resource', message: 'create names resource_kind, not resource' });
    if (q.action !== 'create' && q.resource === undefined) errors.push({ path: '/resource', message: `required for ${q.action}` });
    // The project is the tenancy boundary: a call for project A never reaches a resource of project B.
    if (q.resource !== undefined && parse(q.resource).project_id !== q.project_id) errors.push({ path: '/resource', message: `must name a resource of project ${q.project_id}` });
    return { valid: errors.length === 0, errors };
}

function checkControlResult(res) {
    const r = registry.validate('common.resource-control-result@1', res);
    if (!r.valid) return r;
    const errors = [];
    const has = (k) => res[k] !== undefined;
    if (res.state === 'refused' && !has('problem') && !has('confirmation_required')) errors.push({ path: '/state', message: 'refused carries problem or confirmation_required' });
    if (res.state === 'failed' && !has('problem')) errors.push({ path: '/problem', message: 'required when failed' });
    if ((res.state === 'done' || res.state === 'pending') && has('problem')) errors.push({ path: '/problem', message: `not allowed when ${res.state}` });
    if (res.state !== 'refused' && has('confirmation_required')) errors.push({ path: '/confirmation_required', message: 'only when refused' });
    return { valid: errors.length === 0, errors };
}

module.exports = { parse, format, nameOf, checkName, checkControlRequest, checkControlResult };
