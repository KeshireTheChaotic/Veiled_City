import test from 'node:test';
import assert from 'node:assert/strict';
import {createP08ThreeFixture} from './p08-final-three-fixture.mjs';
import {assemblyInputs,assemblyWriterBrief,certifyAssemblyPlan} from '../../src/assembly-context.js';
import {assemblyNarrativeCandidate,prepareAssemblyOutput} from '../../src/pvp-output.js';
import {bindDirectorNarrativeSource} from '../../src/narrative-director-source.js';
import {openingWorldOpportunities} from '../../src/opening-world-bridge.js';
import {authorNarrativeRequests,establishNarrativeUnits} from '../../src/narrative-authority.js';
import {GMService} from '../../src/gm.js';

function writerAnswer(textPrefix){return {fiction_delta:[],narrative_units:[
  {id:`${textPrefix}-a`,kind:'scene',text:`${textPrefix}: the brass harbor ledger trembles beside the salt-stiff window.`,subject_key:'',location_key:'harbor-desk',
    visibility:'party',epistemic:'observation',source_refs:[],receipt_kind:'',receipt_ref:''},
  {id:`${textPrefix}-b`,kind:'scene',text:`${textPrefix}: blue carbon dust rings a second page beneath the clock.`,subject_key:'',location_key:'harbor-desk',
    visibility:'party',epistemic:'observation',source_refs:[],receipt_kind:'',receipt_ref:''}
]};}
function certifiedPlan(db,guild,session){
  const inputs=assemblyInputs(db,guild,session);
  const generated={public_opening:'PLANNER_PUBLIC_OPENING_CANARY',convergence_goal:'PLANNER_SECRET_MYSTERY_CANARY',public_opportunity_refs:[],
    character_entries:inputs.characters.map(p=>({discord_user_id:p.user,character_id:p.character,character_name:p.name,
      hook_source_refs:p.sources.slice(0,1).map(s=>s.id),private_hook:`PRIVATE_PLAN_${p.user}`,private_parts:[],public_cue:`PRIVATE_CUE_${p.user}`,stay_reason:`PRIVATE_STAY_${p.user}`})),
    bonds:[],gm_notes:'PLANNER_GM_NOTES_CANARY',public_parts:[]};
  return certifyAssemblyPlan(db,guild,session,generated,{strict:true});
}
async function createTwoNativeCues(f){
  const {db,guild,session}=f,scope={mode:'party',actorUserId:null,actorCharacterId:null};
  db.setAssemblyPlan(session.id,certifiedPlan(db,guild,session));
  const native=assemblyNarrativeCandidate(db,guild,session.id,scope),source=native.source;
  assert.equal(source.kind,'native_assembly_scope','the camera source is independently created by native assembly authority');
  const response=writerAnswer('opening-source');
  const request=native.candidate.gm_world_parts[0];
  await authorNarrativeRequests({db,guild,result:{gm_world_parts:[request],narration:''},
    scope,sourceRef:source.event_key,budget:{used:false},generate:async()=>response});
  establishNarrativeUnits(db,guild,request,scope,source.event_key);
  const partyScope={mode:'party',actorUserId:null,actorCharacterId:null};
  const directorRef=bindDirectorNarrativeSource(db,guild,{},partyScope,'manual',{scope:'party',event_refs:[source.event_key],reason:'current writer proof'},null);
  const opportunities=openingWorldOpportunities(db,guild,{mode:'party',actorUserId:null,actorCharacterId:null});
  assert.equal(opportunities.beats.length,2,'two current audience-visible native camera units create two Director cues');
  return {scope,source:directorRef,opportunities};
}

test('OpeningDirector-selected public opportunity reaches actual assembly writer packet without planner prose',async()=>{
  const f=createP08ThreeFixture();
  try{
    const {db,guild,session,pcs}=f,{scope,source,opportunities}=await createTwoNativeCues(f);
    const plan=db.getAssemblyPlan(session.id),selected=opportunities.beats[0],unselected=opportunities.beats[1];
    const recertified=certifyAssemblyPlan(db,guild,session,{...plan,public_opportunity_refs:[{source_ref:selected.source_ref,signal_ref:selected.signal_ref}]},{strict:true});
    db.setAssemblyPlan(session.id,recertified);
    const packets=[],service=new GMService({db,content:{root:'',search:()=>[]},config:{gmTurnDeadlineMs:10000},
      ai:{responses:{create:async()=>{throw new Error('The provider must remain mocked at the writer boundary.');}}},srd:{}});
    service.generateNarrative=async(_guild,packet)=>{packets.push(structuredClone(packet));return writerAnswer('cohort-writer');};
    await service.authorAssemblyScene(guild,session.id,scope);
    prepareAssemblyOutput(db,guild,session.id,scope);
    assert.equal(packets.length,1,'one current writer request receives the compiled brief');
    const packet=packets[0],intent=packet.assembly_brief?.dramatic_intent;
    assert.equal(intent?.version,3);
    assert.equal(intent.selected_opportunities.length,1);
    assert.equal(intent.selected_opportunities[0].source_ref,selected.source_ref);
    assert.equal(intent.selected_opportunities[0].signal_ref,selected.signal_ref);
    assert.equal(intent.selected_opportunities[0].visible_text,selected.visible_text);
    assert.match(intent.selected_opportunities[0].visible_text,/brass harbor ledger|blue carbon dust/);
    assert.notEqual(intent.selected_opportunities[0].signal_ref,unselected.signal_ref);
    const prompt=JSON.stringify(packet);
    for(const canary of ['PLANNER_PUBLIC_OPENING_CANARY','PLANNER_SECRET_MYSTERY_CANARY','PLANNER_GM_NOTES_CANARY','PRIVATE_PLAN_owner-a','PRIVATE_PLAN_owner-b'])
      assert.equal(prompt.includes(canary),false,`writer packet must exclude ${canary}`);
    assert.match(packet.assembly_brief.public_throughline,/source-authorized opportunity/);
    assert.doesNotMatch(packet.assembly_brief.public_throughline,/must use|exactly|template|word count/i);
    const accepted=db.listCityRecords(guild,{kind:'narrative_unit',includeGM:true,limit:20})
      .filter(row=>row.status==='accepted_established'&&row.data.unit?.text.startsWith('cohort-writer:'));
    assert.ok(accepted.length>=1,'the actual assembly writer response passes native narrative acceptance');
    assert.ok(accepted.every(row=>!/PLANNER_|PRIVATE_PLAN_/.test(row.data.text)));
    const privateBrief=assemblyWriterBrief(db,guild,session.id,{mode:'private',actorUserId:pcs[1].user,actorCharacterId:pcs[1].pc.id},recertified);
    assert.ok(privateBrief.sources.some(row=>row.text==='PLAYER_THREAD_owner-b'));
    assert.equal(privateBrief.sources.some(row=>row.text==='PLAYER_THREAD_owner-a'),false);
    assert.equal(privateBrief.dramatic_intent.selected_opportunities.length,0,'public selected incident is not implicitly copied into a private owner packet');
    const generic=assemblyWriterBrief(db,guild,session.id,scope,{...recertified,public_opportunity_refs:[],assembly_contract:{...recertified.assembly_contract,public_opportunity_refs:[]}});
    assert.equal(generic.dramatic_intent.selected_opportunities.length,0,'without selected evidence the ordinary open-world direction remains available');
    assert.match(generic.public_throughline,/invent an ordinary detail freely/);
    const selectedSource=db.getWorldEvent(guild,selected.signal_ref);
    assert.ok(selectedSource?.status==='active'&&source,'the selected proof is backed by a current native Director source');
  }finally{f.close();}
});
test('selected specific cue is rejected after its native source is revoked',async()=>{
  const f=createP08ThreeFixture();
  try{
    const {db,guild,session,pcs}=f,{scope,opportunities}=await createTwoNativeCues(f),cue=opportunities.beats[0];
    const privateScope={mode:'private',actorUserId:pcs[1].user,actorCharacterId:pcs[1].pc.id};
    bindDirectorNarrativeSource(db,guild,{},privateScope,'manual',{scope:'private',event_refs:[cue.signal_ref],reason:'recipient isolation'},null);
    assert.equal(openingWorldOpportunities(db,guild,privateScope).beats.length,0,'a party-visible source is not relabeled as another owner private evidence');
    const plan=certifyAssemblyPlan(db,guild,session,{...db.getAssemblyPlan(session.id),
      public_opportunity_refs:[{source_ref:cue.source_ref,signal_ref:cue.signal_ref}]},{strict:true});
    assert.equal(assemblyWriterBrief(db,guild,session.id,scope,plan).dramatic_intent.selected_opportunities[0].signal_ref,cue.signal_ref);
    assert.throws(()=>certifyAssemblyPlan(db,guild,session,{...plan,public_opportunity_refs:[{source_ref:'unsupported-source',signal_ref:'unsupported-signal'}]},{strict:true}),
      error=>error.code==='ASSEMBLY_SOURCE','unverified references cannot be selected as public dramatic intent');
    const revoked=db.getWorldEvent(guild,cue.signal_ref);db.saveWorldEvent(guild,{...revoked,key:revoked.event_key,status:'retracted'});
    const remaining=openingWorldOpportunities(db,guild,scope).beats;
    assert.equal(remaining.length,1,'only the separate still-active observation remains available');
    assert.equal(remaining.some(beat=>beat.signal_ref===cue.signal_ref),false,'the revoked scene observation remains unavailable');
    assert.throws(()=>assemblyWriterBrief(db,guild,session.id,scope,plan),error=>error.code==='ASSEMBLY_SOURCE');
    const originRef=db.getCityRecord(guild,'narrative_unit',cue.signal_ref.replace(/:source$/,'')).data.binding.source;
    db.db.prepare('UPDATE world_events SET source_id=? WHERE guild_id=? AND event_key=?').run('native:unsupported',guild,originRef);
    assert.equal(openingWorldOpportunities(db,guild,scope).beats.length,0,'a native event with no matching registered authority is not accepted as GM provenance');
  }finally{f.close();}
});







