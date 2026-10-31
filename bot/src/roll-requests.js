/** Authenticated, private pending roll breakdowns. Native persistence only; preparation never spends PC resources or rolls dice. */
import { createHash } from "node:crypto";
import {nativePersonalContinuity} from './frameworks/daggerheart/public.js';
function personalCharacter(...args){return nativePersonalContinuity.personalCharacter(...args);}
import {nativeScenes} from './frameworks/daggerheart/public.js';
function currentScene(...args){return nativeScenes.currentScene(...args);}
import {nativeWorldSource} from './frameworks/daggerheart/public.js';
function requireCitySource(...args){return nativeWorldSource.requireCitySource(...args);}
import {nativeWorldEvents} from './frameworks/daggerheart/public.js';
function cityAudit(...args){return nativeWorldEvents.cityAudit(...args);}function cityKey(...args){return nativeWorldEvents.cityKey(...args);}
import { TRAITS } from "./character-system.js";
import { StateConflictError } from "./kernel/errors.js";
import {createRollRequestRules} from "./frameworks/daggerheart/public.js";
import {createAdvantageOpportunitySource} from './frameworks/daggerheart/advantage-opportunity-source.js';
import {createFeatureOpportunityRules} from './frameworks/daggerheart/feature-opportunity-rules.js';
import {compileNativeFeatures} from './frameworks/daggerheart/public.js';
import {nativeHouseErratum} from './frameworks/daggerheart/public.js';
import {nativeEncounterActorSource} from './frameworks/daggerheart/public.js';
const {nativeEncounterActor}=nativeEncounterActorSource;
import {nativeActorControl} from './frameworks/daggerheart/public.js';
import { isPvpIntent, assertNonPvpCombatant } from "./pvp-authority.js";
import {assertPcCanAct} from "./pc-native-eligibility.js";
import {blazeActionAuthorization} from "./pc-death.js";
import {publishNativeNotice,queueNativeNotice,reserveNativeNotice,publishCampaignPvpNotices} from "./native-publications.js";
import {noticeHash} from "./native-notice.js";
import {gmRulingDetails} from "./gm-action-ruling.js";
import {nativeOwnerActionTerminal} from './frameworks/daggerheart/public.js';
function overlapsOwnerActionTerminal(...args){return nativeOwnerActionTerminal.overlapsOwnerActionTerminal(...args);}
import {nativeDefenseAura,persistNativeDefenseAura,nativeFormationDefense,persistNativeFormationDefense,nativeVeilExposureDefense} from './native-defense-aura.js';
import {inspectNativeUnarmedAttack} from './native-unarmed-attacks.js';
import {publishPreRollFearNotice} from './pre-roll-fear-notice.js';
import {inspectOrdinaryRollModifier} from './native-roll-modifiers.js';
import {inspectNativeEquippedAttack} from './native-equipped-attacks.js';
const hash=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
const signed=value=>`${value>=0?"+":""}${value}`;
export const rollRevision=hash;
let nativeRequests;
let nativeFeatureOpportunities;
export function captureAdvantageFeatureOpportunities(db,guild,request){
  if(!nativeFeatureOpportunities){
    const source=createAdvantageOpportunitySource({currentScene,nativeEncounterActor,nativeActorControl,
      indexWorldEvent:(...args)=>nativeWorldEvents.indexWorldEvent(...args)});
    nativeFeatureOpportunities=createFeatureOpportunityRules({capabilities:{...source,compileNativeFeatures,nativeHouseErratum,nativeEncounterActor,nativeActorControl,currentScene,
      indexWorldEvent:(...args)=>nativeWorldEvents.indexWorldEvent(...args)}});
  }
  return nativeFeatureOpportunities.captureAdvantageFeatureOpportunities(db,guild,request);
}
function nativeRollRequests(){
  return nativeRequests??=createRollRequestRules({traits:TRAITS,
    sources:{personalCharacter:(...args)=>personalCharacter(...args),currentScene:(...args)=>currentScene(...args),requireCitySource:(...args)=>requireCitySource(...args),cityAudit:(...args)=>cityAudit(...args),cityKey:(...args)=>cityKey(...args),overlapsOwnerActionTerminal:(...args)=>overlapsOwnerActionTerminal(...args)},
    mechanics:{captureAdvantageFeatureOpportunities:(...args)=>captureAdvantageFeatureOpportunities(...args),isPvpIntent:(...args)=>isPvpIntent(...args),assertNonPvpCombatant:(...args)=>assertNonPvpCombatant(...args),assertPcCanAct:(...args)=>assertPcCanAct(...args),blazeActionAuthorization:(...args)=>blazeActionAuthorization(...args),nativeDefenseAura:(...args)=>nativeDefenseAura(...args),persistNativeDefenseAura:(...args)=>persistNativeDefenseAura(...args),nativeFormationDefense:(...args)=>nativeFormationDefense(...args),persistNativeFormationDefense:(...args)=>persistNativeFormationDefense(...args),nativeVeilExposureDefense:(...args)=>nativeVeilExposureDefense(...args),inspectNativeUnarmedAttack:(...args)=>inspectNativeUnarmedAttack(...args),inspectOrdinaryRollModifier:(...args)=>inspectOrdinaryRollModifier(...args),inspectNativeEquippedAttack:(...args)=>inspectNativeEquippedAttack(...args)},
    reserveRollAmendment:(...args)=>reserveRollAmendment(...args)});
}
export function rollTraitBreakdown(...args){return nativeRollRequests().rollTraitBreakdown(...args);}
export function rollBreakdown(...args){return nativeRollRequests().rollBreakdown(...args);}
export function prepareRollRequest(...args){return nativeRollRequests().prepareRollRequest(...args);}
export function pendingRollRequests(...args){return nativeRollRequests().pendingRollRequests(...args);}
export function ownedRollRequest(...args){return nativeRollRequests().ownedRollRequest(...args);}
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
    ...b.modifiers.map(mod=>`${mod.name}: ${mod.kind==="flat"?signed(mod.amount):mod.kind} [${mod.ruling_key?`saved ruling ${mod.ruling_key}`:'native contextual odds'}; ${mod.source}; included]`),
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
/** Public table roll unless the request warrants privacy (private result, or a non-party accepted declaration). */
export function isPublicRollRequest(db,guild,row){
  const accepted=row?.data.input?.accepted_intent&&db.getCityRecord(guild,'typed_intent',row.data.input.accepted_intent);
  return row?.status==='pending'&&row.data.input?.private_result!==true&&accepted?.visibility==='party';
}
/** Retries reuse stored requests; failed private delivery is recoverable through the read-only pending command. */
/** Public table prompt for a pending request, as plain Discord component JSON: owner-only Roll and Options buttons. */
export function rollPromptPayload(row){
  const b=row.data.breakdown,attempt=String(row.data.attempt||'').replace(/<@!?\d+>\s*/g,'').trim();
  const button=(label,action,style)=>({type:2,style,label,custom_id:`vcrp|${row.record_key}|${action}`});
  return {content:[`**🎲 Roll requested — ${row.data.character_name}** (<@${row.data.owner_user_id}>)`,
    `> ${attempt.length>300?`${attempt.slice(0,297)}...`:attempt}`,
    `${b.trait} ${row.data.kind} roll${b.subtotal===null?'':` (${signed(b.subtotal)})`}${b.difficulty===null?'':` against Difficulty ${b.difficulty}`}.`,
    `Only <@${row.data.owner_user_id}> can roll. **Options** adds Experiences or a different trait first.`].join('\n'),
    components:[{type:1,components:[button('Roll','roll',1),button('Options','options',2)]}],
    allowedMentions:{users:[row.data.owner_user_id]}};
}
export async function publishRollRequests(db,guild,mutation,send){
  const failures=[];
  const campaignRequests=new Set((mutation.campaignPvpPreparations||[]).map(p=>p.request).filter(Boolean));
  for(const decision of mutation.unifiedArbitration||[])
    if(decision.data?.native?.operation==='campaign_pvp_attack')campaignRequests.add(decision.data.native.request);
  for(const contribution of mutation.intents||[]){
    if(contribution.status!=='accepted'||contribution.data.intent?.feature!=='pvp')continue;
    const key=contribution.data.result?.record_key,
      receipt=db.getCityRecord(guild,'pvp_attack_roll_receipt',key)||db.getCityRecord(guild,'pvp_damage_roll_receipt',key);
    if(receipt?.data.attack)campaignRequests.add(receipt.data.attack);
    else if(receipt?.data.attack_receipt){
      const attack=db.getCityRecord(guild,'pvp_attack_roll_receipt',receipt.data.attack_receipt);
      if(attack?.data.attack)campaignRequests.add(attack.data.attack);
    }
  }
  for(const request of campaignRequests)try{await publishCampaignPvpNotices(db,guild,request,send);}catch(error){failures.push(error);}
  for(const decision of mutation.unifiedArbitration||[]){
    const key=decision.data?.native?.opportunity?.pre_roll_fear;
    if(key)try{await publishPreRollFearNotice(db,guild,key,publication=>send(publication.target_user_id,publication.payload,
      decision.data.origin.session,publication.target_character_id,{publication}));}catch(error){failures.push(error);}
  }
  // Unified-arbitration rolls reach a private owner through the turn output; a public one also needs its table prompt.
  for(const decision of mutation.unifiedArbitration||[]){
    const key=decision.status==='pending_pc_roll'?decision.data?.native?.roll_request_ref:null,row=key&&db.getCityRecord(guild,'roll_request',key);
    if(row&&isPublicRollRequest(db,guild,row))try{await send(row.data.owner_user_id,rollPromptPayload(row),row.data.session_id,row.subject_key,{publicPrompt:row});}
    catch(error){failures.push(error);}
  }
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
    // A public table roll gets one play-channel prompt instead of the private breakdown (still behind Options).
    try{if(isPublicRollRequest(db,guild,row))await send(row.data.owner_user_id,rollPromptPayload(row),row.data.session_id,row.subject_key,{publicPrompt:row});
      else await publishRollAmendment(db,guild,row,send);}
    catch(error){failures.push(error);}
  }
  // Delivery is not game execution. One held/uncertain notice must not suppress independent native requests.
  if(failures.length)throw failures[0];
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
