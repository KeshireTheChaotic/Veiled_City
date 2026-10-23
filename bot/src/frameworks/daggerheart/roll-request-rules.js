/** Native roll request policy. Source context, dependent mechanics and once-only notice reservations are explicit capabilities; no rendering or transport lives here. */
import {createHash} from 'node:crypto';
import {StateConflictError,UserInputError} from '../../kernel/errors.js';
import {diceSpec} from './dice.js';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const rollRevision=hash;
export function createRollRequestRules({sources,mechanics,traits:TRAITS,reserveRollAmendment}){
  const {personalCharacter,currentScene,requireCitySource,cityAudit,cityKey,overlapsOwnerActionTerminal}=sources||{};
  const {isPvpIntent,assertNonPvpCombatant,assertPcCanAct,blazeActionAuthorization,nativeDefenseAura,persistNativeDefenseAura,nativeFormationDefense,persistNativeFormationDefense,nativeVeilExposureDefense,inspectNativeUnarmedAttack,inspectOrdinaryRollModifier,inspectNativeEquippedAttack}=mechanics||{};
  if(!Array.isArray(TRAITS)||[personalCharacter,currentScene,requireCitySource,cityAudit,cityKey,overlapsOwnerActionTerminal,isPvpIntent,assertNonPvpCombatant,assertPcCanAct,blazeActionAuthorization,nativeDefenseAura,persistNativeDefenseAura,nativeFormationDefense,persistNativeFormationDefense,nativeVeilExposureDefense,inspectNativeUnarmedAttack,inspectOrdinaryRollModifier,inspectNativeEquippedAttack,reserveRollAmendment].some(fn=>typeof fn!=='function'))throw new TypeError('Complete native roll request capabilities required.');
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
function rollTraitBreakdown(db,guild,input,pc){
  if(!TRAITS.includes(input.trait)||!["action","reaction","attack"].includes(input.kind)
    ||typeof input.adjudication!=="string"||!input.adjudication.trim()||input.adjudication.length>600)
    throw new UserInputError("Adjudicate the relevant trait and roll kind, with a factual reason.");
  const key=Object.keys(pc.data.traits||{}).find(name=>name.toLowerCase()===input.trait.toLowerCase());
  const trait=key===undefined?null:pc.data.traits[key];
  if(trait!==null&&!Number.isSafeInteger(trait)) throw new StateConflictError("Recorded trait is not a verified integer.");
  if(!Array.isArray(input.modifier_keys)||input.modifier_keys.length>20||new Set(input.modifier_keys).size!==input.modifier_keys.length)
    throw new UserInputError("A unique bounded modifier-source list is required.");
  const declaration=input.source_event?db.getWorldEvent(guild,input.source_event):null;
  const applicable=db.rollModifierSources(guild,pc.id,input.trait,input.kind,input.accepted_intent,
    {sessionId:declaration?.session_id||null,sceneKey:declaration?.scene||null});
  if(applicable.length>20||applicable.some(row=>!input.modifier_keys.includes(row.event_key)))
    throw new StateConflictError("Every active scoped modifier source must be accounted for; seek human review rather than omit one.");
  const modifiers=input.modifier_keys.map(id=>{
    const event=requireCitySource(db,guild,id),mod=event.details.roll_modifier;
    if(event.details.issuer==='native:ordinary-roll-modifier'){
      const native=inspectOrdinaryRollModifier(db,guild,input,pc,event);
      return {source:id,name:native.name,kind:native.kind,amount:native.amount,ruling_key:native.ruling_key};
    }
    if(event.kind!=="roll_adjudication"||event.source_kind!=="gm"||!event.details.human_reviewed
      ||declaration&&(event.session_id!==declaration.session_id||event.scene!==declaration.scene)
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
function rollBreakdown(db,guild,input,pc){
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
    const native=event.kind==='native_unarmed_attack'?inspectNativeUnarmedAttack(db,guild,input,pc)
      :input.native_equipped_ref?inspectNativeEquippedAttack(db,guild,input,pc):null;
    if(!native&&(event.kind!=="roll_adjudication"||event.details.human_reviewed!==true||event.source_kind!=="gm"
      ||event.subject_key!==pc.id||event.visibility!=="character"||event.session_id!==session?.id||event.scene!==currentScene(db,guild).key
      ||!a||a.trait!==input.trait||a.active!==true||!weapon||typeof weapon==="object"&&weapon.equipped!==true
      ||!db.getRulesRuling(guild,a.ruling_key)||!/^\d{1,2}d\d{1,4}(?:[+-]\d+)?$/i.test(a.damage)
      ||!["physical","magic"].includes(a.damage_type)||encounter?.status!=="active"||!target||target.status!=="active"||!Number.isSafeInteger(target.difficulty)))
      throw new StateConflictError("Active owned attack, damage formula, target and rules require exact current human adjudication.");
    diceSpec(native?native.attack.damage:a.damage);
    attack=native?.attack||{weapon:a.weapon,damage:a.damage,damage_type:a.damage_type,target_id:target.id,encounter_id:encounter.id,difficulty:target.difficulty};
    const actualTarget=native?db.listCombatants(attack.encounter_id).find(t=>t.id===attack.target_id):target;
    const aura=nativeDefenseAura(db,guild,actualTarget,input);
    if(aura)attack={...attack,difficulty:actualTarget.difficulty+1,base_difficulty:actualTarget.difficulty,defense_aura:aura.proof};
    const formation=nativeFormationDefense(db,guild,actualTarget,input);
    if(formation){
      if(aura)throw new StateConflictError('Combined defensive passive/aura odds require an authored native mapping.');
      attack={...attack,difficulty:actualTarget.difficulty+formation.detail.bonus,base_difficulty:actualTarget.difficulty,defense_passive:formation.proof};
    }
    const veil=nativeVeilExposureDefense(db,guild,actualTarget,input);
    if(veil){
      if(aura||formation)throw new StateConflictError('Combined defensive passive/aura odds require an authored native mapping.');
      attack={...attack,difficulty:actualTarget.difficulty+veil.detail.bonus,base_difficulty:actualTarget.difficulty,defense_passive:veil.proof};
    }
  }
  const unresolved=[...base.unresolved,
    ...(input.kind==="attack"&&!attack?["Active weapon/feature attack provenance requires native adjudication before resolution."]:[])];
  const {unresolved:baseUnresolved,...values}=base; // Preserve persisted breakdown key order/revision hashes.
  return {...values,difficulty,attack,unresolved};
}
function prepareRollRequest(db,guild,input,actor,context={}){
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
function pendingRollRequests(db,guild,user){
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
function ownedRollRequest(db,guild,user,key){
  const pc=personalCharacter(db,guild,user),row=db.getCityRecord(guild,"roll_request",key);
  if(!row||!(row.subject_key===pc.id&&row.data.owner_user_id===user
    ||row.data.tag?.participants.some(item=>item.user===user&&item.character===pc.id)
    ||row.data.helpers?.some(item=>item.user===user&&item.character===pc.id)))
    throw new StateConflictError("No saved request is available to this current owned character.");
  return row;
}

return Object.freeze({rollTraitBreakdown,rollBreakdown,prepareRollRequest,pendingRollRequests,ownedRollRequest});
}
