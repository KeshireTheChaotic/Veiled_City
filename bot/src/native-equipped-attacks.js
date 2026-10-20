/** Native preparation of an EXISTING exact human-approved equipped attack. No equipment acquisition or rule invention. */
import {inspectArbitrationOrigin} from './scene-intent-board.js';
import {consentAction,historicalActionSource} from './action-consent.js';
import {nativeEncounterActor} from './native-encounter-relations.js';
import {nativeActorControl} from './native-actor-control.js';
import {scenePresence,sceneAccess} from './scene-continuity.js';
import {sceneFictionHash as hash,narrativeSourceVisible} from './scene-fiction-context.js';
import {indexWorldEvent} from './city-calendar.js';
import {adjudicateAcceptedIntent} from './rules-arbitration.js';
import {isPvpIntent} from './pvp-authority.js';
import {arbitrationFailure as fail} from './gm-arbitration-contract.js';
const issuer='native:equipped-attack';
const declaration=a=>({key:a.record_key,source:a.source_event,source_hash:a.data.source_hash,actor:a.data.actor,
  owner:a.data.owner_user_id,principal:a.data.actor_principal_revision,operation:a.data.operation,target:a.data.target_key,
  scene:a.data.scene,session:a.data.session_id,audience:a.visibility,subject:a.subject_key||null});
function facts(db,guild,a,pc,event,{library}={}){
  const attack=event?.details?.roll_attack,target=nativeEncounterActor(db,guild,a.data.target_key,{library}),
    rule=attack&&db.getRulesRuling(guild,attack.ruling_key),items=(pc.data.inventory||[]).filter(i=>typeof i==='object'&&i.name===attack?.weapon&&i.equipped===true),
    presence=scenePresence(db,guild,'character',pc.id),npcPresence=target.presence,
    scope={mode:a.visibility==='character'?'private':'party',actorUserId:a.data.owner_user_id,actorCharacterId:pc.id};
  if(a.data.operation!=='weapon_attack'||a.data.type!=='interact'||a.data.framing!=='immediate'||isPvpIntent(db,guild,a)
    ||a.data.coordination||nativeActorControl(db,guild,'npc',a.data.target_key).owner_control_type!=='ai_world'
    ||event?.status!=='active'||event.kind!=='roll_adjudication'||event.source_kind!=='gm'||event.details.human_reviewed!==true
    ||event.visibility!=='character'||event.subject_key!==pc.id||event.scene!==a.data.scene||event.session_id!==a.data.session_id
    ||!rule||!attack||attack.active!==true||items.length!==1||attack.target_id!==target.combatant.id
    ||!Number.isSafeInteger(pc.data.traits?.[attack.trait])||!/^\d{1,2}d\d{1,4}(?:[+-]\d+)?$/i.test(attack.damage)
    ||!['physical','magic'].includes(attack.damage_type)||presence?.status!=='active'||presence.data.state!=='actually_present'
    ||presence.location_key!==pc.data.location||npcPresence.location_key!==presence.location_key||npcPresence.data.zone!==presence.data.zone
    ||!sceneAccess(db,guild,{observer_type:'character',observer_key:pc.id,target_type:'npc',target_key:a.data.target_key})
    ||!narrativeSourceVisible(db,guild,presence.source_event,scope)||!narrativeSourceVisible(db,guild,npcPresence.source_event,scope))
    throw fail('equipped_exact_existing_approval_owned_item_local_target_required');
  return {weapon:items[0],approval:event.event_key,approval_hash:hash(event),rule_hash:hash(rule),presence:hash(presence),npc_presence:hash(npcPresence),
    template:hash(target.template),binding:target.binding,trait:attack.trait,trait_bonus:pc.data.traits[attack.trait],
    attack:{weapon:attack.weapon,damage:attack.damage,damage_type:attack.damage_type,target_id:target.combatant.id,
      encounter_id:target.encounter,difficulty:target.combatant.difficulty}};
}
export function prepareNativeEquippedAttack(db,guild,origin,entry,p,{library}={}){
  const o=inspectArbitrationOrigin(db,guild,origin),a=consentAction(db,guild,entry.intent_ref).row,pc=db.getCharacter(a.data.actor);
  if(entry.actor.type!=='character'||entry.actor.key!==pc.id||p.disposition!=='request_pc_action_roll'||p.stakes_kind!=='native_attack'
    ||p.feature_ref!=='equipped_attack'||p.experience_ref||p.advantage||p.disadvantage||!p.rule_basis_refs.includes('srd:attack-rolls')
    ||a.data.scene!==o.binding.scene||a.data.session_id!==o.binding.session||!narrativeSourceVisible(db,guild,a.source_event,o.scope))throw fail('equipped_sealed_origin_and_declaration');
  const candidates=db.scopedRollAttackSources(guild,pc.id,a.data.session_id,a.data.scene,p.trait),valid=[];
  if(candidates.length>100)throw fail('equipped_approval_ambiguity_requires_review');
  for(const event of candidates){try{valid.push(facts(db,guild,a,pc,event,{library}));}catch(error){if(error.code!=='GM_ARBITRATION')throw error;}}
  if(valid.length!==1)throw fail('equipped_unique_existing_approval_required_no_inferred_acquisition');
  const detail=valid[0];if(p.difficulty!==null&&p.difficulty!==detail.attack.difficulty)throw fail('equipped_native_target_difficulty');
  const binding={version:1,issuer,declaration:declaration(a),origin:o.binding,detail},key=`native-equipped:${hash(binding)}`;
  return db.transaction(()=>{
    if(!db.getWorldEvent(guild,key)){
      const m=db.recordMutation(guild,{sessionId:a.data.session_id,actorType:'ai_gm',actorId:issuer,sourceLayer:'native_pc_attack',
        mutationType:'prepare_equipped_attack',entityKey:a.record_key,visibility:'gm',after:binding});
      indexWorldEvent(db,guild,{key,kind:'native_equipped_attack',title:'Native sourced equipped attack preparation',source_kind:'mutation',source_id:m.id,
        session_id:a.data.session_id,scene:a.data.scene,visibility:'gm',details:{binding,payload_hash:hash(binding)}},issuer);
    }
    const scope={mode:a.visibility==='character'?'private':'party',actorUserId:a.data.owner_user_id,actorCharacterId:pc.id},
      adjudication=adjudicateAcceptedIntent(db,guild,{acceptedIntent:a.record_key,mode:'roll_required',kind:'attack',trait:detail.trait,
        difficulty:detail.attack.difficulty,attackSource:detail.approval,rawRefs:['srd:attack-rolls'],
        modifierKeys:db.rollModifierSources(guild,pc.id,detail.trait,'attack',a.record_key,{sessionId:a.data.session_id,sceneKey:a.data.scene}).map(s=>s.event_key),risk:'Your declared attack may miss.',
        stakes:'Only the exactly approved local NPC target may receive this native attack damage after owner dice.',
        explanation:'Native equipped attack from an existing exact human-approved weapon/rule/target mapping.'},issuer,{scope,privateResult:true,nativeEquippedRef:key});
    const q=db.getCityRecord(guild,'roll_request',adjudication.roll_request_ref);
    if(!q||q.data.input.attack_source!==detail.approval||q.data.kind!=='attack')throw fail('equipped_exact_native_request');
    if(q.data.input.native_equipped_ref!==key)throw fail('equipped_cannot_adopt_other_or_legacy_preparation');
    return adjudication;
  });
}
export function inspectNativeEquippedAttack(db,guild,input,pc,{historical=false,library}={}){
  const e=db.getWorldEvent(guild,input.native_equipped_ref),b=e?.details?.binding,m=e&&db.getMutation(guild,e.source_id),
    a=db.getCityRecord(guild,'typed_intent',input.accepted_intent);
  if(!a||!b)throw fail('equipped_native_preparation_missing');
  (historical?historicalActionSource:consentAction)(db,guild,a.record_key,{resolved:a.status==='resolved'});
  const approval=db.getWorldEvent(guild,b.detail.approval),origin=db.getWorldEvent(guild,b.origin.source);
  if(e.status!=='active'||e.kind!=='native_equipped_attack'||e.source_kind!=='mutation'||e.visibility!=='gm'
    ||b.version!==1||b.issuer!==issuer||e.event_key!==`native-equipped:${hash(b)}`||e.details.payload_hash!==hash(b)
    ||m?.actor_type!=='ai_gm'||m.actor_id!==issuer||m.source_layer!=='native_pc_attack'||m.mutation_type!=='prepare_equipped_attack'
    ||m.entity_key!==a.record_key||hash(JSON.parse(m.after_json))!==hash(b)||hash(declaration(a))!==hash(b.declaration)
    ||pc.id!==a.data.actor||input.character_id!==pc.id||input.source_event!==a.source_event||input.attack_source!==b.detail.approval
    ||input.trait!==b.detail.trait||input.kind!=='attack'||input.private_result!==true||approval?.status!=='active'
    ||hash(approval)!==b.detail.approval_hash||hash(db.getRulesRuling(guild,approval.details.roll_attack.ruling_key))!==b.detail.rule_hash
    ||origin?.status!=='active'||hash(origin.details)!==b.origin.source_hash)throw fail('equipped_saved_source_rule_or_owner_changed');
  if(!historical&&(db.getCityCalendar(guild).flags.gm_discretion!==true
    ||db.getCityRecord(guild,'gm_authority','campaign')?.data.gm_authority_mode==='manual'
    ||hash(facts(db,guild,a,pc,approval,{library}))!==hash(b.detail)))throw fail('equipped_current_ownership_placement_or_template_changed');
  return {event:e,attack:b.detail.attack};
}
