import test from 'node:test';
import assert from 'node:assert/strict';
import {lifecycleHash,lifecycleProjection,publicationKnowledgeDisclosure} from '../../src/frameworks/publication/public.js';
const party={mode:'party',actorUserId:null,actorCharacterId:null},privateScope={mode:'private',actorUserId:'owner',actorCharacterId:'pc'};
const unused=()=>{throw Error('Unexpected lower evidence capability');};
publicationKnowledgeDisclosure.bind({activeEvidence:db=>db.evidenceActive,evidenceType:unused,factVisibleTo:unused,objectiveEvidence:unused});
function fixture({kind='aftermath',scope=party,job=false}={}){
  const saved={status:'applied',native_id:'native-receipt',model_summary:'unverified hidden prose'},encounter={guild_id:'guild',encounter_number:4},cycle={id:'cycle',guild_id:'guild',status:'resolved',source_session_id:'session',label:'Rest'},project={cycle_id:'cycle',visibility:scope.mode==='private'?'character':'party',discord_user_id:'owner',character_id:'pc',title:'Repair',progress:1,max_progress:3,status:'active'};
  const data={version:1,kind,scope:structuredClone(scope),id:kind==='aftermath'?'encounter':'cycle',source_session:'session',project:'project',snapshot:lifecycleHash(kind==='aftermath'?saved:kind==='downtime_project'?project:cycle),...(job?{job_source:'job-source'}:{})};
  const row={status:'verified',source_event:'source',data},receipt={actor_type:'system',actor_id:'native:lifecycle-publication',mutation_type:'lifecycle_publication',entity_key:'key',after_json:JSON.stringify(data)},source={source_kind:'mutation',source_id:'receipt',details:{digest:lifecycleHash(data)}},origin={status:'active',kind:'native_downtime_authoring',source_id:'native:downtime',details:{cycle:'cycle'}},authoring={status:'committed',source_event:'job-source'},character={owner_user_id:'owner'};
  const db={evidenceActive:true,getCityRecord:(guild,kind)=>kind==='lifecycle_publication'?row:kind==='downtime_authoring_job'?authoring:null,getWorldEvent:(guild,key)=>key==='source'?source:key==='job-source'?origin:null,getMutation:()=>receipt,getEncounter:()=>encounter,getEncounterAftermath:()=>saved,getDowntimeCycle:()=>cycle,getDowntimeProject:()=>project,getCharacter:()=>character};
  return {db,row,data,receipt,source,origin,authoring,character,cycle,project,saved,scope};
}
const rejected=error=>error.code==='NARRATIVE_PVP'&&error.message==='Current native lifecycle publication required.';

test('saved version1 aftermath renders only exact native summary without exposing model prose or mutating readers',()=>{
  const f=fixture(),before=structuredClone({row:f.row,receipt:f.receipt,source:f.source,saved:f.saved});
  assert.deepEqual(lifecycleProjection(f.db,'guild','key',party),{text:'Encounter 4 aftermath has been applied. Native encounter outcomes remain recorded; no additional character action or disclosure is implied.',title:'Encounter 4 Aftermath'});
  assert.deepEqual({row:f.row,receipt:f.receipt,source:f.source,saved:f.saved},before);
});
test('wrong stored version/scope/receipt/source/evidence/snapshot is refused at each projection',()=>{
  for(const change of [f=>f.data.version=2,f=>f.row.status='draft',f=>f.receipt.actor_id='model',f=>f.receipt.after_json='{}',f=>f.source.details.digest='wrong',f=>f.db.evidenceActive=false,f=>f.saved.status='pending']){
    const f=fixture();change(f);assert.throws(()=>lifecycleProjection(f.db,'guild','key',party),rejected);
  }
  const f=fixture();assert.throws(()=>lifecycleProjection(f.db,'guild','key',privateScope),rejected);
});
test('private downtime project requires exact current character owner and projects native progress only',()=>{
  const f=fixture({kind:'downtime_project',scope:privateScope});
  assert.deepEqual(lifecycleProjection(f.db,'guild','key',privateScope),{title:'Downtime: Repair',text:'Downtime project "Repair": 1/3 steps; native status: active. Fictional details not independently certified remain GM-private.'});
  f.character.owner_user_id='other-owner';assert.throws(()=>lifecycleProjection(f.db,'guild','key',privateScope),rejected);
});
test('party downtime project preserves audience and exact current snapshot requirements',()=>{
  const f=fixture({kind:'downtime_project'});assert.equal(lifecycleProjection(f.db,'guild','key',party).title,'Downtime: Repair');f.project.progress=2;assert.throws(()=>lifecycleProjection(f.db,'guild','key',party),rejected);
});
test('world cycle and authored job source are revalidated and do not reveal unverified prose',()=>{
  const f=fixture({kind:'downtime_world',job:true}),projection=lifecycleProjection(f.db,'guild','key',party);
  assert.deepEqual(projection,{title:'World Movement — Rest',text:'The downtime cycle "Rest" has resolved. Committed world changes remain recorded; unverified Director narration is held for source review.'});
  f.origin.status='retracted';assert.throws(()=>lifecycleProjection(f.db,'guild','key',party),rejected);
});
test('unrecognized lifecycle kind cannot render as a generic world result',()=>{
  const f=fixture({kind:'unsupported'});assert.throws(()=>lifecycleProjection(f.db,'guild','key',party),rejected);
});
