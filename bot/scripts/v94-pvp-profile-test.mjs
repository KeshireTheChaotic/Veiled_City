/** B.3: source-bound v3 damage consent is separate from narrative scoring and never an effect. */
import assert from "node:assert/strict";
import test from "node:test";
import {nativeFixture,pvpTerms} from "./v9-fixtures.mjs";
import {proposePvp,reviewPvp,respondPvp,stagePvpAttempts} from "../src/narrative-pvp.js";
import {buildActionPlan} from "../src/action-dependency.js";
import {indexWorldEvent} from "../src/city-calendar.js";
import {handleCommand} from "../src/commands.js";
const api=()=>import("../src/pvp-profiles.js");
const boundaries=["no_forced_player_dialogue","no_private_information_disclosure","no_forced_player_control","no_involuntary_item_loss","no_authored_permanent_scar"];
function terms(f,count=2,patch={}){
  const pcs=f.pcs.slice(0,count);
  return {version:3,profile:"damage_enabled",objective:"A voluntary test of arms with real death risk.",
    participants:pcs.map(pc=>({character:pc.id,team:null})),interaction_scope:count===2?"duel":"free_for_all",
    target_permissions:pcs.flatMap(actor=>pcs.filter(target=>target.id!==actor.id).map(target=>({actor:actor.id,target:target.id,effect_class:"attack_damage",max_risk:"lethal"}))),
    stakes:pcs.map(pc=>({character:pc.id,best:"Achieve my objective within native outcomes.",worst:"Native damage may lead to my own death-move decision."})),
    boundaries,allow_damage:true,lethality:"lethal",last_hp_policy:"owner_selected_srd_death_move",
    critical_stress_policy:"disabled",hope_policy:"no_pvp_hope_generation",fear_policy:"immediate_contextual_fear",
    scoring_policy:"none",features:[],resource_spending:"owner_native_only",audience:"private",
    stop_policy:"neutral_withdrawal_preserve_committed_effects",expires_minute:1000,...patch};
}
async function offer(f,t=terms(f)){
  const a=await api(),accepted=f.accepted(0,"I attempt to strike Choso.",f.pcs[1].id,{operation:"attack"});
  return a.proposeDamagePvp(f.db,f.guild,f.pcs[0].owner_user_id,{accepted_intent:accepted.record_key,terms:t},{interactionId:"offer"});
}
async function reply(f,p,i,decision="accept",suffix=""){
  const a=await api(),user=f.pcs[i].owner_user_id;
  a.reviewDamagePvp(f.db,f.guild,user,p.record_key);
  return a.respondDamagePvp(f.db,f.guild,user,{contract:p.record_key,expected_revision:p.data.terms_hash,decision},{interactionId:`reply:${i}:${decision}:${suffix}:${p.data.revision}`});
}
async function locked(f,t=terms(f)){
  let p=await offer(f,t);for(let i=0;i<t.participants.length;i++)p=await reply(f,p,i);return p;
}
function noEffects(f){
  for(const kind of ["pvp_attack_roll_receipt","pvp_damage_roll_receipt","pc_effect_receipt","pvp_round_receipt"])
    assert.equal(f.db.listCityRecords(f.guild,{kind,includeGM:true}).length,0,kind);
  for(const pc of f.pcs)assert.deepEqual(f.db.getCharacter(pc.id).data.resources,pc.data.resources);
}
test("PVC01 existing v2 harmless narrative agreement remains separate and no-harm",()=>nativeFixture(f=>{
  let p=proposePvp(f.db,f.guild,f.pcs[0].owner_user_id,{accepted_intent:f.accepted().record_key,opponent:f.pcs[1].id,terms:pvpTerms(f.pcs)});
  for(const pc of f.pcs.slice(0,2)){reviewPvp(f.db,f.guild,pc.owner_user_id,p.record_key);p=respondPvp(f.db,f.guild,pc.owner_user_id,{proposal:p.record_key,expected_revision:p.data.terms_hash,decision:"accept",interaction_id:`v2:${pc.id}`});}
  assert.equal(p.status,"locked");assert.equal(f.db.listCityRecords(f.guild,{kind:"pvp_encounter_contract",includeGM:true}).length,0);noEffects(f);
}));
test("PVC02 private target decline never grants dice, damage or a fictional forfeit",()=>nativeFixture(async f=>{
  const a=await api(),p=await offer(f);await reply(f,p,0);const declined=await reply(f,p,1,"decline");
  assert.equal(declined.status,"declined");assert.throws(()=>a.validateDamagePvp(f.db,f.guild,p.record_key),/locked|terminal|consent/i);noEffects(f);
}));
for(const tier of ["nonlethal_no_incapacitation","nonlethal_incapacitation"])test(`PVC03/PVC04 owner ruling rejects guaranteed tier ${tier}`,()=>nativeFixture(async f=>{
  await assert.rejects(()=>offer(f,terms(f,2,{lethality:tier})),/nonlethal|vanilla|lethal/i);noEffects(f);
}));
test("PVC05 all owners sign identical v3 lethal scope after private death-risk review",()=>nativeFixture(async f=>{
  const a=await api(),p=await offer(f),texts=f.pcs.slice(0,2).map(pc=>a.reviewDamagePvp(f.db,f.guild,pc.owner_user_id,p.record_key).text);
  assert.equal(texts[0],texts[1]);for(const s of ["Blaze of Glory","Avoid Death","Risk It All","no_pvp_hope_generation","disabled","lethal"])assert(texts[0].includes(s));
  const one=await reply(f,p,0);assert.throws(()=>a.validateDamagePvp(f.db,f.guild,one.record_key),/locked|consent/i);
  const both=await reply(f,one,1);assert.equal(a.validateDamagePvp(f.db,f.guild,both.record_key).contract.status,"locked");
  f.restart();assert.equal(a.validateDamagePvp(f.db,f.guild,both.record_key).contract.data.terms_hash,p.data.terms_hash);noEffects(f);
}));
test("PVC06 changed terms invalidate every old signature and require all new reviews",()=>nativeFixture(async f=>{
  const a=await api(),p=await locked(f),rev=a.reviseDamagePvp(f.db,f.guild,f.pcs[0].owner_user_id,{contract:p.record_key,expected_revision:p.data.terms_hash,terms:terms(f,2,{objective:"A new explicitly negotiated objective."})},{interactionId:"revision"});
  assert.notEqual(rev.data.terms_hash,p.data.terms_hash);assert.deepEqual(rev.data.approvals,[]);
  assert.throws(()=>a.respondDamagePvp(f.db,f.guild,f.pcs[1].owner_user_id,{contract:p.record_key,expected_revision:p.data.terms_hash,decision:"accept"},{interactionId:"old"}),/revision|terms/i);
  assert.throws(()=>a.respondDamagePvp(f.db,f.guild,f.pcs[1].owner_user_id,{contract:p.record_key,expected_revision:rev.data.terms_hash,decision:"accept"},{interactionId:"unreviewed"}),/review/i);noEffects(f);
}));
test("PVC07 terms cannot be rewritten after a native staged attack, and replay cannot change them",()=>nativeFixture(async f=>{
  const a=await api(),p=await locked(f),action=f.accepted(0,"I strike Choso.",f.pcs[1].id,{operation:"attack"});
  const attack=a.stageDamagePvp(f.db,f.guild,action);assert.equal(attack.status,"awaiting_native_attack");
  assert.throws(()=>a.reviseDamagePvp(f.db,f.guild,f.pcs[0].owner_user_id,{contract:p.record_key,expected_revision:p.data.terms_hash,terms:terms(f,2,{objective:"Retroactive rewrite."})},{interactionId:"late"}),/attack|immutable|started/i);
  assert.equal(a.stageDamagePvp(f.db,f.guild,action).record_key,attack.record_key);noEffects(f);
}));
test("PVC08 withdrawal disables future target edges without undoing committed history",()=>nativeFixture(async f=>{
  const a=await api(),p=await locked(f),before=structuredClone(f.db.getCityRecord(f.guild,"pvp_encounter_terms",p.data.terms_revision));
  const action=f.accepted(0,"I strike Choso.",f.pcs[1].id,{operation:"attack"});
  assert(a.damagePvpEligibility(f.db,f.guild,action));await reply(f,p,1,"withdraw");
  assert.equal(a.damagePvpEligibility(f.db,f.guild,action),null);
  assert.deepEqual(f.db.getCityRecord(f.guild,"pvp_encounter_terms",p.data.terms_revision),before);noEffects(f);
}));
test("PVC09 changed controlled role, source retraction or absent owner invalidates use-time consent",()=>nativeFixture(async f=>{
  const a=await api(),p=await locked(f);f.db.assignCharacter(f.session.id,f.pcs[0].owner_user_id,f.pcs[2].id);
  assert.throws(()=>a.validateDamagePvp(f.db,f.guild,p.record_key),/owner|principal|control/i);noEffects(f);
}));
for(const source of ["offer","signature","declaration"])test(`PVC09 retracted ${source} blocks native attack eligibility`,()=>nativeFixture(async f=>{
  const a=await api(),p=await locked(f),ref=source==="offer"?p.source_event:source==="declaration"?p.data.snapshot.source_event:f.db.getCityRecord(f.guild,"pvp_damage_consent",p.data.approvals[0]).source_event;
  indexWorldEvent(f.db,f.guild,{key:ref,status:"retracted"},"gm");
  assert.throws(()=>a.validateDamagePvp(f.db,f.guild,p.record_key),/source|retracted|stale|consent/i);noEffects(f);
}));
test("PVC10 new participant revision requires every affected owner approval again",()=>nativeFixture(async f=>{
  const a=await api(),p=await locked(f),rev=a.reviseDamagePvp(f.db,f.guild,f.pcs[0].owner_user_id,{contract:p.record_key,expected_revision:p.data.terms_hash,terms:terms(f,3)},{interactionId:"join"});
  assert.deepEqual(rev.data.approvals,[]);await reply(f,rev,0);await reply(f,rev,1);
  assert.throws(()=>a.validateDamagePvp(f.db,f.guild,rev.record_key),/locked|consent/i);
  const complete=await reply(f,rev,2);assert.equal(a.validateDamagePvp(f.db,f.guild,complete.record_key).participants.length,3);noEffects(f);
}));
test("PVC11 FFA requires exact allowed target edge, not generic group approval",()=>nativeFixture(async f=>{
  const a=await api(),t=terms(f,3);t.target_permissions=t.target_permissions.filter(e=>!(e.actor===f.pcs[0].id&&e.target===f.pcs[2].id));await locked(f,t);
  assert.equal(a.stageDamagePvp(f.db,f.guild,f.accepted(0,"I strike Billy.",f.pcs[2].id,{operation:"attack"})),null);
  assert(a.stageDamagePvp(f.db,f.guild,f.accepted(0,"I strike Choso.",f.pcs[1].id,{operation:"attack"})));noEffects(f);
}));
test("PVC12 2v2 opposing edges never imply friendly fire",()=>nativeFixture(async f=>{
  const a=await api(),t=terms(f,4,{interaction_scope:"teams"});t.participants=t.participants.map((p,i)=>({...p,team:i<2?"A":"B"}));
  t.target_permissions=t.target_permissions.filter(e=>t.participants.find(p=>p.character===e.actor).team!==t.participants.find(p=>p.character===e.target).team);
  await locked(f,t);assert.equal(a.stageDamagePvp(f.db,f.guild,f.accepted(0,"I strike Choso.",f.pcs[1].id,{operation:"attack"})),null);
  assert(a.stageDamagePvp(f.db,f.guild,f.accepted(0,"I strike Billy.",f.pcs[2].id,{operation:"attack"})));noEffects(f);
}));
test("PVC13 foreign user cannot read private offers and command adapter uses authenticated identity",()=>nativeFixture(async f=>{
  const a=await api(),p=await offer(f);assert.throws(()=>a.reviewDamagePvp(f.db,f.guild,f.pcs[2].owner_user_id,p.record_key),/participant|owner/i);
  const messages=[],i={id:"actual-private-review",guildId:f.guild,guild:{id:f.guild},user:{id:f.pcs[1].owner_user_id,username:"Choso"},isChatInputCommand:()=>true,
    commandName:"vc-roll",options:{getSubcommand:()=>"pvp",getString:()=>JSON.stringify({op:"damage-review",contract:p.record_key})},reply:async x=>messages.push(x),followUp:async x=>messages.push(x)};
  assert.equal(await handleCommand(i,{db:f.db,gm:{}}),true);assert(messages.length>0);assert(messages.every(m=>m.ephemeral===true&&m.content.length<=2000));
  assert(messages.some(m=>m.content.includes("Risk It All")));assert(!JSON.stringify(messages).includes('"hp"'));noEffects(f);
}));
test("PVC14 unapproved combined score/damage and critical Stress clear are rejected",()=>nativeFixture(async f=>{
  await api();
  for(const patch of [{scoring_policy:"three_strikes"},{critical_stress_policy:"vanilla"},{hope_policy:"normal"},{allow_damage:false},{profile:"narrative_only"}])
    await assert.rejects(()=>offer(f,terms(f,2,patch)),/policy|profile|hope|critical|scor|damage/i);noEffects(f);
}));
test("PVC native early dispatcher stages exact consented attack without generic roll or effects",()=>nativeFixture(async f=>{
  await locked(f);const action=f.accepted(0,"I strike Choso.",f.pcs[1].id,{operation:"attack"});
  const rows=stagePvpAttempts(f.db,f.guild,[action],buildActionPlan(f.db,f.guild,[action]));
  assert.equal(rows[0].kind,"pvp_attack_intent");assert.equal(rows[0].data.accepted_intent,action.record_key);
  assert.equal(rows[0].status,"awaiting_native_attack");noEffects(f);
}));
test("PVC forged signature or native contract mutation cannot certify target permission",()=>nativeFixture(async f=>{
  const a=await api(),p=await locked(f),s=f.db.getCityRecord(f.guild,"pvp_damage_consent",p.data.approvals[1]);
  f.db.saveCityRecord(f.guild,{...s,key:s.record_key,data:{...s.data,user:f.pcs[0].owner_user_id}});
  assert.throws(()=>a.validateDamagePvp(f.db,f.guild,p.record_key),/signature|consent|owner/i);noEffects(f);
}));
test("PVC withdrawal leaves unrelated signed group edges available and never signs a bystander",()=>nativeFixture(async f=>{
  const a=await api(),p=await locked(f,terms(f,3));await reply(f,p,2,"withdraw");
  assert(a.damagePvpEligibility(f.db,f.guild,f.accepted(0,"I strike Choso.",f.pcs[1].id,{operation:"attack"})));
  assert.equal(a.damagePvpEligibility(f.db,f.guild,f.accepted(3,"I strike Choso.",f.pcs[1].id,{operation:"attack"})),null);noEffects(f);
}));

test("PVC source-bound v3 agreement also protects Director/outbox/archive output, not only v2 proposals",()=>nativeFixture(async f=>{
  await locked(f);const {assertPvpOutput,archivePvpHistory}=await import("../src/pvp-output.js");
  const {queueTurnPublications}=await import("../src/publication-outbox.js");
  const scope={mode:"party",actorUserId:f.pcs[2].owner_user_id,actorCharacterId:f.pcs[2].id},result={narration:"Choso apologizes for losing.",narrative_claims:[]};
  assert.throws(()=>assertPvpOutput(f.db,f.guild,result,scope),e=>e.code==="NARRATIVE_PVP");
  const turn=f.db.beginTurnAttempt({guildId:f.guild,messageId:"v3-output",actorPrincipal:scope.actorUserId,sessionId:f.session.id,audience:"party"});
  assert.throws(()=>queueTurnPublications(f.db,{guild:{id:f.guild},session:f.session,result,scope,turnId:turn.turn_id}),e=>e.code==="NARRATIVE_PVP");
  assert.equal(f.db.listTurnPublications(f.guild,turn.turn_id).length,0);assert.equal(archivePvpHistory(f.db,f.guild,f.session.id).length,1);noEffects(f);
}));
test("PVC actual authoritative turn stages a consented attack even without coordination metadata",()=>nativeFixture(async f=>{
  await locked(f);const {captureWorldInput}=await import("../src/autonomous-world.js"),{commitGmTurn}=await import("../src/turn-orchestration.js");
  const pc=f.pcs[0],text="I strike Choso.",scope={mode:"party",actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,"actual-v3-attack",text);
  const result={respond:true,narration:"Choso apologizes for losing.",narrative_claims:[],player_intents:[{type:"interact",operation:"attack",source_span:text,
    target_name:"Choso",target_key:f.pcs[1].id,destination:"unspecified",utterance:"",excluded_targets:[],framing:"immediate",resolution:"auto",reason:"Native PvP adjudication is still required."}]};
  commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result,scope,speaker:pc.name,label:"v3 attack",meta:{messageId:"actual-v3-attack",triggerText:text}});
  const attacks=f.db.listCityRecords(f.guild,{kind:"pvp_attack_intent",includeGM:true});assert.equal(attacks.length,1);assert.equal(attacks[0].status,"awaiting_native_attack");
  assert(!result.narration.includes("apologizes"));assert.equal(f.db.listCityRecords(f.guild,{kind:"roll_request",includeGM:true}).length,0);noEffects(f);
}));
test("PVC action class, duplicate scopes and forged interaction fields never authorize a mechanical shortcut",()=>nativeFixture(async f=>{
  const a=await api(),p=await locked(f);
  assert.equal(a.stageDamagePvp(f.db,f.guild,f.accepted(0,"I grab Choso's coat.",f.pcs[1].id,{operation:"take"})),null);
  assert.throws(()=>a.respondDamagePvp(f.db,f.guild,f.pcs[0].owner_user_id,{contract:p.record_key,expected_revision:p.data.terms_hash,decision:"accept",interaction_id:"forged"},{interactionId:"native"}),/closed/i);
  const action=f.accepted(0,"I attempt another strike.",f.pcs[1].id,{operation:"attack"});
  const second=a.proposeDamagePvp(f.db,f.guild,f.pcs[0].owner_user_id,{accepted_intent:action.record_key,terms:terms(f)},{interactionId:"second-offer"});
  await reply(f,second,0,"accept","second");await reply(f,second,1,"accept","second");
  assert.throws(()=>a.stageDamagePvp(f.db,f.guild,action),/multiple|scope|clarification/i);noEffects(f);
}));
test("PVC native command adapter proposes, reviews, signs and withdraws without public or resource effects",()=>nativeFixture(async f=>{
  const action=f.accepted(0,"I attempt to strike Choso.",f.pcs[1].id,{operation:"attack"}),messages=[];
  async function command(actor,id,json){const i={id,guildId:f.guild,guild:{id:f.guild},user:{id:f.pcs[actor].owner_user_id,username:f.pcs[actor].name},
    isChatInputCommand:()=>true,commandName:"vc-roll",options:{getSubcommand:()=>"pvp",getString:()=>JSON.stringify(json)},reply:async x=>messages.push(x),followUp:async x=>messages.push(x)};
    await handleCommand(i,{db:f.db,gm:{}});}
  await command(0,"cmd-proposal",{op:"damage-propose",accepted_intent:action.record_key,terms:terms(f)});
  const p=f.db.listCityRecords(f.guild,{kind:"pvp_encounter_contract",includeGM:true})[0];
  await command(1,"cmd-review",{op:"damage-review",contract:p.record_key});
  for(const actor of [0,1])await command(actor,`cmd-accept:${actor}`,{op:"damage-respond",contract:p.record_key,expected_revision:p.data.terms_hash,decision:"accept"});
  const a=await api();assert(a.validateDamagePvp(f.db,f.guild,p.record_key));
  await command(1,"cmd-withdraw",{op:"damage-respond",contract:p.record_key,expected_revision:p.data.terms_hash,decision:"withdraw"});
  assert.equal(f.db.getCityRecord(f.guild,"pvp_encounter_contract",p.record_key).status,"withdrawn");
  assert(messages.every(m=>m.ephemeral===true&&m.content.length<=2000&&m.allowedMentions.parse.length===0));noEffects(f);
}));
test("PVC accepted row copies cannot substitute attack meaning, actor or target for immutable source input",()=>nativeFixture(async f=>{
  const a=await api();await locked(f,terms(f,3));
  const original=f.accepted(0,"I reach for Choso's coat.",f.pcs[1].id,{operation:"take"});
  const forged={...original,data:{...original.data,operation:"attack",target_key:f.pcs[2].id}};
  assert.equal(a.stageDamagePvp(f.db,f.guild,forged),null);noEffects(f);
}));
test("PVC group withdrawal retry is idempotent without duplicate stop or re-enrollment",()=>nativeFixture(async f=>{
  const a=await api(),p=await locked(f,terms(f,3)),once=await reply(f,p,2,"withdraw","retry"),again=await reply(f,p,2,"withdraw","retry");
  assert.equal(once.status,"locked");assert.deepEqual(again,once);assert.equal(again.data.withdrawals.length,1);
  assert.equal(a.damagePvpEligibility(f.db,f.guild,f.accepted(2,"I strike Jaxon.",f.pcs[0].id,{operation:"attack"})),null);noEffects(f);
}));
