/** FXA: production state boundary, temporary SQLite and no provider/network calls. */
import assert from "node:assert/strict";
import test from "node:test";
import { nativeFixture } from "./v9-fixtures.mjs";
import { applyAuthoritativeMutation } from "../src/state.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { recordScenePresence, currentScene } from "../src/scene-continuity.js";
import { EncounterLibrary } from "../src/encounter.js";
import { buildCombatants } from "../src/combat.js";
import { fakeInteraction } from "./contract-fixtures.mjs";
import { handleCommand } from "../src/commands.js";
import { reviewPcEffect } from "../src/pc-effects.js";
import { reviewIncomingAttack } from "../src/pc-incoming.js";

test("FXA14 owner cannot approve unseen exact mechanics by guessing an authority key",()=>nativeFixture(async f=>{
  const {reviewFeatureEffect,approvePcEffect}=await import("../src/pc-effects.js");
  const pc=f.pcs[0];f.db.updateCharacterData(pc.id,d=>{d.domain_cards=["Synthetic Focus"];});
  f.db.upsertRulesRuling(f.guild,{key:"focus",ruling:"Synthetic Focus costs one Hope.",createdBy:"gm"});
  const source=f.accepted(0,"I use Synthetic Focus.",pc.id).source_event;
  const a=reviewFeatureEffect(f.db,f.guild,"gm",{character:pc.id,feature:"Synthetic Focus",ruling:"focus",source,resource:"hope",amount:-1},
    {gm:true,interactionId:"unseen"});
  assert.throws(()=>approvePcEffect(f.db,f.guild,pc.owner_user_id,a.record_key,{interactionId:"blind"}),/review/i);
  assert.equal(f.db.getCharacter(pc.id).data.resources.hope,2);
}));

test("FXA09 owner cannot confirm unseen incoming defenses",()=>nativeFixture(async f=>{
  const {prepareIncomingAttack,confirmIncomingDefense}=await import("../src/pc-incoming.js");
  const {pc,lib,input}=incomingFixture(f),a=prepareIncomingAttack(f.db,f.guild,"gm",input,{gm:true,interactionId:"unseen-attack",library:lib});
  assert.throws(()=>confirmIncomingDefense(f.db,f.guild,pc.owner_user_id,a.record_key),/review/i);
}));

test("FXA14 actual command adapter requires GM review then current affected owner's feature cost approval",()=>nativeFixture(async f=>{
  const pc=f.pcs[0];f.db.updateCharacterData(pc.id,d=>{d.domain_cards=["Synthetic Focus"];});
  f.db.upsertRulesRuling(f.guild,{key:"synthetic-focus",ruling:"Synthetic Focus costs one Hope.",createdBy:"gm"});
  const source=f.accepted(0,"I use Synthetic Focus.",pc.id).source_event;
  const invoke=async (user,op,data,gm=false)=>{
    const interaction=fakeInteraction({gm,sub:"effect",json:{op,...data}});
    Object.assign(interaction,{id:`effect:${user}:${op}`,guildId:f.guild,commandName:"vc-roll",isChatInputCommand:()=>true});
    interaction.user={id:user,username:user};await handleCommand(interaction,{db:f.db,gm:{}});return interaction;
  };
  await invoke("gm","review-feature",{character:pc.id,feature:"Synthetic Focus",ruling:"synthetic-focus",source,resource:"hope",amount:-1},true);
  const row=f.db.listCityRecords(f.guild,{kind:"pc_effect_authority",includeGM:true})[0];
  assert(row,"Actual authenticated review command must create native effect proposal.");
  await invoke(f.pcs[1].owner_user_id,"approve",{authority:row.record_key});
  assert.equal(f.db.getCharacter(pc.id).data.resources.hope,2,"Foreign owner cannot spend.");
  const reviewed=await invoke(pc.owner_user_id,"review",{authority:row.record_key});
  assert.match(JSON.stringify(reviewed.deliveries),/Synthetic Focus/);
  await invoke(pc.owner_user_id,"approve",{authority:row.record_key});
  assert.equal(f.db.getCharacter(pc.id).data.resources.hope,1);
}));

function incomingFixture(f){
  const pc=f.pcs[1],lib=new EncounterLibrary("../content"),scene=currentScene(f.db,f.guild);
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,scene_continuity:true}});
  f.db.setSimulationEntity(f.guild,"location","terminal",{name:"Terminal"});
  f.db.upsertNpcProfile(f.guild,{npcKey:"guard",displayName:"Guard"});
  f.db.setSimulationEntity(f.guild,"npc","guard",{location_key:"terminal"});
  f.db.updateCharacterData(pc.id,d=>{d.evasion=12;d.thresholds={major:7,severe:14};});
  const s=indexWorldEvent(f.db,f.guild,{key:"incoming-scene",kind:"observation",source_id:"gm",title:"Established guard and target",
    session_id:f.session.id,scene:scene.key,location_key:"terminal",visibility:"party"},"gm");
  for(const [type,key] of [["npc","guard"],["character",pc.id]])recordScenePresence(f.db,f.guild,{source_event:s.event_key,
    entity_type:type,entity_key:key,location_key:"terminal",zone:"scene",range:"Close",visibility:"party",accepted_by:pc.owner_user_id},"gm");
  const e=f.db.createEncounter(f.guild,f.session.id,{status:"active",tier:1,pc_count:4,base_bp:14,budget_bp:14,
    composition:[{name:"Aster Vale Contractor",quantity:1}]});
  const c=f.db.initializeCombatants(e.id,buildCombatants(e,lib))[0];
  f.db.saveCityRecord(f.guild,{kind:"encounter_binding",key:e.id,source_event:s.event_key,data:{combatants:[{actor:"guard",id:c.id}]}});
  f.db.upsertRulesRuling(f.guild,{key:"incoming-standard",ruling:"Current guard can make its standard attack. No applicable special attack or defense modifier; target has reviewed base defenses.",createdBy:"gm"});
  return {pc,lib,input:{npc:"guard",combatant:c.id,character:pc.id,source:s.event_key,ruling:"incoming-standard",
    defenses:{resistance:"none",armor_reduction:1,armor_allowed:true,source:"base"}}};
}

test("FXA09 missing defense applicability cannot silently mean no resistance",()=>nativeFixture(async f=>{
  const {prepareIncomingAttack}=await import("../src/pc-incoming.js");
  const {lib,input}=incomingFixture(f);delete input.defenses;
  assert.throws(()=>prepareIncomingAttack(f.db,f.guild,"gm",input,{gm:true,interactionId:"missing-defense",library:lib}),/defense/i);
}));

test("FXA12 native incoming source cannot be rerolled by changing command nonce",()=>nativeFixture(async f=>{
  const {prepareIncomingAttack}=await import("../src/pc-incoming.js");
  const {lib,input}=incomingFixture(f);
  const a=prepareIncomingAttack(f.db,f.guild,"gm",input,{gm:true,interactionId:"first",library:lib});
  const b=prepareIncomingAttack(f.db,f.guild,"gm",input,{gm:true,interactionId:"retry",library:lib});
  assert.equal(a.record_key,b.record_key);
}));

test("FXA09 reviewed active resistance applies before thresholds and Fortified Armor",()=>nativeFixture(async f=>{
  const {prepareIncomingAttack,confirmIncomingDefense,rollIncomingAttack,resolveIncomingDamage}=await import("../src/pc-incoming.js");
  const {pc,lib,input}=incomingFixture(f);
  f.db.updateCharacterData(pc.id,d=>{d.inventory=[{name:"Reviewed Fortified Ward",equipped:true}];});
  input.defenses={resistance:"half",armor_reduction:2,armor_allowed:true,source:"Reviewed Fortified Ward"};
  const a=prepareIncomingAttack(f.db,f.guild,"gm",input,{gm:true,interactionId:"resist",library:lib});
  reviewIncomingAttack(f.db,f.guild,pc.owner_user_id,a.record_key,{library:lib});
  confirmIncomingDefense(f.db,f.guild,pc.owner_user_id,a.record_key);
  let i=0;rollIncomingAttack(f.db,f.guild,"gm",a.record_key,{gm:true,library:lib,rng:()=>[20,8][i++]});
  const r=resolveIncomingDamage(f.db,f.guild,pc.owner_user_id,a.record_key,{armor:true,library:lib});
  assert.equal(r.data.damage_after_resistance,10);assert.equal(r.data.hp_marks,0);
  assert.equal(f.db.getCharacter(pc.id).data.resources.armor.current,1);
}));

test("FXA09/12 actual NPC attack uses Evasion, native dice, owner Armor and restart-safe HP",()=>nativeFixture(async f=>{
  const { prepareIncomingAttack, confirmIncomingDefense, rollIncomingAttack, resolveIncomingDamage }=await import("../src/pc-incoming.js");
  const {pc,lib,input}=incomingFixture(f);
  const a=prepareIncomingAttack(f.db,f.guild,"gm",input,{gm:true,interactionId:"incoming-1",library:lib});
  reviewIncomingAttack(f.db,f.guild,pc.owner_user_id,a.record_key,{library:lib});
  confirmIncomingDefense(f.db,f.guild,pc.owner_user_id,a.record_key);
  let i=0;const rolled=rollIncomingAttack(f.db,f.guild,"gm",a.record_key,{gm:true,library:lib,rng:()=>[15,8][i++]});
  assert.equal(rolled.data.evasion,12);assert.equal(rolled.data.damage.total,11);
  assert.equal(f.db.getCharacter(pc.id).data.resources.hp.current,0,"Defender chooses Armor before HP application.");
  const receipt=resolveIncomingDamage(f.db,f.guild,pc.owner_user_id,a.record_key,{armor:true,library:lib});
  assert.equal(receipt.data.hp_marks,1);assert.equal(f.db.getCharacter(pc.id).data.resources.hp.current,1);
  assert.equal(f.db.getCharacter(pc.id).data.resources.armor.current,1);
  f.restart();assert.equal(resolveIncomingDamage(f.db,f.guild,pc.owner_user_id,a.record_key,{armor:true,library:lib}).record_key,receipt.record_key);
  assert.equal(f.db.getCharacter(pc.id).data.resources.hp.current,1);
}));

test("FXA10/15 simulation source and cross-session native attack cannot authorize PC HP",()=>nativeFixture(async f=>{
  const { prepareIncomingAttack, confirmIncomingDefense, rollIncomingAttack }=await import("../src/pc-incoming.js");
  const {pc,lib,input}=incomingFixture(f);
  const a=prepareIncomingAttack(f.db,f.guild,"gm",input,{gm:true,interactionId:"incoming-stale",library:lib});
  reviewIncomingAttack(f.db,f.guild,pc.owner_user_id,a.record_key,{library:lib});
  confirmIncomingDefense(f.db,f.guild,pc.owner_user_id,a.record_key);
  const before=structuredClone(f.db.getCharacter(pc.id).data.resources);
  const mutation=applyAuthoritativeMutation(f.db,{guildId:f.guild,sessionId:f.session.id,events:[{
    type:"resource_delta",key:"hp",amount:1,target_character_id:pc.id,cause_receipt:"simulation:d20"}]});
  assert.equal(mutation.events[0].blocked,true);
  f.db.endSession(f.guild,"");f.db.startSession(f.guild,"New session");
  assert.throws(()=>rollIncomingAttack(f.db,f.guild,"gm",a.record_key,{gm:true,library:lib,rng:()=>15}),/scene|session|native/i);
  assert.deepEqual(f.db.getCharacter(pc.id).data.resources,before);
}));

test("FXA09 incoming NPC Critical uses actual damage dice maximum, no PC metacurrency",()=>nativeFixture(async f=>{
  const { prepareIncomingAttack, confirmIncomingDefense, rollIncomingAttack, resolveIncomingDamage }=await import("../src/pc-incoming.js");
  const {pc,lib,input}=incomingFixture(f),before=structuredClone(f.db.getCharacter(pc.id).data.resources);
  const a=prepareIncomingAttack(f.db,f.guild,"gm",input,{gm:true,interactionId:"incoming-critical",library:lib});
  reviewIncomingAttack(f.db,f.guild,pc.owner_user_id,a.record_key,{library:lib});
  confirmIncomingDefense(f.db,f.guild,pc.owner_user_id,a.record_key);
  let i=0;const r=rollIncomingAttack(f.db,f.guild,"gm",a.record_key,{gm:true,library:lib,rng:()=>[20,8][i++]});
  assert.equal(r.data.damage.total,19); // 1d8+3 + maximum damage dice (8), never double the flat bonus.
  const damage=resolveIncomingDamage(f.db,f.guild,pc.owner_user_id,a.record_key,{armor:false,library:lib});
  assert.equal(damage.data.hp_marks,3);assert.equal(f.db.getCharacter(pc.id).data.resources.hope,before.hope);
  assert.deepEqual(f.db.getCharacter(pc.id).data.resources.stress,before.stress);
}));

test("FXA11 stale defense snapshot and foreign Armor choices cannot alter PC resources",()=>nativeFixture(async f=>{
  const { prepareIncomingAttack, confirmIncomingDefense, rollIncomingAttack, resolveIncomingDamage }=await import("../src/pc-incoming.js");
  const {pc,lib,input}=incomingFixture(f);
  const a=prepareIncomingAttack(f.db,f.guild,"gm",input,{gm:true,interactionId:"incoming-cas",library:lib});
  assert.throws(()=>confirmIncomingDefense(f.db,f.guild,f.pcs[0].owner_user_id,a.record_key),/own|assign|authority/i);
  reviewIncomingAttack(f.db,f.guild,pc.owner_user_id,a.record_key,{library:lib});
  confirmIncomingDefense(f.db,f.guild,pc.owner_user_id,a.record_key);
  let i=0;rollIncomingAttack(f.db,f.guild,"gm",a.record_key,{gm:true,library:lib,rng:()=>[15,8][i++]});
  assert.throws(()=>resolveIncomingDamage(f.db,f.guild,f.pcs[0].owner_user_id,a.record_key,{armor:false,library:lib}),/own|assign|authority/i);
  f.db.updateCharacterData(pc.id,d=>{d.evasion++;});
  assert.throws(()=>resolveIncomingDamage(f.db,f.guild,pc.owner_user_id,a.record_key,{armor:false,library:lib}),/stale|compare/i);
  assert.equal(f.db.getCharacter(pc.id).data.resources.hp.current,0);
}));

for(const [id,key,amount,mode] of [["FXA03","stress",1,"private"],["FXA03-absent","stress",1,"private"],["FXA04","armor",-1,"party"],
  ["FXA05","hope",1,"party"],["FXA06","hp",1,"party"],["FXA06-heal","hp",-1,"private"]])
  test(`${id} generated ${key} never substitutes for a native cause`,()=>nativeFixture(f=>{
    const pc=f.pcs[1],before=structuredClone(f.db.getCharacter(pc.id).data.resources);
    const mutation=applyAuthoritativeMutation(f.db,{guildId:f.guild,sessionId:f.session.id,
      scope:{mode,actorUserId:mode==="private"?pc.owner_user_id:null,actorCharacterId:mode==="private"?pc.id:null},
      events:[{type:"resource_delta",key,amount,target_character_id:pc.id,...(id.endsWith("absent")?{}:{cause_receipt:"forged"})},
        {type:"clock_delta",key:"independent-clock",amount:1,value:"Independent clock"}]});
    assert.deepEqual(f.db.getCharacter(pc.id).data.resources,before);
    assert.equal(mutation.events[0].blocked,true);assert.match(mutation.events[0].error,/native.*cause|receipt/i);
    assert.equal(mutation.events[1].ok,true,"Unrelated native clock must not be globally frozen.");
  }));

test("FXA08/12 authenticated reviewed owned feature heals exactly once through native cause",()=>nativeFixture(async f=>{
  const { reviewFeatureEffect, approvePcEffect, applyPcEffect }=await import("../src/pc-effects.js");
  const pc=f.pcs[0];f.db.updateCharacterData(pc.id,d=>{d.resources.hp.current=3;d.domain_cards=["Synthetic Mend"];});
  f.db.upsertRulesRuling(f.guild,{key:"synthetic-mend",ruling:"Synthetic Mend clears two marked HP.",createdBy:"gm"});
  const source=f.accepted(0,"I use Synthetic Mend.",pc.id).source_event;
  const authority=reviewFeatureEffect(f.db,f.guild,"gm",{character:pc.id,feature:"Synthetic Mend",ruling:"synthetic-mend",
    source,resource:"hp",amount:-2},{gm:true,interactionId:"mend-review"});
  reviewPcEffect(f.db,f.guild,pc.owner_user_id,authority.record_key);
  approvePcEffect(f.db,f.guild,pc.owner_user_id,authority.record_key,{interactionId:"owner-mend"});
  const result=applyPcEffect(f.db,f.guild,authority.record_key);
  assert.equal(f.db.getCharacter(pc.id).data.resources.hp.current,1);
  f.restart();assert.equal(applyPcEffect(f.db,f.guild,authority.record_key).record_key,result.record_key);
  assert.equal(f.db.getCharacter(pc.id).data.resources.hp.current,1);
}));

test("FXA07/11 retracted source cannot heal or consume native cause",()=>nativeFixture(async f=>{
  const { reviewFeatureEffect, applyPcEffect }=await import("../src/pc-effects.js");
  const pc=f.pcs[0];f.db.updateCharacterData(pc.id,d=>{d.resources.hp.current=3;d.domain_cards=["Synthetic Mend"];});
  f.db.upsertRulesRuling(f.guild,{key:"synthetic-mend",ruling:"Synthetic Mend clears two marked HP.",createdBy:"gm"});
  const source=f.accepted(0,"I use Synthetic Mend.",pc.id).source_event;
  const a=reviewFeatureEffect(f.db,f.guild,"gm",{character:pc.id,feature:"Synthetic Mend",ruling:"synthetic-mend",source,resource:"hp",amount:-2},
    {gm:true,interactionId:"stale-mend"});
  const event=f.db.getWorldEvent(f.guild,source);f.db.saveWorldEvent(f.guild,{...event,key:source,status:"retracted"});
  assert.throws(()=>applyPcEffect(f.db,f.guild,a.record_key),/source|cause|native/i);
  assert.equal(f.db.getCharacter(pc.id).data.resources.hp.current,3);
}));

test("FXA06 private reviewed authority cannot become a party resource assertion",()=>nativeFixture(async f=>{
  const { reviewFeatureEffect, approvePcEffect }=await import("../src/pc-effects.js");
  const pc=f.pcs[0];f.db.updateCharacterData(pc.id,d=>{d.domain_cards=["Synthetic Focus"];});
  f.db.upsertRulesRuling(f.guild,{key:"synthetic-focus",ruling:"Synthetic Focus costs one Hope.",createdBy:"gm"});
  const source=f.accepted(0,"I use Synthetic Focus.",pc.id).source_event;
  const authority=reviewFeatureEffect(f.db,f.guild,"gm",{character:pc.id,feature:"Synthetic Focus",ruling:"synthetic-focus",source,resource:"hope",amount:-1},
    {gm:true,interactionId:"private-authority"});
  reviewPcEffect(f.db,f.guild,pc.owner_user_id,authority.record_key);
  approvePcEffect(f.db,f.guild,pc.owner_user_id,authority.record_key,{interactionId:"private-choice"});
  const mutation=applyAuthoritativeMutation(f.db,{guildId:f.guild,sessionId:f.session.id,events:[{type:"resource_delta",key:"hope",amount:-1,
    target_character_id:pc.id,cause_receipt:authority.record_key}]});
  assert.equal(mutation.events[0].blocked,true);assert.equal(f.db.getCharacter(pc.id).data.resources.hope,2);
}));

test("FXA12 a new review interaction cannot duplicate the same authored feature effect",()=>nativeFixture(async f=>{
  const { reviewFeatureEffect }=await import("../src/pc-effects.js");
  const pc=f.pcs[0];f.db.updateCharacterData(pc.id,d=>{d.domain_cards=["Synthetic Focus"];});
  f.db.upsertRulesRuling(f.guild,{key:"synthetic-focus",ruling:"Synthetic Focus costs one Hope.",createdBy:"gm"});
  const source=f.accepted(0,"I use Synthetic Focus.",pc.id).source_event;
  const input={character:pc.id,feature:"Synthetic Focus",ruling:"synthetic-focus",source,resource:"hope",amount:-1};
  const a=reviewFeatureEffect(f.db,f.guild,"gm",input,{gm:true,interactionId:"review-original"});
  const b=reviewFeatureEffect(f.db,f.guild,"gm",input,{gm:true,interactionId:"review-retry"});
  assert.equal(a.record_key,b.record_key);
}));

test("FXA13 actual commit keeps Billy movement and output when unreceipted Choso injury is blocked",()=>nativeFixture(async f=>{
  const {captureWorldInput}=await import("../src/autonomous-world.js"),{commitGmTurn}=await import("../src/turn-orchestration.js");
  const pc=f.pcs[2],text="I enter the annex.",scope={mode:"party",actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  f.db.setSimulationEntity(f.guild,"location","terminal",{name:"Terminal"});
  f.db.setSimulationEntity(f.guild,"location","annex",{name:"Annex",parent_location_key:"terminal"});
  const source=captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,"fxa-billy",text);
  f.db.saveCityRecord(f.guild,{kind:"autonomous_entity",key:"location:annex",visibility:"party",source_event:source.event_key,
    status:"active",data:{kind:"location",key:"annex",name:"Annex"}});
  const turn=f.db.beginTurnAttempt({guildId:f.guild,messageId:"fxa-billy",actorPrincipal:pc.owner_user_id,sessionId:f.session.id,audience:"party"});
  const result={respond:true,narration:"Billy enters the annex.",narrative_claims:[],events:[{type:"resource_delta",key:"hp",amount:1,target_character_id:f.pcs[1].id}],
    player_intents:[{type:"move",source_span:text,target_name:"Annex",target_key:"annex",destination:"interior",operation:"",utterance:"",
      excluded_targets:[],framing:"immediate",resolution:"auto",reason:"Open local entry."}],
    scene_actions:[{kind:"move",entity_ref:"annex",source_span:text,zone:"interior"}]};
  const applied=commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result,scope,speaker:pc.name,label:"movement",
    meta:{messageId:"fxa-billy",turnId:turn.turn_id,triggerText:text}});
  assert(applied.world.some(r=>r.status==="arrived"));assert.equal(f.db.getCharacter(pc.id).data.location,"annex");
  assert.equal(f.db.getCharacter(f.pcs[1].id).data.resources.hp.current,0);
  assert(f.db.listTurnPublications(f.guild,turn.turn_id).some(r=>/annex/i.test(r.payload)));
}));

test("FXA09/14 real command path offers private defenses and applies only native NPC hit",()=>nativeFixture(async f=>{
  const {pc,input}=incomingFixture(f);f.db.updateCharacterData(pc.id,d=>{d.evasion=1;d.thresholds={major:1,severe:2};});
  let n=0;
  const invoke=async(user,op,data={},gm=false)=>{
    const i=fakeInteraction({gm,sub:"effect",json:{op,...data}});Object.assign(i,{id:`incoming-command-${n++}`,guildId:f.guild,
      commandName:"vc-roll",isChatInputCommand:()=>true});i.user={id:user,username:user};
    await handleCommand(i,{db:f.db,gm:{content:{root:"../content"}}});return i;
  };
  await invoke("gm","incoming-prepare",input,true);
  const a=f.db.listCityRecords(f.guild,{kind:"pc_incoming_attack",includeGM:true})[0];assert(a);
  const foreign=await invoke(f.pcs[0].owner_user_id,"inbox");assert(!JSON.stringify(foreign.deliveries).includes(a.record_key));
  const own=await invoke(pc.owner_user_id,"inbox");assert(JSON.stringify(own.deliveries).includes(a.record_key));
  const reviewed=await invoke(pc.owner_user_id,"review",{attack:a.record_key});
  assert(reviewed.deliveries.every(d=>d.ephemeral&&d.content.length<=2000));assert.match(JSON.stringify(reviewed.deliveries),/armor_reduction/);
  await invoke(pc.owner_user_id,"incoming-defense",{attack:a.record_key});
  await invoke("gm","incoming-roll",{attack:a.record_key},true);
  assert.equal(f.db.getCharacter(pc.id).data.resources.hp.current,0);
  await invoke(pc.owner_user_id,"incoming-armor",{attack:a.record_key,armor:false});
  assert.equal(f.db.getCharacter(pc.id).data.resources.hp.current,3);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"pc_effect_receipt",includeGM:true}).length,1);
}));

test("FXA06 PC identity cannot be disguised as incoming NPC actor",()=>nativeFixture(async f=>{
  const {prepareIncomingAttack}=await import("../src/pc-incoming.js"),{lib,input}=incomingFixture(f);
  const key=f.pcs[0].id;f.db.upsertNpcProfile(f.guild,{npcKey:key,displayName:"Disguised PC"});
  f.db.setSimulationEntity(f.guild,"npc",key,{location_key:"terminal"});
  recordScenePresence(f.db,f.guild,{source_event:input.source,entity_type:"npc",entity_key:key,location_key:"terminal",
    zone:"scene",range:"Close",visibility:"party",accepted_by:"gm"},"gm");
  const encounter=f.db.getCurrentEncounter(f.session.id),binding=f.db.getCityRecord(f.guild,"encounter_binding",encounter.id);
  f.db.saveCityRecord(f.guild,{...binding,key:binding.record_key,data:{combatants:[{actor:key,id:input.combatant}]}});
  input.npc=key;
  assert.throws(()=>prepareIncomingAttack(f.db,f.guild,"gm",input,{gm:true,interactionId:"disguise",library:lib}),/PC|NPC|identity/i);
}));

for(const resistance of ["none","immune"])
test(`FXA09 reviewed ${resistance} defense enforces Armor eligibility`,()=>nativeFixture(async f=>{
  const {prepareIncomingAttack,confirmIncomingDefense,rollIncomingAttack,resolveIncomingDamage}=await import("../src/pc-incoming.js");
  const {pc,lib,input}=incomingFixture(f);
  f.db.updateCharacterData(pc.id,d=>{d.conditions=[{name:"Reviewed Defense",active:true}];});
  input.defenses={resistance,armor_reduction:1,armor_allowed:false,source:"Reviewed Defense"};
  const a=prepareIncomingAttack(f.db,f.guild,"gm",input,{gm:true,interactionId:`defense-${resistance}`,library:lib});
  reviewIncomingAttack(f.db,f.guild,pc.owner_user_id,a.record_key,{library:lib});confirmIncomingDefense(f.db,f.guild,pc.owner_user_id,a.record_key);
  let i=0;rollIncomingAttack(f.db,f.guild,"gm",a.record_key,{gm:true,library:lib,rng:()=>[15,8][i++]});
  assert.throws(()=>resolveIncomingDamage(f.db,f.guild,pc.owner_user_id,a.record_key,{armor:true,library:lib}),/Armor/);
  assert.equal(f.db.getCharacter(pc.id).data.resources.hp.current,0);
  const r=resolveIncomingDamage(f.db,f.guild,pc.owner_user_id,a.record_key,{armor:false,library:lib});
  assert.equal(r.data.hp_marks,resistance==="immune"?0:2);
  assert.equal(f.db.getCharacter(pc.id).data.resources.armor.current,0);
}));

test("FXA11 unsupported or inactive defense source stays pending without rolling",()=>nativeFixture(async f=>{
  const {prepareIncomingAttack}=await import("../src/pc-incoming.js"),{pc,lib,input}=incomingFixture(f);
  f.db.updateCharacterData(pc.id,d=>{d.inventory=[{name:"Inactive Ward",equipped:false}];});
  input.defenses={resistance:"half",armor_reduction:1,armor_allowed:true,source:"Inactive Ward"};
  assert.throws(()=>prepareIncomingAttack(f.db,f.guild,"gm",input,{gm:true,interactionId:"inactive",library:lib}),/active.*owned|defense/i);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"npc_attack_roll_receipt",includeGM:true}).length,0);
}));
