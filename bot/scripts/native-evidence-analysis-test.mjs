/** W2 authoring fixtures only. Not executed during construction/qualification freeze. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {actionFixture} from './v96-action-fixture.mjs';
import {manageEvidence} from '../src/evidence-custody.js';
import {stateRevision} from '../src/ai-intents.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {currentScene,recordScenePresence} from '../src/scene-continuity.js';
import {applicationPrincipal} from '../src/application-authority.js';
import {applyRoutineEvidenceAnalysis,verifyRoutineEvidenceAnalysis} from '../src/native-evidence-analysis.js';
import {applyOrdinaryEffects} from '../src/ordinary-effects.js';
import {ordinaryEffectProjection} from '../src/ordinary-effect-proof.js';

function setup(f,{privateScene=false,unresolved=false}={}){
  const pc=f.pcs[0],scene=currentScene(f.db,f.guild),visibility=privateScene?'character':'party';
  f.db.setSimulationEntity(f.guild,'location','terminal',{name:'Terminal',visibility:'party'});
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,evidence_custody:true,scene_continuity:true}});
  const handout=f.db.createHandout(f.guild,{title:'Courier manifest',content:'The manifest claims that a blue parcel arrived at noon.',
    visibility,subjectCharacterId:privateScene?pc.id:null,authority:'unreliable',metadata:{internal:'SYNTHETIC_GM_SECRET'}});
  const source=(key,from,to)=>indexWorldEvent(f.db,f.guild,{key,kind:'evidence_transfer',title:'Sourced physical custody',
    source_id:'human_gm',truth_status:'observed',visibility,subject_key:privateScene?pc.id:null,
    session_id:scene.session_id,scene:scene.key,location_key:'terminal',details:{evidence:{handout_id:handout.id,from,to}}},'fixture-gm');
  const registered=source('manifest-register',null,'location:terminal');
  manageEvidence(f.db,f.guild,{op:'register',key:'register',id:handout.id,holder:'location:terminal',source_event:registered.event_key,
    expected_revision:'absent'},'fixture-gm',{gm:true});
  recordScenePresence(f.db,f.guild,{entity_type:'character',entity_key:pc.id,source_event:registered.event_key,
    location_key:'terminal',visibility,subject_key:privateScene?pc.id:null,accepted_by:pc.owner_user_id},'fixture-gm');
  const collected=source('manifest-collect','location:terminal',`character:${pc.id}`);
  manageEvidence(f.db,f.guild,{op:'collect',key:'collect',id:handout.id,source_event:collected.event_key,
    expected_revision:stateRevision(f.db.getHandout(handout.id).metadata.evidence)},pc.owner_user_id);
  const x=actionFixture(f,'I read the courier manifest.',{privateScene});
  Object.assign(x.intent,{type:'observe',operation:'read_evidence',target_key:handout.id,target_name:handout.title,resolution:unresolved?'roll_required':'auto'});
  if(!unresolved)Object.assign(x.ruling,{disposition:'narrative_no_roll',effect_class:'observation',trait:null,difficulty:null,risk:'none',stakes:'none'});
  x.run();
  const accepted=f.db.listCityRecords(f.guild,{kind:'typed_intent',includeGM:true})[0];
  const proposal={version:1,accepted_intent_ref:accepted.record_key,prerequisite_ref:accepted.data.outcome_receipt||'pending',
    handout_id:handout.id,source_event:collected.event_key,expected_revision:stateRevision(f.db.getHandout(handout.id).metadata.evidence),
    excerpt_start:0,excerpt_end:handout.content.length};
  const apply=(p=proposal,scope=x.scope,principal=applicationPrincipal(f.guild,'evidence.analyze','native-test-adapter'))=>
    applyRoutineEvidenceAnalysis(f.db,f.guild,p,scope,{principal});
  return {x,handout,collected,accepted,proposal,apply};
}

test('W2 bounded document reading owns a separate receipt, preserves physical state and survives restart',()=>nativeFixture(f=>{
  const s=setup(f),before=f.db.getHandout(s.handout.id),pc=f.db.getCharacter(s.x.pc.id),row=s.apply();
  const projection=verifyRoutineEvidenceAnalysis(f.db,f.guild,row.record_key,s.x.scope);
  assert.match(projection.text,/Existing document claim \(unverified\)/);
  assert(projection.text.includes(s.handout.content));assert(!projection.text.includes('SYNTHETIC_GM_SECRET'));
  assert.deepEqual(f.db.getHandout(s.handout.id),before);assert.deepEqual(f.db.getCharacter(s.x.pc.id),pc);
  f.restart();assert.equal(s.apply().record_key,row.record_key);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'evidence_analysis',includeGM:true}).length,1);
}));

for(const principal of [null,{guild:'v9-synthetic',operation:'evidence.analyze',id:'forged'}])
  test('W2 serialized principal never grants interpretation authority',()=>nativeFixture(f=>{
    const s=setup(f);assert.throws(()=>s.apply(s.proposal,s.x.scope,principal),/APPLICATION_AUTHORITY_REQUIRED/);
    assert.equal(f.db.listCityRecords(f.guild,{kind:'evidence_analysis',includeGM:true}).length,0);
  }));

test('W2 pending native roll cannot authorize a document analysis',()=>nativeFixture(f=>{
  const s=setup(f,{unresolved:true});assert.throws(()=>s.apply());
  assert.equal(f.db.listCityRecords(f.guild,{kind:'evidence_analysis',includeGM:true}).length,0);
}));

test('W2 exact excerpt contract rejects model conclusions, custody operations and altered replay',()=>nativeFixture(f=>{
  const s=setup(f);
  for(const patch of [{interpretation:'The courier is guilty.'},{holder:'npc:thief'},{excerpt_end:1000},{expected_revision:'invented'},
    {handout_id:'different-document'},{source_event:'manifest-register'}])assert.throws(()=>s.apply({...s.proposal,...patch}));
  s.apply();assert.throws(()=>s.apply({...s.proposal,excerpt_start:1}),/IMMUTABLE_ANALYSIS_TERMS_CHANGED/);
}));

test('W2 private owner-held evidence cannot be projected to party or another owner',()=>nativeFixture(f=>{
  const s=setup(f,{privateScene:true}),row=s.apply();assert.equal(row.visibility,'character');
  assert.throws(()=>verifyRoutineEvidenceAnalysis(f.db,f.guild,row.record_key,{...s.x.scope,mode:'party'}));
  assert.throws(()=>verifyRoutineEvidenceAnalysis(f.db,f.guild,row.record_key,{mode:'private',actorUserId:f.pcs[1].owner_user_id,actorCharacterId:f.pcs[1].id}));
  f.db.saveCityRecord(f.guild,{...row,key:row.record_key,visibility:'party',subject_key:null});
  assert.throws(()=>verifyRoutineEvidenceAnalysis(f.db,f.guild,row.record_key,{...s.x.scope,mode:'party'}));
}));

for(const change of ['source','owner-source','scene','custody','handout','owner'])
  test(`W2 ${change} invalidates current/saved reading while retaining the committed receipt`,()=>nativeFixture(f=>{
    const s=setup(f),row=s.apply();
    if(change==='source')indexWorldEvent(f.db,f.guild,{key:s.collected.event_key,status:'retracted'},'fixture-gm');
    if(change==='owner-source')indexWorldEvent(f.db,f.guild,{key:s.accepted.source_event,status:'retracted'},'fixture-gm');
    if(change==='scene')f.db.setDirectorState(f.session.id,{scene_number:2});
    if(change==='custody'){
      const e=structuredClone(f.db.getHandout(s.handout.id).metadata.evidence);e.original.holder='npc:thief';f.db.setHandoutEvidence(f.guild,s.handout.id,e);
    }
    if(change==='handout')f.db.archiveHandout(s.handout.id);
    if(change==='owner')f.db.db.prepare('UPDATE characters SET owner_user_id=? WHERE id=?').run(f.pcs[1].owner_user_id,s.x.pc.id);
    f.restart();assert.throws(()=>verifyRoutineEvidenceAnalysis(f.db,f.guild,row.record_key,s.x.scope));
    assert.equal(f.db.getCityRecord(f.guild,'evidence_analysis',row.record_key).status,'resolved');
  }));

for(const privateScene of [false,true])
  test(`W2 ordinary evidence adapter preserves ${privateScene?'private':'party'} source/output and holds unsupported conclusions`,()=>nativeFixture(f=>{
    const s=setup(f,{privateScene}),before=f.db.getHandout(s.handout.id),p=s.proposal;
    const evidence={handout_id:p.handout_id,source_event:p.source_event,expected_revision:p.expected_revision,
      excerpt_start:p.excerpt_start,excerpt_end:p.excerpt_end};
    const proposal={version:1,accepted_intent_ref:p.accepted_intent_ref,prerequisite_ref:p.prerequisite_ref,
      adapter:'evidence_excerpt',effect_class:'evidence',payload_json:JSON.stringify({when:'no_roll',evidence})};
    const unsupported={...proposal,payload_json:JSON.stringify({when:'no_roll',evidence:{...evidence,interpretation:'The courier is guilty.'}})};
    const rows=applyOrdinaryEffects(f.db,f.guild,[unsupported,proposal],s.x.scope);
    assert.equal(rows[0].status,'needs_review');assert.equal(rows[1].status,'applied');
    const receipt=rows[1],projection=ordinaryEffectProjection(f.db,f.guild,receipt.record_key,s.x.scope);
    assert.equal(receipt.visibility,privateScene?'character':'party');
    assert.equal(receipt.subject_key||null,privateScene?s.x.pc.id:null);
    assert.equal(projection.text,`Existing document claim (unverified): ${s.handout.content}`);
    assert(!projection.text.includes('SYNTHETIC_GM_SECRET'));assert(!projection.text.includes('guilty'));
    assert.deepEqual(f.db.getHandout(s.handout.id),before);
    if(privateScene)assert.throws(()=>ordinaryEffectProjection(f.db,f.guild,receipt.record_key,{...s.x.scope,mode:'party'}));
    f.restart();
    assert.equal(ordinaryEffectProjection(f.db,f.guild,receipt.record_key,s.x.scope).text,projection.text);
    const replay=applyOrdinaryEffects(f.db,f.guild,[proposal],s.x.scope)[0];assert.equal(replay.record_key,receipt.record_key);
    assert.equal(f.db.listCityRecords(f.guild,{kind:'evidence_analysis',includeGM:true}).length,1);
    assert.equal(f.db.listCityRecords(f.guild,{kind:'ordinary_effect_receipt',includeGM:true}).length,1);
    assert.equal(f.db.getCityRecord(f.guild,'unsupported_action',rows[0].record_key).status,'needs_review');
    assert.deepEqual(f.db.getHandout(s.handout.id),before);
  }));
