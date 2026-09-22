'use strict';
/**
 * Request/error envelope helpers (contract errors.problem@1).
 *   - W3C traceparent is accepted or started, and echoed with X-OpenVibe-Request-Id
 *   - problem() builds RFC 9457 bodies that keep the legacy { error } field for old clients
 * Framework-agnostic: works with Express/Node (req, res) objects.
 */
const crypto = require('crypto');

const TRACEPARENT_RE = /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/;

/** Parse a traceparent header; null if absent or malformed (all-zero ids are invalid per spec). */
function parseTraceparent(value) {
    const m = typeof value === 'string' && value.trim().toLowerCase().match(TRACEPARENT_RE);
    if (!m || /^0+$/.test(m[1]) || /^0+$/.test(m[2])) return null;
    return { traceId: m[1], parentId: m[2], flags: m[3] };
}

/** Context for an incoming request: continue the caller's trace or start one. */
function requestContext(headers = {}) {
    const get = (k) => headers[k] ?? headers[k.toLowerCase()];
    const tp = parseTraceparent(get('traceparent'));
    const traceId = tp ? tp.traceId : crypto.randomBytes(16).toString('hex');
    const spanId = crypto.randomBytes(8).toString('hex');
    const incoming = get('x-openvibe-request-id');
    const requestId = typeof incoming === 'string' && /^[A-Za-z0-9._-]{8,128}$/.test(incoming) ? incoming : `req_${crypto.randomBytes(12).toString('hex')}`;
    return { traceId, spanId, requestId, traceparent: `00-${traceId}-${spanId}-${tp ? tp.flags : '01'}`, idempotencyKey: get('idempotency-key') || null };
}

/** Headers to send on an outbound call so the next service joins the same trace. */
function outboundHeaders(ctx) {
    return ctx ? { traceparent: `00-${ctx.traceId}-${crypto.randomBytes(8).toString('hex')}-01`, 'X-OpenVibe-Request-Id': ctx.requestId } : {};
}

/** Express/Connect middleware: attaches req.ov and echoes the ids on the response. */
function middleware() {
    return function openvibeRequestContext(req, res, next) {
        req.ov = requestContext(req.headers);
        res.setHeader('X-OpenVibe-Request-Id', req.ov.requestId);
        res.setHeader('traceparent', req.ov.traceparent);
        next();
    };
}

const TITLES = { 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 409: 'Conflict', 413: 'Payload Too Large', 422: 'Unprocessable Content', 429: 'Too Many Requests', 500: 'Internal Server Error', 502: 'Bad Gateway', 503: 'Service Unavailable' };

/**
 * problem(403, 'capability.denied', { detail, ctx }) -> RFC 9457 body.
 * `type` defaults to https://openvibe.network/problems/<code> so every code has a documentable URI.
 */
function problem(status, code, { title, detail, type, instance, ctx, errors, extra } = {}) {
    const body = {
        type: type || `https://openvibe.network/problems/${code}`,
        title: title || TITLES[status] || 'Error',
        status, code,
    };
    if (detail) body.detail = detail;
    if (instance) body.instance = instance;
    if (errors && errors.length) body.errors = errors;
    if (ctx) { body.request_id = ctx.requestId; body.trace_id = ctx.traceId; }
    body.error = detail || body.title;  // compatibility with clients that read { error }
    return Object.assign(body, extra);
}

function sendProblem(res, status, code, opts = {}) {
    const body = problem(status, code, opts);
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/problem+json');
    res.end(JSON.stringify(body));
    return body;
}

module.exports = { parseTraceparent, requestContext, outboundHeaders, middleware, problem, sendProblem };
