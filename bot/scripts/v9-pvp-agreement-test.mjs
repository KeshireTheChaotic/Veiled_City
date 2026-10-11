/** V9-PVP-A: bilateral immutable stakes, independent owner consent, neutral closure and bypass resistance. */
import assert from "node:assert/strict";
import test from "node:test";
import { nativeFixture, pvpTerms } from "./v9-fixtures.mjs";
import { proposePvp, reviewPvp, respondPvp, revisePvp, stagePvpAttempts, validatePvpAgreement } from "../src/narrative-pvp.js";
import { buildActionPlan } from "../src/action-dependency.js";
import { applyGMEvents, applyAuthoritativeMutation } from "../src/state.js";
import { configureCityFlags } from "../src/city-core.js";
import { captureWorldInput } from "../src/autonomous-world.js";
import { handleCommand } from "../src/commands.js";

function offer(f,terms=pvpTerms(f.pcs)){
  return proposePvp(f.db,f.guild,f.pcs[0].owner_user_id,{accepted_intent:f.accepted().record_key,
    opponent:f.pcs[1].id,terms});
}
function respond(f,p,index,decision="accept",suffix=""){
  reviewPvp(f.db,f.guild,f.pcs[index].owner_user_id,p.record_key);
  return respondPvp(f.db,f.guild,f.pcs[index].owner_user_id,{proposal:p.record_key,expected_revision:p.data.terms_hash,
    decision,interaction_id:`decision-${index}-${suffix}`});
}
test("PVP01 unconsented attempt has native pending status and no forced effects",()=>nativeFixture(f=>{
  const action=f.accepted(),plan=buildActionPlan(f.db,f.guild,[action]);
  const staged=stagePvpAttempts(f.db,f.guild,[action],plan);
  assert.equal(staged.length,1);assert.equal(staged[0].status,"awaiting_stakes");
  assert.equal(f.db.getCityRecord(f.guild,"compound_action",plan[0].record_key).status,"pending");
  assert.equal(f.db.listCityRecords(f.guild,{kind:"roll_request",includeGM:true,limit:10}).length,0);
}));
test("PVP02 both owners privately review both asymmetric stakes, all policies and same hash",()=>nativeFixture(f=>{
  const p=offer(f),a=reviewPvp(f.db,f.guild,f.pcs[0].owner_user_id,p.record_key),b=reviewPvp(f.db,f.guild,f.pcs[1].owner_user_id,p.record_key);
  assert.equal(a.text,b.text);assert(a.text.includes("Jaxon")&&a.text.includes("Choso"));
  assert(a.text.includes("no_HP_armor_stress_damage")&&a.text.includes("no_pvp_hope_generation"));
  assert.equal(a.terms_hash,b.terms_hash);assert.equal(a.visibility,"character");
}));
test("PVP03 mandatory boundaries and closed terms cannot smuggle HP/item/forced speech effects",()=>nativeFixture(f=>{
  for(const field of ["hp_delta","death","item_transfer","forced_dialogue"])
    assert.throws(()=>offer(f,pvpTerms(f.pcs,{[field]:true})),/closed|field/i);
  assert.throws(()=>offer(f,pvpTerms(f.pcs,{boundaries:["no_death"]})),/boundar/i);
  const a=f.accepted(),before=structuredClone(f.db.getCharacter(f.pcs[1].id).data.resources);
  stagePvpAttempts(f.db,f.guild,[a],buildActionPlan(f.db,f.guild,[a]));
  const events=applyGMEvents(f.db,f.guild,f.session.id,[{type:"resource_delta",key:"hp",amount:1,target_character_id:f.pcs[1].id}],
    {mode:"party",actorUserId:f.pcs[0].owner_user_id,actorCharacterId:f.pcs[0].id},{pvp_action_ids:[a.record_key]});
  assert.equal(events[0].ok,false);assert.deepEqual(f.db.getCharacter(f.pcs[1].id).data.resources,before);
}));
test("PVP04 declined proposal closes neutrally with no dice or winner",()=>nativeFixture(f=>{
  const p=offer(f),closed=respond(f,p,1,"decline");assert.equal(closed.status,"declined");
  const receipt=f.db.getCityRecord(f.guild,"pvp_resolution_receipt",closed.data.resolution_receipt);
  assert.equal(receipt.data.winner,null);assert.deepEqual(receipt.data.roll_refs,[]);
}));
for(const [id,patch] of [["PVP05",{objective:"A different harmless objective."}],["PVP06",{mode:"three_strikes"}],
  ["PVP11",{audience:"bilateral_author_projection"}]])
  test(`${id} changed terms invalidate both approvals, even across restart reconstruction`,()=>nativeFixture(f=>{
    const p=offer(f);respond(f,p,0);f.restart();
    const revised=revisePvp(f.db,f.guild,f.pcs[1].owner_user_id,{proposal:p.record_key,expected_revision:p.data.terms_hash,
      terms:pvpTerms(f.pcs,patch),interaction_id:`counter-${id}`});
    assert.notEqual(revised.data.terms_hash,p.data.terms_hash);assert.deepEqual(revised.data.approvals,[]);
    assert.throws(()=>respondPvp(f.db,f.guild,f.pcs[0].owner_user_id,{proposal:p.record_key,expected_revision:p.data.terms_hash,
      decision:"accept",interaction_id:"stale"}),/revision|terms/i);
    assert.equal(respond(f,revised,1,"accept","new").status,"awaiting_mutual_consent");
    assert.equal(respond(f,revised,0,"accept","new").status,"locked");
    assert(validatePvpAgreement(f.db,f.guild,p.record_key));
  }));
test("PVP07 foreign owner cannot review or approve another PC's proposal",()=>nativeFixture(f=>{
  const p=offer(f);assert.throws(()=>reviewPvp(f.db,f.guild,f.pcs[2].owner_user_id,p.record_key),/owner|participant/i);
  assert.throws(()=>respondPvp(f.db,f.guild,f.pcs[2].owner_user_id,{proposal:p.record_key,expected_revision:p.data.terms_hash,
    decision:"accept",interaction_id:"foreign"}),/owner|participant/i);
}));
test("PVP02 private Discord adapter presents all long bilateral terms without truncation",()=>nativeFixture(async f=>{
  const terms=pvpTerms(f.pcs);
  for(const stake of terms.stakes){stake.best="Harmless success. ".repeat(30);stake.worst="No success; own response. ".repeat(20);}
  const p=offer(f,terms),sent=[];
  for(const pc of f.pcs.slice(0,2)){
    const interaction={id:`review-${pc.id}`,guildId:f.guild,guild:{id:f.guild},user:{id:pc.owner_user_id,username:pc.name},
      isChatInputCommand:()=>true,commandName:"vc-roll",options:{getSubcommand:()=>"pvp",
        getString:()=>JSON.stringify({op:"review",proposal:p.record_key})},
      reply:async payload=>{sent.push(payload);return {id:"synthetic"};},followUp:async payload=>{sent.push(payload);return {id:"synthetic"};}};
    await handleCommand(interaction,{db:f.db,gm:{}});
  }
  assert(sent.length>=4);assert(sent.every(payload=>payload.ephemeral&&payload.content.length<=2000));
  for(const stake of terms.stakes)assert(sent.map(payload=>payload.content).join("\n").includes(stake.best));
  assert.equal(f.db.getCityRecord(f.guild,"pvp_proposal",p.record_key).status,"proposed","review is not approval");
}));
test("PVP08 source retraction invalidates a locked agreement without erasing audit",()=>nativeFixture(f=>{
  const p=offer(f);respond(f,p,0);respond(f,p,1);
  const source=f.db.getWorldEvent(f.guild,p.source_event);f.db.saveWorldEvent(f.guild,{...source,key:source.event_key,status:"retracted"});
  assert.throws(()=>validatePvpAgreement(f.db,f.guild,p.record_key),/source|stale/i);
  assert(f.db.getCityRecord(f.guild,"pvp_proposal",p.record_key));
}));
test("PVP09 same user cannot sign for another non-controlled character",()=>nativeFixture(f=>{
  const p=offer(f),user=f.pcs[1].owner_user_id;
  const second=f.db.createCharacter(f.guild,user,"Second PC",{});f.db.assignCharacter(f.session.id,user,second.id);
  assert.throws(()=>respond(f,p,1),/principal|controlled|owner|stale/i);
}));
test("PVP10 locked agreement can be withdrawn before dice without punishment",()=>nativeFixture(f=>{
  const p=offer(f);respond(f,p,0);respond(f,p,1);
  const closed=respond(f,p,1,"withdraw","withdraw");assert.equal(closed.status,"withdrawn");
  assert.throws(()=>validatePvpAgreement(f.db,f.guild,p.record_key),/locked|withdrawn|terminal/i);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"pvp_round_receipt",includeGM:true,limit:10}).length,0);
}));
test("PVP06 a locked but unrolled agreement can be revised only by resetting both approvals",()=>nativeFixture(f=>{
  const p=offer(f);respond(f,p,0);const locked=respond(f,p,1);
  const revised=revisePvp(f.db,f.guild,f.pcs[1].owner_user_id,{proposal:p.record_key,expected_revision:p.data.terms_hash,
    terms:pvpTerms(f.pcs,{mode:"three_strikes"}),interaction_id:"locked-counteroffer"});
  assert.equal(revised.status,"negotiating");assert.deepEqual(revised.data.approvals,[]);
  assert.equal(f.db.getCityRecord(f.guild,"pvp_agreement",locked.data.agreement).status,"superseded");
  assert.throws(()=>validatePvpAgreement(f.db,f.guild,p.record_key),/locked|agreement/i);
}));
test("PVP08 retracted counteroffer source cannot be newly signed",()=>nativeFixture(f=>{
  const p=offer(f),terms=f.db.getCityRecord(f.guild,"pvp_terms_revision",p.data.terms_revision);
  const source=f.db.getWorldEvent(f.guild,terms.source_event);
  f.db.saveWorldEvent(f.guild,{...source,key:source.event_key,status:"retracted"});
  assert.throws(()=>respond(f,p,0),/retracted|source|stale/i);
}));
test("PVP12 actual state path gates mislabeled interact before native roll construction",()=>nativeFixture(f=>{
  configureCityFlags(f.db,f.guild,{roll_requests:true},"gm");
  const text="I try to kick Choso in the shin.",pc=f.pcs[0];
  const scope={mode:"party",actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,"mislabeled",text);
  const narrative={player_intents:[{type:"interact",source_span:text,target_name:"Choso",target_key:f.pcs[1].id,destination:"unspecified",
    operation:"kick",utterance:"",excluded_targets:[],framing:"immediate",resolution:"roll_required",reason:"Opposed attempt",
    native_adjudication:{trait:"Agility",kind:"action",difficulty:12,risk:"Opposition",stakes:"A harmless contest",explanation:"Attempt",
      saved_ruling_key:"",override_refs:[],raw_refs:["srd:action-rolls"],house_refs:[],homebrew_refs:[],modifier_keys:[],attack_source:""}}],
    scene_actions:[],world_additions:[],context_memories:[]};
  const mutation=applyAuthoritativeMutation(f.db,{guildId:f.guild,sessionId:f.session.id,narrative,scope,
    provenance:{messageId:"mislabeled",triggerText:text}});
  assert.equal(mutation.nativeAdjudications.length,0);assert.equal(mutation.pvpAttempts.length,1);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"roll_request",includeGM:true,limit:10}).length,0);
}));
