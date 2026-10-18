/** Authenticated, private pending roll breakdowns. Native persistence only; preparation never spends PC resources or rolls dice. */
import { createHash } from "node:crypto";
import { personalCharacter } from "./personal-continuity.js";
import { currentScene } from "./scene-continuity.js";
import { requireCitySource } from "./city-core.js";
import { cityAudit, cityKey } from "./city-calendar.js";
import { TRAITS } from "./character-system.js";
import { StateConflictError, UserInputError } from "./errors.js";
import { diceSpec } from "./dice.js";
import { isPvpIntent, assertNonPvpCombatant } from "./pvp-authority.js";
import {assertPcCanAct} from "./pc-native-eligibility.js";
import {blazeActionAuthorization} from "./pc-death.js";
import {publishNativeNotice,queueNativeNotice,reserveNativeNotice} from "./native-publications.js";
import {noticeHash} from "./native-notice.js";
import {gmRulingDetails} from "./gm-action-ruling.js";
import {overlapsOwnerActionTerminal} from "./owner-action-terminal.js";
import {nativeDefenseAura,persistNativeDefenseAura,nativeFormationDefense,persistNativeFormationDefense,nativeVeilExposureDefense} from './native-defense-aura.js';
const hash=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
const signed=value=>`${value>=0?"+":""}${value}`;
export const rollRevision=hash;
function sourceActor(db,guild,input){
  if(db.getCityCalendar(guild).flags.roll_requests!==true) throw new StateConflictError("Roll requests are opt-in.");
  const source=requireCitySource(db,guild,input.source_event),session=db.getActiveSession(guild);
  const legacy=source.kind==="player_declaration"&&source.visibility==="character"&&source.subject_key===input.character_id;
  const accepted=input.accepted_intent?db.getCityRecord(guild,"typed_intent",input.accepted_intent):null;
  if(accepted&&overlapsOwnerActionTerminal(db,guild,accepted.source_event,accepted.data.start,accepted.data.end))
    throw new StateConflictError("The owner withdrew this source range; no new native preparation.");
  const typed=source.kind==="authored_turn"&&accepted?.status==="accepted_for_adjudication"
    &&accepted.source_event===source.event_key&&accepted.data.actor===input.character_id
    &&accepted.data.owner_user_id===source.details.author;
  if(accepted&&isPvpIntent(db,guild,accepted))throw new StateConflictError("PC conflict requires the separately locked narrative PvP service.");
  if(!legacy&&!typed||source.details.character_id!==input.character_id||source.source_id!==`player:${source.details.author}`
    ||!session||source.session_id!==session.id||source.scene!==currentScene(db,guild).key||!db.ownerAuthoredSource(guild,source.event_key,source.details.author))
    throw new StateConflictError("A current authenticated owner declaration in this scene is required.");
  const pc=personalCharacter(db,guild,source.details.author,input.character_id);
  if(!blazeActionAuthorization(db,guild,pc.id,accepted?.record_key))assertPcCanAct(pc,db,guild);
  return {source,accepted,session,pc};
}
/** Pure shared trait/modifier validation. This supplies no target, dice, costs or execution permission. */
export function rollTraitBreakdown(db,guild,input,pc){
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
  const flat=modifiers.filter(row=>row.kind==="flat").reduce((sum,row)=>sum+row.amount,0);
  return {trait:input.trait,trait_bonus:trait,modifiers,subtotal:trait===null?null:trait+flat,
    advantage:modifiers.filter(row=>row.kind==="advantage").length,
    disadvantage:modifiers.filter(row=>row.kind==="disadvantage").length,
    unresolved:trait===null?["Relevant trait is missing from the sheet."]:[]};
}
export function rollBreakdown(db,guild,input,pc){
  const base=rollTraitBreakdown(db,guild,input,pc);
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
    if(target)assertNonPvpCombatant(db,guild,target);
    const weapon=(pc.data.inventory||[]).find(item=>(typeof item==="string"?item:item.name)===a?.weapon);
    if(event.kind!=="roll_adjudication"||event.details.human_reviewed!==true||event.source_kind!=="gm"
      ||event.subject_key!==pc.id||event.visibility!=="character"||event.session_id!==session?.id||event.scene!==currentScene(db,guild).key
      ||!a||a.trait!==input.trait||a.active!==true||!weapon||typeof weapon==="object"&&weapon.equipped!==true
      ||!db.getRulesRuling(guild,a.ruling_key)||!/^\d{1,2}d\d{1,4}(?:[+-]\d+)?$/i.test(a.damage)
      ||!["physical","magic"].includes(a.damage_type)||encounter?.status!=="active"||!target||target.status!=="active"||!Number.isSafeInteger(target.difficulty))
      throw new StateConflictError("Active owned attack, damage formula, target and rules require exact current human adjudication.");
    diceSpec(a.damage);
    attack={weapon:a.weapon,damage:a.damage,damage_type:a.damage_type,target_id:target.id,encounter_id:encounter.id,difficulty:target.difficulty};
    const aura=nativeDefenseAura(db,guild,target,input);
    if(aura)attack={...attack,difficulty:target.difficulty+1,base_difficulty:target.difficulty,defense_aura:aura.proof};
    const formation=nativeFormationDefense(db,guild,target,input);
    if(formation){
      if(aura)throw new StateConflictError('Combined defensive passive/aura odds require an authored native mapping.');
      attack={...attack,difficulty:target.difficulty+formation.detail.bonus,base_difficulty:target.difficulty,defense_passive:formation.proof};
    }
    const veil=nativeVeilExposureDefense(db,guild,target,input);
    if(veil){
      if(aura||formation)throw new StateConflictError('Combined defensive passive/aura odds require an authored native mapping.');
      attack={...attack,difficulty:target.difficulty+veil.detail.bonus,base_difficulty:target.difficulty,defense_passive:veil.proof};
    }
  }
  const unresolved=[...base.unresolved,
    ...(input.kind==="attack"&&!attack?["Active weapon/feature attack provenance requires native adjudication before resolution."]:[])];
  const {unresolved:baseUnresolved,...values}=base; // Preserve persisted breakdown key order/revision hashes.
  return {...values,difficulty,attack,unresolved};
}
export function prepareRollRequest(db,guild,input,actor,context={}){
  const {source,accepted,pc,session}=sourceActor(db,guild,input);
  if(accepted?.data.gm_review_terminal||accepted?.data.gm_ruling
    &&(!context.gmRulingRef||context.gmRulingRef!==input.gm_ruling))
    throw new StateConflictError("Scoped ruling/review must be validated before native preparation; it cannot be bypassed manually.");
  if(blazeActionAuthorization(db,guild,pc.id,accepted?.record_key))input={...input,private_result:true};
  if(context.scope?.mode==="private"&&(context.scope.actorUserId!==pc.owner_user_id||context.scope.actorCharacterId!==pc.id))
    throw new StateConflictError("Private requests belong only to the current authenticated actor.");
  const values=rollBreakdown(db,guild,input,pc),key=input.accepted_intent
    ?cityKey(`roll:${hash([source.event_key,accepted.record_key,accepted.data.type,input.kind,
      accepted.data.source_hash||accepted.data.actor_principal_revision||"v1"]).slice(0,48)}`)
    :cityKey(`roll:${source.event_key}`);
  return db.transaction(()=>{
    const prior=db.getCityRecord(guild,"roll_request",key);
    if(prior) return prior;
    const after=db.saveCityRecord(guild,{kind:"roll_request",key,actor_key:pc.id,visibility:"character",subject_key:pc.id,
      source_event:source.event_key,status:values.unresolved.length?"needs_review":"pending",
      data:{session_id:session.id,scene:source.scene,character_id:pc.id,owner_user_id:pc.owner_user_id,character_name:pc.name,
        attempt:source.details.text||source.details.raw_text,kind:input.kind,adjudication:input.adjudication,breakdown:values,input,
        sheet_fingerprint:hash(pc.data),revision:1,history:[],authority:"Pending only; no dice, expenditure or outcome."}});
    persistNativeDefenseAura(db,guild,after);
    persistNativeFormationDefense(db,guild,after);
    cityAudit(db,guild,"roll_request_prepared",key,null,after,actor);reserveRollAmendment(db,guild,after);return after;
  });
}
export function formatRollRequest(row,{user=null,db=null,guild=null}={}){
  const data=row.data,participant=data.tag?.participants.find(item=>item.user===user),b=participant?.breakdown||data.breakdown,net=b.advantage-b.disadvantage;
  const subtotal=b.subtotal===null?null:b.subtotal+(data.experiences||[]).reduce((sum,item)=>sum+item.bonus,0);
  if(user&&data.owner_user_id!==user&&!participant){
    const helper=data.helpers?.find(item=>item.user===user);
    if(helper) return `Help recorded for request ${row.record_key}: ${helper.name} spent 1 Hope and rolled d6 ${helper.die}. Parent status: ${row.status}. Revision: ${rollRevision(row)}.`;
    const disclosure=data.disclosures?.find(item=>item.user===user);
    if(disclosure)
      return `Owner-shared attempt by ${data.character_name}: ${disclosure.context||'Context not shared: no source-confirmed accepted occurrence is available; ask the owner for bounded context.'} Request ${row.record_key}; status ${row.status}; revision ${rollRevision(row)}. No private sheet data, outcome or participation is implied.`;
    if(data.tag?.partner_user===user||data.withdrawn_tag?.partner_user===user)
      return `Nonbinding Tag Team proposal for your character; request ${row.record_key}. Status: ${row.status}. No participation is inferred. Revision: ${rollRevision(row)}. Describe your response freely.`;
    throw new StateConflictError("Request is not owned by this reader.");
  }
  const outcomeReview=data.input?.accepted_intent&&row.status==="resolved"&&b.difficulty==null&&!b.attack&&data.result?.duality!=="Critical";
  const review=row.status==="needs_review"||outcomeReview;
  return [`[${review?"Review required":"Pending"} Daggerheart ${data.kind} roll — ${row.record_key}]`,
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
    ...(db?gmRulingDetails(db,guild,row,user||data.owner_user_id):[]),
    ...(outcomeReview
      ?["Saved dice require GM outcome review: no success/failure is authorized without grounded Difficulty. Do not reroll."]:[]),
    ...b.unresolved.map(reason=>`Pending clarification: ${reason}`),
    ...(review?[outcomeReview?"Dice are already saved. A human GM may review the missing Difficulty; no reroll or repeated cost."
      :"Not actionable: a human GM must resolve the listed provenance or sheet issue before dice can be finalized."]:[]),
    `Status: ${row.status}; ${data.roll_id?`saved result ${data.roll_id}, total ${data.result.total}, ${data.result.duality}`:"acting dice not finalized"}. Revision: ${rollRevision(row)}`,
    ...(data.damage_result?[`Combined damage: ${data.damage_result.total} ${data.damage_result.type}; ${data.damage_result.marks} HP marked once.`]:[]),
    "Describe any clarification or intended contribution in your own words."].join("\n");
}
export function pendingRollRequests(db,guild,user){
  const session=db.getActiveSession(guild);if(!session)return [];
  const pc=personalCharacter(db,guild,user);
  return db.ownedRollRequests(guild,user,pc.id)
    .filter(row=>row.data.session_id===session.id&&row.data.scene===currentScene(db,guild).key
      &&(["pending","needs_review","awaiting_partner","awaiting_selection","awaiting_damage","awaiting_damage_type"].includes(row.status)
        ||row.status==="resolved"&&(()=>{const a=db.getCityRecord(guild,"typed_intent",row.data.input?.accepted_intent);
          return a?.status==="accepted_for_adjudication"&&db.getCityRecord(guild,"action_outcome_receipt",a.data.outcome_receipt)?.status==="needs_review";})()))
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
  const keys=new Set((mutation.nativeAdjudications||[]).map(row=>row?.roll_request_ref).filter(Boolean));
  for(const ruling of mutation.gmRulings||[])if(ruling.data?.adjudication?.roll_request_ref)
    keys.add(ruling.data.adjudication.roll_request_ref);
  for(const receipt of mutation.intents||[]){
    if(receipt.status!=="accepted"||receipt.data.intent?.feature!=="roll"||!receipt.data.result) continue;
    keys.add(receipt.data.result.record_key);
  }
  for(const key of keys){
    const row=db.getCityRecord(guild,"roll_request",key);
    if(!row||!["pending","needs_review","awaiting_selection","awaiting_partner","awaiting_damage","awaiting_damage_type"].includes(row.status)) continue;
    await publishRollAmendment(db,guild,row,send);
  }
}
/** Receipt-backed post-commit delivery. Discord failures never redo mechanics; unsent receipts can be retried. */
function amendmentSpecs(db,guild,row,{checkOwners=true}={}){
  const recipients=new Map([[row.data.owner_user_id,row.subject_key]]);
  for(const participant of row.data.tag?.participants||[]) recipients.set(participant.user,participant.character);
  for(const helper of row.data.helpers||[])recipients.set(helper.user,helper.character);
  for(const disclosure of row.data.disclosures||[]) if(db.getWorldEvent(guild,disclosure.source_event)?.status==="active") recipients.set(disclosure.user,disclosure.character);
  if(row.status==="awaiting_partner"&&row.data.tag?.partner_user){
    const partner=db.getCityRecord(guild,"roll_request",row.data.tag.partner_request);
    if(partner) recipients.set(row.data.tag.partner_user,partner.subject_key);
  }
  return [...recipients].map(([user,character])=>{
    if(checkOwners)personalCharacter(db,guild,user,character);
    const key=`roll-pub:${hash([row.record_key,row.data.revision,user]).slice(0,48)}`;
    return {kind:"roll_publication",key,source:row.source_event,
      notice:{kind:"roll_private",ref:row.record_key,request:row.record_key,revision:noticeHash([row.status,row.data]),user,character}};
  });
}
export function queueRollAmendment(db,guild,row){return db.transaction(()=>amendmentSpecs(db,guild,row).map(spec=>queueNativeNotice(db,guild,spec)));}
export function reserveRollAmendment(db,guild,row){return amendmentSpecs(db,guild,row,{checkOwners:false}).map(spec=>reserveNativeNotice(db,guild,spec));}
export async function publishRollAmendment(db,guild,row,send){
  const specs=amendmentSpecs(db,guild,row);
  for(const spec of specs)queueNativeNotice(db,guild,spec);
  const results=await Promise.allSettled(specs.map(spec=>publishNativeNotice(db,guild,spec,
    publication=>send(spec.notice.user,publication.payload,row.data.session_id,spec.notice.character,{publication}))));
  const error=results.find(r=>r.status==="rejected");if(error)throw error.reason;
}
