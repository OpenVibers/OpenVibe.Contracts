'use strict';
// The product catalog (plan T11 lane D): every domain the OpenVibe.Sites catalog held has exactly one
// home in Contracts, a service manifest's site carrying a tld or manifests/products/<domain>.json,
// and every home validates.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const contracts = require('..');
const { services, products } = contracts;

const ROOT = path.join(__dirname, '..');
let checks = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); checks++; };

const DIR = path.join(ROOT, 'manifests/products');
for (const f of fs.readdirSync(DIR).filter(f => f.endsWith('.json'))) {
    const p = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
    const r = contracts.validate('registry.product@1', p);
    ok(r.valid, `product ${f}: ${JSON.stringify(r.errors)}`);
    ok(f === `${p.domain}.json`, `${f} is named after its domain`);
}
for (const m of services.manifests) {
    ok(contracts.validate('registry.service-manifest@1', m).valid, `service manifest ${m.id} validates`);
    if (m.site && m.site.tld) ok((m.domains || []).includes(products.siteDomain(m)), `${m.id}: its site domain ${products.siteDomain(m)} is one of its domains`);
}

const homes = new Map();
for (const row of products.catalog()) homes.set(row.domain, [...(homes.get(row.domain) || []), `${row.home}:${row.id}`]);
for (const [domain, list] of homes) ok(list.length === 1, `${domain} has one home, not ${list.join(', ')}`);

const snapshot = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/sites-domains.json'), 'utf8')).domains;
ok(snapshot.length === 34 && new Set(snapshot).size === 34, 'the Sites snapshot holds 34 distinct domains (ai.openvibe.network retired 2026-10-10)');
for (const d of snapshot) ok((homes.get(d) || []).length === 1, `${d} (OpenVibe.Sites) has exactly one Contracts home: ${(homes.get(d) || ['none']).join(', ')}`);

for (const p of products.manifests) {
    const rel = p.relationships || {};
    const serving = services.manifests.filter(m => (m.domains || []).includes(p.domain)).map(m => m.id);
    if (rel.service) ok(!!services.get(rel.service), `${p.domain}: relationships.service ${rel.service} is a service manifest`);
    if (serving.length) ok(serving.length === 1 && rel.service === serving[0], `${p.domain} is served by ${serving.join(', ')}, and relationships.service says so`);
    ok(!(rel.noRepo && rel.plannedRepo), `${p.domain}: a repository is either planned or absent`);
    if (p.kind) ok((rel.links || []).length > 0, `${p.domain} is ${p.kind}: its links say where to go`);
}
console.log(`product catalog: ${checks} checks passed (${homes.size} catalog domains)`);
