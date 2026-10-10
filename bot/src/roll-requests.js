/** Authenticated, private pending roll breakdowns. Native persistence only; preparation never spends PC resources or rolls dice. */
import { createHash } from "node:crypto";
import { personalCharacter } from "./personal-continuity.js";
import { currentScene } from "./scene-continuity.js";
import { requireCitySource } from "./city-core.js";
import { cityAudit, cityKey } from "./city-calendar.js";
import { TRAITS } from "./character-system.js";
import { StateConflictError, UserInputError } from "./errors.js";
import { diceSpec } from "./dice.js";
const hash=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
const signed=value=>`${value>=0?"+":""}${value}`;
export const rollRevision=hash;
function sourceActor(db,guild,input){
  if(db.getCityCalendar(guild).flags.roll_requests!==true) throw new StateConflictError("Roll requests are opt-in.");
  const source=requireCitySource(db,guild,input.source_event),session=db.getActiveSession(guild);
  const legacy=source.kind==="player_declaration"&&source.visibility==="character"&&source.subject_key===input.character_id;
  const accepted=input.accepted_intent?db.getCityRecord(guild,"typed_intent",input.accepted_intent):null;
  const typed=source.kind==="authored_turn"&&accepted?.status==="accepted_for_adjudication"
    &&accepted.source_event===source.event_key&&accepted.data.actor===input.character_id
    &&accepted.data.owner_user_id===source.details.author;
  if(!legacy&&!typed||source.details.character_id!==input.character_id||source.source_id!==`player:${source.details.author}`
    ||!session||source.session_id!==session.id||source.scene!==currentScene(db,guild).key||!db.ownerAuthoredSource(guild,source.event_key,source.details.author))
    throw new StateConflictError("A current authenticated owner declaration in this scene is required.");
  return {source,session,pc:personalCharacter(db,guild,source.details.author,input.character_id)};
}
export function rollBreakdown(db,guild,input,pc){
  if(!TRAITS.includes(input.trait)||!["action","reaction","attack"].includes(input.kind)
    ||typeof input.adjudication!=="string"||!input.adjudication.trim()||input.adjudication.length>600)
    throw new UserInputError("Adjudicate the relevant trait and roll kind, with a factual reason.");
  const key=Object.keys(pc.data.traits||{}).find(name=>name.toLowerCase()===input.trait.toLowerCase());
  const trait=key===undefined?null:pc.data.traits[key];
  if(trait!==null&&!Number.isSafeInteger(trait)) throw new StateConflictError("Recorded trait is not a verified integer.");
  if(!Array.isArray(input.modifier_keys)||input.modifier_keys.length>20||new Set(input.modifier_keys).size!==input.modifier_keys.length)
    throw new UserInputError("A unique bounded modifier-source list is required.");
  const applicable=db.rollModifierSources(guild,pc.id,input.trait,input.kind);
  if(applicable.length>20||applicable.some(row=>!input.modifier_keys.includes(row.event_key)))
    throw new StateConflictError("Every active scoped modifier source must be accounted for; seek human review rather than omit one.");
  const modifiers=input.modifier_keys.map(id=>{
    const event=requireCitySource(db,guild,id),mod=event.details.roll_modifier;
    if(event.kind!=="roll_adjudication"||event.source_kind!=="gm"||!event.details.human_reviewed
      ||event.visibility!=="character"||event.subject_key!==pc.id||!mod||mod.trait!==input.trait||mod.roll_kind!==input.kind
      ||!["flat","advantage","disadvantage"].includes(mod.kind)||!Number.isSafeInteger(mod.amount)||Math.abs(mod.amount)>20
      ||!mod.name||typeof mod.name!=="string"||mod.name.length>160
      ||!db.getRulesRuling(guild,mod.ruling_key))
      throw new StateConflictError("Modifiers require a current character-scoped human adjudication and saved ruling.");
    if(mod.feature) throw new StateConflictError("Feature activation/ownership needs native adjudication; a name alone is not sufficient authority.");
    if(mod.kind!=="flat"&&mod.amount!==1) throw new UserInputError("Each advantage/disadvantage source contributes one source.");
    return {source:id,name:mod.name,kind:mod.kind,amount:mod.amount,ruling_key:mod.ruling_key};
  });
  let difficulty=null;
  if(input.difficulty_source){
    const event=requireCitySource(db,guild,input.difficulty_source),data=event.details.roll_difficulty;
    if(event.kind!=="roll_adjudication"||!data
      ||!(event.source_kind==="gm"&&event.details.human_reviewed||event.details.native_grounded===true
        &&event.details.accepted_intent===input.accepted_intent)
      ||data.declaration!==input.source_event||!Number.isSafeInteger(data.value)||data.value<0||data.value>100
      ||event.visibility!=="character"||event.subject_key!==pc.id)
      throw new StateConflictError("Player-visible Difficulty requires an exact human-adjudicated scoped source.");
    difficulty=data.value;
  }
  let attack=null;
  if(input.kind==="attack"&&input.attack_source){
    const event=requireCitySource(db,guild,input.attack_source),a=event.details.roll_attack,session=db.getActiveSession(guild);
    const encounter=session?db.getCurrentEncounter(session.id):null;
    const target=encounter?db.listCombatants(encounter.id).find(row=>row.id===a?.target_id):null;
    const weapon=(pc.data.inventory||[]).find(item=>(typeof item==="string"?item:item.name)===a?.weapon);
    if(event.kind!=="roll_adjudication"||event.details.human_reviewed!==true||event.source_kind!=="gm"
      ||event.subject_key!==pc.id||event.visibility!=="character"||event.session_id!==session?.id||event.scene!==currentScene(db,guild).key
      ||!a||a.trait!==input.trait||a.active!==true||!weapon||typeof weapon==="object"&&weapon.equipped!==true
      ||!db.getRulesRuling(guild,a.ruling_key)||!/^\d{1,2}d\d{1,4}(?:[+-]\d+)?$/i.test(a.damage)
      ||!["physical","magic"].includes(a.damage_type)||encounter?.status!=="active"||!target||target.status!=="active"||!Number.isSafeInteger(target.difficulty))
      throw new StateConflictError("Active owned attack, damage formula, target and rules require exact current human adjudication.");
    diceSpec(a.damage);
    attack={weapon:a.weapon,damage:a.damage,damage_type:a.damage_type,target_id:target.id,encounter_id:encounter.id,difficulty:target.difficulty};
  }
  const unresolved=[...(trait===null?["Relevant trait is missing from the sheet."]:[]),
    ...(input.kind==="attack"&&!attack?["Active weapon/feature attack provenance requires native adjudication before resolution."]:[])];
  const flat=modifiers.filter(row=>row.kind==="flat").reduce((sum,row)=>sum+row.amount,0);
  return {trait:input.trait,trait_bonus:trait,modifiers,subtotal:trait===null?null:trait+flat,
    advantage:modifiers.filter(row=>row.kind==="advantage").length,
    disadvantage:modifiers.filter(row=>row.kind==="disadvantage").length,difficulty,attack,unresolved};
}
export function prepareRollRequest(db,guild,input,actor,context={}){
  const {source,pc,session}=sourceActor(db,guild,input);
  if(context.scope?.mode==="private"&&(context.scope.actorUserId!==pc.owner_user_id||context.scope.actorCharacterId!==pc.id))
    throw new StateConflictError("Private requests belong only to the current authenticated actor.");
  const values=rollBreakdown(db,guild,input,pc),key=cityKey(`roll:${source.event_key}`);
  return db.transaction(()=>{
    const prior=db.getCityRecord(guild,"roll_request",key);
    if(prior) return prior;
    const after=db.saveCityRecord(guild,{kind:"roll_request",key,actor_key:pc.id,visibility:"character",subject_key:pc.id,
      source_event:source.event_key,status:values.unresolved.length?"needs_review":"pending",
      data:{session_id:session.id,scene:source.scene,character_id:pc.id,owner_user_id:pc.owner_user_id,character_name:pc.name,
        attempt:source.details.text||source.details.raw_text,kind:input.kind,adjudication:input.adjudication,breakdown:values,input,
        sheet_fingerprint:hash(pc.data),revision:1,history:[],authority:"Pending only; no dice, expenditure or outcome."}});
    cityAudit(db,guild,"roll_request_prepared",key,null,after,actor);return after;
  });
}
export function formatRollRequest(row,{user=null}={}){
  const data=row.data,participant=data.tag?.participants.find(item=>item.user===user),b=participant?.breakdown||data.breakdown,net=b.advantage-b.disadvantage;
  const subtotal=b.subtotal===null?null:b.subtotal+(data.experiences||[]).reduce((sum,item)=>sum+item.bonus,0);
  if(user&&data.owner_user_id!==user&&!participant){
    const helper=data.helpers?.find(item=>item.user===user);
    if(helper) return `Help recorded for request ${row.record_key}: ${helper.name} spent 1 Hope and rolled d6 ${helper.die}. Parent status: ${row.status}. Revision: ${rollRevision(row)}.`;
    if(data.disclosures?.some(item=>item.user===user))
      return `Owner-shared attempt by ${data.character_name}: ${data.attempt}. Request ${row.record_key}; status ${row.status}; revision ${rollRevision(row)}. No private sheet data or participation is implied.`;
    if(data.tag?.partner_user===user||data.withdrawn_tag?.partner_user===user)
      return `Nonbinding Tag Team proposal for your character; request ${row.record_key}. Status: ${row.status}. No participation is inferred. Revision: ${rollRevision(row)}. Describe your response freely.`;
    throw new StateConflictError("Request is not owned by this reader.");
  }
  return [`[Pending Daggerheart ${data.kind} roll — ${row.record_key}]`,
    `Actor: ${participant?.name||data.character_name} (<@${user||data.owner_user_id}>)`,
    `Attempt: ${participant?.attempt||(participant?.input?"Owner-authored linked contribution; original declaration retained":data.attempt)}`,
    `Trait: ${b.trait} ${b.trait_bonus===null?"PENDING":signed(b.trait_bonus)} [recorded character sheet at preparation]`,
    ...b.modifiers.map(mod=>`${mod.name}: ${mod.kind==="flat"?signed(mod.amount):mod.kind} [saved ruling ${mod.ruling_key}; ${mod.source}; included]`),
    ...(data.experiences?.length?data.experiences.map(item=>`Experience: ${item.name} ${signed(item.bonus)} [owner invoked; 1 Hope spent; ${item.proof}]`)
      :["Experience: not applied; requires the owner's explicit relevant declaration and authorized Hope spend."]),
    ...(data.helpers||[]).map(item=>`Helper: ${item.name}, native d6 ${item.die}, 1 Hope spent; highest applicable advantage die only.`),
    ...(data.tag?[`Tag Team participants: ${data.tag.participants.map(item=>item.name).join(", ")}. ${row.status==="awaiting_partner"?"Participation pending; 3 Hope not yet charged.":"Initiator paid 3 Hope once; each rolls separately and players select one actual result."}`,
      ...data.tag.participants.filter(item=>item.roll_id).map(item=>`${item.name}: saved roll ${item.roll_id}; total ${item.result.total}, ${item.result.duality}.`)]:[]),
    `Advantage/disadvantage: ${b.advantage}/${b.disadvantage}; cancel one-for-one; ${net===0?"no ordinary d6":`${net>0?"add":"subtract"} one d6`}.`,
    `Subtotal: ${subtotal===null?"PENDING":signed(subtotal)}`,
    `Formula: Hope d12 + Fear d12 ${subtotal===null?"+ pending values":signed(subtotal)}${net===0?"":net>0?" + one d6":" - one d6"}${data.helpers?.length?"; use highest applicable helper/own advantage d6, never their sum":""}.`,
    `Difficulty: ${b.difficulty===null?"not disclosed / awaiting GM adjudication":b.difficulty}`,
    ...b.unresolved.map(reason=>`Pending clarification: ${reason}`),
    `Status: ${row.status}; ${data.roll_id?`saved result ${data.roll_id}, total ${data.result.total}, ${data.result.duality}`:"acting dice not finalized"}. Revision: ${rollRevision(row)}`,
    ...(data.damage_result?[`Combined damage: ${data.damage_result.total} ${data.damage_result.type}; ${data.damage_result.marks} HP marked once.`]:[]),
    "Describe any clarification or intended contribution in your own words."].join("\n");
}
export function pendingRollRequests(db,guild,user){
  const pc=personalCharacter(db,guild,user),session=db.getActiveSession(guild);
  return db.ownedRollRequests(guild,user,pc.id)
    .filter(row=>row.data.session_id===session.id&&row.data.scene===currentScene(db,guild).key
      &&["pending","needs_review","awaiting_partner","awaiting_selection","awaiting_damage","awaiting_damage_type"].includes(row.status))
    .filter(row=>row.subject_key===pc.id||row.data.tag?.participants.some(item=>item.character===pc.id&&item.user===user)
      ||row.data.helpers?.some(item=>item.character===pc.id&&item.user===user)
      ||row.data.tag?.partner_user===user&&db.getCityRecord(guild,"roll_request",row.data.tag.partner_request)?.subject_key===pc.id
      ||row.data.disclosures?.some(item=>item.character===pc.id&&item.user===user&&db.getWorldEvent(guild,item.source_event)?.status==="active"
        &&db.ownerAuthoredSource(guild,item.source_event,row.data.owner_user_id)));
}
export function ownedRollRequest(db,guild,user,key){
  const pc=personalCharacter(db,guild,user),row=db.getCityRecord(guild,"roll_request",key);
  if(!row||!(row.subject_key===pc.id&&row.data.owner_user_id===user
    ||row.data.tag?.participants.some(item=>item.user===user&&item.character===pc.id)
    ||row.data.helpers?.some(item=>item.user===user&&item.character===pc.id)))
    throw new StateConflictError("No saved request is available to this current owned character.");
  return row;
}
/** Retries reuse stored requests; failed private delivery is recoverable through the read-only pending command. */
export async function publishRollRequests(db,guild,mutation,send){
  for(const receipt of mutation.intents||[]){
    if(receipt.status!=="accepted"||receipt.data.intent?.feature!=="roll"||!receipt.data.result) continue;
    const row=db.getCityRecord(guild,"roll_request",receipt.data.result.record_key);
    if(!row) continue;
    await publishRollAmendment(db,guild,row,send);
  }
}
/** Receipt-backed post-commit delivery. Discord failures never redo mechanics; unsent receipts can be retried. */
export async function publishRollAmendment(db,guild,row,send){
  const recipients=new Map([[row.data.owner_user_id,row.subject_key]]);
  for(const participant of row.data.tag?.participants||[]) recipients.set(participant.user,participant.character);
  for(const disclosure of row.data.disclosures||[]) if(db.getWorldEvent(guild,disclosure.source_event)?.status==="active") recipients.set(disclosure.user,disclosure.character);
  if(row.status==="awaiting_partner"&&row.data.tag?.partner_user){
    const partner=db.getCityRecord(guild,"roll_request",row.data.tag.partner_request);
    if(partner) recipients.set(row.data.tag.partner_user,partner.subject_key);
  }
  for(const [user,character] of recipients){
    personalCharacter(db,guild,user,character);
    const key=`roll-pub:${hash([row.record_key,row.data.revision,user]).slice(0,48)}`;
    let receipt=db.getCityRecord(guild,"roll_publication",key);
    if(receipt?.status==="delivered") continue;
    receipt=receipt||db.saveCityRecord(guild,{kind:"roll_publication",key,status:"pending",visibility:"character",subject_key:character,
      source_event:row.source_event,data:{request:row.record_key,revision:row.data.revision,user}});
    if(await send(user,formatRollRequest(row,{user}),row.data.session_id,character)!==true)
      throw new StateConflictError("Request committed; private delivery failed. Retrieve /vc-roll pending; do not repeat the turn.");
    db.saveCityRecord(guild,{...receipt,key,status:"delivered"});
  }
}
