/** W6 construction fixtures. NOT RUN until the complete W6 freeze. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {setup,candidate} from './narrative-fixtures.mjs';
import {buildNarrativeContext} from '../src/narrative-authority-context.js';
import {establishNativeEnvironmentInstance} from '../src/native-environment-instance.js';
import {persistPlayerIntents} from '../src/typed-intents.js';
import {createArbitrationOrigin,buildSceneIntentBoard} from '../src/scene-intent-board.js';
import {applyEnvironmentArrival,inspectEnvironmentArrival} from '../src/native-environment-arrivals.js';
import {worldIdentityOrigin} from '../src/world-authorship.js';
import {featureDisposition} from '../src/native-feature-catalog.js';
import {indexWorldEvent} from '../src/city-calendar.js';
const FEATURE='environment:occult-crime-scene:sirens-outside';
const changes=f=>f.db.db.prepare('SELECT total_changes() n').get().n;
function fixture(f){
  assert.equal(featureDisposition(FEATURE).status,'supported'); // Real qualification, never a test-only grant.
  const x=setup(f,{privateScene:true,text:'What is happening at the scene?',messageId:'sirens-source'});
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,authoring:true,gm_discretion:true}});
  f.db.changeFear(f.guild,3-f.db.getCampaign(f.guild).fear);
  const profile=establishNativeEnvironmentInstance(f.db,f.guild,buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef),
    {version:1,environment:'environment:occult-crime-scene',location:'terminal'}),
    [action]=persistPlayerIntents(f.db,f.guild,candidate(x.text).player_intents,x.scope,{messageId:x.messageId}),
    origin=createArbitrationOrigin(f.db,f.guild,x.scope,x.sourceRef),board=buildSceneIntentBoard(f.db,f.guild,origin,[action],[]),
    proposal={version:1,feature_ref:FEATURE,environment:profile.record_key,category:'authority',
      npc:{kind:'npc',key:'sirens-responder',name:'Responding Officer',aliases:[],location_key:'terminal',parent_location_key:'',
        role:'authority',summary:'An ordinary responder arrives at the scene.'}};
  return {...x,profile,origin,board,proposal};
}
const apply=(f,x,input=x.proposal,origin=x.origin)=>applyEnvironmentArrival(f.db,f.guild,origin,x.board,input,{content:{read:()=>null}});
test('printed Sirens arrival spends exactly one Fear and establishes ordinary audience-bound presence, not a combatant or PC effect',()=>nativeFixture(f=>{
  const x=fixture(f),pcs=f.pcs.map(pc=>f.db.getCharacter(pc.id)),before=f.db.getCampaign(f.guild).fear,row=apply(f,x),
    identity=f.db.getCityRecord(f.guild,'autonomous_entity',row.data.identity),proof=worldIdentityOrigin(f.db,f.guild,identity,x.scope);
  assert.equal(row.status,'resolved');assert.equal(row.visibility,'gm');assert.equal(row.data.fear.spent,1);
  assert.equal(f.db.getCampaign(f.guild).fear,before-1);assert.equal(proof.version,1);assert.equal(proof.execution_authority,false);
  assert.equal(identity.visibility,'character');assert.equal(identity.subject_key,x.pc.id);
  assert.equal(f.db.getCurrentEncounter(f.session.id),null);assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id)),pcs);
  assert.deepEqual(inspectEnvironmentArrival(f.db,f.guild,row.record_key,x.scope),row);
  f.restart();const written=changes(f);assert.deepEqual(inspectEnvironmentArrival(f.db,f.guild,row.record_key,x.scope),row);
  assert.equal(changes(f),written);
  const origin=createArbitrationOrigin(f.db,f.guild,x.scope,x.sourceRef);
  assert.deepEqual(apply(f,x,x.proposal,origin),row);assert.equal(f.db.getCampaign(f.guild).fear,before-1);
}));
for(const mutation of ['role','location','extra','identity','balance'])test(`Sirens rejects ${mutation} without partial identity or Fear writes`,()=>nativeFixture(f=>{
  const x=fixture(f),input=structuredClone(x.proposal);
  if(mutation==='role')input.npc.role='combatant';
  if(mutation==='location')input.npc.location_key='elsewhere';
  if(mutation==='extra')input.gm=true;
  if(mutation==='identity')input.npc.key='INVALID KEY';
  if(mutation==='balance')f.db.changeFear(f.guild,-f.db.getCampaign(f.guild).fear);
  const before=changes(f),fear=f.db.getCampaign(f.guild).fear;
  assert.throws(()=>apply(f,x,input));assert.equal(changes(f),before);assert.equal(f.db.getCampaign(f.guild).fear,fear);
  assert.equal(f.db.getCityRecord(f.guild,'autonomous_entity','npc:sirens-responder'),null);
}));
test('arrival source retraction holds saved proof without reversing committed identity, Fear or PC state',()=>nativeFixture(f=>{
  const x=fixture(f),row=apply(f,x),fear=f.db.getCampaign(f.guild).fear,pcs=f.pcs.map(pc=>f.db.getCharacter(pc.id)),
    source=f.db.getWorldEvent(f.guild,x.sourceRef);
  indexWorldEvent(f.db,f.guild,{...source,key:source.event_key,status:'retracted'},x.pc.owner_user_id);
  const before=changes(f);assert.throws(()=>inspectEnvironmentArrival(f.db,f.guild,row.record_key,x.scope));
  assert.equal(changes(f),before);assert.equal(f.db.getCampaign(f.guild).fear,fear);
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id)),pcs);
  assert(f.db.getCityRecord(f.guild,'autonomous_entity',row.data.identity));
  assert.throws(()=>inspectEnvironmentArrival(f.db,f.guild,row.record_key,{...x.scope,actorCharacterId:f.pcs[1].id,actorUserId:f.pcs[1].owner_user_id}));
}));
