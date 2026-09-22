'use strict';
/**
 * openvibe-contracts — machine-readable contracts for the OpenVibe network.
 *
 *   const contracts = require('openvibe-contracts');
 *   contracts.validate('identity.subject-ref@1', { type: 'user', id: 'usr_01J...' });
 *   contracts.ids.newId('user');                       // 'usr_01J...'
 *   contracts.http.problem(403, 'capability.denied');  // RFC 9457 body
 *   contracts.capabilities.check(tokenClaims, 'media.object.read', { namespace: 'live' });
 */
const registry = require('./lib/registry');

module.exports = {
    catalog: registry.catalog,
    resolve: registry.resolve,
    validate: registry.validate,
    assertValid: registry.assertValid,
    schema: registry.schema,
    ids: require('./lib/ids'),
    http: require('./lib/http'),
    capabilities: require('./lib/capabilities'),
    services: require('./lib/services'),
    serviceAuth: require('./lib/service-auth'),
};
