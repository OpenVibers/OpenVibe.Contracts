'use strict';
/**
 * The generated OpenAPI documents (roadmap WS-C task 6, lib/openapi.js → generated/openapi/): each is
 * a valid OpenAPI 3.1 document (@seriousme/openapi-schema-validator), every $ref resolves inside it,
 * operation ids are unique, and every HTTP route an active capability names appears as an operation of
 * its owner's document listing that capability, with its input and output schemas. A non-HTTP binding
 * is listed instead. The committed files match a fresh build (scripts/generate.js --check covers it too).
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { buildOpenApi, load, HTTP_RE } = require('../lib/openapi');

const ROOT = path.join(__dirname, '..');

(async () => {
    const { Validator } = await import('@seriousme/openapi-schema-validator');
    const src = load();
    const { docs, index } = buildOpenApi(src);
    const owners = new Set(src.capabilities.filter((c) => c.status === 'active').map((c) => c.owner));
    assert.deepStrictEqual(Object.keys(docs).sort(), [...owners].sort(), 'one document per owner of an active capability');
    assert.deepStrictEqual(index.map((i) => i.service).sort(), Object.keys(docs).sort());

    let operations = 0, refs = 0;
    for (const [svc, doc] of Object.entries(docs)) {
        const committed = JSON.parse(fs.readFileSync(path.join(ROOT, 'generated/openapi', `${svc}.json`), 'utf8'));
        assert.deepStrictEqual(committed, doc, `${svc}: generated/openapi is up to date (npm run generate)`);
        const r = await new Validator().validate(JSON.parse(JSON.stringify(doc)));
        assert.ok(r.valid, `${svc}: a valid OpenAPI 3.1 document: ${String(JSON.stringify(r.errors)).slice(0, 600)}`);
        assert.strictEqual(doc.info.version, src.version);
        const walk = (n) => {
            if (Array.isArray(n)) return n.forEach(walk);
            if (!n || typeof n !== 'object') return;
            for (const [k, v] of Object.entries(n)) {
                if (k === '$ref' && typeof v === 'string') {
                    refs++;
                    let cur = doc;
                    for (const part of v.replace(/^#\//, '').split('/')) cur = cur && cur[part.replace(/~1/g, '/').replace(/~0/g, '~')];
                    assert.ok(v.startsWith('#/') && cur !== undefined, `${svc}: ${v} resolves`);
                } else walk(v);
            }
        };
        walk(doc);
        const ids = new Set();
        for (const [p, methods] of Object.entries(doc.paths)) {
            for (const [m, op] of Object.entries(methods)) {
                operations++;
                assert.ok(!ids.has(op.operationId), `${svc}: ${op.operationId} is unique`);
                ids.add(op.operationId);
                assert.ok(op.responses['2XX'] && op.responses.default, `${svc} ${m} ${p}: success and problem responses`);
                assert.ok(op['x-openvibe-capabilities'].length && op.security.length, `${svc} ${m} ${p}: names its capabilities`);
            }
        }
    }

    // Every capability route is an operation of its owner that lists it, with its schemas.
    for (const cap of src.capabilities.filter((c) => c.status === 'active')) {
        const doc = docs[cap.owner];
        for (const route of cap.implementedBy || []) {
            const m = HTTP_RE.exec(String(route).trim());
            if (!m) { assert.ok((doc['x-openvibe-other-bindings'] || []).some((b) => b.capability === cap.id && b.binding === route), `${cap.id}: "${route}" listed as another binding`); continue; }
            const p = m[2].replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, '{$1}').replace(/\/+$/, '') || '/';
            for (const method of m[1].toLowerCase().split('|')) {
                const op = doc.paths[p] && doc.paths[p][method];
                assert.ok(op && op['x-openvibe-capabilities'].includes(cap.id), `${cap.id}: ${method.toUpperCase()} ${p} in ${cap.owner}'s document`);
                const text = JSON.stringify(op);
                const key = (ref) => `${ref.replace(/@(\d+)$/, '.v$1')}`;
                if (cap.outputSchema && !['common.binary@1', 'common.no-body@1'].includes(cap.outputSchema)) assert.ok(text.includes(`#/components/schemas/${key(cap.outputSchema)}"`), `${cap.id} ${method} ${p}: output ${cap.outputSchema}`);
                if (cap.inputSchema && !['common.binary@1', 'common.no-body@1'].includes(cap.inputSchema)) assert.ok(text.includes(`#/components/schemas/${key(cap.inputSchema)}"`), `${cap.id} ${method} ${p}: input ${cap.inputSchema}`);
            }
        }
    }
    console.log(`openapi: ${Object.keys(docs).length} services, ${operations} operations, ${refs} references, all valid OpenAPI 3.1`);
})().catch((err) => { console.error(err); process.exit(1); });
