import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {featureDisposition,executableNativeFeatures,inspectNativeFeatureOccurrence} from '../../src/native-feature-catalog.js';
import {environmentProposalContract} from '../../src/native-environment-capabilities.js';
import {validateEnvironmentOddsProposal} from '../../src/native-environment-noise.js';
import {sceneFictionHash as hash} from '../../src/scene-fiction-context.js';

const FEATURE='environment:storm-drain-shrine:local-memory';
const sources=()=>({
  adversaries:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json',import.meta.url),'utf8')),
  environments:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ENVIRONMENTS/environments.json',import.meta.url),'utf8'))
});

test('Local Memory exposes only its exact passive zero-cost PC advantage modifier',()=>{
  const input=sources(),inspection=inspectNativeFeatureOccurrence(FEATURE,input),disposition=featureDisposition(FEATURE,input),feature=disposition.feature;
  assert.equal(inspection.status,'verified_source');assert.equal(inspection.execution_authorized,false);
  assert.equal(disposition.status,'supported');assert.equal(feature.native_handler,'shrine_local_memory_advantage');
  assert.equal(feature.type,'Passive');assert.equal(feature.trigger_kind,'passive');assert.equal(feature.target_policy,'none');
  assert.equal(feature.roll_protocol,'native_pc_action_advantage');assert.deepEqual(feature.costs,[]);
  assert.match(inspection.printed_rule,/Respectful offerings grant advantage on one question about recent movement in the area/);
  assert.ok(executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));
  const contract=environmentProposalContract(feature);
  assert.equal(contract.handler,'shrine_local_memory_advantage');assert.equal(contract.entry,'decisions');
  assert.equal(contract.disposition,'request_pc_action_roll');assert.equal(contract.stakes_kind,'attempt_only');
  assert.equal(contract.advantage,true);assert.equal(contract.disadvantage,false);assert.equal(contract.fear,0);
});

test('one source-bound player question produces Advantage for exactly its ordinary roll',()=>{
  const feature=featureDisposition(FEATURE,sources()).feature,
    profile={record_key:'profile-1',data:{template_hash:feature.template_hash,session:'session-1',scene:'scene-1'}},
    action={record_key:'intent-1',data:{actor:'pc-1',session_id:'session-1',scene:'scene-1'}},
    entry={intent_ref:action.record_key,actor:{type:'character',key:'pc-1'}},
    proposal={feature_ref:FEATURE,disposition:'request_pc_action_roll',stakes_kind:'attempt_only',advantage:true,disadvantage:false,
      experience_ref:'',rule_basis_refs:['srd:action-rolls'],reason:'The player offers respectfully and asks about recent movement.'};
  assert.deepEqual(validateEnvironmentOddsProposal({feature,profile,entry,action,proposal,kind:'advantage'}),{
    version:1,feature:FEATURE,feature_hash:hash(feature),environment:'profile-1',environment_hash:hash(profile),action:'intent-1',
    applicability_ruling:proposal.reason,kind:'advantage',amount:1
  });
});

test('wrong actor, action, environment, roll kind or rules basis cannot receive Local Memory Advantage',()=>{
  const feature=featureDisposition(FEATURE,sources()).feature,profile={record_key:'profile-1',data:{template_hash:feature.template_hash,session:'s',scene:'c'}},
    action={record_key:'i',data:{actor:'pc',session_id:'s',scene:'c'}},entry={intent_ref:'i',actor:{type:'character',key:'pc'}},
    proposal={feature_ref:FEATURE,disposition:'request_pc_action_roll',stakes_kind:'attempt_only',advantage:true,disadvantage:false,
      experience_ref:'',rule_basis_refs:['srd:action-rolls'],reason:'The declared offering supports this exact question.'},
    validate=(overrides={})=>validateEnvironmentOddsProposal({feature,profile,entry,action,proposal:{...proposal,...overrides},kind:'advantage'});
  assert.equal(validate().kind,'advantage');
  assert.throws(()=>validate({advantage:false}),{code:'GM_ARBITRATION'});
  assert.throws(()=>validate({feature_ref:'invented'}),{code:'GM_ARBITRATION'});
  assert.throws(()=>validate({rule_basis_refs:[]}),{code:'GM_ARBITRATION'});
  assert.throws(()=>validate({reason:''}),{code:'GM_ARBITRATION'});
  assert.throws(()=>validateEnvironmentOddsProposal({feature,profile,entry:{...entry,actor:{type:'npc',key:'pc'}},action,proposal,kind:'advantage'}),{code:'GM_ARBITRATION'});
  assert.throws(()=>validateEnvironmentOddsProposal({feature,profile:{...profile,data:{...profile.data,template_hash:'stale'}},entry,action,proposal,kind:'advantage'}),{code:'GM_ARBITRATION'});
  assert.throws(()=>validateEnvironmentOddsProposal({feature,profile,entry,action,proposal,kind:'disadvantage'}),{code:'GM_ARBITRATION'});
});

test('source drift and forged descriptor fields hold the occurrence and arbitration wiring remains explicit',()=>{
  const input=sources(),actor=input.environments.find(row=>row.name==='Storm Drain Shrine');
  actor.features[0]+=' altered';assert.equal(featureDisposition(FEATURE,input).status,'needs_rules_review');
  assert.ok(!executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));
  const actual=featureDisposition(FEATURE,sources()).feature;
  assert.equal(environmentProposalContract({...actual,native_handler:'invented'}),null);
  assert.equal(environmentProposalContract({...actual,costs:[{resource:'fear',amount:1}]}),null);
  assert.equal(environmentProposalContract({...actual,roll_protocol:'difficulty'}),null);
  assert.equal(environmentProposalContract({...actual,trigger_kind:'spotlight_action'}),null);
  const source=fs.readFileSync(new URL('../../src/gm-unified-arbitration.js',import.meta.url),'utf8');
  assert.equal((source.match(/'environment:storm-drain-shrine:local-memory'/g)||[]).length,2);
  assert.match(source,/prepareOrdinaryRollModifier\(db,guild,origin,entry,p\)/);
  const modifiers=fs.readFileSync(new URL('../../src/native-roll-modifiers.js',import.meta.url),'utf8');
  assert.match(modifiers,/environment:storm-drain-shrine:local-memory'\?prepareEnvironmentMemoryOdds/);
});
