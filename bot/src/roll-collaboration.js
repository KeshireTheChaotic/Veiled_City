/** Owner-authorized collaboration uses native RNG, roll persistence, transactions and receipts. No model may call this as a PC. */
import { personalCharacter } from "./personal-continuity.js";
import { currentScene, sceneAccess } from "./scene-continuity.js";
import { requireCitySource } from "./city-core.js";
import { cityAudit, cityKey, cityObject, indexWorldEvent } from "./city-calendar.js";
import { rollRevision, rollBreakdown, rollTraitBreakdown, reserveRollAmendment } from "./roll-requests.js";
import {reserveRollPartyDisclosure,validateRollSharePreview,sourceConfirmedRollAttempt} from "./roll-sharing.js";
import { dualityRoll, parseDice, d } from "./dice.js";
import { hpMarksForDamage } from "./combat.js";
import { recordObservedAttack } from "./encounter.js";
import { StateConflictError, PermissionError, UserInputError } from "./errors.js";
import { finalizeTypedRollAction } from "./typed-roll-outcomes.js";
import { assertNonPvpCombatant } from "./pvp-authority.js";
import { validatePvpAttackRoll } from "./pvp-attacks.js";
import { validatePvpDamageRoll } from "./pvp-damage.js";
import { validatePcDeathOutcome,blazeActionAuthorization,blazeCriticalResult,completeBlazeAction,validateBlazeSavedRoll } from "./pc-death.js";
import {assertPcCanAct,hopeCap} from "./pc-native-eligibility.js";
import {consentAction,historicalActionSource} from "./action-consent.js";
import {assertGmRulingRequest} from "./gm-action-ruling.js";
import {assertGmInvitationRequest,resumePendingGmActions} from './gm-native-rolls.js';
import {nativeAdversaryDamageDefense} from './native-feature-damage.js';
import {reconcileNativeFormationBreakdown} from './native-defense-aura.js';
import {validateNativeExperienceEligibility} from './native-experience-eligibility.js';
import {inspectNativeUnarmedAttack} from './native-unarmed-attacks.js';
import {alternateNativeUnarmedTrait} from './native-unarmed-traits.js';
function fail(message){throw new StateConflictError(message);}
/** Called only by the authenticated GM command/review boundary, never by model-supplied identity. */
export function adjudicateRollSource(db,guild,input,reviewer){
  cityObject(input);const session=db.getActiveSession(guild),pc=db.getCharacter(input.character_id);
  if(!session||pc?.guild_id!==guild||!reviewer) fail("Current campaign character, session and authenticated GM review required.");
  if(!["participation","modifier","difficulty","attack","alternate_trait"].includes(input.kind)) throw new UserInputError("Unsupported adjudication kind.");
  if(Object.keys(input).some(key=>!["key","character_id","kind","data","ruling_key"].includes(key))) throw new UserInputError("Closed GM adjudication required.");
  if(!db.getRulesRuling(guild,input.ruling_key)) fail("Save the actual human GM ruling first.");
  const field={participation:"roll_participation",modifier:"roll_modifier",difficulty:"roll_difficulty",attack:"roll_attack",
    alternate_trait:"roll_alternate_trait"}[input.kind];
  return indexWorldEvent(db,guild,{key:cityKey(input.key),kind:"roll_adjudication",source_id:reviewer,title:"Human-reviewed roll adjudication",
    session_id:session.id,scene:currentScene(db,guild).key,visibility:"character",subject_key:pc.id,
    details:{human_reviewed:true,reviewed_by:reviewer,ruling_key:input.ruling_key,[field]:{...cityObject(input.data),ruling_key:input.ruling_key}}},reviewer);
}
function live(db,guild,row){
  const session=db.getActiveSession(guild);
  if(!session||row.data.session_id!==session.id||row.data.scene!==currentScene(db,guild).key) fail("Request belongs to another session or scene.");
  requireCitySource(db,guild,row.source_event);
  const pc=personalCharacter(db,guild,row.data.owner_user_id,row.subject_key);
  if(row.data.input?.accepted_intent){
    const a=db.getCityRecord(guild,"typed_intent",row.data.input.accepted_intent);
    if(row.status==="resolved")historicalActionSource(db,guild,a?.record_key,{resolved:a?.status==="resolved"});
    else consentAction(db,guild,row.data.input.accepted_intent);
    if(a.source_event!==row.source_event||a.data.actor!==pc.id||a.data.owner_user_id!==row.data.owner_user_id)
      fail("Exact accepted request source and rolling owner required before dice or costs.");
    if(row.status!=="resolved"&&row.data.input.gm_ruling)assertGmRulingRequest(db,guild,row);
    if(row.status!=="resolved"&&row.data.input.gm_invitation)assertGmInvitationRequest(db,guild,row);
  }
  const checkResources=character=>{
    const r=character.data.resources;
    if(character.id!==row.subject_key||!blazeActionAuthorization(db,guild,character.id,row.data.input?.accepted_intent))assertPcCanAct(character,db,guild);
    if(!Number.isSafeInteger(r?.hope)||r.hope<0||r.hope>hopeCap(character.data)||!Number.isSafeInteger(r.stress?.current)
      ||!Number.isSafeInteger(r.stress?.max)||r.stress.current<0||r.stress.current>r.stress.max)
      fail("Current Hope/Stress values are unverified; seek human correction before dice or spending.");
  };
  checkResources(pc);
  const actual=reconcileNativeFormationBreakdown(db,guild,row,rollBreakdown(db,guild,row.data.input,pc));
  if(JSON.stringify(actual)!==JSON.stringify(row.data.breakdown)||actual.unresolved.length) fail("Sheet or authority changed, or mechanics need review; no dice or spending.");
  if(row.data.tag){
    requireCitySource(db,guild,row.data.tag.proof);
    for(const participant of row.data.tag.participants){
      const other=personalCharacter(db,guild,participant.user,participant.character);
      checkResources(other);
      if(participant.proof) requireCitySource(db,guild,participant.proof);
      if(participant.source_event) requireCitySource(db,guild,participant.source_event);
      if(!mayKnowRoll(db,guild,row,participant.character)) fail("Private participation disclosure changed; preserve saved effects for human review.");
      if(participant.input&&JSON.stringify(rollBreakdown(db,guild,participant.input,other))!==JSON.stringify(participant.breakdown))
        fail("Partner's sheet/source changed; preserve saved dice for human review.");
    }
  }
  for(const helper of row.data.helpers||[]){
    requireCitySource(db,guild,helper.proof);
    personalCharacter(db,guild,helper.user,helper.character);
    if(!mayKnowRoll(db,guild,row,helper.character)) fail("Private helper disclosure changed; human correction required without refund/reroll.");
    if(!sceneAccess(db,guild,{observer_type:"character",observer_key:helper.character,target_type:"character",target_key:pc.id,sense:"sound"}))
      fail("Confirmed helper no longer has scene access; human correction required without reroll/refund.");
  }
  return pc;
}
function save(db,guild,before,data,status,actor){
  const after=db.saveCityRecord(guild,{...before,key:before.record_key,status,data:{...data,revision:(before.data.revision||0)+1,
    history:[...(before.data.history||[]),{revision:before.data.revision,status:before.status,breakdown:before.data.breakdown}].slice(-40)}});
  cityAudit(db,guild,"roll_request_amended",before.record_key,before,after,actor);return after;
}
function spend(db,pc,amount){
  const hope=pc.data.resources?.hope;
  assertPcCanAct(pc,db,pc.guild_id);
  if(!Number.isSafeInteger(hope)||hope<amount||hope>hopeCap(pc.data)) fail("Insufficient verified Hope; no charge or dice.");
  return db.updateCharacterData(pc.id,data=>{data.resources.hope-=amount;});
}
function proof(db,guild,row,pc,input,kind){
  if(!mayKnowRoll(db,guild,row,pc.id)) fail("Private attempt requires the actual owner's explicit disclosure before another PC can contribute.");
  const event=requireCitySource(db,guild,input.proof),p=event.details.roll_participation;
  if(event.kind!=="roll_adjudication"||event.source_kind!=="gm"||event.details.human_reviewed!==true
    ||event.session_id!==row.data.session_id||event.scene!==row.data.scene||event.visibility!=="character"||event.subject_key!==pc.id||!p||p.request!==row.record_key
    ||p.character_id!==pc.id||p.kind!==kind||p.description!==input.description||!input.description?.trim())
    fail("Exact human-adjudicated feasibility source and owner-authored contribution required; keep proposal pending.");
  if(pc.id!==row.subject_key&&!sceneAccess(db,guild,{observer_type:"character",observer_key:pc.id,target_type:"character",target_key:row.subject_key,sense:"sound"}))
    fail("No actual scene/communication access for this contribution.");
  return p;
}
export function mayKnowRoll(db,guild,row,character){
  if(row.subject_key===character||db.getWorldEvent(guild,row.source_event)?.details.private_scene!==true) return true;
  const disclosure=db.getCityRecord(guild,"roll_disclosure",`${row.record_key}:${character}`);
  if(!disclosure) return false;
  const source=db.getWorldEvent(guild,disclosure.source_event);
  return source?.status==="active"&&source.kind==="roll_disclosure"&&source.source_id===`player:${row.data.owner_user_id}`
    &&source.details.author===row.data.owner_user_id&&source.details.request===row.record_key&&source.subject_key===character
    &&db.ownerAuthoredSource(guild,source.event_key,row.data.owner_user_id);
}
function resultStatus(data){
  const attack=data.breakdown.attack;
  if(!attack) return "resolved";
  const success=data.result.duality==="Critical"||data.result.total>=attack.difficulty;
  return success?"awaiting_damage":"resolved";
}
function finishDamage(db,guild,row,data){
  const participants=data.tag?.participants||[{character:data.character_id,damage:data.damage,breakdown:data.breakdown}];
  if(!participants.every(item=>item.damage)) return "awaiting_damage";
  const types=new Set(participants.map(item=>(item.breakdown||data.breakdown).attack.damage_type));
  const type=types.size===1?[...types][0]:data.damage_type;
  if(!type) return "awaiting_damage_type";
  const attack=data.breakdown.attack,encounter=db.getCurrentEncounter(data.session_id);
  if(encounter?.id!==attack.encounter_id||encounter.status!=="active") fail("Attack encounter changed; human correction required.");
  const target=db.listCombatants(encounter.id).find(item=>item.id===attack.target_id);
  assertNonPvpCombatant(db,guild,target);
  if(!target||target.status!=="active") fail("Target is no longer active; do not apply a second consequence.");
  const total=participants.reduce((sum,item)=>sum+item.damage.total,0),baseMarks=hpMarksForDamage(target,total),
    defense=nativeAdversaryDamageDefense(db,guild,row,data,target,{total,type,marks:baseMarks}),marks=defense?.marks??baseMarks;
  const hp=Math.max(0,target.hp_current-marks);
  const after=db.updateCombatant(target.id,{hp_current:hp,status:hp===0?"defeated":target.status});
  data.damage_result={total,type,marks,target_id:target.id,before:target.hp_current,after:after.hp_current,source_count:1,...(defense?{defense_ref:defense.ref}:{})};
  cityAudit(db,guild,"combined_attack_damage",row.record_key,target,after,"native_roll");return "resolved";
}
/** Same native action/reaction metacurrency semantics used by raw and request-bound rolls. */
export function applyRollOutcome(db,guild,session,characterIds,result,{reaction=false}={}){
  const identities=db.savedRollsForResult(guild,result.id),protectedRoll=identities.find(r=>["damage_pvp_attack","damage_pvp_damage","pc_death","blaze_final_action","narrative_pvp","reaction"].includes(r.roll_type));
  if(protectedRoll){
    if(identities.length!==1||Object.keys(result).some(k=>JSON.stringify(result[k])!==JSON.stringify(protectedRoll.payload[k])))
      fail("Unverified relabeling of native PvP dice cannot authorize resources.");
    result=protectedRoll.payload;
    if(protectedRoll.roll_type==="blaze_final_action"){
      validateBlazeSavedRoll(db,guild,protectedRoll.id);
      if(protectedRoll.session_id!==session||characterIds.length!==1||characterIds[0]!==protectedRoll.character_id)fail("Native final action cannot authorize another PC's resources.");
      return;
    }
    if(["pc_death","damage_pvp_damage"].includes(protectedRoll.roll_type)){
      const receipt=protectedRoll.roll_type==="pc_death"?validatePcDeathOutcome(db,guild,`${result.request}:outcome`)
        :validatePvpDamageRoll(db,guild,`${result.attack_receipt}:damage`).receipt;
      const id=protectedRoll.roll_type==="pc_death"?receipt.data.roll:receipt.data.roll_id;
      if(id!==protectedRoll.id||protectedRoll.session_id!==session||characterIds.length!==1||characterIds[0]!==protectedRoll.character_id)
        fail("Exact native death/damage identity required; no generic metacurrency.");
      return;
    }
    if(protectedRoll.roll_type==="reaction"){
      if(protectedRoll.session_id!==session||characterIds.length!==1||characterIds[0]!==protectedRoll.character_id)
        fail("Native reaction identity cannot authorize another character's resources.");
      return; // SRD reactions never grant metacurrency or Critical Stress, irrespective of caller labels.
    }
  }
  if(result.roll_type==="damage_pvp_attack"){
    const {receipt,offer}=validatePvpAttackRoll(db,guild,`${result.attack}:roll`);
    if(offer.session!==session||characterIds.length!==1||characterIds[0]!==offer.actor||JSON.stringify(receipt.data.result)!==JSON.stringify(result))
      fail("Unverified native damage-PvP result cannot grant generic resources.");
    return;
  }
  if(result.auto_critical||["pc_death","damage_pvp_damage","blaze_final_action"].includes(result.roll_type))fail("Native death/damage dice require saved identity; no generic resources.");
  if(result.proposal||result.terms_hash||result.choice||result.roll_type==="narrative_pvp"){
    // A caller cannot reclassify custom opposed dice as an ordinary action/Critical resource grant.
    let found=false;
    for(let offset=0;offset<10000&&!found;offset+=100){
      const page=db.listCityRecords(guild,{kind:"pvp_round_receipt",includeGM:true,limit:100,offset});
      found=page.some(r=>{
        const native=db.getSavedRoll(guild,r.data.roll_id);
        return r.status==="resolved"&&native?.roll_type==="narrative_pvp"&&native.session_id===session
          &&characterIds.length===1&&native.character_id===characterIds[0]
          &&JSON.stringify(native.payload)===JSON.stringify(result)&&JSON.stringify(r.data.result)===JSON.stringify(result);
      });
      if(page.length<100)break;
    }
    if(!found)fail("Unverified PvP-shaped result cannot enter generic resource resolution.");
    return;
  }
  if(reaction) return;
  if(["Hope","Critical"].includes(result.duality)){
    for(const id of characterIds) db.updateCharacterData(id,data=>{
      data.resources=data.resources||{};data.resources.hope=Math.min(hopeCap(data),Number(data.resources.hope||0)+1);
      if(result.duality==="Critical"){
        data.resources.stress=data.resources.stress||{current:0,max:6};
        data.resources.stress.current=Math.max(0,Number(data.resources.stress.current||0)-1);
      }
    });
  }else if(result.duality==="Fear") db.changeFear(guild,Math.max(1,characterIds.length));
  const encounter=db.getCurrentEncounter(session);
  if(encounter?.status==="active"&&characterIds.length) db.recordSpotlight(encounter.id,characterIds[0]); // One action, not one per participant.
}
/** Bound only to the actual interaction/message author. expected_revision is mandatory; receipts protect redelivery before stale checks. */
export function contributeRoll(db,guild,user,input,{rng=d,gmRng=d}={}){
  if(db.getCityCalendar(guild).flags.roll_collaboration!==true||db.getCityCalendar(guild).flags.roll_requests!==true)
    fail("Native roll collaboration is opt-in.");
  const pc=personalCharacter(db,guild,user),key=cityKey(input.request),row=db.getCityRecord(guild,"roll_request",key);
  if(!row) fail("Pending request not found.");
  const operation=cityKey(input.key),receiptKey=cityKey(`${operation}:${pc.id}`);
  const prior=db.getCityRecord(guild,"roll_operation",receiptKey);
  if(prior){if(prior.data.user!==user||prior.data.request!==key) throw new PermissionError("Receipt does not belong to this request owner.");return row;}
  if(rollRevision(row)!==input.expected_revision) fail("Request changed; read the current revision before authorizing a contribution.");
  return db.transaction(()=>{
    if(["resolved","superseded","cancelled"].includes(row.status)&&input.op!=="share")
      fail("Committed/closed rolls cannot be reopened; use human saved-result review.");
    live(db,guild,row);
    const affected=[...new Set([pc.id,row.subject_key,...(row.data.tag?.participants||[]).map(item=>item.character)])];
    const beforeResources=new Map(affected.map(id=>[id,structuredClone(db.getCharacter(id).data.resources)]));
    let data=structuredClone(row.data),status=row.status;
    const mine=pc.id===row.subject_key;
    if(input.op==="share"){
      if(!mine||input.scope!=="party"||input.confirm!==true||!data.result||!["resolved","awaiting_damage","awaiting_damage_type"].includes(row.status))
        fail("Only the acting owner may affirmatively share an actual saved result with the party.");
      const preview=input.preview?validateRollSharePreview(db,guild,row,input.preview):null;
      const disclosureKey=`${key}:party`;
      const source=indexWorldEvent(db,guild,{key:`party-roll-disclosure:${operation}`,source_id:`player:${user}`,
        kind:"roll_disclosure",title:"Owner-shared roll result",session_id:data.session_id,scene:data.scene,visibility:"party",
        details:{author:user,request:key,character_id:pc.id,status:row.status,preview:preview?.record_key||null,
          result:{total:data.result.total,duality:data.result.duality},authority:"owner_shared_redacted_native_result_only"}},user);
      db.saveCityRecord(guild,{kind:"roll_disclosure",key:disclosureKey,status:"shared",source_event:source.event_key,
        visibility:"party",data:{request:key,author:user,character_id:pc.id,source_event:source.event_key}});
      data.party_disclosure={source_event:source.event_key,shared_by:user,scope:"party",...(preview?{preview:preview.record_key,context:preview.data.text}:{})};
    }else if(input.op==="disclose"){
      if(!mine||!["pending","awaiting_partner"].includes(row.status)) fail("Only the acting owner can disclose their unsettled attempt.");
      const recipient=db.getCharacter(input.character_id);
      if(recipient?.guild_id!==guild||recipient.id===pc.id) fail("A distinct actual campaign PC recipient is required.");
      personalCharacter(db,guild,recipient.owner_user_id,recipient.id);
      if(!sceneAccess(db,guild,{observer_type:"character",observer_key:recipient.id,target_type:"character",target_key:pc.id,sense:"sound"}))
        fail("Actual established communication access is required for disclosure.");
      const disclosureKey=`${key}:${recipient.id}`;
      const context=sourceConfirmedRollAttempt(db,guild,row);
      const source=indexWorldEvent(db,guild,{key:`disclosure:${operation}`,source_id:`player:${user}`,kind:"roll_disclosure",title:"Owner-disclosed pending attempt",
        session_id:data.session_id,scene:data.scene,visibility:"character",subject_key:recipient.id,
        details:{author:user,request:key,attempt:context,authority:"owner_disclosed_accepted_attempt_only_not_private_sheet_or_consent"}},user);
      db.saveCityRecord(guild,{kind:"roll_disclosure",key:disclosureKey,source_event:source.event_key,visibility:"character",subject_key:recipient.id,data:{request:key,author:user}});
      data.disclosures=[...(data.disclosures||[]).filter(item=>item.character!==recipient.id),{character:recipient.id,user:recipient.owner_user_id,source_event:source.event_key,context}];
    }else if(input.op==="help"){
      if(mine||data.tag||data.kind!=="action"||row.status!=="pending") fail("Help requires another PC's unsettled action, not a reaction/group/Tag Team.");
      if((data.helpers||[]).some(helper=>helper.character===pc.id)) fail("This character has already helped; no second charge or die.");
      if(data.breakdown.disadvantage>data.breakdown.advantage) fail("Help with net disadvantage requires a saved GM ruling; no charge.");
      proof(db,guild,row,pc,input,"help");if(input.pay_hope!==true) fail("Helper's explicit authorization to spend 1 Hope required.");
      spend(db,pc,1);const die=rng(6);if(!Number.isInteger(die)||die<1||die>6) fail("Native helper die out of range.");
      const rollId=db.addRoll(guild,data.session_id,user,pc.id,"help",{die,request:key,proof:input.proof,hope_spent:1});
      data.helpers=[...(data.helpers||[]),{character:pc.id,name:pc.name,user,die,roll_id:rollId,proof:input.proof,description:input.description}];
    }else if(input.op==="alternate-trait"){
      if(!mine||data.tag||row.status!=="pending"||(data.experiences||[]).length)
        fail("Alternate trait choice requires the acting owner's unrolled request before paid options.");
      const event=requireCitySource(db,guild,input.proof);
      if(event.kind==='native_unarmed_attack'){
        if(Object.keys(input).some(field=>!['op','request','expected_revision','key','trait','proof'].includes(field)))
          fail('Native unarmed trait selection is a closed owner operation.');
        if(data.alternate_trait||data.input?.accepted_intent==null)fail('Only one native unarmed trait switch is allowed before the roll.');
        inspectNativeUnarmedAttack(db,guild,data.input,pc);
        const candidate=alternateNativeUnarmedTrait(db,guild,row,pc);
        if(event.event_key!==data.input.attack_source||input.trait!==candidate?.trait)
          fail('Native unarmed trait choice must select the other source-pinned Strength/Finesse trait.');
        const source=event.details,operationKey=receiptKey,nextInput={...data.input,trait:input.trait,
          modifier_keys:db.rollModifierSources(guild,pc.id,input.trait,data.kind||data.input.kind||'attack').map(item=>item.event_key),
          native_unarmed_trait_operation:operationKey};
        const base=rollTraitBreakdown(db,guild,nextInput,pc),{unresolved,...values}=base;
        if(unresolved.length)fail('Alternate native trait remains unresolved; no dice or costs.');
        const prior=data.breakdown;
        data.input=nextInput;data.breakdown={...values,difficulty:prior.difficulty,attack:prior.attack,unresolved};
        data.alternate_trait={version:1,issuer:'native:unarmed-traits',request:row.record_key,source:event.event_key,
          operation_key:operationKey,expected_revision:input.expected_revision,owner_user_id:user,character_id:pc.id,
          principal_revision:db.getCityRecord(guild,'typed_intent',data.input.accepted_intent).data.actor_principal_revision,
          from_trait:source.binding.target.trait,to_trait:candidate.trait,from_bonus:source.binding.target.trait_bonus,to_bonus:candidate.bonus};
      }else{
        const choice=event.details.roll_alternate_trait;
        if(event.kind!=="roll_adjudication"||event.source_kind!=="gm"||event.details.human_reviewed!==true
          ||event.session_id!==data.session_id||event.scene!==data.scene||event.visibility!=="character"||event.subject_key!==pc.id
          ||!choice||choice.request!==row.record_key||choice.from_trait!==data.breakdown.trait||choice.to_trait!==input.trait
          ||!choice.reason?.trim()||!db.getRulesRuling(guild,event.details.ruling_key||choice.ruling_key))
          fail("Alternate trait requires an exact current human-adjudicated source for this request.");
        const nextInput={...data.input,trait:input.trait},breakdown=rollBreakdown(db,guild,nextInput,pc);
        if(breakdown.unresolved.length)fail("Alternate trait remains unresolved; seek human review.");
        data.input=nextInput;data.breakdown=breakdown;data.alternate_trait={from:choice.from_trait,to:choice.to_trait,
          proof:event.event_key,ruling_key:event.details.ruling_key||choice.ruling_key,reason:choice.reason};
      }
    }else if(input.op==="experience"){
      if(!mine||data.tag||row.status!=="pending") fail("Only the acting owner may amend their unrolled single-PC request.");
      let p;
      try{const native=validateNativeExperienceEligibility(db,guild,row,pc,input.proof);
        p={experience:native.binding.experience.name,description:''};}
      catch(error){if(error.code!=="NATIVE_EXPERIENCE_ELIGIBILITY")throw error;p=proof(db,guild,row,pc,input,"experience");}
      if(p.experience!==input.experience||input.pay_hope!==true) fail("Exact relevant owned Experience and explicit 1 Hope authorization required.");
      const found=(pc.data.experiences||[]).find(item=>(typeof item==="string"?item:item.name)===input.experience);
      const bonus=typeof found==="string"?2:found?.modifier;
      if(!found||!Number.isSafeInteger(bonus)||bonus<0||bonus>20||(data.experiences||[]).some(item=>item.name===input.experience))
        fail("Experience is missing, unverified or already invoked.");
      spend(db,pc,1);data.experiences=[...(data.experiences||[]),{name:input.experience,bonus,proof:input.proof,hope_spent:1,operation_key:receiptKey}];
    }else if(input.op==="tag"){
      if(!mine||data.kind==="reaction"||data.tag||(data.helpers||[]).length||(data.experiences||[]).length||row.status!=="pending")
        fail("Tag Team initiation requires the actor's untouched unsettled action; paid prior amendments need human review.");
      const other=db.getCityRecord(guild,"roll_request",input.partner_request);
      if(other&&!mayKnowRoll(db,guild,other,pc.id)) fail("The other owner has not disclosed their private attempt.");
      if(!other||other.subject_key===pc.id||other.status!=="pending"||other.data.kind!==data.kind||other.data.tag
        ||other.data.helpers?.length||other.data.experiences?.length) fail("A separate compatible pending request from the other PC is required.");
      live(db,guild,other);proof(db,guild,row,pc,input,"tag");
      if(data.kind==="attack"&&data.breakdown.attack.target_id!==other.data.breakdown.attack.target_id)
        fail("Combined Tag Team attack damage requires one established common target; other cases need human adjudication.");
      if(input.pay_hope!==true||pc.data.resources.hope<3) fail("Initiator must explicitly authorize 3 Hope and have it available.");
      if(db.getCityRecord(guild,"tag_usage",`${data.session_id}:${pc.id}`)||db.playerInitiatedTagTeam(guild,data.session_id,user))
        fail("This PC/player already initiated a Tag Team this session; character switching does not reset usage.");
      data.tag={initiator:pc.id,partner_request:other.record_key,partner_user:other.data.owner_user_id,partner_revision:rollRevision(other),proof:input.proof,authorized_by:user,
        participants:[{character:pc.id,user,name:pc.name,request:key,roll_id:null}],selections:{}};status="awaiting_partner";
    }else if(input.op==="withdraw"){
      const other=data.tag&&db.getCityRecord(guild,"roll_request",data.tag.partner_request);
      if(row.status!=="awaiting_partner"||!data.tag||!mine&&other?.subject_key!==pc.id)
        fail("Only an actual proposed participant may withdraw an uncharged Tag Team proposal.");
      data.withdrawn_tag=data.tag;delete data.tag;status="pending";
    }else if(input.op==="participate"){
      if(!data.tag||row.status!=="awaiting_partner"||mine) fail("Only the proposed other PC can authorize their participation.");
      const other=db.getCityRecord(guild,"roll_request",data.tag.partner_request);
      if(other?.subject_key!==pc.id||rollRevision(other)!==data.tag.partner_revision||other.status!=="pending") fail("Other participant's request changed.");
      live(db,guild,other);proof(db,guild,row,pc,input,"participate");
      const initiator=personalCharacter(db,guild,data.owner_user_id,data.tag.initiator),usageKey=`${data.session_id}:${initiator.id}`;
      if(db.getCityRecord(guild,"tag_usage",usageKey)||db.playerInitiatedTagTeam(guild,data.session_id,data.owner_user_id))
        fail("Initiator has already used Tag Team this session.");
      spend(db,initiator,3);
      db.saveCityRecord(guild,{kind:"tag_usage",key:usageKey,visibility:"character",subject_key:initiator.id,source_event:row.source_event,
        data:{request:key,user:data.owner_user_id,hope_spent:3,proof:data.tag.proof}});
      data.tag.participants.push({character:pc.id,user,name:pc.name,request:other.record_key,roll_id:null,proof:input.proof,
        input:other.data.input,breakdown:other.data.breakdown,source_event:other.source_event,attempt:other.data.attempt});
      save(db,guild,other,{...other.data,superseded_by:key},"superseded",user);status="pending";
    }else if(input.op==="roll"){
      if(row.status!=="pending") fail("Request is awaiting another authorization or adjudication.");
      let target=data.tag?.participants.find(item=>item.user===user&&item.character===pc.id);
      if(!mine&&!target) throw new PermissionError("Only the actual rolling participant can roll.");
      if(target?.roll_id) fail("This participant has already rolled; saved dice cannot be replaced.");
      if(data.tag) for(const participant of data.tag.participants){
        personalCharacter(db,guild,participant.user,participant.character);
        if(participant.proof) requireCitySource(db,guild,participant.proof);
        if(participant.source_event) requireCitySource(db,guild,participant.source_event);
      }
      const b=target?.breakdown||data.breakdown;
      if(target?.input&&JSON.stringify(rollBreakdown(db,guild,target.input,pc))!==JSON.stringify(b)) fail("Participant's trait/modifier authority changed.");
      for(const item of data.experiences||[]){
        const current=pc.data.experiences.find(e=>(typeof e==="string"?e:e.name)===item.name);
        if((typeof current==="string"?2:current?.modifier)!==item.bonus) fail("Invoked Experience changed; human correction required.");
        const event=db.getWorldEvent(guild,item.proof);
        if(event?.kind==='native_experience_eligibility'&&event.source_id==='native:experience-eligibility')
          validateNativeExperienceEligibility(db,guild,row,pc,item.proof,item);
        else requireCitySource(db,guild,item.proof);
      }
      const blaze=blazeCriticalResult(db,guild,pc.id,data.input?.accepted_intent);
      if(blaze&&(data.tag||data.helpers?.length||data.experiences?.length))fail("Final action optional features need separate native reviewed mapping; no generic group or paid bonus.");
      const rolled=blaze||dualityRoll({modifier:b.subtotal,experience:(data.experiences||[]).reduce((n,item)=>n+item.bonus,0),
        advantage:b.advantage,disadvantage:b.disadvantage,helperDice:(data.helpers||[]).map(helper=>helper.die)},rng);
      const id=db.addRoll(guild,data.session_id,user,pc.id,blaze?"blaze_final_action":data.tag?"tag_team_action":data.kind,{...rolled,request:key,revision:input.expected_revision});
      if(data.tag){target.roll_id=id;target.result=rolled;status=data.tag.participants.every(item=>item.roll_id)?"awaiting_selection":"pending";}
      else{data.roll_id=id;data.result=rolled;status=resultStatus(data);if(!blaze)applyRollOutcome(db,guild,data.session_id,[pc.id],rolled,{reaction:data.kind==="reaction"});}
    }else if(input.op==="select"){
      const tag=data.tag;
      if(!tag||row.status!=="awaiting_selection"||!tag.participants.some(item=>item.user===user&&item.character===pc.id)
        ||!tag.participants.some(item=>item.roll_id===input.roll_id)) fail("Both actual participants must select an actual stored roll.");
      for(const participant of tag.participants) personalCharacter(db,guild,participant.user,participant.character);
      tag.selections[user]=input.roll_id;
      if(tag.participants.every(item=>tag.selections[item.user]===input.roll_id)){
        const selected=tag.participants.find(item=>item.roll_id===input.roll_id);
        const saved=db.getSavedRoll(guild,selected.roll_id);
        if(saved?.character_id!==selected.character||saved.session_id!==data.session_id||saved.payload.request!==key)
          fail("The selected result is not an actual saved participant roll.");
        data.result=saved.payload;data.roll_id=selected.roll_id;
        applyRollOutcome(db,guild,data.session_id,tag.participants.map(item=>item.character),saved.payload);
        status=resultStatus(data);
      }
    }else if(input.op==="damage"){
      if(row.status!=="awaiting_damage"||!data.result||data.kind!=="attack") fail("Only a successful committed attack can request damage.");
      const participant=data.tag?.participants.find(item=>item.user===user&&item.character===pc.id);
      if(!mine&&!participant) throw new PermissionError("Only the attacking owner can roll their damage.");
      if(participant?.damage||!data.tag&&data.damage) fail("Damage already rolled; saved dice cannot be replaced.");
      const b=participant?.breakdown||data.breakdown;
      if(participant?.input&&JSON.stringify(rollBreakdown(db,guild,participant.input,pc))!==JSON.stringify(b)) fail("Attack authority changed.");
      const rolled=parseDice(b.attack.damage,rng),match=/^(\d+)d(\d+)/i.exec(b.attack.damage);
      if(data.result.duality==="Critical") rolled.total+=Number(match[1])*Number(match[2]);
      rolled.roll_id=db.addRoll(guild,data.session_id,user,pc.id,"attack_damage",{...rolled,request:key,type:b.attack.damage_type});
      if(data.tag) participant.damage=rolled;else data.damage=rolled;
      status=finishDamage(db,guild,row,data);
    }else if(input.op==="damage-type"){
      if(row.status!=="awaiting_damage_type"||!data.tag||!data.tag.participants.some(item=>item.user===user&&item.character===pc.id))
        fail("Only participating players can choose the combined damage type.");
      const types=data.tag.participants.map(item=>(item.breakdown||data.breakdown).attack.damage_type);
      if(!types.includes(input.damage_type)) fail("Choose an actual damage type from these attacks in your own words.");
      data.tag.type_selections={...data.tag.type_selections,[user]:input.damage_type};
      if(data.tag.participants.every(item=>data.tag.type_selections[item.user]===input.damage_type)){
        data.damage_type=input.damage_type;status=finishDamage(db,guild,row,data);
      }
    }else throw new UserInputError("Unsupported mechanical contribution. Describe your intent freely; no narrative response menu is required.");
    const after=save(db,guild,row,data,status,user);
    if(after.status==="resolved"&&after.data.input?.accepted_intent)finalizeTypedRollAction(db,guild,after);
    if(after.status==="resolved"&&after.data.result?.auto_critical)completeBlazeAction(db,guild,pc.id,after.data.input.accepted_intent,{request:after.record_key,roll:after.data.roll_id});
    recordObservedAttack(db,guild,after);
    const resource_deltas=affected.map(id=>{
      const before=beforeResources.get(id),current=db.getCharacter(id).data.resources;
      return {character:id,hope:{before:before.hope,after:current.hope,delta:current.hope-before.hope},
        stress:{before:before.stress.current,after:current.stress.current,delta:current.stress.current-before.stress.current}};
    });
    db.saveCityRecord(guild,{kind:"roll_operation",key:receiptKey,visibility:"character",subject_key:pc.id,source_event:row.source_event,
      data:{user,request:key,op:input.op,authorization:input,resource_deltas,result:after}});
    reserveRollAmendment(db,guild,after);
    if(input.op==="share")reserveRollPartyDisclosure(db,guild,after);
    if(['roll','damage'].includes(input.op)&&after.status==='resolved')resumePendingGmActions(db,guild,{rng:gmRng});
    return after;
  });
}
