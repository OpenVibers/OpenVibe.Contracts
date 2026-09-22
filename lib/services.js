'use strict';
const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, '..', 'manifests', 'services');
const manifests = fs.readdirSync(DIR).filter(f => f.endsWith('.json')).sort()
    .map(f => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')));
module.exports = { manifests, get: (id) => manifests.find(m => m.id === id) };
