/** Source-pinned Memory Leech passive. Completed PC receipts precede this separately validated NPC consequence. */
import {sceneFictionHash as hash} from './scene-fiction-context.js';
import {compileNativeFeatures} from './native-feature-catalog.js';
import {nativeEncounterActor} from './native-encounter-relations.js';
import {currentScene,scenePresence} from './scene-continuity.js';
import {indexWorldEvent} from './city-calendar.js';
import {validateGroupReactionEffect} from './native-group-features.js';
import {validateFeatureReactionEffect} from './native-feature-effects.js';
import {inspectManyDeathsEffect} from './native-feature-hit.js';
import {validatedPcEffectProjection} from './pc-effects.js';
import {nativeActorControl} from './native-actor-control.js';
import {assertNonPvpCombatant} from './pvp-authority.js';

const FEATURE='adversary:memory-leech:taste-the-fear';
const LeechName='Memory Leech';
const EXPECTED_NATIVE_FAILURES=new Set(['GM_ARBITRATION','PC_EFFECT_AUTHORITY','TYPED_ROLL_PROOF','SCENE_ACTION_WINDOW','SCENE_FICTION','SCENE_CONTINUITY','NARRATIVE_PVP']);
const expectedNativeFailure=error=>EXPECTED_NATIVE_FAILURES.has(error?.code);
const descriptor=()=>compileNativeFeatures().find(row=>row.feature_key===FEATURE&&row.status==='supported'
  &&row.native_handler==='first_pc_stress_clear');
const keyFor=(actor,scene)=>`native-stress-passive:${hash([FEATURE,actor,scene])}`;

function positivePcStressMark(db,guild,row,{historical=false}={}){
  if(row.kind==='gm_group_feature_effect'){
    const effect=validateGroupReactionEffect(db,guild,row.record_key,{historical});
    return effect.data.stress>0?{character:effect.data.character,owner:effect.data.owner}:null;
  }
  if(row.kind==='gm_feature_effect_receipt'){
    const v=row.data;
    if(v.feature==='adversary:static-wraith:feedback'){
      const effect=validateFeatureReactionEffect(db,guild,row.record_key);
      return !effect.data.success&&effect.data.after.stress.current-effect.data.before.stress.current>0
        ?{character:effect.data.character,owner:effect.data.owner}:null;
    }
    if(v.feature==='adversary:wraith-pack:many-deaths'){
      const effect=inspectManyDeathsEffect(db,guild,row.record_key);
      return effect.data.after.stress.current-effect.data.before.stress.current>0
        ?{character:effect.data.character,owner:effect.data.owner}:null;
    }
    return null;
  }
  if(row.kind==='pc_effect_receipt'){
    const effect=validatedPcEffectProjection(db,guild,row.record_key);
    return effect.data.resource==='stress'&&effect.data.amount>0
      ?{character:effect.data.character,owner:db.getCityRecord(guild,'pc_effect_authority',effect.data.authority)?.data.owner}:null;
  }
  return null;
}

function receiptFor(db,guild,family,key){
  if(family==='group')return db.getCityRecord(guild,'gm_group_feature_effect',key);
  if(family==='feature')return db.getCityRecord(guild,'gm_feature_effect_receipt',key);
  if(family==='pc')return db.getCityRecord(guild,'pc_effect_receipt',key);
  return null;
}
function familyFor(row){
  if(row.kind==='gm_group_feature_effect')return 'group';
  if(row.kind==='gm_feature_effect_receipt')return row.data.feature==='adversary:static-wraith:feedback'
    ||row.data.feature==='adversary:wraith-pack:many-deaths'?'feature':null;
  return row.kind==='pc_effect_receipt'&&row.data.resource==='stress'?'pc':null;
}
function markEventKey(row){return row.kind==='pc_effect_receipt'?row.data.owner_choice:row.source_event;}
function passiveReview(db,guild,key,cause,reason){
  const prior=db.getCityRecord(guild,'native_stress_passive_review',`${key}:review`);
  if(prior)return prior;
  const source=typeof cause==='string'?cause:cause?.source_event||null;
  return db.saveCityRecord(guild,{kind:'native_stress_passive_review',key:`${key}:review`,status:'needs_rules_review',
    source_event:source,visibility:'gm',data:{version:1,feature:FEATURE,passive:key,cause_receipt:typeof cause==='string'?cause:cause?.record_key||null,
      reason_code:String(reason?.code||'GM_ARBITRATION'),reason:String(reason?.message||'native_stress_passive_unverified').slice(0,240),
      authority:'Optional Memory Leech Stress clear held; the separately committed PC Stress mark remains unchanged.'}});
}
export function inspectNativeStressPassive(db,guild,key){
  const receipt=db.getCityRecord(guild,'native_stress_passive_receipt',key),v=receipt?.data,event=receipt&&db.getWorldEvent(guild,receipt.source_event),
    mutation=v&&db.getMutation(guild,v.mutation),binding=v&&db.getCityRecord(guild,'encounter_binding',v.encounter),
    actor=v&&binding?.data.combatants?.find(row=>row.actor===v.actor&&row.id===v.combatant),combatant=v&&db.listCombatants(v.encounter).find(row=>row.id===v.combatant),
    feature=descriptor(),expected=v&&structuredClone(v.before),actualBefore=mutation&&JSON.parse(mutation.before_json),
    actualAfter=mutation&&JSON.parse(mutation.after_json);
  if(expected)expected.stress_current=v.after.stress_current;
  if(!v||receipt.status!=='resolved'||receipt.visibility!=='gm'||key!==keyFor(v.actor,v.scene)||v.feature!==FEATURE
    ||!feature||v.feature_hash!==hash(feature)||v.template_hash!==feature.template_hash||v.source_hash!==feature.source_hash
    ||receipt.source_event!==event?.event_key||event.status!=='active'||event.kind!=='native_stress_passive_effect'||event.source_id!=='native:stress-passive'
    ||event.visibility!=='gm'||event.session_id!==v.session||event.scene!==v.scene||event.details.payload_hash!==hash(v)
    ||v.before.actor!==v.actor||v.before.scene!==v.scene||v.after.actor!==v.actor||v.after.scene!==v.scene
    ||v.cause?.receipt_hash!==hash(db.getCityRecord(guild,v.cause.kind,v.cause.receipt))
    ||v.cause?.record_sequence!==db.cityRecordSequence(guild,v.cause.kind,v.cause.receipt)
    ||v.cause?.source_sequence!==db.worldEventSequence(guild,v.cause.source_event)
    ||!mutation||mutation.source_layer!=='native_feature'||mutation.actor_id!=='native:stress-passive'||mutation.entity_key!==v.actor
    ||mutation.mutation_type!=='memory_leech_taste_the_fear'||hash(JSON.parse(mutation.before_json))!==hash(v.mutation_before)
    ||hash(JSON.parse(mutation.after_json))!==hash(v.mutation_after)
    ||mutation.actor_type!=='ai_gm'||mutation.visibility!=='gm'||mutation.session_id!==v.session
    ||actualBefore.id!==v.combatant||actualAfter.id!==v.combatant||actualBefore.stress_current!==v.before.stress_current
    ||actualAfter.stress_current!==v.after.stress_current||hash(actualAfter)!==hash({...actualBefore,stress_current:v.after.stress_current})
    ||hash(v.after)!==hash(expected)||!Number.isSafeInteger(v.cleared)||v.cleared<0||v.cleared>1
    ||v.cleared!==v.before.stress_current-v.after.stress_current||v.cleared!==(v.before.stress_current>0?1:0)
    ||!actor||actor.actor!==v.actor
    ||combatant?.id!==v.combatant)throw Object.assign(new Error('native_stress_passive_receipt_ancestry'),{code:'GM_ARBITRATION'});
  return receipt;
}

function sceneLeeches(db,guild,scene){
  const encounter=db.getCurrentEncounter(scene.session_id),binding=encounter&&db.getCityRecord(guild,'encounter_binding',encounter.id);
  if(!encounter||encounter.status!=='active'||binding?.status!=='active')return [];
  const combatants=db.listCombatants(encounter.id),actors=(binding.data.combatants||[]).filter(row=>{
    const combatant=combatants.find(c=>c.id===row.id);
    return combatant?.base_name===LeechName;
  });
  if(actors.length>8)throw Object.assign(new Error('native_stress_passive_leech_roster_overflow'),{code:'GM_ARBITRATION'});
  return actors.map(row=>({actor:row.actor,combatant:row.id,encounter:encounter.id}));
}

function firstCause(db,guild,session,scene,current){
  const rows=db.nativeStressMarkHistory(guild,session,scene,{limit:201});
  if(rows.length>=201)throw Object.assign(new Error('native_stress_passive_history_overflow'),{code:'GM_ARBITRATION'});
  const currentSequence=db.cityRecordSequence(guild,current.kind,current.record_key);
  if(!currentSequence)throw Object.assign(new Error('native_stress_passive_current_receipt_missing'),{code:'GM_ARBITRATION'});
  let earliest=null;
  for(const row of rows){
    if(row.record_sequence>=currentSequence)continue;
    const family=familyFor(row);
    if(!family){
      // Unknown or changed completed effect receipt is ambiguous historical Stress ancestry.
      if(row.kind==='gm_feature_effect_receipt'&&['native_feature_effect','native_many_deaths_effect'].includes(row.source?.kind))
        throw Object.assign(new Error('native_stress_passive_unknown_feature_history'),{code:'GM_ARBITRATION'});
      continue;
    }
    const mark=positivePcStressMark(db,guild,row,{historical:true});
    if(mark){if(!earliest||row.record_sequence<earliest.record_sequence)earliest=row;continue;}
    const event=row.source;
    if(!event||event.status!=='active')throw Object.assign(new Error('native_stress_passive_ambiguous_revoked_history'),{code:'GM_ARBITRATION'});
  }
  return earliest;
}

function commitForLeech(db,guild,leech,scene,cause,leechReady){
  const key=keyFor(leech.actor,scene.key),prior=db.getCityRecord(guild,'native_stress_passive_receipt',key),review=db.getCityRecord(guild,'native_stress_passive_review',`${key}:review`);
  if(prior)return inspectNativeStressPassive(db,guild,key);
  if(review)return review;
  const causeRow=db.getCityRecord(guild,cause.kind,cause.record_key),causeEventKey=markEventKey(causeRow),causeEvent=db.getWorldEvent(guild,causeEventKey),
    causeSequence=db.worldEventSequence(guild,causeEventKey),
    presence=scenePresence(db,guild,'npc',leech.actor),presenceSequence=presence&&db.cityRecordSequence(guild,'scene_presence',presence.record_key),
    presenceEvent=presence&&db.worldEventSequence(guild,presence.source_event),binding=db.getCityRecord(guild,'encounter_binding',leech.encounter),
    bindingSequence=binding&&db.cityRecordSequence(guild,'encounter_binding',binding.record_key),bindingEventSequence=binding&&db.worldEventSequence(guild,binding.source_event),
    currentSequence=causeRow&&db.cityRecordSequence(guild,causeRow.kind,causeRow.record_key);
  try{
    const descriptorRow=descriptor();
    if(!causeRow||causeRow.status!=='resolved'||!causeEvent||!causeSequence||!descriptorRow||descriptorRow.actor_name!==LeechName
      ||descriptorRow.index!==1||descriptorRow.type!=='Passive'||descriptorRow.source_ref!=='content/GM_PRIVATE/ADVERSARIES/adversaries.json#memory-leech/features/1'
      ||descriptorRow.template_hash!==leech.templateHash||causeEvent.session_id!==scene.session_id||causeEvent.scene!==scene.key
      ||causeEvent.status!=='active'||rowsDifferentScene(causeEvent,scene)||!presence||presence.status!=='active'||presence.data.state!=='actually_present'
      ||presence.data.scene!==scene.key||presence.location_key!==leech.location||db.getWorldEvent(guild,presence.source_event)?.status!=='active'
      ||!currentSequence||!presenceSequence||presenceSequence>=currentSequence||!presenceEvent||presenceEvent>=causeSequence
      ||!binding||binding.status!=='active'||!bindingSequence||bindingSequence>=currentSequence||!bindingEventSequence||bindingEventSequence>=causeSequence
      ||!leechReady)throw Object.assign(new Error('native_stress_passive_current_source_or_leech_scope'),{code:'GM_ARBITRATION'});
    const priorCause=firstCause(db,guild,scene.session_id,scene.key,causeRow);
    const first=priorCause||{...causeRow,source_sequence:causeSequence,record_sequence:currentSequence},firstSequence=first.record_sequence;
    const mark=positivePcStressMark(db,guild,causeRow),pcPresence=mark&&scenePresence(db,guild,'character',mark.character),
      initiallyPresent=!priorCause&&pcPresence?.status==='active'&&pcPresence.data.state==='actually_present'
      &&pcPresence.data.scene===scene.key&&pcPresence.location_key===leech.location
      &&db.getCharacter(mark.character)?.data.location===leech.location
      &&db.getWorldEvent(guild,pcPresence.source_event)?.status==='active'
      &&db.cityRecordSequence(guild,'scene_presence',pcPresence.record_key)<currentSequence
      &&db.worldEventSequence(guild,pcPresence.source_event)>0
      &&db.worldEventSequence(guild,pcPresence.source_event)<causeSequence
      &&presenceSequence<firstSequence&&presenceEvent<first.source_sequence
      &&bindingSequence<firstSequence&&bindingEventSequence<first.source_sequence;
    if(priorCause||!initiallyPresent)return passiveReview(db,guild,key,causeRow,
      Object.assign(new Error(priorCause?'native_stress_passive_first_mark_already_consumed':'native_stress_passive_pc_presence_unverified'),{code:'GM_ARBITRATION'}));
    return db.transaction(()=>{
      const actor=nativeEncounterActor(db,guild,leech.actor),before=structuredClone(actor.combatant);
      if(!Number.isSafeInteger(before.stress_current)||before.stress_current<0||!Number.isSafeInteger(before.stress_max)
        ||before.stress_max!==actor.template.stress||before.stress_current>before.stress_max)
        throw Object.assign(new Error('native_stress_passive_invalid_npc_resources'),{code:'GM_ARBITRATION'});
      const cleared=initiallyPresent&&before.stress_current>0?1:0,
        after={...before,stress_current:before.stress_current-cleared},mutation=db.recordMutation(guild,{sessionId:scene.session_id,actorType:'ai_gm',actorId:'native:stress-passive',
          sourceLayer:'native_feature',mutationType:'memory_leech_taste_the_fear',entityKey:leech.actor,visibility:'gm',before,after,
          rationale:'Source-pinned first-PC-Stress passive only; no PC facts or agency transferred.',payload:{cause:first.record_key,actor:leech.actor,scene:scene.key}}),
      data={version:1,feature:FEATURE,feature_hash:hash(descriptorRow),template_hash:descriptorRow.template_hash,source_hash:descriptorRow.source_hash,
          actor:leech.actor,combatant:actor.combatant.id,encounter:actor.encounter,session:scene.session_id,scene:scene.key,
          cause:{kind:first.kind,receipt:first.record_key,receipt_hash:hash(db.getCityRecord(guild,first.kind,first.record_key)),source_event:markEventKey(first),source_sequence:first.source_sequence,
            record_sequence:first.record_sequence},mutation_before:before,mutation_after:after,
          before:{actor:leech.actor,scene:scene.key,stress_current:before.stress_current},
          after:{actor:leech.actor,scene:scene.key,stress_current:after.stress_current},cleared,mutation:mutation.id,
          decision:initiallyPresent?'first_verified_stress_mark_and_leech_present':'first_mark_preceded_leech_presence_or_binding;consumed_without_retroactive_effect'};
      if(cleared)db.updateCombatant(actor.combatant.id,{stress_current:after.stress_current});
      const event=indexWorldEvent(db,guild,{key:`${key}:source`,kind:'native_stress_passive_effect',source_id:'native:stress-passive',title:'Native Memory Leech passive',
        session_id:scene.session_id,scene:scene.key,visibility:'gm',details:{payload_hash:hash(data)}},'native:stress-passive');
      return db.saveCityRecord(guild,{kind:'native_stress_passive_receipt',key,status:'resolved',source_event:event.event_key,visibility:'gm',data});
    });
  }catch(error){if(!expectedNativeFailure(error))throw error;return passiveReview(db,guild,key,causeRow||cause,error);}
}

const rowsDifferentScene=(event,scene)=>event.session_id!==scene.session_id||event.scene!==scene.key;

/** Called after a completed native effect step. Expected passive proof failures hold only the NPC consequence. */
export function applyNativeStressPassive(db,guild,family,receiptKey){
  const row=receiptFor(db,guild,family,receiptKey);if(!row||row.status!=='resolved')return null;
  const scene=currentScene(db,guild);let leeches,feature;
  try{
    leeches=sceneLeeches(db,guild,scene);if(!leeches.length)return [];
    feature=descriptor();
  }catch(error){
    if(!expectedNativeFailure(error))throw error;
    return passiveReview(db,guild,`${FEATURE}:scope:${hash(scene.key)}`,row,error);
  }
  if(!feature)return []; // No new records for an unqualified feature or unrelated native Stress outcomes.
  if(leeches.every(leech=>db.getCityRecord(guild,'native_stress_passive_receipt',keyFor(leech.actor,scene.key)))){
    return leeches.map(leech=>{
      const key=keyFor(leech.actor,scene.key);
      try{return inspectNativeStressPassive(db,guild,key);}catch(error){
        if(!expectedNativeFailure(error))throw error;return passiveReview(db,guild,key,row,error);
      }
    });
  }
  let mark;
  try{mark=positivePcStressMark(db,guild,row);}catch(error){
    if(!expectedNativeFailure(error))throw error;
    const key=`${FEATURE}:unverified:${hash([receiptKey,scene.key])}`;
    return passiveReview(db,guild,key,row,error);
  }
  if(!mark)return null;
  const source=markEventKey(row),event=db.getWorldEvent(guild,source);
  if(!event||event.session_id!==scene.session_id||event.scene!==scene.key)return null;
  try{
    const encounter=db.getCurrentEncounter(scene.session_id),out=[];
    if(leeches.length>0&&feature?.template_hash){
      for(const leech of leeches){
        try{
          const actor=nativeEncounterActor(db,guild,leech.actor),presence=scenePresence(db,guild,'npc',leech.actor);
          if(nativeActorControl(db,guild,'npc',leech.actor).owner_control_type!=='ai_world')
            throw Object.assign(new Error('native_stress_passive_non_world_control'),{code:'GM_ARBITRATION'});
          assertNonPvpCombatant(db,guild,{...actor.combatant,actor_key:leech.actor});
          if(actor.combatant.id!==leech.combatant||actor.template.name!==LeechName||actor.template.features?.[1]===undefined
            ||hash(actor.template)!==feature.template_hash)throw Object.assign(new Error('native_stress_passive_exact_leech_template'),{code:'GM_ARBITRATION'});
          leech.templateHash=hash(actor.template);leech.location=actor.presence.location_key;
          leech.encounter=encounter.id;leech.presence=presence;
          out.push(commitForLeech(db,guild,leech,scene,row,true));
        }catch(error){
          if(!expectedNativeFailure(error))throw error;
          const key=keyFor(leech.actor,scene.key);out.push(passiveReview(db,guild,key,row,error));
        }
      }
    }
    return out;
  }catch(error){
    if(!expectedNativeFailure(error))throw error;
    const key=`${FEATURE}:unverified:${hash([receiptKey,scene.key])}`;
    return passiveReview(db,guild,key,row,error);
  }
}
