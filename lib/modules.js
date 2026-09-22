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

module.exports = { namespaces, get: (n) => byNs.get(n), validateData, publicView, canWrite, sizeOf };
