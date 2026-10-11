/** Real Daggerheart incoming standard NPC attacks. Simulation d20 rows and GM prose are not damage authority. */
import { createHash } from "node:crypto";
import { d, parseDice, diceSpec } from "./dice.js";
import { indexWorldEvent } from "./city-calendar.js";
import { currentScene, scenePresence, sceneAccess, RANGE_BANDS } from "./scene-continuity.js";
import { activeCityProxy } from "./city-constraints.js";
import { personalCharacter } from "./personal-continuity.js";
import { conversationPrincipal } from "./conversation-principal.js";
import { assertNonPvpCombatant } from "./pvp-authority.js";

const hash=v=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
function fail(message){throw Object.assign(new Error(message),{code:"PC_EFFECT_AUTHORITY",expected:true});}
function gmOnly(user,options){if(!options.gm||!user)fail("Authenticated GM native attack required.");}
function facts(db,guild,input,library){
  assertNonPvpCombatant(db,guild,{actor_key:input.npc});
  const scene=currentScene(db,guild),pc=db.getCharacter(input.character),encounter=db.getCurrentEncounter(scene.session_id);
  const c=encounter&&db.listCombatants(encounter.id).find(c=>c.id===input.combatant),binding=encounter&&db.getCityRecord(guild,"encounter_binding",encounter.id);
  if(c)assertNonPvpCombatant(db,guild,c);
  const npc=scenePresence(db,guild,"npc",input.npc),target=pc&&scenePresence(db,guild,"character",pc.id);
  const source=db.getWorldEvent(guild,input.source),ruling=db.getRulesRuling(guild,input.ruling),template=c&&library?.findAdversary(c.base_name);
  if(pc?.guild_id!==guild||!db.getNpcProfile(guild,input.npc)||!db.getSimulationEntity(guild,"npc",input.npc)
    ||encounter?.status!=="active"||c?.status!=="active"||activeCityProxy(db,guild,input.npc)
    ||!binding?.data.combatants?.some(b=>b.actor===input.npc&&b.id===c.id)
    ||db.getWorldEvent(guild,binding.source_event)?.status!=="active"||source?.status!=="active"
    ||source.session_id!==scene.session_id||source.scene!==scene.key||!ruling?.created_by||!template
    ||npc?.data.state!=="actually_present"||target?.data.state!=="actually_present"
    ||npc.location_key!==pc.data.location||target.location_key!==pc.data.location
    ||!sceneAccess(db,guild,{observer_type:"npc",observer_key:input.npc,target_type:"character",target_key:pc.id,sense:"sight"}))
    fail("Current native encounter, NPC binding, unproxied presence, source and target legality required.");
  for(const presence of [npc,target])if(db.getWorldEvent(guild,presence.source_event)?.status!=="active")fail("Native presence source retracted.");
  personalCharacter(db,guild,pc.owner_user_id,pc.id);
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
function context(db,guild,key,library,{applied=false}={}){
  const row=db.getCityRecord(guild,"pc_incoming_attack",key),source=row&&db.getWorldEvent(guild,row.source_event);
  if(row?.data.version!==1||row.visibility!=="character"||source?.status!=="active"||source.kind!=="native_npc_attack_offer"
    ||hash(source.details)!==hash(row.data.offer)||source.source_id!==`gm:${row.data.offer.gm}`
    ||!db.ownerAuthoredSource(guild,source.event_key,row.data.offer.gm))fail("Exact native incoming attack source required.");
  const actual=facts(db,guild,row.data.offer.input,library);
  if(actual.pc.owner_user_id!==row.data.offer.snapshot.owner||actual.snapshot.principal!==row.data.offer.snapshot.principal)
    fail("Incoming attack owner/principal changed; native review required.");
  if(!applied&&hash(actual.snapshot)!==hash(row.data.offer.snapshot))fail("Native attack source/scene/target compare-and-set is stale.");
  return {row,...actual};
}
/** A saved human ruling reviews applicability of the template and defense features; it cannot invent dice. */
export function prepareIncomingAttack(db,guild,user,input,options={}){
  gmOnly(user,options);
  if(!options.interactionId||!input||Object.keys(input).some(k=>!["npc","combatant","character","source","ruling","defenses"].includes(k)))fail("Closed native attack offer required.");
  const actual=facts(db,guild,input,options.library),offer={version:1,gm:user,input,snapshot:actual.snapshot,
    damage:actual.damage,damage_type:actual.damage_type,bonus:actual.bonus,evasion:actual.evasion,major:actual.major,severe:actual.severe};
  return db.transaction(()=>{
    const key=`npc-incoming:${hash([guild,input.source,input.npc,input.combatant,input.character])}`,prior=db.getCityRecord(guild,"pc_incoming_attack",key);
    if(prior){if(hash(prior.data.offer)!==hash(offer))fail("Native attack offer identity reused.");return prior;}
    const source=indexWorldEvent(db,guild,{key:`${key}:source`,kind:"native_npc_attack_offer",title:"Native standard attack awaiting defense review",
      source_id:`gm:${user}`,session_id:actual.snapshot.session,scene:actual.snapshot.scene,visibility:"character",subject_key:actual.pc.id,details:offer},user);
    return db.saveCityRecord(guild,{kind:"pc_incoming_attack",key,status:"awaiting_defense",source_event:source.event_key,
      visibility:"character",subject_key:actual.pc.id,data:{version:1,offer}});
  });
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
    const rng=options.rng||d,face=rng(20);if(!Number.isInteger(face)||face<1||face>20)fail("Native d20 out of range.");
    const hit=face===20||face+c.bonus>=c.evasion,damage=hit?parseDice(c.damage,rng):null;
    if(damage&&face===20){const spec=diceSpec(c.damage);damage.total+=spec.count*spec.sides;}
    const payload={attack:key,face,bonus:c.bonus,total:face+c.bonus,evasion:c.evasion,hit,damage,type:c.damage_type,offer_hash:hash(row.data.offer)};
    const roll=db.addRoll(guild,c.snapshot.session,user,c.pc.id,"npc_incoming_standard",payload);
    const receipt=db.saveCityRecord(guild,{kind:"npc_attack_roll_receipt",key:`${key}:roll`,status:"resolved",source_event:row.source_event,
      visibility:"character",subject_key:c.pc.id,data:{...payload,roll}});
    db.saveCityRecord(guild,{...row,key,status:hit?"awaiting_armor":"missed",data:{...row.data,roll:receipt.record_key}});return receipt;
  });
}
function verifyRoll(db,guild,row){
  const r=db.getCityRecord(guild,"npc_attack_roll_receipt",row.data.roll),roll=r&&db.getSavedRoll(guild,r.data.roll),{roll:ignored,...payload}=r?.data||{};
  if(r?.status!=="resolved"||r.source_event!==row.source_event||r.subject_key!==row.subject_key
    ||roll?.roll_type!=="npc_incoming_standard"||roll.character_id!==row.subject_key||roll.session_id!==row.data.offer.snapshot.session
    ||hash(roll.payload)!==hash(payload)||payload.offer_hash!==hash(row.data.offer)||payload.attack!==row.record_key)fail("Saved native attack/damage roll ancestry required.");
  return r;
}
export function resolveIncomingDamage(db,guild,user,key,{armor=false,library}={}){
  return db.transaction(()=>{
    const prior=db.getCityRecord(guild,"pc_effect_receipt",`${key}:damage`),c=context(db,guild,key,library,{applied:!!prior}),{row,pc}=c;
    personalCharacter(db,guild,user,pc.id);defenseProof(db,guild,row);const roll=verifyRoll(db,guild,row);
    if(prior){if(prior.data.roll!==roll.record_key||prior.data.armor!==armor)fail("Native damage receipt replay differs.");return prior;}
    if(!roll.data.hit||row.status!=="awaiting_armor"||typeof armor!=="boolean")fail("Actual hit and affected owner Armor decision required.");
    const resources=pc.data.resources,hp=resources.hp,slots=resources.armor;
    if(![hp?.current,hp?.max,slots?.current,slots?.max].every(Number.isSafeInteger)||hp.current<0||hp.current>=hp.max
      ||slots.current<0||slots.current>slots.max||armor&&slots.current===slots.max)fail("Verified available HP and owner-selected Armor Slot required.");
    if(armor&&!c.defenses.armor_allowed)fail("Armor is not applicable to this reviewed damage source.");
    const damage=c.defenses.resistance==="immune"?0:c.defenses.resistance==="half"?Math.ceil(roll.data.damage.total/2):roll.data.damage.total;
    const base=damage<=0?0:damage>=c.severe?3:damage>=c.major?2:1,marks=Math.max(0,base-(armor?c.defenses.armor_reduction:0));
    if(armor&&!base)fail("No positive damage to reduce with Armor.");
    db.updateCharacterData(pc.id,data=>{data.resources.hp.current=Math.min(hp.max,hp.current+marks);if(armor)data.resources.armor.current++;});
    const receipt=db.saveCityRecord(guild,{kind:"pc_effect_receipt",key:`${key}:damage`,status:"resolved",source_event:row.source_event,
      visibility:"character",subject_key:pc.id,data:{version:1,cause_type:"verified_npc_attack",roll:roll.record_key,character:pc.id,
        hp_marks:Math.min(marks,hp.max-hp.current),armor,defenses:c.defenses,damage_after_resistance:damage,before:resources,after:db.getCharacter(pc.id).data.resources,
        session:c.snapshot.session,scene:c.snapshot.scene,owner:user}});
    if(hp.current+marks>=hp.max)db.saveCityRecord(guild,{kind:"pc_death_move_request",key:`${key}:death`,status:"awaiting_owner",
      source_event:row.source_event,visibility:"character",subject_key:pc.id,data:{version:1,character:pc.id,cause:receipt.record_key,owner:user,
        authority:"Only the affected owner may select their native SRD death move; no death or narration is automatically chosen."}});
    db.saveCityRecord(guild,{...row,key,status:"resolved"});return receipt;
  });
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
