/** Source-triggered reaction compatibility: never a free second defense against an ordinary PC attack. */
import assert from "node:assert/strict";
import test from "node:test";
import {nativeFixture} from "./v9-fixtures.mjs";
import {attackFixture} from "./v94-pvp-attack-fixtures.mjs";
import {preparePvpAttack,reviewPvpAttack,authorizePvpAttack,rollPvpAttack} from "../src/pvp-attacks.js";
import {indexWorldEvent} from "../src/city-calendar.js";
import {fakeInteraction} from "./contract-fixtures.mjs";
import {handleCommand} from "../src/commands.js";
import {rollBreakdown} from "../src/roll-requests.js";
import {applyRollOutcome} from "../src/roll-collaboration.js";
import {buildActionPlan} from "../src/action-dependency.js";
import {captureAuthoredTurnEnvelope} from "../src/authored-turn-envelope.js";
import {proposeIntents,acceptIntentForAdjudication} from "../src/typed-intents.js";
const api=()=>import("../src/pvp-reactions.js");
async function context(f){
  const x=await attackFixture(f),r=preparePvpAttack(f.db,f.guild,"gm",x.input,{gm:true,interactionId:"reaction-parent"});
  for(const pc of f.pcs.slice(0,2)){reviewPvpAttack(f.db,f.guild,pc.owner_user_id,r.record_key);authorizePvpAttack(f.db,f.guild,pc.owner_user_id,
    {attack:r.record_key,expected_revision:r.data.offer_hash},{interactionId:`reaction-parent:${pc.id}`});}
  const roll=rollPvpAttack(f.db,f.guild,f.pcs[0].owner_user_id,{attack:r.record_key,expected_revision:r.data.offer_hash},{rng:s=>s===12?1:assert.fail()});
  const accepted=f.accepted(1,"I try to avoid the falling debris.","terminal",{type:"roll",operation:"reaction",target:{kind:"location",key:"terminal",phrase:"terminal",grounding:"known"}});
  f.db.upsertRulesRuling(f.guild,{key:"debris-reaction",ruling:"Synthetic source-grounded hazard: Agility reaction Difficulty 13; ordinary success mitigates, Critical avoids remaining effect. No change to the independent PC attack.",createdBy:"gm"});
  const trigger=indexWorldEvent(f.db,f.guild,{key:"debris",kind:"environment_hazard",title:"Established falling debris",source_id:"gm:gm",
    session_id:f.session.id,scene:x.contract.data.scene,location_key:"terminal",visibility:"gm",
    details:{reaction_rule:{trait:"Agility",difficulty:13,normal_success:"partial",critical_success:"none",ruling:"debris-reaction"}}},"gm");
  return {input:{attack_receipt:roll.record_key,accepted_intent:accepted.record_key,trigger:trigger.event_key,ruling:"debris-reaction",trait:"Agility",modifier_keys:[]},parent:roll,trigger};
}
for(const [faces,outcome] of [[[1,1],"critical_avoids_effect"],[[9,10],"success_partial_effect"],[[1,2],"failure_effect_pending"]])
test(`PVD10/PVD11 real source-triggered owner reaction ${outcome} produces native protection, zero metacurrency or attack mutation`,()=>nativeFixture(async f=>{
  const a=await api(),x=await context(f),offer=a.preparePvpReaction(f.db,f.guild,"gm",x.input,{gm:true,interactionId:"reaction-offer"});
  const user=f.pcs[1].owner_user_id;a.reviewPvpReaction(f.db,f.guild,user,offer.record_key);let n=0;
  const result=a.rollPvpReaction(f.db,f.guild,user,{offer:offer.record_key,expected_revision:offer.data.digest},{interactionId:"reaction-dice",rng:()=>faces[n++]});
  assert.equal(result.data.outcome,outcome);assert.equal(n,2);
  assert.deepEqual(f.db.getCityRecord(f.guild,"pvp_attack_roll_receipt",x.parent.record_key),x.parent);
  for(const pc of f.pcs)assert.deepEqual(f.db.getCharacter(pc.id).data.resources,pc.data.resources);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"pvp_fear_trigger",includeGM:true}).length,0);
  f.restart();assert.deepEqual(a.rollPvpReaction(f.db,f.guild,user,{offer:offer.record_key,expected_revision:offer.data.digest},{interactionId:"retry",rng:()=>assert.fail()}),result);
}));
test("PVD10 no source/rule or a model-crafted hazard cannot authorize an extra PC defender reaction",()=>nativeFixture(async f=>{
  const a=await api(),x=await context(f);
  assert.throws(()=>a.preparePvpReaction(f.db,f.guild,"gm",{...x.input,trigger:x.parent.source_event},{gm:true,interactionId:"free-defense"}),/hazard|trigger|source/i);
  const hazard=f.db.getWorldEvent(f.guild,x.trigger.event_key),fake=indexWorldEvent(f.db,f.guild,{key:"model-hazard",kind:hazard.kind,title:hazard.title,
    source_id:"gm:model",session_id:hazard.session_id,scene:hazard.scene,location_key:hazard.location_key,visibility:"gm",details:hazard.details},"model");
  assert.throws(()=>a.preparePvpReaction(f.db,f.guild,"gm",{...x.input,trigger:fake.event_key},{gm:true,interactionId:"fake"}),/hazard|trigger|source/i);
}));
test("PVD10 use-time source revocation and foreign owner reject without dice/cost",()=>nativeFixture(async f=>{
  const a=await api(),x=await context(f),offer=a.preparePvpReaction(f.db,f.guild,"gm",x.input,{gm:true,interactionId:"offer"});
  assert.throws(()=>a.reviewPvpReaction(f.db,f.guild,f.pcs[2].owner_user_id,offer.record_key),/own|assignment/i);
  a.reviewPvpReaction(f.db,f.guild,f.pcs[1].owner_user_id,offer.record_key);indexWorldEvent(f.db,f.guild,{key:x.trigger.event_key,status:"retracted"},"gm");
  assert.throws(()=>a.rollPvpReaction(f.db,f.guild,f.pcs[1].owner_user_id,{offer:offer.record_key,expected_revision:offer.data.digest},{interactionId:"stale",rng:()=>assert.fail()}),/source|hazard|retract/i);
}));
test("B.4 shared trait extraction preserves serialized existing native roll breakdown contracts",()=>nativeFixture(f=>{
  const b=rollBreakdown(f.db,f.guild,{trait:"Agility",kind:"action",adjudication:"Existing ordinary action",modifier_keys:[]},f.pcs[0]);
  assert.deepEqual(Object.keys(b),["trait","trait_bonus","modifiers","subtotal","advantage","disadvantage","difficulty","attack","unresolved"]);
}));
test("PVD10 actual private command adapter prepares, reviews and rolls only the reaction owner",()=>nativeFixture(async f=>{
  const x=await context(f),call=async(user,op,input,gm=false)=>{
    const i=fakeInteraction({gm,sub:"pvp",json:{op,...input}});Object.assign(i,{id:`${user}:${op}`,guildId:f.guild,commandName:"vc-roll",isChatInputCommand:()=>true,user:{id:user,username:user}});
    await handleCommand(i,{db:f.db,gm:{}});return i;
  };
  await call("gm","reaction-prepare",x.input,true);const offer=f.db.listCityRecords(f.guild,{kind:"pvp_reaction_offer",includeGM:true})[0];assert(offer);
  const input={offer:offer.record_key,expected_revision:offer.data.digest};
  await call(f.pcs[2].owner_user_id,"reaction-roll",input);assert.equal(f.db.listCityRecords(f.guild,{kind:"pvp_reaction_roll_receipt",includeGM:true}).length,0);
  const user=f.pcs[1].owner_user_id;await call(user,"reaction-review",{offer:offer.record_key});const rolled=await call(user,"reaction-roll",input);
  assert(rolled.deliveries.every(d=>d.ephemeral&&d.content.length<=2000));assert.equal(f.db.listCityRecords(f.guild,{kind:"pvp_reaction_roll_receipt",includeGM:true}).length,1);
  for(const pc of f.pcs)assert.deepEqual(f.db.getCharacter(pc.id).data.resources,pc.data.resources);
}));
test("PVD11 saved native reaction cannot be relabeled as a generic Critical reward",()=>nativeFixture(async f=>{
  const a=await api(),x=await context(f),o=a.preparePvpReaction(f.db,f.guild,"gm",x.input,{gm:true,interactionId:"stripped-reaction"}),user=f.pcs[1].owner_user_id;
  a.reviewPvpReaction(f.db,f.guild,user,o.record_key);const r=a.rollPvpReaction(f.db,f.guild,user,{offer:o.record_key,expected_revision:o.data.digest},{interactionId:"critical",rng:()=>1});
  applyRollOutcome(f.db,f.guild,f.session.id,[f.pcs[1].id],r.data.result);
  assert.deepEqual(f.db.getCharacter(f.pcs[1].id).data.resources,f.pcs[1].data.resources);
}));
test("PVD private reaction to a party-authored attempt never promotes dice or Difficulty into shared receipts",()=>nativeFixture(async f=>{
  const a=await api(),x=await context(f),initial=f.db.getCityRecord(f.guild,"typed_intent",x.input.accepted_intent);
  const node=buildActionPlan(f.db,f.guild,[initial])[0];
  const o=a.preparePvpReaction(f.db,f.guild,"gm",x.input,{gm:true,interactionId:"private-outcome"}),user=f.pcs[1].owner_user_id;
  a.reviewPvpReaction(f.db,f.guild,user,o.record_key);a.rollPvpReaction(f.db,f.guild,user,{offer:o.record_key,expected_revision:o.data.digest},{interactionId:"own-dice",rng:()=>1});
  const accepted=f.db.getCityRecord(f.guild,"typed_intent",x.input.accepted_intent),receipt=f.db.getCityRecord(f.guild,"action_outcome_receipt",accepted.data.outcome_receipt);
  assert.equal(accepted.visibility,"party","Original declaration remains immutable and party authored.");
  assert.equal(receipt.visibility,"character");assert.equal(receipt.subject_key,f.pcs[1].id);assert.equal(receipt.data.audience,"character");
  assert.equal(accepted.data.native_disposition,"private_roll_resolved");
  assert(!f.db.listCityRecords(f.guild,{kind:"action_outcome_receipt"}).some(r=>r.record_key===receipt.record_key));
  const rebuilt=buildActionPlan(f.db,f.guild,[accepted])[0];assert.equal(rebuilt.record_key,node.record_key);assert.equal(rebuilt.visibility,"character");assert.equal(rebuilt.subject_key,f.pcs[1].id);
}));
test("PVD private reaction dependency stays private without hiding an independent party sibling",()=>nativeFixture(async f=>{
  const a=await api(),x=await context(f),pc=f.pcs[1],parts=["I try to dodge the debris.","If that works, I inspect the exposed beam.","Meanwhile, I look for the exit."],raw=parts.join(" ");
  const scope={mode:"party",actorUserId:pc.owner_user_id,actorCharacterId:pc.id},messageId="reaction-compound";
  const envelope=captureAuthoredTurnEnvelope(f.db,f.guild,pc.owner_user_id,pc.id,messageId,raw),proposals=[],rows=[];let start=0;
  for(let i=0;i<parts.length;i++){
    const proposal=proposeIntents(f.db,f.guild,[{version:2,proposal_id:"",source_event:envelope.source_event,start,end:start+parts[i].length,
      source_span:parts[i],actor_character_id:pc.id,sequence_index:i,dependencies:i===1?[proposals[0].record_key]:[],type:i===0?"roll":"search",
      operation:i===0?"reaction":"inspect",target:{kind:"location",key:"terminal",phrase:"terminal",grounding:"known"},framing:"immediate",
      destination_scope:"none",attempted_action:parts[i],desired_outcome:null,authored_outcome_claim:null,temporal_relation:i===2?"parallel":"sequential"}],scope,{messageId})[0];
    proposals.push(proposal);rows.push(acceptIntentForAdjudication(f.db,f.guild,proposal,scope));start+=parts[i].length+1;
  }
  buildActionPlan(f.db,f.guild,rows);const offer=a.preparePvpReaction(f.db,f.guild,"gm",{...x.input,accepted_intent:rows[0].record_key},{gm:true,interactionId:"compound-offer"});
  a.reviewPvpReaction(f.db,f.guild,pc.owner_user_id,offer.record_key);let face=0;
  a.rollPvpReaction(f.db,f.guild,pc.owner_user_id,{offer:offer.record_key,expected_revision:offer.data.digest},{interactionId:"compound-roll",rng:()=>[1,2][face++]});
  const plan=buildActionPlan(f.db,f.guild,rows.map(r=>f.db.getCityRecord(f.guild,"typed_intent",r.record_key)));
  assert.deepEqual(plan.map(r=>r.data.status),["failed","blocked","ready"]);assert.deepEqual(plan.map(r=>r.visibility),["character","character","party"]);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"pc_effect_receipt",includeGM:true}).length,0);
}));
