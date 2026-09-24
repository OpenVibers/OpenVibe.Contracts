'use strict';
/**
 * Staff roles and staff capabilities (manifests/policy/staff-roles.json, contract
 * policy.staff-role-map@1, ADR-022). OpenVibe.Network owns the roles and issues the capabilities as
 * claims; every service asks `staff.can(claims, 'staff.<area>.<action>')` instead of comparing role
 * names. Until Network issues the capability claim, can() derives it from the role claims, so the
 * answer is the same before and after.
 *
 *   staff.roles                          ['user', 'streamer', 'global_mod', 'admin', 'owner']
 *   staff.effectiveRole(claims)          'owner' for role admin with the owner claim true, else the role
 *                                        claim (a role claim of 'owner' counts as user: owner is never stored)
 *   staff.atLeast(roleOrClaims, 'admin') role order check (prefer can())
 *   staff.capabilitiesOf(roleOrClaims)   every staff capability the role holds, sorted
 *   staff.can(roleOrClaims, capability)  exact id or a family grant ('staff.moderation.*'); a capability
 *                                        newer than the token's staff_map claim comes from its role
 *   staff.map.version                    what Network puts in the staff_map claim
 */
const fs = require('fs');
const path = require('path');

const MAP = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'manifests', 'policy', 'staff-roles.json'), 'utf8'));
const roles = MAP.roles.map(r => r.id);
const RANK = new Map(roles.map((r, i) => [r, i]));
const byId = new Map(MAP.capabilities.map(c => [c.id, c]));

/** The role a token or role string stands for; unknown or missing is the lowest role. */
function effectiveRole(v) {
    if (typeof v === 'string') return RANK.has(v) ? v : roles[0];
    if (!v || typeof v !== 'object') return roles[0];
    const r = v[MAP.claims.role];
    // owner is never a stored role: in claims it is role admin plus the owner claim (as Live's isOwner).
    if (v[MAP.claims.owner] === true && r === 'admin' && RANK.has('owner')) return 'owner';
    return RANK.has(r) && r !== 'owner' ? r : roles[0];
}

function atLeast(v, min) {
    if (!RANK.has(min)) throw new Error(`unknown staff role ${min}`);
    return RANK.get(effectiveRole(v)) >= RANK.get(min);
}

function capabilitiesOf(v) {
    const rank = RANK.get(effectiveRole(v));
    return MAP.capabilities.filter(c => RANK.get(c.minRole) <= rank).map(c => c.id).sort();
}

const semver = (s) => String(s || '1.0.0').split('.').map(n => parseInt(n, 10) || 0);
function older(a, b) {
    const x = semver(a), y = semver(b);
    for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] < y[i];
    return false;
}

/**
 * Does this holder have the staff capability? Issued claims win; otherwise derived from the role.
 * A capability added after the map the token's claims were issued from (staff_map claim, absent =
 * 1.0.0) is judged by the role: tokens live for days, and an addition should not wait for them.
 */
function can(v, capability) {
    const cap = byId.get(capability);
    if (!cap) throw new Error(`unknown staff capability ${capability}`);
    const issued = v && typeof v === 'object' && Array.isArray(v[MAP.claims.capabilities]) ? v[MAP.claims.capabilities] : null;
    const match = (held) => held.some(g => g === capability || (g.endsWith('.*') && capability.startsWith(g.slice(0, -1)) && g.split('.').length === 3));
    if (!issued) return match(capabilitiesOf(v));
    if (match(issued)) return true;
    return Boolean(cap.since) && older(v[MAP.claims.map], cap.since) && match(capabilitiesOf(v));
}

module.exports = { map: MAP, roles, effectiveRole, atLeast, capabilitiesOf, can, get: (id) => byId.get(id) };
