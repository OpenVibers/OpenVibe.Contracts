'use strict';
/**
 * The network's product catalog (manifests/products/<domain>.json, contract registry.product@1): the
 * product domains no service manifest presents as a site. Together with the service manifests whose
 * site carries a tld, it is the catalog the OpenVibe.Sites repository used to hold (plan T11 lane D):
 * `catalog()` lists both homes, one row per domain.
 */
const fs = require('fs');
const path = require('path');
const services = require('./services');
const DIR = path.join(__dirname, '..', 'manifests', 'products');
const manifests = fs.readdirSync(DIR).filter(f => f.endsWith('.json')).sort()
    .map(f => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')));

/** The host a service manifest's site is served on. */
const siteDomain = (m) => (m.publicOrigin ? new URL(m.publicOrigin).host : m.site.host);

/** Every catalog domain with its home: { domain, home: 'service' | 'product', id, entry }. */
function catalog() {
    const rows = services.manifests.filter(m => m.site && m.site.tld)
        .map(m => ({ domain: siteDomain(m), home: 'service', id: m.id, entry: m.site }));
    for (const p of manifests) rows.push({ domain: p.domain, home: 'product', id: p.domain, entry: p });
    return rows.sort((a, b) => a.domain.localeCompare(b.domain));
}

module.exports = { manifests, get: (domain) => manifests.find(p => p.domain === domain), siteDomain, catalog };
