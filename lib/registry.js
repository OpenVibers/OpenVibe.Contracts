'use strict';
/** Loads the catalog and compiles every schema once (Ajv, JSON Schema 2020-12). */
const fs = require('fs');
const path = require('path');
const Ajv2020 = require('ajv/dist/2020');
const addFormats = require('ajv-formats');

const ROOT = path.join(__dirname, '..');
const CONTRACTS = path.join(ROOT, 'contracts');
const catalog = JSON.parse(fs.readFileSync(path.join(CONTRACTS, 'catalog.json'), 'utf8')).contracts;
const aliases = JSON.parse(fs.readFileSync(path.join(ROOT, 'compatibility/aliases.json'), 'utf8')).aliases;
const deprecations = JSON.parse(fs.readFileSync(path.join(ROOT, 'compatibility/deprecations.json'), 'utf8')).deprecations;

const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false, allowUnionTypes: true });
addFormats(ajv);
// One contract id may hold more than one major (a v2 file, a catalog entry each). The bare id always
// resolves to the newest major listed, and `id@N` to that major, so a v1 caller keeps resolving while
// a v2 caller names it exactly. The catalog lists versions in ascending order.
const byRef = new Map();
for (const entry of catalog) {
    const schema = JSON.parse(fs.readFileSync(path.join(CONTRACTS, entry.schema), 'utf8'));
    ajv.addSchema(schema);
    const record = { ...entry, $id: schema.$id, schemaObject: schema };
    byRef.set(`${entry.id}@${entry.version.split('.')[0]}`, record);
    byRef.set(entry.id, record);
}

/** 'identity.subject-ref' | 'identity.subject-ref@1' | an alias -> catalog entry (the newest major, or the named one). */
function resolve(ref) {
    const [raw, major] = String(ref).split('@');
    const id = aliases[raw] || raw;
    const entry = major ? byRef.get(`${id}@${major}`) : byRef.get(id);
    if (!entry) {
        const known = byRef.get(id);
        if (major && known) throw new Error(`contract "${id}" is v${known.version}, not @${major}`);
        throw new Error(`unknown contract "${ref}"`);
    }
    return entry;
}

function validate(ref, value) {
    const entry = resolve(ref);
    const fn = ajv.getSchema(entry.$id);
    const valid = fn(value);
    return { valid, errors: valid ? [] : fn.errors.map(e => ({ path: e.instancePath || '/', message: e.message })) };
}

function assertValid(ref, value) {
    const r = validate(ref, value);
    if (!r.valid) {
        const err = new Error(`${ref}: ${r.errors.map(e => `${e.path} ${e.message}`).join('; ')}`);
        err.code = 'contract.invalid';
        err.errors = r.errors;
        throw err;
    }
    return value;
}

function schema(ref) { return resolve(ref).schemaObject; }

module.exports = { catalog, aliases, deprecations, resolve, validate, assertValid, schema, ajv, ROOT };
