/** Repeatable fixture benchmark against real validators/resolvers; rejects mutations without claiming unrestricted AI quality. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { VeiledDB } from "../src/db.js";
import { GMService } from "../src/gm.js";
import { ContentIndex } from "../src/content.js";
import { POST_TURN_REVIEW_CATEGORIES } from "../src/director.js";
import { validateNarrativeClaims } from "../src/narrative-integrity.js";
import { applyAuthoritativeMutation } from "../src/state.js";
import { configureSimulationEntity, submitNpcAction, executeNpcAction, actorState } from "../src/simulation.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { configureCityFlags, updateCityCore } from "../src/city-core.js";
import { updateCityCivic } from "../src/city-civic.js";
import { subscribeConsequence, coordinateConsequences, reviewConsequence } from "../src/city-consequences.js";
import { explainWhy } from "../src/provenance.js";
import { FakeResponses } from "./contract-fixtures.mjs";
const fixtures=JSON.parse(fs.readFileSync(new URL("./fixtures/expansion-quality-golden.json",import.meta.url),"utf8"));
const root=fs.mkdtempSync(path.join(os.tmpdir(),"vc-quality-")),schema=path.resolve("sql/schema.sql"),db=new VeiledDB(path.join(root,"fixture.sqlite"),schema);
const metrics={fixture_only:true,seed:570,baseline_failures:0,false_positives:0,regressions:0,golden_passes:0,malicious_rejections:0,
  categories:{},source_traceability_checks:0,events:0,billable_tokens:0,live_requests:0};
try{
  const guild="quality";db.ensureCampaign(guild);db.upsertPlayer(guild,"owner","Owner");
  const pc=db.createCharacter(guild,"owner","Detective",{});db.upsertNpcProfile(guild,{npcKey:"witness",displayName:"Witness"});
  configureSimulationEntity(db,guild,"npc","witness",{location_key:"station"});configureSimulationEntity(db,guild,"location","station",{});
  const secret=db.addFact(guild,{content:"SYNTHETIC_SECRET",visibility:"gm"}),publicId=db.addFact(guild,{content:"Public evidence",visibility:"party"});
  const claim={actor:"",entity_type:"npc",entity:"witness",action:"movement",prior:"station",proposed:"remote",visibility:"party",source_ref:"",
    source_span:"",mutation_index:-1,certainty:"committed"};
  const check=(row,scope)=>validateNarrativeClaims(db,guild,{narration:row.source_span,narrative_claims:[row]},scope);
  for(const fixture of fixtures.legitimate_claims){
    try{check({...claim,action:fixture.action,certainty:fixture.certainty,source_span:fixture.text});metrics.golden_passes++;}
    catch(error){metrics.false_positives++;throw error;}
  }
  for(const fixture of fixtures.mutations){
    const row={...claim,...Object.fromEntries(Object.entries(fixture).filter(([key])=>!['category','text'].includes(key))),source_span:fixture.text};
    if(row.source_ref==="SECRET_ID") row.source_ref=secret;if(row.source_ref==="PUBLIC_ID") row.source_ref=publicId;
    assert.throws(()=>check(row),error=>error.code==="NARRATIVE_INTEGRITY");metrics.malicious_rejections++;metrics.categories[fixture.category]=1;
  }
  check({...claim,action:"disclosure",entity_type:"character",entity:pc.id,proposed:"Public evidence",source_ref:publicId,source_span:"Public evidence"});metrics.golden_passes++;
  const privateId=db.addFact(guild,{content:"Personal clue",visibility:"character",subjectCharacterId:pc.id});
  check({...claim,action:"disclosure",entity_type:"character",entity:pc.id,proposed:"Personal clue",source_ref:privateId,source_span:"Personal clue"},
    {mode:"private",actorCharacterId:pc.id,actorUserId:"owner"});metrics.golden_passes++;
  let seed=570;
  for(let i=0;i<100;i++){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const fixture=fixtures.mutations[seed%fixtures.mutations.length],row={...claim,action:fixture.action,proposed:fixture.proposed,
      actor:fixture.actor||"",source_ref:fixture.source_ref==="SECRET_ID"?secret:fixture.source_ref==="PUBLIC_ID"?publicId:fixture.source_ref,source_span:fixture.text};
    assert.throws(()=>check(row),error=>error.code==="NARRATIVE_INTEGRITY");metrics.malicious_rejections++;
  }
  db.updateCharacterData(pc.id,data=>{data.resources.hp={current:6,max:6};});
  const damage={narration:"You suffer 20 damage",narrative_claims:[{...claim,entity_type:"character",entity:pc.id,action:"damage",prior:"6",proposed:"-20",
    mutation_index:0,source_span:"You suffer 20 damage"}],events:[{type:"resource_delta",key:"hp",amount:-20,target_character_id:pc.id,visibility:"party"}]};
  assert.throws(()=>applyAuthoritativeMutation(db,{guildId:guild,events:damage.events,narrative:damage}),/committed_result_mismatch/);
  assert.equal(db.getCharacter(pc.id).data.resources.hp.current,6);metrics.categories.atomic_resource_rollback=1;metrics.malicious_rejections++;
  db.upsertNpcGoal(guild,{npcKey:"witness",goalKey:"prepare",objective:"Prepare",acceptableMethods:["prepare"]});
  const prior=actorState(db,guild,"npc","witness").resources.materials;
  const action=submitNpcAction(db,guild,{actor_type:"npc",actor_key:"witness",goal_key:"prepare",type:"prepare"},{roll:()=>20});
  for(let i=0;i<10;i++) executeNpcAction(db,guild,action,{roll:()=>20});
  assert.equal(actorState(db,guild,"npc","witness").resources.materials,prior-1);metrics.categories.double_cost_replay=10;
  const review=Object.fromEntries(POST_TURN_REVIEW_CATEGORIES.map(key=>[key,{decision:"no_change",reason:"No mutation",confidence:100}]));
  review.scene={decision:"continue",label:"",reason:"Same scene"};
  const fake=new FakeResponses([{...fixtures.compatibility_5_0,state_review:review}]);
  const gm=new GMService({db,content:new ContentIndex(path.resolve("../content")),ai:fake,config:{gmModel:"offline",maxRecentMessages:8,maxContentChunks:2}});
  assert.equal((await gm.runTurn({guildId:guild,actorUserId:"owner",actorName:"Detective",messageText:"Describe the station window"})).narration,
    fixtures.compatibility_5_0.narration);assert.equal(fake.requests.length,1);metrics.golden_passes++;metrics.compatibility_5_0="unchanged fixture accepted";
  configureCityFlags(db,guild,{consequences:true});
  const start=performance.now();
  for(let i=0;i<25;i++){indexWorldEvent(db,guild,{key:`event-${i}`,title:`Physical damage ${i}`,source_kind:"gm",source_id:"human",kind:"infrastructure_damage",location_key:"station"});metrics.events++;}
  metrics.event_index_ms=Number((performance.now()-start).toFixed(2));
  updateCityCore(db,guild,{kind:"institution",key:"works",source_event:"event-0",data:{name:"Works",mandate:"Maintain power",capacity:5,jurisdictions:["station"],procedures:[]}},"gm");
  updateCityCivic(db,guild,{kind:"infrastructure",key:"power",source_event:"event-0",data:{name:"Power",service:"power",native_condition:80,operator:"works",locations:["station"]}},"gm");
  subscribeConsequence(db,guild,{key:"damage",source_event:"event-0",handler:"service",entity_key:"power",location_key:"station",event_kinds:["infrastructure_damage"],payload:{delta:-1}},"gm");
  const consequence=coordinateConsequences(db,guild,1)[0];reviewConsequence(db,guild,{key:consequence.record_key,decision:"approve"},"gm");
  const trace=explainWhy(db,guild,{event_key:consequence.source_event});
  assert(trace.validations.some(row=>row.kind==="consequence"&&row.status==="completed"));assert(trace.ledger.length);metrics.source_traceability_checks++;
  metrics.covered_by_required_suites={failed_clue_paths:"story-continuity-test",atomic_publication:"endurance-test",context_bounds:"expansion-f-test",
    consent_attendance:"expansion-d-test",major_review_restore:"expansion-c-test",travel_last_unit:"expansion-e-test"};
  console.log(`Expansion quality benchmark PASS ${JSON.stringify(metrics)}`);
}finally{db.close();fs.rmSync(root,{recursive:true,force:true});}
