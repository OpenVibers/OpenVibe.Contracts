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
const byId = new Map();
for (const entry of catalog) {
    const schema = JSON.parse(fs.readFileSync(path.join(CONTRACTS, entry.schema), 'utf8'));
    ajv.addSchema(schema);
    byId.set(entry.id, { ...entry, $id: schema.$id, schemaObject: schema });
}

/** 'identity.subject-ref' | 'identity.subject-ref@1' | an alias -> catalog entry. */
function resolve(ref) {
    const [raw, major] = String(ref).split('@');
    const id = aliases[raw] || raw;
    const entry = byId.get(id);
    if (!entry) throw new Error(`unknown contract "${ref}"`);
    if (major && entry.version.split('.')[0] !== major) throw new Error(`contract "${id}" is v${entry.version}, not @${major}`);
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
