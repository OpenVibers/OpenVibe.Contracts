'use strict';
/**
 * OpenAPI 3.1 documents per service, generated from the contracts (roadmap WS-C task 6).
 *
 * Every active capability names the routes that implement it (`implementedBy`: "METHOD /path",
 * "PUT|DELETE /path", optionally "(a note)") and its input and output schemas. For each owning
 * service this builds one document:
 *
 *   servers     the service's public origin (manifests/services/<id>.json publicOrigin)
 *   paths       every HTTP route of its capabilities (":param" becomes "{param}"); a route several
 *               capabilities share is one operation listing all of them
 *   operation   requestBody from the input schema on POST/PUT/PATCH (multipart for uploads,
 *               octet-stream for common.binary@1; none for common.no-body@1); query parameters from a
 *               plain object input schema on GET/HEAD/DELETE; 2XX from the output schema; default is
 *               application/problem+json (errors.problem@1); security: a bearer token carrying the
 *               capability (x-openvibe-capabilities, x-openvibe-visibility, x-openvibe-quota-class)
 *   components  every schema reached, keyed "<contract id>.v<major>", with $id/$schema dropped and
 *               every $ref (relative files, "#/…" inside a schema) rewritten to "#/components/schemas/…";
 *               a property literally named "$ref" becomes the equivalent patternProperties "^\\$ref$"
 *
 * Non-HTTP bindings (a WebSocket frame, a mod runtime call) are listed in x-openvibe-other-bindings.
 * The documents describe route shapes as the contracts know them; a service may answer more.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const HTTP_RE = /^((?:GET|POST|PUT|PATCH|DELETE|HEAD)(?:\|(?:GET|POST|PUT|PATCH|DELETE|HEAD))*)\s+(\/[^\s(]*)\s*(?:\((.*)\))?\s*$/;
const BODY_METHODS = new Set(['post', 'put', 'patch']);
const NO_BODY = 'common.no-body@1';
const BINARY = 'common.binary@1';
const MULTIPART = new Set(['media.file-upload@1']);
const PROBLEM = 'errors.problem@1';

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const firstSentence = (s) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); const m = /^(.{20,200}?[.!?])(\s|$)/.exec(t); return m ? m[1] : t.slice(0, 200); };

function load() {
    const catalog = readJson('contracts/catalog.json').contracts;
    const capabilities = fs.readdirSync(path.join(ROOT, 'manifests/capabilities')).filter((f) => f.endsWith('.json')).sort()
        .map((f) => readJson(`manifests/capabilities/${f}`));
    const services = Object.fromEntries(fs.readdirSync(path.join(ROOT, 'manifests/services')).filter((f) => f.endsWith('.json'))
        .map((f) => { const m = readJson(`manifests/services/${f}`); return [m.id, m]; }));
    const version = readJson('package.json').version;
    return { catalog, capabilities, services, version };
}

/** → { docs: { <service id>: OpenAPI 3.1 document }, index: [{ service, name, origin, operations, capabilities }] } */
function buildOpenApi({ catalog, capabilities, services, version } = load()) {
    // "tools.job@1" and "tools/job.v1.json" → the catalog entry and its component key.
    const byRef = new Map(), byFile = new Map();
    for (const e of catalog) {
        const major = String(e.version).split('.')[0];
        const key = `${e.id}.v${major}`;
        const entry = { ...e, key, ref: `${e.id}@${major}` };
        byRef.set(entry.ref, entry);
        byFile.set(e.schema, entry);
    }
    const schemaCache = new Map();
    function componentFor(entry) {
        if (schemaCache.has(entry.key)) return schemaCache.get(entry.key);
        const raw = readJson(`contracts/${entry.schema}`);
        const dir = path.posix.dirname(entry.schema);
        const deps = new Set();
        const rewrite = (node) => {
            if (Array.isArray(node)) return node.map(rewrite);
            if (!node || typeof node !== 'object') return node;
            const out = {};
            for (const [k, v] of Object.entries(node)) {
                if (k === '$id' || k === '$schema') continue;
                if (k === '$ref' && typeof v === 'string') {
                    const [file, frag = ''] = v.split('#');
                    if (!file) { out[k] = `#/components/schemas/${entry.key}${frag}`; continue; }
                    const rel = /^https:\/\/openvibe\.network\/contracts\//.test(file) ? file.replace(/^https:\/\/openvibe\.network\/contracts\//, '') : path.posix.normalize(path.posix.join(dir, file));
                    const target = byFile.get(rel);
                    if (!target) throw new Error(`openapi: ${entry.schema} refers to ${v}, which is not in the catalog`);
                    deps.add(target);
                    out[k] = `#/components/schemas/${target.key}${frag}`;
                    continue;
                }
                if (k === 'properties' && v && typeof v === 'object' && v.$ref && typeof v.$ref === 'object') {
                    // A property literally named "$ref" (tools.tool@1 lets a field be { "$ref": uri }) is the
                    // same as patternProperties "^\\$ref$", which OpenAPI tools do not mistake for a reference.
                    const { $ref: named, ...rest } = v;
                    out[k] = rewrite(rest);
                    out.patternProperties = { ...(out.patternProperties || {}), '^\\$ref$': rewrite(named) };
                    continue;
                }
                out[k] = rewrite(v);
            }
            return out;
        };
        const schema = rewrite(raw);
        const c = { schema, deps: [...deps] };
        schemaCache.set(entry.key, c);
        return c;
    }
    const refOf = (ref, where) => {
        const e = byRef.get(ref);
        if (!e) throw new Error(`openapi: ${where} names ${ref}, which is not in the catalog`);
        return e;
    };

    const docs = {};
    const index = [];
    const owners = [...new Set(capabilities.filter((c) => c.status === 'active').map((c) => c.owner))].sort();
    for (const owner of owners) {
        const svc = services[owner] || { id: owner, name: owner };
        const used = new Map();   // key → entry
        const use = (entry) => {
            if (used.has(entry.key)) return;
            used.set(entry.key, entry);
            for (const d of componentFor(entry).deps) use(d);
        };
        const ops = new Map();    // "method path" → { method, path, caps: [] }
        const other = [];
        const caps = capabilities.filter((c) => c.owner === owner && c.status === 'active');
        for (const cap of caps) {
            for (const route of cap.implementedBy || []) {
                const m = HTTP_RE.exec(String(route).trim());
                if (!m) { other.push({ capability: cap.id, binding: route }); continue; }
                const p = m[2].replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, '{$1}').replace(/\/+$/, '') || '/';
                for (const method of m[1].toLowerCase().split('|')) {
                    const k = `${method} ${p}`;
                    if (!ops.has(k)) ops.set(k, { method, path: p, caps: [], notes: [] });
                    const op = ops.get(k);
                    if (!op.caps.includes(cap)) op.caps.push(cap);
                    if (m[3]) op.notes.push(m[3]);
                }
            }
        }
        const paths = {};
        const problem = refOf(PROBLEM, 'openapi');
        use(problem);
        const oneOrAny = (entries) => {
            const uniq = [...new Map(entries.map((e) => [e.key, e])).values()];
            uniq.forEach(use);
            const refs = uniq.map((e) => ({ $ref: `#/components/schemas/${e.key}` }));
            return refs.length === 1 ? refs[0] : { anyOf: refs };
        };
        for (const op of [...ops.values()].sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method))) {
            const ids = op.caps.map((c) => c.id);
            const operation = {
                operationId: `${op.method}_${op.path.replace(/[{}]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '')}`,
                summary: firstSentence(op.caps[0].description),
                description: op.caps.map((c) => `**${c.id}** (${c.visibility}): ${String(c.description || '').trim()}`).join('\n\n') + (op.notes.length ? `\n\nRoute note: ${[...new Set(op.notes)].join('; ')}` : ''),
                tags: [...new Set(op.caps.map((c) => c.id.split('.').slice(0, 2).join('.')))],
                'x-openvibe-capabilities': ids,
                'x-openvibe-visibility': [...new Set(op.caps.map((c) => c.visibility))],
                ...(op.caps[0].quotaClass && { 'x-openvibe-quota-class': op.caps[0].quotaClass }),
                security: [...ids.map((id) => ({ openvibeToken: [id] })), ...(op.caps.some((c) => (c.permissions || []).includes('none')) ? [{}] : [])],
            };
            const params = [...op.path.matchAll(/\{([^}]+)\}/g)].map((x) => ({ name: x[1], in: 'path', required: true, schema: { type: 'string' } }));
            const inputs = op.caps.map((c) => c.inputSchema).filter((r) => r && r !== NO_BODY);
            if (BODY_METHODS.has(op.method) && inputs.length) {
                const entries = inputs.map((r) => refOf(r, op.caps[0].id));
                const content = {};
                if (inputs.some((r) => MULTIPART.has(r))) content['multipart/form-data'] = { schema: oneOrAny(entries.filter((e) => MULTIPART.has(e.ref))) };
                if (inputs.includes(BINARY)) content['application/octet-stream'] = { schema: { type: 'string', contentEncoding: 'binary' } };
                const json = entries.filter((e) => !MULTIPART.has(e.ref) && e.ref !== BINARY);
                if (json.length) content['application/json'] = { schema: oneOrAny(json) };
                operation.requestBody = { required: false, content };
            } else if (inputs.length) {
                // A read's input is its query string when it is a plain object schema.
                const entries = inputs.map((r) => refOf(r, op.caps[0].id));
                for (const e of entries) {
                    const s = componentFor(e).schema;
                    if (s && s.type === 'object' && s.properties && !s.anyOf && !s.oneOf) {
                        for (const [name, prop] of Object.entries(s.properties)) {
                            if (params.some((x) => x.name === name)) continue;
                            params.push({ name, in: 'query', required: (s.required || []).includes(name), schema: prop, ...(prop.description && { description: prop.description }) });
                        }
                    }
                }
                operation['x-openvibe-input'] = oneOrAny(entries);
            }
            if (params.length) operation.parameters = params;
            const outputs = op.caps.map((c) => c.outputSchema).filter(Boolean);
            const ok = { description: 'Success' };
            if (outputs.includes(BINARY)) ok.content = { 'application/octet-stream': { schema: { type: 'string', contentEncoding: 'binary' } } };
            const jsonOut = outputs.filter((r) => r !== BINARY && r !== NO_BODY).map((r) => refOf(r, op.caps[0].id));
            if (jsonOut.length) ok.content = { ...(ok.content || {}), 'application/json': { schema: oneOrAny(jsonOut) } };
            operation.responses = {
                '2XX': ok,
                default: { description: 'An error (RFC 9457 problem details)', content: { 'application/problem+json': { schema: { $ref: `#/components/schemas/${problem.key}` } } } },
            };
            (paths[op.path] = paths[op.path] || {})[op.method] = operation;
        }
        const schemas = {};
        for (const key of [...used.keys()].sort()) schemas[key] = componentFor(used.get(key)).schema;
        docs[owner] = {
            openapi: '3.1.0',
            jsonSchemaDialect: 'https://json-schema.org/draft/2020-12/schema',
            info: {
                title: `${svc.name || owner} API`,
                version,
                description: `Routes of ${svc.name || owner} as the OpenVibe contracts describe them (openvibe-contracts ${version}): each operation lists the capabilities it performs; a token for the service's audience must carry one of them unless the route is open. Generated by openvibe-contracts lib/openapi.js; do not edit.`,
                license: { name: 'MIT', identifier: 'MIT' },
            },
            ...(svc.publicOrigin && { servers: [{ url: svc.publicOrigin }] }),
            paths,
            components: {
                schemas,
                securitySchemes: {
                    openvibeToken: {
                        type: 'http', scheme: 'bearer', bearerFormat: 'JWT',
                        description: 'An OpenVibe Network token for this service: a person\'s token, an app token (client credentials, audience of the service) or a first-party service token. Its `cap` claim must include the capability the operation names.',
                    },
                },
            },
            ...(other.length && { 'x-openvibe-other-bindings': other }),
        };
        index.push({ service: owner, name: svc.name || owner, origin: svc.publicOrigin || null, operations: Object.values(paths).reduce((n, p) => n + Object.keys(p).length, 0), capabilities: caps.length });
    }
    return { docs, index };
}

/** The committed documents (generated/openapi): index() → [{ service, name, origin, operations, capabilities }]. */
function index() { return readJson('generated/openapi/index.json').services; }
/** document('tools') → that service's OpenAPI 3.1 document, or null. */
function document(service) {
    if (!/^[a-z][a-z0-9-]{0,39}$/.test(String(service || ''))) return null;
    const file = path.join(ROOT, 'generated/openapi', `${service}.json`);
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
}

module.exports = { buildOpenApi, load, index, document, HTTP_RE };
