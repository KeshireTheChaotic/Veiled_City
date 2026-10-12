/** Native PC attacks. A model cannot select mechanics, sign for either owner, roll or mint receipts. */
import {createHash} from "node:crypto";
import {validateDamageAttackIntent} from "./pvp-profiles.js";
import {personalCharacter} from "./personal-continuity.js";
import {scenePresence,sceneAccess,RANGE_BANDS} from "./scene-continuity.js";
import {indexWorldEvent} from "./city-calendar.js";
import {rollTraitBreakdown} from "./roll-requests.js";
import {d,dualityRoll} from "./dice.js";
import {captureAttackFear,pendingPvpFear} from "./pvp-fear-gate.js";
import {assertPcCanAct,assertPcAttackable} from "./pc-native-eligibility.js";
import {blazeActionAuthorization,blazeCriticalResult,validateBlazeSavedRoll} from "./pc-death.js";
import {brawlAdmission,reserveBrawlAttack,verifyBrawlAttack,consumeBrawlAttack,brawlBatchMayFinish} from "./pvp-brawl.js";
import {resolveAutonomousPvpFear} from "./pvp-fear-moves.js";
const hash=v=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
function fail(message){throw Object.assign(new Error(message),{code:"NARRATIVE_PVP",expected:true});}
function closed(input,keys){if(!input||Array.isArray(input)||Object.keys(input).length!==keys.length||keys.some(k=>!(k in input)))fail("Closed native PC attack fields required.");}
function mechanics(db,guild,input){
  const ctx=validateDamageAttackIntent(db,guild,input.attack),{row,contract}=ctx;
  const pc=db.getCharacter(row.data.actor),target=db.getCharacter(row.data.target),ruling=db.getRulesRuling(guild,input.ruling);
  if(!blazeActionAuthorization(db,guild,pc.id,ctx.accepted.record_key))assertPcCanAct(pc,db,guild);
  assertPcAttackable(target,db,guild);
  if(!ruling?.created_by)fail("Save exact human-reviewed weapon/unarmed rules before attack preparation.");
  const actorPresence=scenePresence(db,guild,"character",pc.id),targetPresence=scenePresence(db,guild,"character",target.id);
  for(const presence of [actorPresence,targetPresence])if(presence?.data.state!=="actually_present"||presence.location_key!==contract.data.location_key
    ||db.getWorldEvent(guild,presence.source_event)?.status!=="active")fail("Current source-backed actual attack/target presence required.");
  if(!sceneAccess(db,guild,{observer_type:"character",observer_key:pc.id,target_type:"character",target_key:target.id,sense:"sight"}))fail("Attack needs actual line of sight.");
  let range,damage,damage_type;
  const proficiency=pc.data.proficiency;
  if(!Number.isSafeInteger(proficiency)||proficiency<1||proficiency>50)fail("Verified current Proficiency required.");
  if(input.kind==="unarmed"){
    if(input.weapon!==null||!["Strength","Finesse"].includes(input.trait))fail("Reviewed unarmed Strength/Finesse only.");
    range="Melee";damage=`${proficiency}d4`;damage_type="physical";
  }else if(input.kind==="weapon"){
    const weapons=(pc.data.inventory||[]).filter(w=>w?.name===input.weapon&&w.equipped===true),weapon=weapons[0];
    if(weapons.length!==1||!weapon||weapon.trait!==input.trait||!RANGE_BANDS.includes(weapon.range)
      ||!Number.isSafeInteger(weapon.damage_die)||weapon.damage_die<2||weapon.damage_die>1000
      ||!Number.isSafeInteger(weapon.damage_modifier)||Math.abs(weapon.damage_modifier)>100
      ||!["physical","magic"].includes(weapon.damage_type))fail("Exact equipped weapon trait/range/damage metadata required; missing source stays pending ruling.");
    range=weapon.range;damage=`${proficiency}d${weapon.damage_die}${weapon.damage_modifier?`${weapon.damage_modifier>0?"+":""}${weapon.damage_modifier}`:""}`;damage_type=weapon.damage_type;
  }else fail("Unsupported spell/feature PC-target mapping; no adversary-to-PC conversion. Keep pending native ruling.");
  const actualRange=actorPresence.data.zone===targetPresence.data.zone?"Melee":targetPresence.data.range;
  if(!RANGE_BANDS.includes(actualRange)||RANGE_BANDS.indexOf(actualRange)>RANGE_BANDS.indexOf(range))fail("Native target outside current weapon range.");
  if(!Number.isSafeInteger(target.data.evasion)||target.data.evasion<1||target.data.evasion>100)fail("Verified current target Evasion required, never adversary Difficulty.");
  // Reuse the native modifier inventory/authority checks without entering the adversary attack path.
  const breakdown=rollTraitBreakdown(db,guild,{trait:input.trait,kind:"attack",adjudication:ruling.ruling,modifier_keys:input.modifier_keys},pc);
  if(breakdown.unresolved.length)fail("Current attack trait unresolved.");
  if([...(pc.data.conditions||[]),...(target.data.conditions||[])].some(c=>c?.active!==false))
    fail("Active conditions require native attack/defense applicability review; never assume vanilla bonuses.");
  const snapshot={actor:hash(pc.data),target:hash(target.data),actor_owner:pc.owner_user_id,target_owner:target.owner_user_id,
    actor_principal:ctx.participants.find(p=>p.character===pc.id).principal_revision,
    target_principal:ctx.participants.find(p=>p.character===target.id).principal_revision,
    actor_presence:hash(actorPresence),target_presence:hash(targetPresence),ruling:hash(ruling),breakdown};
  return {...ctx,pc,target,snapshot,range,damage,damage_type,evasion:target.data.evasion,breakdown};
}
function inventory(db,guild){
  const rows=[];for(let offset=0;offset<10000;offset+=100){const page=db.listCityRecords(guild,{kind:"pvp_attack_request",includeGM:true,limit:100,offset});rows.push(...page);if(page.length<100)return rows;}
  fail("Attack inventory exceeds bounded recovery coverage.");
}
function sourceProof(db,guild,key,{committed=false}={}){
  const row=db.getCityRecord(guild,"pvp_attack_request",key),o=row?.data.offer,s=row&&db.getWorldEvent(guild,row.source_event);
  if(row?.visibility!=="gm"||row.subject_key!==o?.actor||row.data.version!==1||row.data.offer_hash!==hash(o)
    ||key!==`pvp-attack:${hash([guild,o?.input.attack])}`||s?.status!=="active"||s.kind!=="pvp_attack_mechanics_review"
    ||s.source_id!==`gm:${o.reviewer}`||hash(s.details)!==hash(o)||s.subject_key!==null||s.visibility!=="gm"
    ||s.session_id!==o.session||s.scene!==o.scene||!db.ownerAuthoredSource(guild,s.event_key,o.reviewer))fail("Exact native attack review source changed/retracted.");
  const ctx=validateDamageAttackIntent(db,guild,o.input.attack,{committed});
  if(o.actor!==ctx.row.data.actor||o.target!==ctx.row.data.target||o.terms_hash!==ctx.contract.data.terms_hash
    ||o.session!==ctx.row.data.session_id||o.scene!==ctx.row.data.scene||row.source_event!==`${key}:source`)fail("Attack source/target/terms changed.");
  verifyBrawlAttack(db,guild,row,{committed:!!row.data.roll});
  return {...ctx,row,o,attackIntent:ctx.row};
}
function live(db,guild,key){
  const proof=sourceProof(db,guild,key),actual=mechanics(db,guild,proof.o.input);
  brawlAdmission(db,guild,actual,key);
  if(hash(actual.snapshot)!==hash(proof.o.snapshot)||actual.damage!==proof.o.damage||actual.evasion!==proof.o.evasion)
    fail("Attack equipment, target Evasion, source or sheet compare-and-set is stale; refresh review without dice/cost.");
  return {...actual,request:proof.row,o:proof.o};
}
function owner(db,guild,user,o){
  const character=o.snapshot.actor_owner===user?o.actor:o.snapshot.target_owner===user?o.target:null;
  if(!character)fail("Only current affected owner participants may inspect this private attack.");
  personalCharacter(db,guild,user,character);return character;
}
export function preparePvpAttack(db,guild,user,input,{gm=false,interactionId}={}){
  if(!gm||!user||!interactionId)fail("Authenticated GM source/rules review required; models cannot prepare attack mechanics.");
  closed(input,["attack","kind","weapon","trait","modifier_keys","ruling"]);
  return db.transaction(()=>{
    const c=mechanics(db,guild,input),key=`pvp-attack:${hash([guild,input.attack])}`,prior=db.getCityRecord(guild,"pvp_attack_request",key);
    if(prior){live(db,guild,key);if(hash(prior.data.offer.input)!==hash(input))fail("Native attack replay cannot change mechanics.");return prior;}
    if(pendingPvpFear(db,guild,c.contract).length)fail("Immediate Fear consequence pending; no next attack.");
    const brawl=brawlAdmission(db,guild,c,key);
    if(c.terms.interaction_scope==="duel"&&!blazeActionAuthorization(db,guild,c.pc.id,c.accepted.record_key)
      &&inventory(db,guild).some(r=>r.data.offer?.contract===c.contract.record_key&&!["missed","resolved","cancelled"].includes(r.status)))
      fail("An unfinished attack must reach its native terminal path before another elective attack.");
    const offer={version:1,input,reviewer:user,actor:c.pc.id,target:c.target.id,contract:c.contract.record_key,terms_hash:c.contract.data.terms_hash,
      session:c.row.data.session_id,scene:c.row.data.scene,snapshot:c.snapshot,trait:input.trait,damage:c.damage,damage_type:c.damage_type,
      range:c.range,evasion:c.evasion,breakdown:c.breakdown,...(brawl?{brawl}:{})};
    const s=indexWorldEvent(db,guild,{key:`${key}:source`,kind:"pvp_attack_mechanics_review",title:"Native PC attack awaiting independent owner review",
      source_id:`gm:${user}`,session_id:offer.session,scene:offer.scene,visibility:"gm",subject_key:offer.actor,details:offer},user);
    if(s.status!=="active"||hash(s.details)!==hash(offer))fail("Attack review source changed.");
    const row=db.saveCityRecord(guild,{kind:"pvp_attack_request",key,status:"awaiting_players",source_event:s.event_key,visibility:"gm",subject_key:offer.actor,
      data:{version:1,offer,offer_hash:hash(offer)}});
    return reserveBrawlAttack(db,guild,c,row);
  });
}
export function reviewPvpAttack(db,guild,user,key){
  return db.transaction(()=>{
    const {request:row,o}=live(db,guild,key),character=owner(db,guild,user,o),role=character===o.actor?"attacker":"defender";
    db.saveCityRecord(guild,{kind:"pvp_attack_review",key:`${key}:${character}`,status:"reviewed",source_event:row.source_event,
      visibility:"character",subject_key:character,data:{user,offer_hash:hash(o),role}});
    return {attack:key,status:row.status,offer_hash:hash(o),role,character,
      ...(role==="attacker"?{trait:o.trait,trait_bonus:o.breakdown.trait_bonus,modifiers:o.breakdown.modifiers,damage:o.damage,damage_type:o.damage_type,range:o.range}
        :{evasion:o.evasion}),
      instruction:"Review your own current mechanics. Standard attack uses current Evasion, no free defender roll. Unsupported optional features hold for native ruling. No Hope/critical Stress; Fear requires an immediate native move. Armor and death choices remain affected-owner decisions."};
  });
}
function choice(db,guild,row,character){
  const o=row.data.offer,key=`${row.record_key}:authorize:${character}`,s=db.getWorldEvent(guild,key),user=character===o.actor?o.snapshot.actor_owner:o.snapshot.target_owner;
  if(!s)return null;
  if(s.status!=="active"||s.kind!=="pvp_attack_owner_authorization"||s.source_id!==`player:${user}`||s.subject_key!==character
    ||s.visibility!=="character"||s.scene!==o.scene||s.session_id!==o.session||s.details.author!==user
    ||s.details.attack!==row.record_key||s.details.offer_hash!==row.data.offer_hash||s.details.character!==character
    ||!db.ownerAuthoredSource(guild,key,user))fail("Exact current owner attack/defense authorization source revoked or changed.");
  return s;
}
export function authorizePvpAttack(db,guild,user,input,{interactionId}={}){
  closed(input,["attack","expected_revision"]);if(!interactionId)fail("Authenticated owner interaction required.");
  return db.transaction(()=>{
    const {request:row,o}=live(db,guild,input.attack),character=owner(db,guild,user,o);
    if(input.expected_revision!==row.data.offer_hash)fail("Owner mechanics revision changed; private review required.");
    const review=db.getCityRecord(guild,"pvp_attack_review",`${input.attack}:${character}`);
    if(review?.status!=="reviewed"||review.data.user!==user||review.data.offer_hash!==row.data.offer_hash||review.source_event!==row.source_event
      ||review.visibility!=="character"||review.subject_key!==character)fail("Privately review exact own attack/defense mechanics before authorization.");
    if(row.data.roll)fail("Dice already saved; no new authorization or reroll.");
    if(!choice(db,guild,row,character))indexWorldEvent(db,guild,{key:`${input.attack}:authorize:${character}`,kind:"pvp_attack_owner_authorization",
      title:"Owner-authorized native PC attack mechanics",source_id:`player:${user}`,session_id:o.session,scene:o.scene,visibility:"character",subject_key:character,
      details:{author:user,character,attack:input.attack,offer_hash:row.data.offer_hash,interaction:interactionId}},user);
    const ready=[o.actor,o.target].every(c=>choice(db,guild,row,c));
    const defense=choice(db,guild,row,o.target);
    if(defense)db.saveCityRecord(guild,{kind:"pvp_defense_option_receipt",key:`${input.attack}:defense`,status:"confirmed",source_event:defense.event_key,
      visibility:"character",subject_key:o.target,data:{version:1,attack:input.attack,offer_hash:row.data.offer_hash,evasion:o.evasion,owner:o.snapshot.target_owner,mode:"base_evasion_no_extra_roll"}});
    return db.saveCityRecord(guild,{...row,key:row.record_key,status:ready?"ready":"awaiting_players"});
  });
}
/** Read-only saved native ancestry. It never rolls or changes character resources. */
export function validatePvpAttackRoll(db,guild,key){
  const row=db.getCityRecord(guild,"pvp_attack_roll_receipt",key),d=row?.data,request=d&&db.getCityRecord(guild,"pvp_attack_request",d.attack),o=request?.data.offer;
  if(row?.status!=="resolved"||!o||key!==`${d.attack}:roll`||request.data.roll!==key||row.visibility!=="gm"||row.subject_key!==o.actor
    ||row.source_event!==`${d.attack}:authorize:${o.actor}`||d.result.attack!==d.attack||d.result.terms_hash!==o.terms_hash
    ||d.result.roll_type!=="damage_pvp_attack"||d.result.evasion!==o.evasion||d.result.target_character_id!==o.target
    ||d.result.hit!==(d.result.duality==="Critical"||d.result.total>=o.evasion))fail("Exact native PC attack roll receipt required.");
  const {contract}=sourceProof(db,guild,d.attack,{committed:true});
  if(!Number.isSafeInteger(row.minute)||row.minute<0||row.minute>=contract.data.snapshot.terms.expires_minute)
    fail("Native attack must have committed before signed consent expiry; history cannot authorize late dice.");
  choice(db,guild,request,o.actor);choice(db,guild,request,o.target);
  const saved=db.getSavedRoll(guild,d.roll_id),defense=db.getCityRecord(guild,"pvp_defense_option_receipt",`${d.attack}:defense`);
  if(saved?.payload.auto_critical){const blaze=validateBlazeSavedRoll(db,guild,saved.id),staged=db.getCityRecord(guild,"pvp_attack_intent",o.input.attack);
    if(blaze.data.action!==staged.data.accepted_intent)fail("Blaze Critical belongs to a different native attack.");}
  if(saved?.roll_type!=="damage_pvp_attack"||saved.session_id!==o.session||saved.character_id!==o.actor||saved.discord_user_id!==o.snapshot.actor_owner
    ||hash(saved.payload)!==hash(d.result)||defense?.status!=="confirmed"||defense.subject_key!==o.target
    ||hash(defense.data)!==hash({version:1,attack:d.attack,offer_hash:request.data.offer_hash,evasion:o.evasion,owner:o.snapshot.target_owner,mode:"base_evasion_no_extra_roll"})
    ||defense.source_event!==choice(db,guild,request,o.target).event_key)fail("Saved dice and independent native defender receipt required.");
  return {receipt:row,request,offer:o,contract:db.getCityRecord(guild,"pvp_encounter_contract",o.contract)};
}
export function rollPvpAttack(db,guild,user,input,{rng=d}={}){
  closed(input,["attack","expected_revision"]);
  const receipt=db.transaction(()=>{
    const proof=sourceProof(db,guild,input.attack,{committed:true}),row=proof.row,o=proof.o;
    if(user!==o.snapshot.actor_owner)fail("Only the authenticated current attacker owner may roll.");
    personalCharacter(db,guild,user,o.actor);
    if(input.expected_revision!==row.data.offer_hash)fail("Attack mechanics revision changed.");
    if(row.data.roll)return validatePvpAttackRoll(db,guild,row.data.roll).receipt;
    const c=live(db,guild,input.attack);
    if(row.status!=="ready"||![o.actor,o.target].every(character=>choice(db,guild,row,character)))fail("Independent owner attack/defense approvals required; attack not ready.");
    const due=pendingPvpFear(db,guild,c.contract);
    if(due.length&&!brawlBatchMayFinish(db,guild,row,due))fail("Immediate Fear pending; no dice outside the exact pre-reserved simultaneous batch.");
    const result={...(blazeCriticalResult(db,guild,o.actor,c.accepted.record_key)
      ||dualityRoll({modifier:o.breakdown.subtotal,advantage:o.breakdown.advantage,disadvantage:o.breakdown.disadvantage},rng)),
      roll_type:"damage_pvp_attack",attack:input.attack,terms_hash:o.terms_hash,character_id:o.actor,target_character_id:o.target,evasion:o.evasion};
    result.hit=result.duality==="Critical"||result.total>=o.evasion;
    const rollId=db.addRoll(guild,o.session,user,o.actor,"damage_pvp_attack",result),authorization=choice(db,guild,row,o.actor);
    const receipt=db.saveCityRecord(guild,{kind:"pvp_attack_roll_receipt",key:`${input.attack}:roll`,status:"resolved",source_event:authorization.event_key,
      visibility:"gm",subject_key:o.actor,data:{version:1,attack:input.attack,roll_id:rollId,result}});
    db.saveCityRecord(guild,{...row,key:row.record_key,status:result.hit?"awaiting_damage":"missed",data:{...row.data,roll:receipt.record_key}});
    consumeBrawlAttack(db,guild,row,receipt);
    captureAttackFear(db,guild,c.contract,receipt);
    return receipt;
  });
  if(db.getCityCalendar(guild).flags.autonomous_pvp_fear!==false){
    const fear=db.listCityRecords(guild,{kind:"pvp_fear_trigger",includeGM:true,limit:100})
      .find(t=>t.data.version===2&&t.data.attack_receipt===receipt.record_key&&t.status==="awaiting_move");
    if(fear)resolveAutonomousPvpFear(db,guild,fear.record_key);
  }
  return receipt;
}
