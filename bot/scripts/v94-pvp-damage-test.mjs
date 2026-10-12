/** B.5 native damage authority: temporary SQLite, real source/owner adapters, deterministic dice. */
import assert from "node:assert/strict";
import test from "node:test";
import {nativeFixture} from "./v9-fixtures.mjs";
import {attackFixture} from "./v94-pvp-attack-fixtures.mjs";
import {preparePvpAttack,reviewPvpAttack,authorizePvpAttack,rollPvpAttack} from "../src/pvp-attacks.js";
import {respondDamagePvp,proposeDamagePvp,reviewDamagePvp,stageDamagePvp} from "../src/pvp-profiles.js";
import {recordScenePresence} from "../src/scene-continuity.js";
import {indexWorldEvent} from "../src/city-calendar.js";
import {establishFearContext,selectFearMove,applyFearMove,fearRevision} from "../src/pvp-fear-moves.js";
import {fakeInteraction} from "./contract-fixtures.mjs";
import {handleCommand} from "../src/commands.js";
import {captureAuthoredTurnEnvelope} from "../src/authored-turn-envelope.js";
import {proposeIntents,acceptIntentForAdjudication} from "../src/typed-intents.js";
import {stagePvpAttempts} from "../src/narrative-pvp.js";
const api=()=>import("../src/pvp-damage.js");
test("PVD actual Discord damage/Armor adapters retain separate owners, private choices and exactly-once effects",()=>nativeFixture(async f=>{
  const x=await hit(f),a=await api();
  const call=async(user,op,data,gm=false)=>{const i=fakeInteraction({gm,sub:"pvp",json:{op,...data}});
    Object.assign(i,{id:`damage-ui:${user}:${op}`,guildId:f.guild,commandName:"vc-roll",isChatInputCommand:()=>true});i.user={id:user,username:user};
    await handleCommand(i,{db:f.db,gm:{}});assert(i.deliveries.every(d=>d.ephemeral&&d.content.length<=2000));return i;};
  await call(f.pcs[1].owner_user_id,"damage-roll",{attack_receipt:x.roll.record_key});
  assert.equal(f.db.listCityRecords(f.guild,{kind:"pvp_damage_roll_receipt",includeGM:true}).length,0);
  await call(f.pcs[0].owner_user_id,"damage-roll",{attack_receipt:x.roll.record_key});
  const roll=f.db.listCityRecords(f.guild,{kind:"pvp_damage_roll_receipt",includeGM:true})[0];assert(roll);
  await call("gm","damage-prepare",{damage_receipts:[roll.record_key],ruling:"pc-damage",defenses:{source:"base",resistance:"none",armor_reduction:1,armor_allowed:true}},true);
  const offer=f.db.listCityRecords(f.guild,{kind:"pvp_damage_offer",includeGM:true})[0];assert(offer);
  await call(f.pcs[0].owner_user_id,"armor-review",{damage:offer.record_key});
  assert.equal(f.db.listCityRecords(f.guild,{kind:"pvp_damage_owner_review",includeGM:true}).length,0);
  await call(f.pcs[1].owner_user_id,"armor-review",{damage:offer.record_key});
  const input={damage:offer.record_key,expected_revision:offer.data.digest,armor:true};
  await call(f.pcs[1].owner_user_id,"armor-choose",input);const effect=a.validatePvpDamageApplication(f.db,f.guild,`${offer.record_key}:effect`);
  f.restart();const before=f.db.getCharacter(f.pcs[1].id).data.resources;
  assert.deepEqual(a.resolvePvpDamage(f.db,f.guild,f.pcs[1].owner_user_id,input,{interactionId:"adapter-restart"}),effect);
  assert.deepEqual(f.db.getCharacter(f.pcs[1].id).data.resources,before);
}));
async function hit(f,{faces=[5,4],setup=()=>{},kind="weapon"}={}){
  const x=await attackFixture(f,{kind});setup(f);const r=preparePvpAttack(f.db,f.guild,"gm",x.input,{gm:true,interactionId:"damage-attack"});
  for(const pc of f.pcs.slice(0,2)){reviewPvpAttack(f.db,f.guild,pc.owner_user_id,r.record_key);authorizePvpAttack(f.db,f.guild,pc.owner_user_id,
    {attack:r.record_key,expected_revision:r.data.offer_hash},{interactionId:`damage-attack:${pc.id}`});}
  let n=0;const roll=rollPvpAttack(f.db,f.guild,f.pcs[0].owner_user_id,{attack:r.record_key,expected_revision:r.data.offer_hash},{rng:()=>faces[n++]});
  f.db.upsertRulesRuling(f.guild,{key:"pc-damage",createdBy:"gm",ruling:"SRD current thresholds and native owned passive defenses; Armor lowers severity by one, direct damage disallows Armor. No optional massive damage rule."});
  return {...x,roll};
}
async function damage(f,options={}){
  const a=await api(),x=await hit(f,options);let n=0;const faces=options.damageFaces||[1,1];
  const r=a.rollPvpDamage(f.db,f.guild,f.pcs[0].owner_user_id,{attack_receipt:x.roll.record_key},{rng:()=>faces[n++]});
  return {a,x,r,count:()=>n};
}
function prepare(f,a,r,defenses={source:"base",resistance:"none",armor_reduction:1,armor_allowed:true}){
  return a.preparePvpDamage(f.db,f.guild,"gm",{damage_receipts:[r.record_key],ruling:"pc-damage",defenses},{gm:true,interactionId:"damage-review"});
}
function apply(f,a,offer,armor=false){const user=f.pcs[1].owner_user_id,view=a.reviewPvpDamage(f.db,f.guild,user,offer.record_key);
  return a.resolvePvpDamage(f.db,f.guild,user,{damage:offer.record_key,expected_revision:view.revision,armor},{interactionId:"own-armor"});}

test("PVD06 Critical damage adds maximum dice, not multiplied flat modifier; no roll-derived resources",()=>nativeFixture(async f=>{
  const {r,count}=await damage(f,{faces:[1,1],damageFaces:[3,4]});assert.equal(r.data.result.total,25);assert.equal(r.data.result.critical_bonus,16);assert.equal(count(),2);
  for(const pc of f.pcs)assert.deepEqual(f.db.getCharacter(pc.id).data.resources,pc.data.resources);
}));
for(const [faces,marks] of [[[1,1],1],[[2,3],2],[[6,6],3]])
test(`PVD12/PVD13/PVD14 native damage marks ${marks} HP at current thresholds`,()=>nativeFixture(async f=>{
  const {a,r}=await damage(f,{damageFaces:faces}),offer=prepare(f,a,r),effect=apply(f,a,offer);
  assert.equal(effect.data.hp_marks,marks);assert.equal(f.db.getCharacter(f.pcs[1].id).data.resources.hp.current,marks);
  assert.equal(effect.data.cause_type,"verified_pvp_damage");assert.equal(effect.visibility,"character");
}));
test("PVD15 target owns Armor severity reduction, not raw subtraction; replay/restart never marks twice",()=>nativeFixture(async f=>{
  const {a,r}=await damage(f,{damageFaces:[6,6]}),offer=prepare(f,a,r),effect=apply(f,a,offer,true);
  assert.equal(effect.data.hp_marks,2);assert.equal(effect.data.damage_after_resistance,14);assert.equal(f.db.getCharacter(f.pcs[1].id).data.resources.armor.current,1);
  f.restart();assert.deepEqual(apply(f,a,offer,true),effect);assert.equal(f.db.getCharacter(f.pcs[1].id).data.resources.hp.current,2);
}));
test("PVD16 actual owned passive resistance precedes threshold/Armor; unnamed model resistance fails",()=>nativeFixture(async f=>{
  const {a,r}=await damage(f,{damageFaces:[6,6],setup:f=>f.db.updateCharacterData(f.pcs[1].id,d=>{d.inventory.push({name:"Reviewed physical ward",equipped:true,resistance_types:["physical"]});})});
  assert.throws(()=>prepare(f,a,r,{source:"invented",resistance:"half",armor_reduction:1,armor_allowed:true}),/source|owned|defense/i);
  const offer=prepare(f,a,r,{source:"Reviewed physical ward",resistance:"half",armor_reduction:1,armor_allowed:true}),effect=apply(f,a,offer,true);
  assert.equal(effect.data.damage_after_resistance,7);assert.equal(effect.data.hp_marks,1);
}));
test("PVD17 native direct weapon damage never permits Armor",()=>nativeFixture(async f=>{
  const {a,r}=await damage(f,{setup:f=>f.db.updateCharacterData(f.pcs[0].id,d=>{d.inventory[0].direct_damage=true;})}),offer=prepare(f,a,r);
  assert.throws(()=>apply(f,a,offer,true),/direct|Armor/i);assert.equal(f.db.getCharacter(f.pcs[1].id).data.resources.hp.current,0);assert.equal(apply(f,a,offer,false).data.hp_marks,1);
}));
test("PVD04 missed attack and narrative score cannot authorize damage dice",()=>nativeFixture(async f=>{
  const a=await api(),x=await hit(f,{faces:[2,1]});
  for(const key of [x.roll.record_key,"pvp-pair:invented"])assert.throws(()=>a.rollPvpDamage(f.db,f.guild,f.pcs[0].owner_user_id,{attack_receipt:key},{rng:()=>assert.fail()}),/hit|native|attack/i);
}));
test("PVD source revocation, withdrawal and wrong owner reject before damage dice/effects",()=>nativeFixture(async f=>{
  const a=await api(),x=await hit(f);
  assert.throws(()=>a.rollPvpDamage(f.db,f.guild,f.pcs[1].owner_user_id,{attack_receipt:x.roll.record_key},{rng:()=>assert.fail()}),/owner|attacker/i);
  respondDamagePvp(f.db,f.guild,f.pcs[1].owner_user_id,{contract:x.contract.record_key,expected_revision:x.contract.data.terms_hash,decision:"withdraw"},{interactionId:"withdraw-before-damage"});
  assert.throws(()=>a.rollPvpDamage(f.db,f.guild,f.pcs[0].owner_user_id,{attack_receipt:x.roll.record_key},{rng:()=>assert.fail()}),/withdraw|locked|consent/i);
  assert.equal(f.db.getCharacter(f.pcs[1].id).data.resources.hp.current,0);
}));
test("PVD exact defender review/CAS is mandatory; GM cannot select Armor or mint native HP",()=>nativeFixture(async f=>{
  const {a,r}=await damage(f),offer=prepare(f,a,r),input={damage:offer.record_key,expected_revision:offer.data.digest,armor:false};
  assert.throws(()=>a.resolvePvpDamage(f.db,f.guild,"gm",input,{interactionId:"gm-armor"}),/owner|assignment/i);
  assert.throws(()=>a.resolvePvpDamage(f.db,f.guild,f.pcs[1].owner_user_id,input,{interactionId:"unreviewed"}),/review/i);
  a.reviewPvpDamage(f.db,f.guild,f.pcs[1].owner_user_id,offer.record_key);f.db.updateCharacterData(f.pcs[1].id,d=>{d.thresholds.major++;});
  assert.throws(()=>a.resolvePvpDamage(f.db,f.guild,f.pcs[1].owner_user_id,input,{interactionId:"stale"}),/stale|changed|compare/i);
  assert.equal(f.db.getCharacter(f.pcs[1].id).data.resources.hp.current,0);
}));
test("PVD native damage roll survives restart without reroll; retracted source blocks new application",()=>nativeFixture(async f=>{
  const {a,x,r}=await damage(f);f.restart();assert.deepEqual(a.rollPvpDamage(f.db,f.guild,f.pcs[0].owner_user_id,{attack_receipt:x.roll.record_key},{rng:()=>assert.fail()}),r);
  const offer=prepare(f,a,r);a.reviewPvpDamage(f.db,f.guild,f.pcs[1].owner_user_id,offer.record_key);indexWorldEvent(f.db,f.guild,{key:offer.source_event,status:"retracted"},"gm");
  assert.throws(()=>apply(f,a,offer),/source|retract|review/i);assert.equal(f.db.getCharacter(f.pcs[1].id).data.resources.hp.current,0);
}));
test("PVD20 vanilla final HP creates exactly one private owner death request, never automatic death/cap/fall",()=>nativeFixture(async f=>{
  const {a,r}=await damage(f,{damageFaces:[6,6],setup:f=>f.db.updateCharacterData(f.pcs[1].id,d=>{d.resources.hp.current=5;})}),offer=prepare(f,a,r),effect=apply(f,a,offer);
  assert.equal(effect.data.hp_marks,1);assert.equal(f.db.getCharacter(f.pcs[1].id).data.resources.hp.current,6);assert.equal(f.db.getCharacter(f.pcs[1].id).status,"active");
  const requests=f.db.listCityRecords(f.guild,{kind:"pc_death_move_request",includeGM:true});assert.equal(requests.length,1);assert.equal(requests[0].status,"awaiting_owner");assert.equal(requests[0].visibility,"character");
  assert.equal(f.db.listCityRecords(f.guild,{kind:"pvp_safety_stop_receipt",includeGM:true}).length,0);assert.equal(f.db.listCityRecords(f.guild,{kind:"pvp_nonlethal_fall_receipt",includeGM:true}).length,0);
}));
test("PVD16 a physical-only ward cannot resist magic from a real native attack",()=>nativeFixture(async f=>{
  const {a,r}=await damage(f,{setup:f=>{
    f.db.updateCharacterData(f.pcs[0].id,d=>{d.inventory[0].damage_type="magic";});
    f.db.updateCharacterData(f.pcs[1].id,d=>{d.inventory.push({name:"Physical-only ward",equipped:true,resistance_types:["physical"]});});
  }});
  assert.throws(()=>prepare(f,a,r,{source:"Physical-only ward",resistance:"half",armor_reduction:1,armor_allowed:true}),/type|resistan|scope/i);
  assert.equal(f.db.getCharacter(f.pcs[1].id).data.resources.hp.current,0);
}));
test("PVE native damage stays committed while immediate Fear holds terminal; actual move releases exactly once after restart",()=>nativeFixture(async f=>{
  const {a,r}=await damage(f,{faces:[5,6]}),offer=prepare(f,a,r),effect=apply(f,a,offer);f.restart();
  assert.equal(f.db.listCityRecords(f.guild,{kind:"pvp_action_terminal_receipt",includeGM:true}).length,0);
  assert.equal(f.db.getCharacter(f.pcs[1].id).data.resources.hp.current,1);
  f.db.changeClock(f.guild,"hazard-countdown",0,{max:6,visibility:"party"});
  const c=establishFearContext(f.db,f.guild,"gm",{move_kind:"clock_advance",target_key:"hazard-countdown",location_key:"terminal",visibility:"party",subject_key:null},{gm:true,interactionId:"damage-fear"});
  const t=f.db.listCityRecords(f.guild,{kind:"pvp_fear_trigger",includeGM:true})[0],d=selectFearMove(f.db,f.guild,"gm",{trigger:t.record_key,
    expected_revision:t.data.revision,context:c.record_key,expected_target_revision:fearRevision(f.db.getClock(f.guild,"hazard-countdown")),affected_actions:[]},{gm:true,interactionId:"damage-fear-select"});
  const input={trigger:t.record_key,expected_revision:f.db.getCityRecord(f.guild,"pvp_fear_trigger",t.record_key).data.revision,decision:d.record_key};
  applyFearMove(f.db,f.guild,"gm",input,{gm:true});
  assert.equal(f.db.listCityRecords(f.guild,{kind:"pvp_action_terminal_receipt",includeGM:true}).length,1);
  applyFearMove(f.db,f.guild,"gm",input,{gm:true});assert.equal(f.db.getClock(f.guild,"hazard-countdown").value,1);
  assert.deepEqual(a.validatePvpDamageApplication(f.db,f.guild,effect.record_key),effect);
  assert.equal(f.db.getCharacter(f.pcs[1].id).data.resources.hp.current,1);
}));
test("PVD simultaneous two native attackers aggregate before thresholds, use one target Armor and consume each source once",()=>nativeFixture(async f=>{
  const {a,x,r}=await damage(f,{damageFaces:[2,3]}),other=f.pcs[2],target=f.pcs[1];
  f.db.updateCharacterData(other.id,d=>{d.evasion=12;d.proficiency=2;d.thresholds={major:7,severe:14};d.inventory=[{...f.db.getCharacter(f.pcs[0].id).data.inventory[0]}];});
  recordScenePresence(f.db,f.guild,{source_event:"attack-scene",entity_type:"character",entity_key:other.id,location_key:"terminal",zone:"floor",range:"Melee",
    visibility:"party",accepted_by:other.owner_user_id},"gm");
  const accepted=f.accepted(2,"I attempt a simultaneous strike at Choso.",target.id,{operation:"attack"}),terms=structuredClone(x.contract.data.snapshot.terms);
  terms.participants=[other,target].map(pc=>({character:pc.id,team:null}));terms.stakes=terms.participants.map(p=>({character:p.character,best:"Own success",worst:"Native damage and own death move risk"}));
  terms.target_permissions=[{actor:other.id,target:target.id,effect_class:"attack_damage",max_risk:"lethal"},{actor:target.id,target:other.id,effect_class:"attack_damage",max_risk:"lethal"}];
  const contract=proposeDamagePvp(f.db,f.guild,other.owner_user_id,{accepted_intent:accepted.record_key,terms},{interactionId:"second-duel"});
  for(const pc of [other,target]){reviewDamagePvp(f.db,f.guild,pc.owner_user_id,contract.record_key);respondDamagePvp(f.db,f.guild,pc.owner_user_id,
    {contract:contract.record_key,expected_revision:contract.data.terms_hash,decision:"accept"},{interactionId:`second-sign:${pc.id}`});}
  const staged=stageDamagePvp(f.db,f.guild,accepted),attack=preparePvpAttack(f.db,f.guild,"gm",{...x.input,attack:staged.record_key},{gm:true,interactionId:"second-attack"});
  for(const pc of [other,target]){reviewPvpAttack(f.db,f.guild,pc.owner_user_id,attack.record_key);authorizePvpAttack(f.db,f.guild,pc.owner_user_id,
    {attack:attack.record_key,expected_revision:attack.data.offer_hash},{interactionId:`second-attack-sign:${pc.id}`});}
  let n=0;const roll=rollPvpAttack(f.db,f.guild,other.owner_user_id,{attack:attack.record_key,expected_revision:attack.data.offer_hash},{rng:()=>[5,4][n++]});
  n=0;const second=a.rollPvpDamage(f.db,f.guild,other.owner_user_id,{attack_receipt:roll.record_key},{rng:()=>[2,3][n++]});
  const offer=a.preparePvpDamage(f.db,f.guild,"gm",{damage_receipts:[r.record_key,second.record_key],ruling:"pc-damage",
    defenses:{source:"base",resistance:"none",armor_reduction:1,armor_allowed:true}},{gm:true,interactionId:"simultaneous-review"});
  const effect=apply(f,a,offer,true);assert.equal(effect.data.damage_after_resistance,14);assert.equal(effect.data.severity,3);assert.equal(effect.data.hp_marks,2);
  assert.equal(f.db.getCharacter(target.id).data.resources.armor.current,1);assert.equal(f.db.listCityRecords(f.guild,{kind:"pvp_action_terminal_receipt",includeGM:true}).length,2);
  assert.throws(()=>prepare(f,a,r),/consum|awaiting|group/i);f.restart();assert.deepEqual(apply(f,a,offer,true),effect);
  assert.equal(f.db.getCharacter(target.id).data.resources.hp.current,2);
}));
test("PVE no feature laundering grants PvP Hope from the actual target Armor source",()=>nativeFixture(async f=>{
  const {reviewFeatureEffect,reviewPcEffect,approvePcEffect,applyPcEffect}=await import("../src/pc-effects.js");
  const {a,r}=await damage(f,{setup:f=>f.db.updateCharacterData(f.pcs[1].id,d=>{d.inventory.push({name:"Godbound Laminar",equipped:true});})});
  const offer=prepare(f,a,r),effect=apply(f,a,offer,true),pc=f.pcs[1];
  f.db.upsertRulesRuling(f.guild,{key:"armor-hope",createdBy:"gm",ruling:"Ordinary armor feature would grant Hope, but PvP house policy generates zero Hope."});
  assert.throws(()=>{
    const auth=reviewFeatureEffect(f.db,f.guild,"gm",{character:pc.id,feature:"Godbound Laminar",source:effect.data.owner_choice,ruling:"armor-hope",resource:"hope",amount:1},{gm:true,interactionId:"pvp-armor-hope"});
    reviewPcEffect(f.db,f.guild,pc.owner_user_id,auth.record_key);approvePcEffect(f.db,f.guild,pc.owner_user_id,auth.record_key,{interactionId:"armor-gain"});applyPcEffect(f.db,f.guild,auth.record_key);
  },/PvP|Hope|generation/i);
  assert.equal(f.db.getCharacter(pc.id).data.resources.hope,2);
}));
test("PVE independently source-accepted ordinary feature in a compound PvP message may grant native non-PvP Hope",()=>nativeFixture(async f=>{
  const pc=f.pcs[0],spans=["I attempt to tap Choso.","I activate Restoring Focus on myself."],raw=spans.join(" ");
  f.db.updateCharacterData(pc.id,d=>{d.domain_cards=["Restoring Focus"];});
  const scope={mode:"party",actorUserId:pc.owner_user_id,actorCharacterId:pc.id},envelope=captureAuthoredTurnEnvelope(f.db,f.guild,pc.owner_user_id,pc.id,"compound-hope",raw);
  const proposals=spans.map((span,i)=>({version:2,proposal_id:"",source_event:envelope.source_event,start:raw.indexOf(span),end:raw.indexOf(span)+span.length,
    source_span:span,actor_character_id:pc.id,sequence_index:i,dependencies:[],type:"interact",operation:i?"activate":"contest",
    target:{kind:"character",key:i?pc.id:f.pcs[1].id,phrase:i?"myself":"Choso",grounding:"known"},framing:"immediate",destination_scope:"none",
    attempted_action:span,desired_outcome:null,authored_outcome_claim:null,temporal_relation:"sequential"}));
  const intents=proposeIntents(f.db,f.guild,proposals,scope,{messageId:"compound-hope"}).map(p=>acceptIntentForAdjudication(f.db,f.guild,p,scope));
  stagePvpAttempts(f.db,f.guild,intents,[]);assert(f.db.hasNativePvpSource(f.guild,envelope.source_event));
  f.db.upsertRulesRuling(f.guild,{key:"independent-focus",createdBy:"gm",ruling:"Reviewed synthetic ordinary free Restoring Focus grants one Hope independently of contest/dice."});
  const a=await import("../src/pc-effects.js"),input={character:pc.id,feature:"Restoring Focus",source:envelope.source_event,ruling:"independent-focus",resource:"hope",amount:1};
  assert.throws(()=>a.reviewFeatureEffect(f.db,f.guild,"gm",input,{gm:true,interactionId:"whole-message-not-proof"}),/PvP|Hope/);
  assert.throws(()=>a.reviewFeatureEffect(f.db,f.guild,"gm",{...input,accepted_intent:intents[0].record_key},{gm:true,interactionId:"pvp-not-independent"}),/PvP|Hope|independent/);
  const row=a.reviewFeatureEffect(f.db,f.guild,"gm",{...input,accepted_intent:intents[1].record_key},{gm:true,interactionId:"independent-focus"});
  a.reviewPcEffect(f.db,f.guild,pc.owner_user_id,row.record_key);a.approvePcEffect(f.db,f.guild,pc.owner_user_id,row.record_key,{interactionId:"owner-focus"});
  a.applyPcEffect(f.db,f.guild,row.record_key);assert.equal(f.db.getCharacter(pc.id).data.resources.hope,3);
}));
test("PVD uninitialized zero-capacity HP cannot become a native damage/death receipt",()=>nativeFixture(async f=>{
  await assert.rejects(()=>damage(f,{setup:f=>f.db.updateCharacterData(f.pcs[1].id,d=>{d.resources.hp={current:0,max:0};})}),/verified|HP|threshold/i);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"pc_death_move_request",includeGM:true}).length,0);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"pvp_attack_roll_receipt",includeGM:true}).length,0);
}));
