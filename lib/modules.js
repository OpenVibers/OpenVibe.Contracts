'use strict';
/**
 * User-module namespaces (manifests/namespaces/*.json, contract modules.namespace@1).
 * Network stores the records; every service uses the same rules through these helpers.
 */
const fs = require('fs');
const path = require('path');
const { ajv } = require('./registry');

const DIR = path.join(__dirname, '..', 'manifests', 'namespaces');
const namespaces = fs.readdirSync(DIR).filter(f => f.endsWith('.json')).sort()
    .map(f => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')));
const byNs = new Map(namespaces.map(n => [n.namespace, n]));
const validators = new Map(namespaces.map(n => [n.namespace, ajv.compile(n.schema)]));

const sizeOf = (data) => Buffer.byteLength(JSON.stringify(data));

/** { valid, errors } for a value in a namespace: its schema plus its quota. */
function validateData(namespace, data) {
    const ns = byNs.get(namespace);
    if (!ns) return { valid: false, errors: [{ path: '/', message: `unknown namespace ${namespace}` }] };
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { valid: false, errors: [{ path: '/', message: 'data must be an object' }] };
    const fn = validators.get(namespace);
    const errors = fn(data) ? [] : fn.errors.map(e => ({ path: e.instancePath || '/', message: e.message }));
    const size = sizeOf(data);
    if (size > ns.quotaBytes) errors.push({ path: '/', message: `${size} bytes exceeds the ${ns.quotaBytes}-byte quota` });
    return { valid: errors.length === 0, errors };
}

/** Only the fields the namespace declares public. */
function publicView(namespace, data) {
    const ns = byNs.get(namespace);
    const out = {};
    if (!ns || !data) return out;
    for (const f of ns.publicFields) if (Object.prototype.hasOwnProperty.call(data, f)) out[f] = data[f];
    return out;
}

/** May this writer write? writer = { type: 'user' } | { type: 'service', id } */
function canWrite(namespace, writer) {
    const ns = byNs.get(namespace);
    if (!ns || !writer) return false;
    if (writer.type === 'user') return ns.writers.includes('user');
    if (writer.type === 'service') return ns.writers.includes('owner') && writer.id === ns.owner;
    return false;
}

/**
 * What a service may read of a record (field-level read rules): the owner everything; another service
 * the public fields plus the fields `readers` lists for it.
 */
function serviceView(namespace, service, data) {
    const ns = byNs.get(namespace);
    if (!ns || !data) return {};
    if (service === ns.owner) return { ...data };
    const allowed = new Set([...ns.publicFields, ...((ns.readers && ns.readers[service]) || [])]);
    const out = {};
    for (const f of allowed) if (Object.prototype.hasOwnProperty.call(data, f)) out[f] = data[f];
    return out;
}

/**
 * Upgrade a stored record to the namespace's version through its declarative `migrations`
 * (rename, then drop, then defaults, per step). Returns { data, version, upgraded } or null when no
 * chain of migrations leads from `version` to the current one.
 */
function upgrade(namespace, data, version) {
    const ns = byNs.get(namespace);
    if (!ns) return null;
    let v = Number(version) || 1;
    let out = { ...(data || {}) };
    if (v >= ns.version) return { data: out, version: v, upgraded: false };
    while (v < ns.version) {
        const step = (ns.migrations || []).find(m => m.from === v);
        if (!step || step.to <= v) return null;
        for (const [from, to] of Object.entries(step.rename || {})) {
            if (Object.prototype.hasOwnProperty.call(out, from)) { out[to] = out[from]; delete out[from]; }
        }
        for (const f of step.drop || []) delete out[f];
        for (const [f, val] of Object.entries(step.defaults || {})) if (!Object.prototype.hasOwnProperty.call(out, f)) out[f] = val;
        v = step.to;
    }
    return { data: out, version: v, upgraded: true };
}

module.exports = { namespaces, get: (n) => byNs.get(n), validateData, publicView, serviceView, upgrade, canWrite, sizeOf };
