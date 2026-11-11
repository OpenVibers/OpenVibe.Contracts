'use strict';
const assert=require('node:assert/strict');
const Ajv=require('ajv/dist/2020'),formats=require('ajv-formats');
const ajv=new Ajv({strict:true});formats(ajv);const validate=ajv.compile(require('../contracts/compare/comparison.v1.json'));
const doc={slug:'ai-models',title:'AI models',kind:'ai.models',summary:'Dated prices',things:[{id:'a',name:'A',maker:'Maker',url:'https://example.com',icon:'model'}],criteria:[{id:'price',label:'Price',unit:'USD',better:'lower',weight:1,group:'Price'}],results:[{thing:'a',criterion:'price',value:0,as_of:'2026-11-10T00:00:00Z',source:{label:'Provider',url:'https://example.com/prices'}}],method:'Weighted normalized results',sources:[],updated_at:'2026-11-10T00:00:00Z',versions:[]};
assert(validate(doc),JSON.stringify(validate.errors));
for(const key of ['as_of','source','value']){const bad=structuredClone(doc);delete bad.results[0][key];assert(!validate(bad),key);}
for(const value of [null,'1',Infinity]){const bad=structuredClone(doc);bad.results[0].value=value;assert(!validate(bad));}
const bad=structuredClone(doc);bad.results[0].source.url='javascript:alert(1)';assert(!validate(bad));
console.log('compare.comparison@1: sourced finite numbers and dates required');
