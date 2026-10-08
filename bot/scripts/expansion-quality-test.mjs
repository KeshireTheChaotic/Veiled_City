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
import { validateDecisionAdvisory } from "../src/decision-advisory.js";
import { routeDiscoveryMessage } from "../src/continuity-routing.js";
const fixtures=JSON.parse(fs.readFileSync(new URL("./fixtures/expansion-quality-golden.json",import.meta.url),"utf8"));
const judgments=JSON.parse(fs.readFileSync(new URL("./fixtures/systems-judgment-golden.json",import.meta.url),"utf8"));
const heard=JSON.parse(fs.readFileSync(new URL("./fixtures/i-heard-you-golden.json",import.meta.url),"utf8"));
const root=fs.mkdtempSync(path.join(os.tmpdir(),"vc-quality-")),schema=path.resolve("sql/schema.sql"),db=new VeiledDB(path.join(root,"fixture.sqlite"),schema);
const metrics={fixture_only:true,seed:570,baseline_failures:0,false_positives:0,false_negatives:0,regressions:0,golden_passes:0,malicious_rejections:0,
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
  configureCityFlags(db,guild,{decision_advisory:true,discovery:true});
  metrics.judgment_provenance=judgments.provenance;metrics.judgment_cases=[];
  for(const fixture of judgments.valid){
    const {id,prompt,...advisory}=fixture;
    const output={...fixtures.compatibility_5_0,state_review:review,decision_advisory:advisory,
      respond:advisory.mode!=="silence",narration:advisory.mode==="silence"?"":"The declared approach remains your choice."};
    const provider=new FakeResponses([output]);
    const service=new GMService({db,content:gm.content,ai:provider,config:{gmModel:"offline",maxRecentMessages:8,maxContentChunks:2}});
    try{
      const result=await service.runTurn({guildId:guild,actorUserId:"owner",actorName:"Detective",messageText:prompt});
      assert.equal(validateDecisionAdvisory(db,guild,result).mode,advisory.mode,id);assert.equal(provider.requests.length,1,id);
      metrics.golden_passes++;metrics.judgment_cases.push({id,expected:"accept",actual:"accept"});
    }catch(error){metrics.false_positives++;throw error;}
  }
  const base={mode:"clarify",check:"",reason:"Ask for the actual declared action",uncertainty:"",consequence:""};
  for(const fixture of judgments.invalid){
    let rejected=false;
    try{validateDecisionAdvisory(db,guild,{respond:false,narration:"",decision_advisory:{...base,...fixture.patch},events:fixture.events||[]});}
    catch{rejected=true;}
    if(!rejected) metrics.false_negatives++;
    assert(rejected,fixture.id);metrics.malicious_rejections++;metrics.judgment_cases.push({id:fixture.id,expected:"reject",actual:"reject"});
  }
  const session=db.startSession(guild,"Fixture");db.assignCharacter(session.id,"owner",pc.id);db.setPresence(session.id,"owner","present");
  configureCityFlags(db,guild,{semantic_integrity:true,natural_language:true});
  metrics.i_heard_you={provenance:heard.provenance,cases:[],false_positives:0,false_negatives:0,
    rule_violations:{measured_by:"i-heard-you-2-test",result:"See required VALIDATION_REPORT; semantic cases do not measure dice arithmetic."},
    unresolved_ambiguities:0,limits:heard.limits};
  for(const fixture of heard.cases){
    let actual="accept";
    try{validateNarrativeClaims(db,guild,fixture.surface==="private"?{narration:"Rain falls.",private_messages:[{content:fixture.text}]}:{narration:fixture.text});}
    catch(error){if(error.code!=="NARRATIVE_INTEGRITY") throw error;actual="reject";}
    const unknown=fixture.expected==="unverified";
    metrics.i_heard_you.cases.push({id:fixture.id,expected:fixture.expected,validator_result:actual,semantic_status:unknown?"UNVERIFIED":"bounded_fixture_verified"});
    if(unknown){metrics.i_heard_you.unresolved_ambiguities++;continue;}
    if(actual!==fixture.expected){if(fixture.expected==="accept") metrics.i_heard_you.false_positives++;else metrics.i_heard_you.false_negatives++;}
  }
  console.log(`I_HEARD_YOU_EVALUATION ${JSON.stringify(metrics.i_heard_you)}`);
  assert.equal(metrics.i_heard_you.false_positives+metrics.i_heard_you.false_negatives,0,"Hand-authored IHY semantics/UX regression");
  const writes=db.db.prepare("SELECT total_changes() AS n").get().n,delivered=[];
  assert(await routeDiscoveryMessage({db,message:{guild:{id:guild},author:{id:"owner"},content:"What do I know about Public evidence?"},deliver:async value=>delivered.push(value)}));
  assert(delivered[0].includes("Public evidence"));assert(!delivered[0].includes("SYNTHETIC_SECRET"));assert(delivered[0].length<=1900);
  assert.equal(db.db.prepare("SELECT total_changes() AS n").get().n,writes);metrics.judgment_cases.push({id:"J15-private-fake-Discord",expected:"scoped-read-only",actual:"scoped-read-only"});
  configureCityFlags(db,guild,{decision_advisory:false});
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
    consent_attendance:"expansion-d-test",major_review_restore:"expansion-c-test",travel_last_unit:"expansion-e-test",
    npc_voice_private_tts:"portrayal-authoring-test",dialogue_refusal_subjectivity:"systems-to-players-2-test",
    audience_differentiation:"systems-to-players-4-test",claim_commit_alignment:"end-to-end-i-test",
    owned_roll_sources:"i-heard-you-1-test",collaboration_rules_and_replay:"i-heard-you-2-test",listener_tactics:"i-heard-you-3-test",
    consent_and_cases:"i-heard-you-4-test",continuity_receipts:"i-heard-you-5-test",quiet_and_ranking:"i-heard-you-6-test",scoped_briefs:"i-heard-you-7-test"};
  console.log(`Expansion quality benchmark PASS ${JSON.stringify(metrics)}`);
}finally{db.close();fs.rmSync(root,{recursive:true,force:true});}
