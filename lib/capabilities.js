'use strict';
/**
 * Capability grants. A grant list comes from a service token's `cap` claim (or a user's role map).
 * `media.object.*` grants every capability under media.object; nothing else is implied.
 */
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'manifests', 'capabilities');
const manifests = fs.readdirSync(DIR).filter(f => f.endsWith('.json')).sort()
    .map(f => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')));
const byId = new Map(manifests.map(c => [c.id, c]));

function grants(granted, capabilityId) {
    if (!Array.isArray(granted)) return false;
    return granted.some(g => g === capabilityId || (g.endsWith('.*') && capabilityId.startsWith(g.slice(0, -1))));
}

/** Namespace constraint: a grant of ['live.*'] allows namespace 'live.vods' but not 'games.maps'. */
function namespaceAllowed(allowed, namespace) {
    if (!Array.isArray(allowed) || !allowed.length) return false;
    return allowed.some(n => n === '*' || n === namespace || (n.endsWith('.*') && (namespace === n.slice(0, -2) || namespace.startsWith(n.slice(0, -1)))));
}

/**
 * Decide one invocation. Returns { allowed, code, reason } — code is a stable problem code
 * (capability.unknown | capability.denied | capability.namespace_denied) when denied.
 */
function check(claims, capabilityId, { namespace } = {}) {
    const cap = byId.get(capabilityId);
    if (!cap) return { allowed: false, code: 'capability.unknown', reason: `no capability ${capabilityId}` };
    if (cap.status === 'retired') return { allowed: false, code: 'capability.unknown', reason: `${capabilityId} is retired` };
    if (!grants(claims && claims.cap, capabilityId)) return { allowed: false, code: 'capability.denied', reason: `${capabilityId} not granted` };
    if (cap.resourceConstraints.includes('namespace') && namespace !== undefined && !namespaceAllowed(claims.ns, namespace)) {
        return { allowed: false, code: 'capability.namespace_denied', reason: `namespace ${namespace} not granted` };
    }
    return { allowed: true, code: null, reason: null };
}

module.exports = { manifests, get: (id) => byId.get(id), grants, namespaceAllowed, check };
