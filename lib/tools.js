'use strict';
/**
 * Tools registry helpers (ADR-027). tools.tool@1 holds every descriptor rule JSON Schema can express;
 * these checks add the ones that depend on the tool's id or compare two values, so a registry (and its
 * tests) can hold every descriptor to the same bar:
 *
 *   contracts.tools.checkDescriptor(d)   -> { valid, errors: [{ path, message }] }
 *   contracts.tools.checkList(list)      -> the same for a tools.tool-list@1 answer, every item included
 *   contracts.tools.jobInput(d, input)   -> the job input a job tool's run submits
 */
const registry = require('./registry');

const SCHEMA_REF = /\/api\/v1\/tools\/([a-z][a-z0-9-]{0,39})\/schema#\/\$defs\/(input|output)$/;
// A quota class names the work. Tiers (anonymous < session < user < app/service) and any later paid
// tier are allowances inside a class, so a class name never carries one.
const TIER_WORDS = /(^|-)(free|paid|pro|plus|premium|trial|tier|anon|anonymous|session|user|app|service|sandbox)(-|$)/;

const isRefOnly = (s) => !!s && typeof s.$ref === 'string' && Object.keys(s).length === 1;

/** Every rule for one descriptor: the schema's, then the ones that depend on its id. */
function checkDescriptor(d) {
    const r = registry.validate('tools.tool@1', d);
    if (!r.valid) return r;
    const errors = [];
    const err = (path, message) => errors.push({ path, message });
    if (d.run && d.run.path !== `/api/v1/tools/${d.id}/run`) err('/run/path', `must be /api/v1/tools/${d.id}/run`);
    if (d.run && (d.run.legacy || []).some(l => l.split(' ')[1].startsWith('/api/v1/tools/'))) err('/run/legacy', 'lists older routes, never the run API');
    if (d.files && d.files.min > d.files.max) err('/files', 'min must not exceed max');
    for (const [at, s, want] of [['/input', d.input, 'input'], ['/output/schema', d.output.schema, 'output']]) {
        if (!isRefOnly(s)) continue;
        const m = SCHEMA_REF.exec(s.$ref);
        if (!m || m[1] !== d.id || m[2] !== want) err(`${at}/$ref`, `must point at /api/v1/tools/${d.id}/schema#/$defs/${want}`);
    }
    if (TIER_WORDS.test(d.quotaClass)) err('/quotaClass', 'names the work, never a caller tier or a price');
    return { valid: errors.length === 0, errors };
}

/** A GET /api/v1/tools answer: the schema, every descriptor, unique ids and hosts, honest counts. */
function checkList(list) {
    const r = registry.validate('tools.tool-list@1', list);
    if (!r.valid) return r;
    const errors = [];
    const err = (path, message) => errors.push({ path, message });
    if (list.count !== list.tools.length) err('/count', `is ${list.count} for ${list.tools.length} tools`);
    const ids = new Set();
    const hosts = new Map();
    list.tools.forEach((d, i) => {
        if (ids.has(d.id)) err(`/tools/${i}/id`, `${d.id} is listed twice`);
        ids.add(d.id);
        for (const h of d.hosts) {
            if (hosts.has(h)) err(`/tools/${i}/hosts`, `${h} is already ${hosts.get(h)}'s`);
            else hosts.set(h, d.id);
        }
        for (const e of checkDescriptor(d).errors) err(`/tools/${i}${e.path === '/' ? '' : e.path}`, e.message);
    });
    for (const [i, f] of (list.families || []).entries()) {
        const n = list.tools.filter(t => t.family === f.id).length;
        if (n !== f.count) err(`/families/${i}/count`, `is ${f.count} for ${n} ${f.id} tools`);
    }
    return { valid: errors.length === 0, errors };
}

/** The job input a job tool's run submits: { ...input, ...preset, tool: operation }; null for other tools. */
function jobInput(d, input = {}) {
    const job = d && d.run && d.run.job;
    if (!job) return null;
    return { ...(input || {}), ...(job.preset || {}), tool: job.operation };
}

module.exports = { checkDescriptor, checkList, jobInput };
