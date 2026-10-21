import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {compileNativeFeatures,inspectNativeFeatureOccurrence,featureDisposition,executableNativeFeatures} from '../../src/native-feature-catalog.js';
const read=name=>JSON.parse(fs.readFileSync(new URL(name,import.meta.url),'utf8'));
const sources=()=>({adversaries:read('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json'),environments:read('../../../content/GM_PRIVATE/ENVIRONMENTS/environments.json')});
test('every current occurrence matches exact source but inventory alone grants no effects',()=>{
 const input=sources(),features=compileNativeFeatures(input);assert.equal(features.length,153);
 for(const f of features){const inspection=inspectNativeFeatureOccurrence(f.feature_key,input);assert.equal(inspection.status,'verified_source',f.feature_key);assert.equal(inspection.execution_authorized,false);}
  assert.equal(executableNativeFeatures(undefined,input).length,49);
});
test('one changed occurrence source locally holds its actor without disabling independent actors',()=>{
 const input=sources();input.adversaries.find(a=>a.name==='Pale Court Thrall').features[0]+=' unverified edit';
 assert.equal(featureDisposition('adversary:pale-court-thrall:pack-pressure',input).status,'needs_rules_review');
 assert.equal(featureDisposition('adversary:choir-relay:local-mesh',input).status,'supported');
  assert.equal(executableNativeFeatures(undefined,input).length,48);
 assert.throws(()=>compileNativeFeatures(input),{code:'GM_ARBITRATION'});
});
test('missing, duplicated, forged status and unknown feature never grant execution',()=>{
 const input=sources();input.adversaries.push(structuredClone(input.adversaries[0]));
 assert.equal(inspectNativeFeatureOccurrence('adversary:pale-court-thrall:pack-pressure',input).status,'held_source');
 assert.equal(featureDisposition({feature_key:'adversary:pale-court-thrall:pack-pressure',status:'supported'},input).status,'needs_rules_review');
 assert.equal(featureDisposition('environment:haunted-nightclub:too-loud-to-think',sources()).status,'supported');
 assert.equal(featureDisposition('unknown',input).status,'needs_rules_review');
 const absent=sources();absent.adversaries.find(a=>a.name==='Pale Court Thrall').features=[];
 assert.equal(inspectNativeFeatureOccurrence('adversary:pale-court-thrall:pack-pressure',absent).status,'held_source');
});
