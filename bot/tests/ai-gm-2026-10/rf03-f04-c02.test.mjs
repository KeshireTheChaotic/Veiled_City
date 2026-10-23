import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compileNativeFeatures} from '../../src/native-feature-catalog.js';
import {jsonHash} from '../../src/kernel/json-hash.js';
import {validateEnvironmentOddsProposal} from '../../src/native-environment-noise.js';
import {ENVIRONMENT_MEMORY_FEATURE,ENVIRONMENT_NOISE_FEATURE} from '../../src/frameworks/daggerheart/environment-odds-contract.js';

function context(key){
  const feature=compileNativeFeatures().find(value=>value.feature_key===key);
  assert.ok(feature,`current catalog is missing ${key}`);
  const profile={record_key:'environment:current-scene-instance',data:{template_hash:feature.template_hash,session:'session:current',scene:'scene:current'}};
  const action={record_key:'intent:current-owner-action',data:{actor:'pc:aya',session_id:profile.data.session,scene:profile.data.scene}};
  const entry={intent_ref:action.record_key,actor:{type:'character',key:action.data.actor}};
  const kind=key===ENVIRONMENT_MEMORY_FEATURE?'advantage':'disadvantage';
  const proposal={feature_ref:key,disposition:'request_pc_action_roll',stakes_kind:'attempt_only',advantage:kind==='advantage',
    disadvantage:kind==='disadvantage',reason:'The existing source-defined condition applies.',rule_basis_refs:['srd:action-rolls']};
  return {feature,profile,action,entry,proposal,kind};
}

test('current supported environment sources return exact source-qualified proposal receipts',()=>{
  for(const key of [ENVIRONMENT_NOISE_FEATURE,ENVIRONMENT_MEMORY_FEATURE]){
    const value=context(key),proof=validateEnvironmentOddsProposal(value);
    assert.equal(value.feature.status,'supported');
    assert.deepEqual(proof,{version:1,feature:key,feature_hash:jsonHash(value.feature),environment:value.profile.record_key,
      environment_hash:jsonHash(value.profile),action:value.action.record_key,applicability_ruling:value.proposal.reason,
      kind:value.kind,amount:1});
  }
});

test('stale template, cross-scene action, review-only feature and wrong proposal shape are held',()=>{
  const value=context(ENVIRONMENT_NOISE_FEATURE);
  for(const patch of [
    {profile:{...value.profile,data:{...value.profile.data,template_hash:'stale'}}},
    {action:{...value.action,data:{...value.action.data,scene:'scene:other'}}},
    {feature:{...value.feature,status:'review_only'}},
    {kind:'advantage'},
    {proposal:{...value.proposal,experience_ref:'pc:experience:1'}},
    {proposal:{...value.proposal,rule_basis_refs:['unsupported:source']}}
  ])assert.throws(()=>validateEnvironmentOddsProposal({...value,...patch}),e=>e.code==='GM_ARBITRATION'
    &&e.message.includes('environment_noise_exact_contextual_action_required'));
  assert.throws(()=>validateEnvironmentOddsProposal({...value,feature:{...value.feature,feature_key:'environment:unregistered:effect'}}),
    e=>e.code==='GM_ARBITRATION');
});

test('existing environment provider delegates the same exported contract to Daggerheart',()=>{
  const provider=fs.readFileSync(new URL('../../src/native-environment-noise.js',import.meta.url),'utf8');
  assert.match(provider,/createEnvironmentOddsContract\(\{hash:value=>hash\(value\),fail\}\)/);
  assert.match(provider,/export const \{validateEnvironmentOddsProposal\}/);
});
