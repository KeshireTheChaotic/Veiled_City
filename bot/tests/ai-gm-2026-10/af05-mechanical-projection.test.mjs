import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createGmMechanicalProposalRules} from '../../src/frameworks/daggerheart/gm-mechanical-proposal-rules.js';
import {projectGmMechanicalInput} from '../../src/frameworks/daggerheart/mechanical-boundary-v9.js';
const definitions=JSON.parse(fs.readFileSync(new URL('../../src/frameworks/daggerheart/native-feature-definitions.json',import.meta.url),'utf8')).features;
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const fail=message=>Object.assign(new Error(message),{code:'GM_ARBITRATION'});
function createAudienceAuthority({authorize}){const grants=new WeakMap();return {issue:request=>{const grant=Object.freeze({});grants.set(grant,authorize(request));return grant;},
  inspect:grant=>{if(!grants.has(grant))throw new Error('Native grant required');return grants.get(grant);}};}

for(const [suffix,operation,expected] of [':flashbang|commit_group_feature|native_pending',':coordinated-volley|commit_adversary_volley|awaiting_owner_defense',
  ':blood-rush|commit_adversary_feature|native_pending',':feedback|request_feature_reaction_roll|awaiting_owner_reaction'].map(s=>s.split('|')))
test(`${suffix} projects its exact existing native decision without effects or moderator approval`,()=>{
  const feature=definitions.find(f=>f.feature_key.endsWith(suffix)),entry={actor:{type:'npc',key:'npc'},target_refs:['pc']},
    row={record_key:'decision',source_event:'native-source',status:operation==='request_feature_reaction_roll'?'pending_pc_reaction':'gm_action_ready',
      data:{origin:{scene:'scene',session:'s'},proposal:{feature_ref:feature.feature_key},native:{operation,feature:feature.feature_key,feature_hash:hash(feature)}}};
  let mode='autonomous',enabled=true,inspections=0;
  const db={getCityCalendar:()=>({flags:{gm_discretion:enabled}}),getCityRecord:()=>({data:{gm_authority_mode:mode}})};
  const rules=createGmMechanicalProposalRules({capabilities:{createAudienceAuthority,authorizeIncomingOffer:()=>{throw new Error('No standard-attack fallback');},
    assertFearIncomingExecution:()=>{throw new Error('No unrelated Fear gate');},inspectNativeGmDecision:()=>{inspections++;return {row,entry};},
    featureDisposition:key=>({status:key===feature.feature_key?'supported':'needs_rules_review',feature}),hash,fail}});
  const proposal={version:9,kind:'mechanical_input',initiator_class:'ai_gm',intent_kind:'adversary_feature',request_id:'decision',
    actor_ref:{kind:'adversary',id:'npc'},feature_ref:feature.feature_key,stat_block_ref:feature.template_hash,target_refs:[{kind:'character',id:'pc'}],
    source_task_id:`gm-task:${hash([row.source_event,row.record_key])}`};
  const projected=rules.projectNativeGmProposal(db,'g',proposal);assert.equal(projected.operation,operation);assert.equal(projected.disposition,expected);
  assert.equal(projected.feature_ref,feature.feature_key);assert.equal(projected.executed,false);assert.equal(inspections,1);
  for(const change of [{actor_ref:{kind:'adversary',id:'other'}},{target_refs:[{kind:'character',id:'other'}]},{stat_block_ref:'changed'},
    {feature_ref:'unqualified'},{source_task_id:'forged'},{amount:0}])assert.throws(()=>rules.projectNativeGmProposal(db,'g',{...proposal,...change}),/gm_/);
  mode='manual';assert.throws(()=>rules.projectNativeGmProposal(db,'g',proposal),/autonomous_mode/);
  mode=undefined;assert.throws(()=>rules.projectNativeGmProposal(db,'g',proposal),/autonomous_mode/);
  mode='autonomous';enabled=false;assert.throws(()=>rules.projectNativeGmProposal(db,'g',proposal),/autonomous_mode/);
});

test('the mechanical boundary binds feature and operation to native proof and refuses arbitrary state operations',()=>{
  const proof={audience:'gm_internal',native_capability:'gm_action',native_route:'qualified_feature',actor:{kind:'adversary',id:'npc'},
    request_id:'decision',source_event:'source',proof_ref:'native-proof',feature_ref:'feature',allowed_operation:'commit_group_feature',initiator_class:'ai_gm'},
    authority=createAudienceAuthority({authorize:()=>proof}),grant=authority.issue({audience:'gm_internal'}),
    native={verified:true,actor:proof.actor,request_id:proof.request_id,source_event:proof.source_event,proof_ref:proof.proof_ref,
      feature_ref:proof.feature_ref,operation:proof.allowed_operation,disposition:'native_pending'};
  assert.equal(projectGmMechanicalInput({authority,grant,proposal:{},verifyInput:()=>native}).executed,false);
  for(const change of [{feature_ref:'other'},{operation:'arbitrary_json_patch'},{request_id:'other'},{disposition:'executed'},{actor:{kind:'character',id:'pc'}}])
    assert.throws(()=>projectGmMechanicalInput({authority,grant,proposal:{},verifyInput:()=>({...native,...change})}),/refused/);
  assert.throws(()=>projectGmMechanicalInput({authority,grant:{},proposal:{},verifyInput:()=>native}),/Native grant/);
});

test('the existing standard attack still requires its native Fear gate and projects no executed outcome',()=>{
  let fearChecks=0;
  const row={record_key:'incoming',source_event:'source',status:'awaiting_defense',data:{offer:{input:{npc:'npc',character:'pc',ruling:''},snapshot:{template:'template',scene:'scene',session:'s'}}}};
  const rules=createGmMechanicalProposalRules({capabilities:{createAudienceAuthority,authorizeIncomingOffer:()=>({row}),
    assertFearIncomingExecution:()=>{fearChecks++;},inspectNativeGmDecision:()=>{throw new Error('Unexpected decision');},featureDisposition:()=>null,hash,fail}});
  const proposal={version:9,kind:'mechanical_input',initiator_class:'adversary',intent_kind:'adversary_attack',request_id:'incoming',actor_ref:{kind:'adversary',id:'npc'},
    target_refs:[{kind:'character',id:'pc'}],stat_block_ref:'template',feature_ref:'standard_attack',source_task_id:`gm-task:${hash([row.source_event,row.record_key])}`};
  const projected=rules.projectNativeGmProposal({},'g',proposal);assert.equal(fearChecks,1);assert.equal(projected.disposition,'awaiting_owner_defense');
  assert.equal(projected.executed,false);assert.equal(projected.operation,'commit_adversary_attack');
  assert.throws(()=>rules.projectNativeGmProposal({},'g',{...proposal,intent_kind:'gm_generic_d20'}),/not_implemented/);
});
