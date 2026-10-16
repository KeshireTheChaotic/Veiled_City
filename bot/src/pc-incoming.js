/** Real Daggerheart incoming standard NPC attacks. Simulation d20 rows and GM prose are not damage authority. */
import { createHash } from "node:crypto";
import { d, diceSpec, gmD20Roll, gmAttackDamage } from "./dice.js";
import { indexWorldEvent } from "./city-calendar.js";
import { currentScene, scenePresence, sceneAccess, RANGE_BANDS } from "./scene-continuity.js";
import { activeCityProxy } from "./city-constraints.js";
import { personalCharacter } from "./personal-continuity.js";
import { conversationPrincipal,historicalOwnerPrincipal } from "./conversation-principal.js";
import { assertNonPvpCombatant } from "./pvp-authority.js";
import {assertPcAttackable} from "./pc-native-eligibility.js";
import {assertFearIncomingExecution} from "./pvp-fear-moves.js";
import {inspectNativeGmDecision,commitGmActionCost} from './gm-action-capability.js';
import {captureIncomingFeatureWindows} from './native-feature-windows.js';

const hash=v=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
const AUTONOMOUS_FEAR_ATTACK=Symbol("native-autonomous-fear-attack");
const NATIVE_AI_ATTACK=Symbol('native-ai-gm-attack'),INSPECT_ONLY=Symbol('read-only-native-attack');
function fail(message){throw Object.assign(new Error(message),{code:"PC_EFFECT_AUTHORITY",expected:true});}
function gmOnly(user,options){if(!options.gm||!user)fail("Authenticated GM native attack required.");}
function facts(db,guild,input,library,authority=null){
  assertNonPvpCombatant(db,guild,{actor_key:input.npc});
  const scene=currentScene(db,guild),pc=db.getCharacter(input.character),encounter=db.getCurrentEncounter(scene.session_id);
  const c=encounter&&db.listCombatants(encounter.id).find(c=>c.id===input.combatant),binding=encounter&&db.getCityRecord(guild,"encounter_binding",encounter.id);
  if(c)assertNonPvpCombatant(db,guild,c);
  const npc=scenePresence(db,guild,"npc",input.npc),target=pc&&scenePresence(db,guild,"character",pc.id);
  const source=db.getWorldEvent(guild,input.source),ruling=input.ruling?.startsWith('ai-decision:')?inspectNativeGmDecision(db,guild,input.ruling.slice(12)).row:db.getRulesRuling(guild,input.ruling),template=c&&library?.findAdversary(c.base_name);
  if(ruling?.kind==='gm_arbitration_decision'){
    const n=ruling.data.native;
    if(ruling.status!=='gm_action_ready'||n?.operation!=='commit_adversary_attack'||input.source!==ruling.source_event
      ||hash({...input,source:n.input.source,ruling:''})!==hash(n.input)||hash(template)!==n.template_hash)fail('Exact native AI-GM attack ruling required.');
  }
  if(pc?.guild_id!==guild||!db.getNpcProfile(guild,input.npc)||!db.getSimulationEntity(guild,"npc",input.npc)
    ||encounter?.status!=="active"||c?.status!=="active"||activeCityProxy(db,guild,input.npc)
    ||!binding?.data.combatants?.some(b=>b.actor===input.npc&&b.id===c.id)
    ||db.getWorldEvent(guild,binding.source_event)?.status!=="active"||source?.status!=="active"
    ||source.session_id!==scene.session_id||source.scene!==scene.key||(authority!==INSPECT_ONLY&&!ruling?.created_by&&ruling?.kind!=='gm_arbitration_decision')||!template
    ||npc?.data.state!=="actually_present"||target?.data.state!=="actually_present"
    ||npc.location_key!==pc.data.location||target.location_key!==pc.data.location
    ||!sceneAccess(db,guild,{observer_type:"npc",observer_key:input.npc,target_type:"character",target_key:pc.id,sense:"sight"}))
    fail("Current native encounter, NPC binding, unproxied presence, source and target legality required.");
  for(const presence of [npc,target])if(db.getWorldEvent(guild,presence.source_event)?.status!=="active")fail("Native presence source retracted.");
  personalCharacter(db,guild,pc.owner_user_id,pc.id);
  assertPcAttackable(pc,db,guild);
  const standard=/^(.+?)\s*[—–]\s*(Melee|Very Close|Close|Far|Very Far)\s*[—–]\s*(\d+d\d+(?:[+-]\d+)?)\s+(physical|magic)$/u.exec(template.standard);
  const evasion=pc.data.evasion,{major,severe}=pc.data.thresholds||{};
  const defenses=input.defenses;
  if(!defenses||Object.keys(defenses).some(k=>!["resistance","armor_reduction","armor_allowed","source"].includes(k))
    ||!["none","half","immune"].includes(defenses.resistance)||![1,2].includes(defenses.armor_reduction)
    ||typeof defenses.armor_allowed!=="boolean"||typeof defenses.source!=="string")fail("Exact reviewed defense applicability required.");
  const base=defenses.resistance==="none"&&defenses.armor_reduction===1&&defenses.armor_allowed;
  const active=[...(pc.data.domain_cards||[]),...(pc.data.inventory||[]),...(pc.data.conditions||[])];
  if(defenses.source==="base"?!base:!active.some(item=>item?.name===defenses.source&&(item.active===true||item.equipped===true)))
    fail("Defense modifier needs an active owned source, saved GM ruling and separate owner review; unsupported defenses remain pending.");
  if(!standard||![evasion,major,severe].every(Number.isSafeInteger)||evasion<1||major<1||severe<major
    ||!Number.isSafeInteger(Number(template.attack)))fail("Verified standard attack, Evasion and final PC thresholds required; unsupported features need review.");
  const actualRange=npc.data.zone===target.data.zone?"Melee":target.data.range;
  if(!RANGE_BANDS.includes(actualRange)||RANGE_BANDS.indexOf(actualRange)>RANGE_BANDS.indexOf(standard[2]))fail("Native target outside standard attack range.");
  const snapshot={scene:scene.key,session:scene.session_id,pc:hash(pc.data),owner:pc.owner_user_id,
    principal:conversationPrincipal(db,guild,pc.owner_user_id,pc.id).revision,encounter:encounter.id,combatant:hash(c),binding:hash(binding),
    npc:hash(npc),target:hash(target),source:hash(source),ruling:hash(ruling),template:hash(template)};
  return {pc,snapshot,damage:standard[3],damage_type:standard[4],bonus:Number(template.attack),evasion,major,severe,defenses};
}
/** Legality inspection alone grants no execution, ruling, encounter activation or dice. */
export function inspectIncomingCandidate(db,guild,input,{library}={}){return facts(db,guild,input,library,INSPECT_ONLY);}
function incomingSourceAuthority(db,guild,source,offer){
  if(offer.input.ruling?.startsWith('ai-decision:')){
    const {row}=inspectNativeGmDecision(db,guild,offer.input.ruling.slice(12));
    return offer.gm==='native:unified-gm'&&source.source_id==='native:unified-gm'&&offer.input.source===row.source_event;
  }
  return source.source_id===`gm:${offer.gm}`&&db.ownerAuthoredSource(guild,source.event_key,offer.gm);
}
function context(db,guild,key,library,{applied=false}={}){
  const row=db.getCityRecord(guild,"pc_incoming_attack",key),source=row&&db.getWorldEvent(guild,row.source_event);
  if(row?.data.version!==1||row.visibility!=="character"||source?.status!=="active"||source.kind!=="native_npc_attack_offer"
    ||hash(source.details)!==hash(row.data.offer)||!incomingSourceAuthority(db,guild,source,row.data.offer))fail("Exact native incoming attack source required.");
  const actual=facts(db,guild,row.data.offer.input,library);
  if(actual.pc.owner_user_id!==row.data.offer.snapshot.owner||actual.snapshot.principal!==row.data.offer.snapshot.principal)
    fail("Incoming attack owner/principal changed; native review required.");
  if(!applied&&hash(actual.snapshot)!==hash(row.data.offer.snapshot))fail("Native attack source/scene/target compare-and-set is stale.");
  return {row,...actual};
}
/** Read-only live offer authorization; still no GM turn, dice, target consent or damage is created. */
export function authorizeIncomingOffer(db,guild,key,{library}={}){return context(db,guild,key,library);}
/** A saved human ruling reviews applicability of the template and defense features; it cannot invent dice. */
export function prepareIncomingAttack(db,guild,user,input,options={}){
  gmOnly(user,options);
  if(!options.interactionId||!input||Object.keys(input).some(k=>!["npc","combatant","character","source","ruling","defenses"].includes(k)))fail("Closed native attack offer required.");
  if(input.ruling?.startsWith('ai-decision:')&&options.gm!==NATIVE_AI_ATTACK)fail('Only the native AI-GM adapter may bind this decision.');
  const actual=facts(db,guild,input,options.library),offer={version:1,gm:user,input,snapshot:actual.snapshot,
    damage:actual.damage,damage_type:actual.damage_type,bonus:actual.bonus,evasion:actual.evasion,major:actual.major,severe:actual.severe};
  return db.transaction(()=>{
    const key=`npc-incoming:${hash([guild,input.source,input.npc,input.combatant,input.character])}`,prior=db.getCityRecord(guild,"pc_incoming_attack",key);
    if(prior){if(hash(prior.data.offer)!==hash(offer))fail("Native attack offer identity reused.");return prior;}
    const source=indexWorldEvent(db,guild,{key:`${key}:source`,kind:"native_npc_attack_offer",title:"Native standard attack awaiting defense review",
      source_id:options.gm===NATIVE_AI_ATTACK?'native:unified-gm':`gm:${user}`,session_id:actual.snapshot.session,scene:actual.snapshot.scene,visibility:"character",subject_key:actual.pc.id,details:offer},user);
    return db.saveCityRecord(guild,{kind:"pc_incoming_attack",key,status:"awaiting_defense",source_event:source.event_key,
      visibility:"character",subject_key:actual.pc.id,data:{version:1,offer}});
  });
}
export function prepareArbitratedIncomingAttack(db,guild,decisionKey,{library}={}){
  const {row}=inspectNativeGmDecision(db,guild,decisionKey),n=row.data.native;
  if(row.status!=='gm_action_ready'||n?.operation!=='commit_adversary_attack')fail('Native standard attack decision required.');
  return prepareIncomingAttack(db,guild,'native:unified-gm',{...n.input,source:row.source_event,ruling:`ai-decision:${row.record_key}`},
    {gm:NATIVE_AI_ATTACK,interactionId:row.record_key,library});
}
/** Owner confirms base defenses only. Applicable optional features require their own reviewed native route instead. */
export function reviewIncomingAttack(db,guild,user,key,{library}={}){
  const {row,pc,...c}=context(db,guild,key,library);
  personalCharacter(db,guild,user,pc.id);
  db.saveCityRecord(guild,{kind:"pc_incoming_review",key:`${key}:review`,status:"reviewed",source_event:row.source_event,
    visibility:"character",subject_key:pc.id,data:{owner:user,offer_hash:hash(row.data.offer)}});
  return {attack:key,status:row.status,character:pc.id,evasion:c.evasion,major:c.major,severe:c.severe,
    damage:c.damage,damage_type:c.damage_type,attack_bonus:c.bonus,defenses:row.data.offer.input.defenses,
    instruction:"Confirm only after reviewing applicable defenses. Unsupported defense features hold the attack for human ruling. Armor is your own later choice; last HP never chooses a death move."};
}
export function confirmIncomingDefense(db,guild,user,key){
  const row=db.getCityRecord(guild,"pc_incoming_attack",key),o=row?.data.offer,pc=o&&personalCharacter(db,guild,user,o.input.character);
  if(!pc||pc.owner_user_id!==o.snapshot.owner||hash(pc.data)!==o.snapshot.pc||row.status!=="awaiting_defense")fail("Current affected owner defense review required.");
  const review=db.getCityRecord(guild,"pc_incoming_review",`${key}:review`);
  if(review?.data.owner!==user||review.data.offer_hash!==hash(o)||review.source_event!==row.source_event
    ||review.visibility!=="character"||review.subject_key!==pc.id)fail("Privately review exact incoming defenses before confirming.");
  return db.transaction(()=>{
    const source=indexWorldEvent(db,guild,{key:`${key}:defense`,kind:"incoming_defense_choice",title:"Owner confirms reviewed base defenses",
      source_id:`player:${user}`,session_id:o.snapshot.session,scene:o.snapshot.scene,visibility:"character",subject_key:pc.id,
      details:{author:user,attack:key,offer_hash:hash(o),principal:o.snapshot.principal}},user);
    if(source.status!=="active")fail("Defense choice revoked.");
    return db.saveCityRecord(guild,{...row,key,status:"ready",data:{...row.data,defense:source.event_key}});
  });
}
function defenseProof(db,guild,row){
  const choice=db.getWorldEvent(guild,row.data.defense),o=row.data.offer;
  if(choice?.status!=="active"||choice.kind!=="incoming_defense_choice"||choice.details.attack!==row.record_key
    ||choice.visibility!=="character"||choice.subject_key!==row.subject_key||choice.source_id!==`player:${o.snapshot.owner}`
    ||choice.details.author!==o.snapshot.owner||choice.details.principal!==o.snapshot.principal
    ||choice.session_id!==o.snapshot.session||choice.scene!==o.snapshot.scene
    ||choice.details.offer_hash!==hash(o)||!db.ownerAuthoredSource(guild,choice.event_key,o.snapshot.owner))fail("Current exact owner defense choice required.");
}
export function rollIncomingAttack(db,guild,user,key,options={}){
  gmOnly(user,options);
  return db.transaction(()=>{
    const c=context(db,guild,key,options.library),{row}=c;defenseProof(db,guild,row);
    if(row.data.roll)return verifyRoll(db,guild,row);
    if(row.status!=="ready")fail("Native attack is not ready.");
    assertFearIncomingExecution(db,guild,row,{autonomous:options.gm===AUTONOMOUS_FEAR_ATTACK});
    let nativeDecision=null,cost=null;
    if(row.data.offer.input.ruling?.startsWith('ai-decision:')){
      if(options.gm!==NATIVE_AI_ATTACK)fail('Native AI-GM executor required; owner defense never grants a GM role.');
      nativeDecision=inspectNativeGmDecision(db,guild,row.data.offer.input.ruling.slice(12)).row;
      cost=commitGmActionCost(db,guild,nativeDecision.record_key);
    }
    const rng=options.rng||d,result=gmD20Roll({kind:'attack',modifier:c.bonus,difficulty:c.evasion,
      advantage:nativeDecision?.data.proposal.advantage||false,disadvantage:nativeDecision?.data.proposal.disadvantage||false},rng),face=result.selected;
    const hit=result.success,damage=gmAttackDamage(result,c.damage,rng);
    const payload={attack:key,face,bonus:c.bonus,total:face+c.bonus,evasion:c.evasion,hit,damage,type:c.damage_type,offer_hash:hash(row.data.offer),
      ...(nativeDecision?{gm_decision:nativeDecision.record_key,gm_d20:result,cost_ref:cost.record_key}: {})};
    const roll=db.addRoll(guild,c.snapshot.session,user,c.pc.id,"npc_incoming_standard",payload);
    const receipt=db.saveCityRecord(guild,{kind:"npc_attack_roll_receipt",key:`${key}:roll`,status:"resolved",source_event:row.source_event,
      visibility:"character",subject_key:c.pc.id,data:{...payload,roll}});
    db.saveCityRecord(guild,{...row,key,status:hit?"awaiting_armor":"missed",data:{...row.data,roll:receipt.record_key}});return receipt;
  });
}
/** No human identity/approval is forged. Current native GM ruling, spotlight and defense authorize this executor. */
export function rollArbitratedIncomingAttack(db,guild,key,{library,rng}={}){
  const c=context(db,guild,key,library);
  if(!c.row.data.offer.input.ruling?.startsWith('ai-decision:'))fail('Native AI-GM decision required.');
  return rollIncomingAttack(db,guild,'native:unified-gm',key,{gm:NATIVE_AI_ATTACK,library,rng});
}
/** Internal automation verifies the exact selected Fear decision; a caller flag is never authority. */
export function rollAutonomousFearIncomingAttack(db,guild,key,{library,rng}={}){
  const row=db.getCityRecord(guild,"pc_incoming_attack",key);
  assertFearIncomingExecution(db,guild,row,{autonomous:true,committedRoll:!!row?.data.roll});
  return rollIncomingAttack(db,guild,"autonomous_pvp_fear",key,{gm:AUTONOMOUS_FEAR_ATTACK,library,rng});
}
function verifyRoll(db,guild,row){
  const r=db.getCityRecord(guild,"npc_attack_roll_receipt",row.data.roll),roll=r&&db.getSavedRoll(guild,r.data.roll),{roll:ignored,...payload}=r?.data||{};
  if(r?.status!=="resolved"||r.source_event!==row.source_event||r.subject_key!==row.subject_key
    ||roll?.roll_type!=="npc_incoming_standard"||roll.character_id!==row.subject_key||roll.session_id!==row.data.offer.snapshot.session
    ||hash(roll.payload)!==hash(payload)||payload.offer_hash!==hash(row.data.offer)||payload.attack!==row.record_key)fail("Saved native attack/damage roll ancestry required.");
  return r;
}
/** Read-only current source + immutable GM roll ancestry, usable by receipt-only output adapters. */
export function incomingRollProjection(db,guild,key){
  const {row,offer}=incomingAttackEvidence(db,guild,key),receipt=verifyRoll(db,guild,row),r=receipt.data;
  if(offer.input.ruling?.startsWith('ai-decision:')){
    const decision=inspectNativeGmDecision(db,guild,offer.input.ruling.slice(12)).row,cost=db.getCityRecord(guild,'gm_action_cost_receipt',r.cost_ref);
    let i=0;const expected=gmD20Roll({kind:'attack',modifier:offer.bonus,difficulty:offer.evasion,
      advantage:decision.data.proposal.advantage,disadvantage:decision.data.proposal.disadvantage},()=>r.gm_d20?.faces[i++]);
    if(r.gm_decision!==decision.record_key||hash(expected)!==hash(r.gm_d20)||expected.selected!==r.face||cost?.status!=='committed'
      ||cost.source_event!==decision.source_event||cost.data.decision!==decision.record_key||cost.data.before-cost.data.after!==cost.data.amount)fail('Exact native GM d20 and pre-roll payment proof required.');
  }
  const {count,sides,mod}=diceSpec(offer.damage);
  if(r.face<1||r.face>20||!Number.isSafeInteger(r.face)||r.bonus!==offer.bonus||r.evasion!==offer.evasion
    ||r.total!==r.face+r.bonus||r.hit!==(r.face===20||r.total>=r.evasion)||r.type!==offer.damage_type
    ||!r.hit&&r.damage!==null||r.hit&&(!r.damage||r.damage.expression!==offer.damage||r.damage.modifier!==mod
      ||r.damage.dice.length!==count||r.damage.dice.some(n=>!Number.isSafeInteger(n)||n<1||n>sides)
      ||r.damage.total!==r.damage.dice.reduce((a,b)=>a+b,0)+mod+(r.face===20?count*sides:0)))fail('Verified incoming GM dice arithmetic required.');
  return {row,offer,receipt};
}
/** Read-only immutable offer/outcome proof for a selected immediate GM move; never executes mechanics. */
export function incomingAttackEvidence(db,guild,key,{terminal=false}={}){
  const row=db.getCityRecord(guild,"pc_incoming_attack",key),o=row?.data.offer,source=row&&db.getWorldEvent(guild,row.source_event);
  const original=o&&db.getWorldEvent(guild,o.input.source),scene=currentScene(db,guild),pc=o&&db.getCharacter(o.input.character);
  if(row?.data.version!==1||row.visibility!=="character"||row.subject_key!==o?.input.character||o?.version!==1
    ||source?.status!=="active"||source.kind!=="native_npc_attack_offer"||hash(source.details)!==hash(o)
    ||!incomingSourceAuthority(db,guild,source,o)||original?.status!=="active"||hash(original)!==o.snapshot.source
    ||o.snapshot.session!==scene.session_id||o.snapshot.scene!==scene.key||pc?.guild_id!==guild||pc.owner_user_id!==o.snapshot.owner
    ||historicalOwnerPrincipal(db,guild,o.snapshot.owner,pc.id).revision!==o.snapshot.principal)
    fail("Exact current native incoming offer/source/owner evidence required.");
  if(!terminal)return {row,offer:o};
  if(!["resolved","missed"].includes(row.status)||!row.data.roll)
    throw Object.assign(new Error("Immediate NPC move awaits its native defense, attack or owner Armor workflow."),{code:"NATIVE_EFFECT_PENDING",expected:true});
  defenseProof(db,guild,row);const roll=verifyRoll(db,guild,row),r=roll.data;
  if(!Number.isSafeInteger(r.face)||r.face<1||r.face>20||r.bonus!==o.bonus||r.evasion!==o.evasion||r.total!==r.face+o.bonus
    ||r.hit!==(r.face===20||r.total>=o.evasion)||r.type!==o.damage_type||roll.visibility!=="character")fail("Exact native NPC attack arithmetic/audience required.");
  const effect=r.hit?validateIncomingDamageApplication(db,guild,`${key}:damage`):null;
  if(!r.hit&&(row.status!=="missed"||r.damage!==null)||r.hit&&row.status!=="resolved")fail("Native incoming terminal outcome mismatch.");
  return {row,offer:o,roll,effect};
}
export function resolveIncomingDamage(db,guild,user,key,{armor=false,library}={}){
  return db.transaction(()=>{
    const prior=db.getCityRecord(guild,"pc_effect_receipt",`${key}:damage`);
    if(prior?.data.version===2){const receipt=validateIncomingDamageApplication(db,guild,prior.record_key);
      if(receipt.data.owner!==user||receipt.data.armor!==armor)fail("Native damage receipt owner/decision replay differs.");return receipt;}
    const c=context(db,guild,key,library,{applied:!!prior}),{row,pc}=c;
    personalCharacter(db,guild,user,pc.id);defenseProof(db,guild,row);const roll=verifyRoll(db,guild,row);
    if(prior){if(prior.data.roll!==roll.record_key||prior.data.armor!==armor)fail("Native damage receipt replay differs.");return prior;}
    if(!roll.data.hit||row.status!=="awaiting_armor"||typeof armor!=="boolean")fail("Actual hit and affected owner Armor decision required.");
    assertFearIncomingExecution(db,guild,row,{committedRoll:true});
    const resources=pc.data.resources,hp=resources.hp,slots=resources.armor;
    if(![hp?.current,hp?.max,slots?.current,slots?.max].every(Number.isSafeInteger)||hp.current<0||hp.current>hp.max||hp.max<1||hp.max>12
      ||slots.current<0||slots.current>slots.max||armor&&slots.current===slots.max)fail("Verified available HP and owner-selected Armor Slot required.");
    if(armor&&!c.defenses.armor_allowed)fail("Armor is not applicable to this reviewed damage source.");
    const damage=c.defenses.resistance==="immune"?0:c.defenses.resistance==="half"?Math.ceil(roll.data.damage.total/2):roll.data.damage.total;
    const base=damage<=0?0:damage>=c.severe?3:damage>=c.major?2:1,marks=Math.max(0,base-(armor?c.defenses.armor_reduction:0));
    if(armor&&!base)fail("No positive damage to reduce with Armor.");
    const choice=indexWorldEvent(db,guild,{key:`${key}:armor`,kind:"incoming_armor_owner_choice",title:"Affected owner chooses native incoming Armor",
      source_id:`player:${user}`,session_id:c.snapshot.session,scene:c.snapshot.scene,visibility:"character",subject_key:pc.id,
      details:{author:user,attack:key,offer_hash:hash(row.data.offer),armor,principal:c.snapshot.principal}},user);
    if(choice.status!=="active")fail("Native Armor owner source revoked.");
    db.updateCharacterData(pc.id,data=>{data.resources.hp.current=Math.min(hp.max,hp.current+marks);if(armor)data.resources.armor.current++;
      if(hp.current+marks>=hp.max&&marks>0)data.death_state={request:`${key}:death`,status:"pending_choice"};});
    const after=db.getCharacter(pc.id).data.resources;
    const mutation=db.recordMutation(guild,{sessionId:c.snapshot.session,actorType:"player",actorId:user,sourceLayer:"pc_incoming",mutationType:"verified_npc_attack",
      entityKey:pc.id,visibility:"character",before:resources,after,rationale:"Native NPC standard attack with target-owned Armor.",payload:{attack:key,effect:`${key}:damage`}});
    const material={version:2,cause_type:"verified_npc_attack",roll:roll.record_key,character:pc.id,
      hp_marks:Math.min(marks,hp.max-hp.current),armor,defenses:c.defenses,damage_after_resistance:damage,before:resources,after,
      session:c.snapshot.session,scene:c.snapshot.scene,owner:user,principal:c.snapshot.principal,owner_choice:choice.event_key,mutation:mutation.id};
    const receipt=db.saveCityRecord(guild,{kind:"pc_effect_receipt",key:`${key}:damage`,status:"resolved",source_event:row.source_event,
      visibility:"character",subject_key:pc.id,data:{...material,effect_digest:hash(material)}});
    if(hp.current+marks>=hp.max&&marks>0){const data={version:2,character:pc.id,cause:receipt.record_key,owner:user,principal:c.snapshot.principal,scene:c.snapshot.scene,session:c.snapshot.session,
      authority:"Only the affected owner may select their native SRD death move; no death or narration is automatically chosen."};
      db.saveCityRecord(guild,{kind:"pc_death_move_request",key:`${key}:death`,status:"awaiting_owner",
        source_event:row.source_event,visibility:"character",subject_key:pc.id,data:{...data,digest:hash(data)}});}
    db.saveCityRecord(guild,{...row,key,status:"resolved"});
    captureIncomingFeatureWindows(db,guild,receipt.record_key,{library});
    return receipt;
  });
}

/** Current-source, read-only native injury ancestry. Does not require the injured PC still to be alive or unhealed. */
export function validateIncomingDamageApplication(db,guild,key){
  const receipt=db.getCityRecord(guild,"pc_effect_receipt",key),{effect_digest,...v}=receipt?.data||{},pc=v.character&&db.getCharacter(v.character);
  const row=v.roll&&db.getCityRecord(guild,"pc_incoming_attack",v.roll.replace(/:roll$/u,"")),o=row?.data.offer;
  const source=row&&db.getWorldEvent(guild,row.source_event),original=o&&db.getWorldEvent(guild,o.input.source),scene=currentScene(db,guild);
  if(receipt?.status!=="resolved"||v.version!==2||v.cause_type!=="verified_npc_attack"||hash(v)!==effect_digest||row?.status!=="resolved"
    ||key!==`${row.record_key}:damage`||receipt.visibility!=="character"||receipt.subject_key!==v.character||receipt.source_event!==row.source_event
    ||pc?.guild_id!==guild||pc.owner_user_id!==v.owner||v.owner!==o.snapshot.owner||v.principal!==o.snapshot.principal
    ||historicalOwnerPrincipal(db,guild,v.owner,v.character).revision!==v.principal||v.scene!==scene.key||v.session!==scene.session_id
    ||source?.status!=="active"||source.kind!=="native_npc_attack_offer"||hash(source.details)!==hash(o)
    ||!incomingSourceAuthority(db,guild,source,o)||original?.status!=="active"||hash(original)!==o.snapshot.source)
    fail("Exact current native incoming effect/source/owner ancestry required.");
  defenseProof(db,guild,row);const roll=verifyRoll(db,guild,row),r=roll.data,spec=diceSpec(o.damage),specDamage=r.damage;
  const expectedHit=r.face===20||r.face+o.bonus>=o.evasion;
  if(!Number.isSafeInteger(r.face)||r.face<1||r.face>20||r.bonus!==o.bonus||r.evasion!==o.evasion||r.total!==r.face+o.bonus
    ||r.hit!==expectedHit||!r.hit||r.type!==o.damage_type||specDamage?.expression!==o.damage||specDamage.modifier!==spec.mod
    ||specDamage.dice.length!==spec.count||specDamage.dice.some(n=>!Number.isSafeInteger(n)||n<1||n>spec.sides)
    ||specDamage.total!==specDamage.dice.reduce((a,b)=>a+b,0)+spec.mod+(r.face===20?spec.count*spec.sides:0))fail("Native incoming attack/damage dice arithmetic required.");
  const damage=o.input.defenses.resistance==="immune"?0:o.input.defenses.resistance==="half"?Math.ceil(specDamage.total/2):specDamage.total;
  const severity=damage<=0?0:damage>=o.severe?3:damage>=o.major?2:1;
  const marks=Math.min(Math.max(0,severity-(v.armor?o.input.defenses.armor_reduction:0)),v.before.hp.max-v.before.hp.current),after=structuredClone(v.before);
  after.hp.current+=marks;if(v.armor)after.armor.current++;
  const choice=db.getWorldEvent(guild,v.owner_choice),mutation=db.getMutation(guild,v.mutation);
  if(typeof v.armor!=="boolean"||v.armor&&(!o.input.defenses.armor_allowed||severity===0||v.before.armor.current>=v.before.armor.max)
    ||v.hp_marks!==marks||v.damage_after_resistance!==damage||hash(v.defenses)!==hash(o.input.defenses)||hash(v.after)!==hash(after)
    ||choice?.status!=="active"||choice.kind!=="incoming_armor_owner_choice"||choice.source_id!==`player:${v.owner}`||choice.visibility!=="character"
    ||choice.subject_key!==v.character||choice.details.author!==v.owner||choice.details.principal!==v.principal||choice.details.attack!==row.record_key
    ||choice.details.offer_hash!==hash(o)||choice.details.armor!==v.armor||!db.ownerAuthoredSource(guild,choice.event_key,v.owner)
    ||mutation?.source_layer!=="pc_incoming"||mutation.entity_key!==v.character||hash(JSON.parse(mutation.before_json))!==hash(v.before)
    ||hash(JSON.parse(mutation.after_json))!==hash(v.after))fail("Exact incoming Armor owner choice and atomic native damage mutation required.");
  return receipt;
}

/** Read-only injury evidence. No reroll, effect application, or public disclosure is implied. */
export function visibleIncomingInjury(db,guild,id,character){
  const receipt=typeof id==="string"&&db.getCityRecord(guild,"pc_effect_receipt",id),d=receipt?.data;
  const row=d&&db.getCityRecord(guild,"pc_incoming_attack",d.roll?.replace(/:roll$/u,""));
  const source=row&&db.getWorldEvent(guild,row.source_event),o=row?.data.offer,pc=db.getCharacter(character),scene=currentScene(db,guild);
  if(receipt?.status!=="resolved"||receipt.subject_key!==character||d.character!==character||d.cause_type!=="verified_npc_attack"
    ||row?.status!=="resolved"||id!==`${row.record_key}:damage`||receipt.source_event!==row.source_event
    ||source?.status!=="active"||source.kind!=="native_npc_attack_offer"||hash(source.details)!==hash(o)
    ||db.getWorldEvent(guild,o.input.source)?.status!=="active"||d.session!==scene.session_id||d.scene!==scene.key
    ||pc?.guild_id!==guild||pc.owner_user_id!==d.owner||d.owner!==o.snapshot.owner
    ||conversationPrincipal(db,guild,d.owner,character).revision!==o.snapshot.principal
    ||!Number.isSafeInteger(d.hp_marks)||d.hp_marks<=0||d.after.hp.current-d.before.hp.current!==d.hp_marks
    ||pc.data.resources?.hp?.current!==d.after.hp.current||pc.data.resources.hp.current<=0)
    fail("Current native injury receipt required; sheet marks and prose are not visible condition evidence.");
  defenseProof(db,guild,row);const roll=verifyRoll(db,guild,row);
  if(roll.record_key!==d.roll||!roll.data.hit)fail("Native injury roll ancestry required.");
  // HP counts can return to an old value after healing and a different private injury. That is not fresh disclosure.
  const latest=db.latestPcHpEffect(guild,character);
  if(latest?.record_key!==id)fail("Visible injury disclosure is superseded by a later native HP effect.");
  return receipt;
}
