/** W6 acceptance fixtures. Authored, NOT RUN before the whole-phase freeze. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {setup} from './narrative-fixtures.mjs';
import {buildNarrativeContext} from '../src/narrative-authority-context.js';
import {establishNativeEnvironmentInstance} from '../src/native-environment-instance.js';
import {establishFact} from '../src/epistemic.js';
import {establishEnvironmentAdmission,inspectEnvironmentAdmission,nativeVipAdmission} from '../src/native-environment-access.js';
import {mundaneEntryImpact,configureEntryPolicy} from '../src/scene-entry-native.js';
import {actionFixture} from './v96-action-fixture.mjs';
const changes=f=>f.db.db.prepare('SELECT total_changes() n').get().n;
function fixture(f,method='invitation'){
  const x=setup(f,{privateScene:true,text:'May I enter the private floor?',messageId:'vip-admission'});
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,authoring:true,gm_discretion:true}});
  f.db.setSimulationEntity(f.guild,'location','private-floor',{name:'Private floor',parent_location_key:'terminal',access:'private',restricted:true,visibility:'party'});
  const profile=establishNativeEnvironmentInstance(f.db,f.guild,buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef),
    {version:1,environment:'environment:haunted-nightclub',location:'terminal'}),
    credential=f.db.addFact(f.guild,{category:'access',content:'The venue permits this specific guest to enter the private floor.',
      visibility:'character',subjectCharacterId:x.pc.id,source:'human_gm',
      provenance:{access_grant:{character:x.pc.id,destination:'private-floor',method}}});
  establishFact(f.db,f.guild,credential,'offline-authenticated-gm');
  return {...x,profile,credential,input:{environment:profile.record_key,destination:'private-floor',method,credential,accepted_intent:'',prerequisite:''}};
}
for(const method of ['invitation','status','leverage'])test(`VIP ${method} is source-backed admission, not arrival or resource change`,()=>nativeFixture(f=>{
  const x=fixture(f,method),before=f.db.getCharacter(x.pc.id),fear=f.db.getCampaign(f.guild).fear,
    row=establishEnvironmentAdmission(f.db,f.guild,x.input,x.scope);
  assert.equal(row.status,'resolved');assert.equal(row.visibility,'gm');
  assert.equal(nativeVipAdmission(f.db,f.guild,before,'private-floor').record_key,row.record_key);
  assert.deepEqual(f.db.getCharacter(x.pc.id),before);assert.equal(f.db.getCampaign(f.guild).fear,fear);
  const written=changes(f);assert.deepEqual(establishEnvironmentAdmission(f.db,f.guild,x.input,x.scope),row);assert.equal(changes(f),written);
  f.restart();assert.deepEqual(inspectEnvironmentAdmission(f.db,f.guild,row.record_key,x.scope),row);
  configureEntryPolicy(f.db,f.guild,{op:'entry-policy',location_key:'private-floor',from_locations:['terminal']},'offline-authenticated-gm');
  const entry={status:'pending',data:{character:x.pc.id,prior_location:'terminal',target:'Private floor',session_id:row.data.session}};
  assert.equal(mundaneEntryImpact(f.db,f.guild,entry,'private-floor').review,false);
  f.db.setSimulationEntity(f.guild,'location','private-floor',{...f.db.getSimulationEntity(f.guild,'location','private-floor').state,locked:true});
  assert.equal(mundaneEntryImpact(f.db,f.guild,entry,'private-floor').review,true);
  assert.deepEqual(inspectEnvironmentAdmission(f.db,f.guild,row.record_key,x.scope),row,'historical admission survives later locking without granting entry');
}));
for(const variation of ['unestablished','wrong_character','wrong_destination','wrong_method','model_role','deception_without_outcome'])
  test(`VIP rejects ${variation} before mutation`,()=>nativeFixture(f=>{
    const x=fixture(f);
    if(variation==='unestablished')x.input.credential=f.db.addFact(f.guild,{category:'access',content:'An invitation',source:'ai_gm',visibility:'party'});
    if(variation==='wrong_character')x.scope={...x.scope,actorCharacterId:f.pcs.find(p=>p.id!==x.pc.id).id};
    if(variation==='wrong_destination')x.input.destination='terminal';
    if(variation==='wrong_method')x.input.method='status';
    if(variation==='model_role')x.input.gm=true;
    if(variation==='deception_without_outcome'){x.input.method='deception';x.input.credential='';}
    const before=changes(f);assert.throws(()=>establishEnvironmentAdmission(f.db,f.guild,x.input,x.scope));assert.equal(changes(f),before);
  }));
test('VIP deception consumes its own successful native owner action, never a claimed success or another actor roll',()=>nativeFixture(f=>{
  const x=fixture(f),a=actionFixture(f,'I attempt to deceive the gatekeeper into admitting me to the private floor.',{privateScene:true});
  Object.assign(a.intent,{type:'interact',operation:'deceive_vip_entry',target_key:'private-floor',target_name:'Private floor',resolution:'auto'});
  Object.assign(a.ruling,{disposition:'narrative_no_roll',trait:null,difficulty:null,risk:'none',stakes:'none',
    explanation:'The native GM adjudicates this specific mundane deception against the actual local access boundary.',
    difficulty_reason:'Contextual native ruling; not a generated success assertion.'});
  const result=a.run(),accepted=result.typedIntents.find(r=>r.data.operation==='deceive_vip_entry'),
    action=f.db.getCityRecord(f.guild,'typed_intent',accepted.record_key),input={...x.input,method:'deception',credential:'',
      accepted_intent:action.record_key,prerequisite:action.data.outcome_receipt},before=f.db.getCharacter(x.pc.id),
    row=establishEnvironmentAdmission(f.db,f.guild,input,x.scope);
  assert.equal(row.data.evidence.action,action.record_key);assert.equal(row.data.ancestry.receipt.record_key,action.data.outcome_receipt);
  assert.deepEqual(f.db.getCharacter(x.pc.id),before);f.restart();
  assert.deepEqual(inspectEnvironmentAdmission(f.db,f.guild,row.record_key,x.scope),row);
}));
test('editing an access grant after GM establishment does not reuse the old approval',()=>nativeFixture(f=>{
  const x=fixture(f),fact=f.db.getFact(f.guild,x.credential),p=JSON.parse(fact.provenance_json);
  p.access_grant.method='leverage';f.db.updateFactProvenance(f.guild,x.credential,p);
  const before=changes(f);assert.throws(()=>establishEnvironmentAdmission(f.db,f.guild,{...x.input,method:'leverage'},x.scope));
  assert.equal(changes(f),before);
}));
test('revoked source and changed ownership hold admission without moving or restoring resources',()=>nativeFixture(f=>{
  const x=fixture(f),row=establishEnvironmentAdmission(f.db,f.guild,x.input,x.scope),pc=f.db.getCharacter(x.pc.id),
    ruling=JSON.parse(f.db.getFact(f.guild,x.credential).provenance_json).epistemic.source_refs[0];
  f.db.saveWorldEvent(f.guild,{...f.db.getWorldEvent(f.guild,ruling),key:ruling,status:'retracted'});
  assert.throws(()=>inspectEnvironmentAdmission(f.db,f.guild,row.record_key,x.scope));
  assert.equal(nativeVipAdmission(f.db,f.guild,pc,'private-floor'),null);
  assert.deepEqual(f.db.getCharacter(x.pc.id),pc);
}));
