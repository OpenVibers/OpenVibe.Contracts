'use strict';
/**
 * Service/app principal tokens (contract identity.service-token-claims@1, ADR-003).
 *
 * Receivers: verifyServiceToken() checks an RS256 client-credentials JWT from OpenVibe.Network
 * (signature, issuer, audience, expiry, claim shape) and requireCapability() turns that into an
 * Express guard that answers with problem+json. Callers: createTokenClient() fetches and caches a
 * token from Network's /oauth/token (grant_type=client_credentials).
 *
 * Node's crypto only; no JWT library, so the rules are exactly the ones written here.
 */
const crypto = require('crypto');
const { validate } = require('./registry');
const capabilities = require('./capabilities');
const http = require('./http');

const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const fromB64url = (s) => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');

/** Sign claims (RS256). Used by the issuer (Network) and by tests. */
function signServiceToken(claims, privateKey, { kid } = {}) {
    const header = { alg: 'RS256', typ: 'JWT', ...(kid ? { kid } : {}) };
    const input = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;
    return `${input}.${b64url(crypto.sign('RSA-SHA256', Buffer.from(input), privateKey))}`;
}

/**
 * Verify a service token. Returns { ok: true, claims } or { ok: false, code, reason } where code is a
 * stable problem code: token.malformed | token.bad_signature | token.expired | token.wrong_issuer |
 * token.wrong_audience | token.invalid_claims.
 */
function verifyServiceToken(token, { publicKey, issuer, audience, clockSkewSec = 30, now = Date.now(), acceptSandbox = false } = {}) {
    const fail = (code, reason) => ({ ok: false, code, reason });
    const parts = typeof token === 'string' ? token.split('.') : [];
    if (parts.length !== 3) return fail('token.malformed', 'not a JWT');
    let header, claims;
    try { header = JSON.parse(fromB64url(parts[0])); claims = JSON.parse(fromB64url(parts[1])); } catch { return fail('token.malformed', 'undecodable'); }
    if (header.alg !== 'RS256') return fail('token.malformed', `alg ${header.alg} not accepted`);
    let good = false;
    try { good = crypto.verify('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), publicKey, fromB64url(parts[2])); } catch { good = false; }
    if (!good) return fail('token.bad_signature', 'signature does not verify');
    const t = Math.floor(now / 1000);
    if (typeof claims.exp !== 'number' || claims.exp + clockSkewSec < t) return fail('token.expired', 'expired');
    if (typeof claims.iat === 'number' && claims.iat - clockSkewSec > t) return fail('token.expired', 'issued in the future');
    if (issuer && claims.iss !== issuer) return fail('token.wrong_issuer', `issuer ${claims.iss}`);
    const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (audience && !aud.includes(audience)) return fail('token.wrong_audience', `not for ${audience}`);
    const v = validate('identity.service-token-claims@1', claims);
    if (!v.valid) return fail('token.invalid_claims', v.errors.map(e => `${e.path} ${e.message}`).join('; '));
    // Developer apps (ADR-014): a sandbox token is refused unless this receiver opted in.
    if (claims.env === 'sandbox' && !acceptSandbox) return fail('token.sandbox_refused', 'sandbox tokens are not accepted here');
    return { ok: true, claims };
}

/**
 * Express guard: `router.post('/coins/credit', requireCapability('network.coins.credit', opts), handler)`.
 *   opts.publicKey | opts.getPublicKey(req), opts.issuer, opts.audience
 *   opts.namespace(req) -> namespace to check against the token's `ns` (optional)
 *   opts.legacy(req) -> true when the request authenticated the old way (X-Internal-Key); it is let
 *       through as `req.principal = { legacy: true }` so both work during migration.
 *   opts.onDecision({ req, capability, principal, allowed, code }) -> audit hook
 * A request that presents a Bearer token is judged ONLY on that token, never on a legacy header.
 */
function requireCapability(capability, opts = {}) {
    if (!capabilities.get(capability)) throw new Error(`requireCapability: unknown capability ${capability}`);
    return function capabilityGuard(req, res, next) {
        const ctx = req.ov || http.requestContext(req.headers);
        const auth = String(req.headers.authorization || '');
        const decide = (allowed, code, principal, detail) => {
            try { if (opts.onDecision) opts.onDecision({ req, capability, principal, allowed, code }); } catch { /* audit must not break the call */ }
            if (allowed) { req.principal = principal; return next(); }
            const status = code && code.startsWith('token.') ? 401 : 403;
            return http.sendProblem(res, status, code, { detail, ctx });
        };
        if (auth.startsWith('Bearer ')) {
            const publicKey = opts.getPublicKey ? opts.getPublicKey(req) : opts.publicKey;
            const r = verifyServiceToken(auth.slice(7).trim(), { publicKey, issuer: opts.issuer, audience: opts.audience, acceptSandbox: !!opts.acceptSandbox });
            if (!r.ok) return decide(false, r.code, null, r.reason);
            const ns = opts.namespace ? opts.namespace(req) : undefined;
            const c = capabilities.check(r.claims, capability, { namespace: ns });
            return decide(c.allowed, c.code, { sub: r.claims.sub, cap: r.claims.cap, ns: r.claims.ns, jti: r.claims.jti }, c.reason);
        }
        if (opts.legacy && opts.legacy(req)) return decide(true, null, { legacy: true });
        return decide(false, 'capability.denied', null, 'no service token');
    };
}

/**
 * Caller side: cached client-credentials tokens.
 *   const tokens = createTokenClient({ tokenUrl, clientId, clientSecret, audience, scope });
 *   const headers = await tokens.authHeaders();   // { Authorization: 'Bearer …' }
 * Refreshes 60 s before expiry; concurrent callers share one request. Throws on failure so the
 * caller can decide whether to fall back.
 */
function createTokenClient({ tokenUrl, clientId, clientSecret, audience, scope, fetchImpl = globalThis.fetch, timeoutMs = 5000 }) {
    let cached = null;      // { token, exp }
    let inflight = null;
    async function fetchToken() {
        const body = new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret, audience });
        if (scope) body.set('scope', Array.isArray(scope) ? scope.join(' ') : scope);
        const res = await fetchImpl(tokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body, signal: AbortSignal.timeout(timeoutMs) });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json || !json.access_token) {
            const err = new Error(`token endpoint ${res.status}: ${(json && (json.error_description || json.error)) || 'no token'}`);
            err.status = res.status;
            throw err;
        }
        cached = { token: json.access_token, exp: Date.now() + (Number(json.expires_in) || 300) * 1000 };
        return cached.token;
    }
    async function getToken() {
        if (cached && cached.exp - 60_000 > Date.now()) return cached.token;
        if (!inflight) inflight = fetchToken().finally(() => { inflight = null; });
        return inflight;
    }
    return {
        getToken,
        async authHeaders() { return { Authorization: `Bearer ${await getToken()}` }; },
        invalidate() { cached = null; },
    };
}

module.exports = { signServiceToken, verifyServiceToken, requireCapability, createTokenClient };
