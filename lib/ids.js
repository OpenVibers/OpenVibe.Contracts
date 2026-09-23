'use strict';
/**
 * Canonical identifiers. ULIDs (Crockford base32, 48-bit ms time + 80-bit randomness) sort by creation
 * time, which keeps SQLite/Postgres indexes append-mostly.
 */
const crypto = require('crypto');

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const PREFIX = { user: 'usr', guest: 'gst', app: 'app', mod: 'mod', event: 'evt', media: 'med', project: 'prj' };
const SLUG_TYPES = new Set(['service', 'system']);
const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/;
const SLUG_RE = /^[a-z][a-z0-9-]{1,39}$/;
const SUBJECT_TYPES = ['user', 'guest', 'service', 'app', 'mod', 'system'];

function ulid(now = Date.now()) {
    let time = '';
    for (let t = now, i = 0; i < 10; i++, t = Math.floor(t / 32)) time = ALPHABET[t % 32] + time;
    const bytes = crypto.randomBytes(16);
    let rand = '';
    for (let i = 0; i < 16; i++) rand += ALPHABET[bytes[i] % 32];
    return time + rand;
}

/** New id for a kind that has a prefix: newId('user') -> 'usr_01J...'. */
function newId(kind, now) {
    const p = PREFIX[kind];
    if (!p) throw new TypeError(`no id prefix for kind "${kind}"`);
    return `${p}_${ulid(now)}`;
}

function isSubjectId(type, id) {
    if (typeof id !== 'string') return false;
    if (SLUG_TYPES.has(type)) return SLUG_RE.test(id);
    const p = PREFIX[type];
    return Boolean(p) && id.startsWith(p + '_') && ULID_RE.test(id.slice(p.length + 1));
}

/** 'user:usr_01J...' <-> { type, id }. Returns null for anything malformed. */
function parseSubject(str) {
    if (typeof str !== 'string') return null;
    const i = str.indexOf(':');
    if (i < 1) return null;
    const type = str.slice(0, i);
    const id = str.slice(i + 1);
    return SUBJECT_TYPES.includes(type) && isSubjectId(type, id) ? { type, id } : null;
}

function formatSubject(ref) {
    if (!ref || !isSubjectId(ref.type, ref.id)) throw new TypeError('invalid SubjectRef');
    return `${ref.type}:${ref.id}`;
}

/** Service-token `sub` claim: svc:<slug> | app:app_<ULID> | mod:mod_<ULID>. */
function principalSub(ref) {
    if (ref.type === 'service' && SLUG_RE.test(ref.id)) return `svc:${ref.id}`;
    if ((ref.type === 'app' || ref.type === 'mod') && isSubjectId(ref.type, ref.id)) return `${ref.type}:${ref.id}`;
    throw new TypeError('principals are service, app or mod subjects');
}

/** Transitional Media reference for today's rows (Wave 4 introduces med_ ids). */
function legacyMediaId(app, kind, id) {
    return `legacy:${app}:${kind}:${id}`;
}

module.exports = { ulid, newId, isSubjectId, parseSubject, formatSubject, principalSub, legacyMediaId, SUBJECT_TYPES, PREFIX };
