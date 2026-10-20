/** Bounded native PC-to-NPC unarmed eligibility. Never rolls, grants gear, or admits PC targets. */
import {inspectArbitrationOrigin} from './scene-intent-board.js';
import {consentAction,historicalActionSource} from './action-consent.js';
import {nativeEncounterActor} from './native-encounter-relations.js';
import {nativeActorControl} from './native-actor-control.js';
import {scenePresence,sceneAccess} from './scene-continuity.js';
import {sceneFictionHash as hash,narrativeSourceVisible} from './scene-fiction-context.js';
import {assertNonPvpCombatant,isPvpIntent} from './pvp-authority.js';
import {indexWorldEvent} from './city-calendar.js';
import {adjudicateAcceptedIntent} from './rules-arbitration.js';
import {arbitrationFailure as fail} from './gm-arbitration-contract.js';
import {validateNativeUnarmedTraitOperation} from './native-unarmed-traits.js';

const issuer='native:unarmed-attack';
const eventKey=b=>`native-unarmed:${hash(b)}`;
const stableCombatant=c=>{
  const {hp_current,stress_current,status,updated_at,...stable}=c;
  return stable;
};
function action(db,guild,key,historical){
  const a=db.getCityRecord(guild,'typed_intent',key);
  const proof=historical?historicalActionSource(db,guild,key,{resolved:a?.status==='resolved'}):consentAction(db,guild,key);
  if(a.data.type!=='interact'||a.data.operation!=='unarmed_attack'||a.data.framing!=='immediate'
    ||isPvpIntent(db,guild,a)||!a.data.target_key||a.data.coordination
    ||a.data.dependencies?.some(ref=>db.getCityRecord(guild,'typed_intent',ref)?.status!=='resolved'))throw fail('unarmed_exact_independent_declaration');
  return proof;
}
function declaration(a){
  const d=a.data;
  return {accepted_intent:a.record_key,source:a.source_event,source_hash:d.source_hash,span:d.source_span,start:d.start,end:d.end,
    owner:d.owner_user_id,principal:d.actor_principal_revision,character:d.actor,session:d.session_id,scene:d.scene,
    audience:a.visibility,subject:a.subject_key||null,target:d.target_key};
}
function liveTarget(db,guild,a,pc,trait,{library}={}){
  if(!['Strength','Finesse'].includes(trait)||!Number.isSafeInteger(pc.data.traits?.[trait])
    ||!Number.isSafeInteger(pc.data.proficiency)||pc.data.proficiency<1||pc.data.proficiency>50)throw fail('unarmed_native_trait_or_proficiency');
  const npc=a.data.target_key;
  if(db.getCharacter(npc.replace(/^character:/,''))||nativeActorControl(db,guild,'npc',npc).owner_control_type!=='ai_world')
    throw fail('unarmed_unproxied_npc_target_only');
  const target=nativeEncounterActor(db,guild,npc,{library});assertNonPvpCombatant(db,guild,target.combatant);
  const presence=scenePresence(db,guild,'character',pc.id),scope={mode:a.visibility==='character'?'private':'party',actorUserId:a.data.owner_user_id,actorCharacterId:pc.id};
  if(presence?.status!=='active'||presence.data.state!=='actually_present'||presence.data.scene!==a.data.scene
    ||db.getWorldEvent(guild,presence.source_event)?.status!=='active'||pc.data.location!==presence.location_key
    ||target.presence.location_key!==presence.location_key||target.presence.data.zone!==presence.data.zone
    ||!sceneAccess(db,guild,{observer_type:'character',observer_key:pc.id,target_type:'npc',target_key:npc})
    ||!narrativeSourceVisible(db,guild,target.presence.source_event,scope)
    ||!narrativeSourceVisible(db,guild,presence.source_event,scope)
    ||target.combatant.difficulty!==target.template.difficulty)throw fail('unarmed_current_melee_target_or_audience');
  return {npc,encounter:target.encounter,combatant:target.combatant.id,template:hash(target.template),binding:target.binding,
    target_state:hash(stableCombatant(target.combatant)),target_presence:hash(target.presence),target_entity:hash(target.entity),
    owner_presence:hash(presence),difficulty:target.combatant.difficulty,trait,trait_bonus:pc.data.traits[trait],
    proficiency:pc.data.proficiency,weapon:'unarmed',damage:`${pc.data.proficiency}d4`,damage_type:'physical'};
}
/** Only a real server-held arbitration origin can mint eligibility; model JSON is not that origin. */
export function prepareNativeUnarmedAttack(db,guild,origin,entry,p,{library}={}){
  const o=inspectArbitrationOrigin(db,guild,origin),proof=action(db,guild,entry.intent_ref,false),a=proof.row,pc=db.getCharacter(a.data.actor);
  if(entry.actor?.type!=='character'||entry.actor.key!==pc.id||entry.source_ref!==a.source_event||entry.source_hash!==a.data.source_hash
    ||entry.target_refs.length!==1||entry.target_refs[0]!==a.data.target_key||p.feature_ref!=='unarmed_attack'
    ||p.disposition!=='request_pc_action_roll'||p.stakes_kind!=='native_attack'||!p.rule_basis_refs.includes('srd:attack-rolls')
    ||p.experience_ref||p.advantage||p.disadvantage||!p.stakes.trim()||!p.difficulty_reason.trim()
    ||a.data.session_id!==o.binding.session||a.data.scene!==o.binding.scene||!o.eligible.some(n=>n.key===a.data.target_key)
    ||!narrativeSourceVisible(db,guild,a.source_event,o.scope))throw fail('unarmed_native_origin_and_proposal');
  const target=liveTarget(db,guild,a,pc,p.trait,{library});
  if(p.difficulty!==null&&p.difficulty!==target.difficulty)throw fail('unarmed_actual_npc_difficulty');
  const binding={version:1,issuer,declaration:declaration(a),origin:o.binding,target},key=eventKey(binding);
  return db.transaction(()=>{
    if(!db.getWorldEvent(guild,key)){
      const receipt=db.recordMutation(guild,{sessionId:a.data.session_id,actorType:'ai_gm',actorId:'native:unified-gm',
        sourceLayer:'native_pc_attack',mutationType:'prepare_unarmed_attack',entityKey:a.record_key,visibility:'gm',
        rationale:'Native eligibility only; owner controls dice and optional resources.',after:binding});
      indexWorldEvent(db,guild,{key,kind:'native_unarmed_attack',source_kind:'mutation',source_id:receipt.id,
        title:'Native unarmed attack eligibility',session_id:a.data.session_id,scene:a.data.scene,visibility:'gm',
        details:{version:1,issuer,binding,payload_hash:hash(binding)}},'native:unified-gm');
    }
    const scope={mode:a.visibility==='character'?'private':'party',actorUserId:a.data.owner_user_id,actorCharacterId:pc.id};
    const adjudication=adjudicateAcceptedIntent(db,guild,{acceptedIntent:a.record_key,mode:'roll_required',kind:'attack',trait:p.trait,
      modifierKeys:db.rollModifierSources(guild,pc.id,p.trait,'attack',a.record_key,{sessionId:a.data.session_id,sceneKey:a.data.scene}).map(s=>s.event_key),
      difficulty:target.difficulty,attackSource:key,rawRefs:['srd:attack-rolls'],
      risk:'Your declared unarmed attack may miss.',stakes:'Only this native NPC target may receive native physical unarmed damage after your actual dice.',
      explanation:'Native unarmed attack: Proficiency d4 physical, Strength or Finesse, actual local NPC Difficulty.'},
      'native:unified-gm',{scope,privateResult:true});
    const request=db.getCityRecord(guild,'roll_request',adjudication.roll_request_ref);
    if(request?.data.kind!=='attack'||request.data.input.attack_source!==key||request.data.input.private_result!==true
      ||request.data.input.accepted_intent!==a.record_key)throw fail('unarmed_existing_request_requires_reconciliation');
    return adjudication;
  });
}
/** Current use checks live target/control/range. Saved readback preserves lawful HP and resource transitions. */
export function inspectNativeUnarmedAttack(db,guild,input,pc,{historical=false}={}){
  const event=db.getWorldEvent(guild,input.attack_source),b=event?.details.binding,
    mutation=event&&db.getMutation(guild,event.source_id),proof=action(db,guild,input.accepted_intent,historical),a=proof.row;
  if(!b||b.version!==1||b.issuer!==issuer||event.status!=='active'||event.kind!=='native_unarmed_attack'
    ||event.source_kind!=='mutation'||event.visibility!=='gm'||event.event_key!==eventKey(b)
    ||event.details.version!==1||event.details.issuer!==issuer||event.details.payload_hash!==hash(b)
    ||mutation?.actor_type!=='ai_gm'||mutation.actor_id!=='native:unified-gm'||mutation.source_layer!=='native_pc_attack'
    ||mutation.mutation_type!=='prepare_unarmed_attack'||mutation.entity_key!==a.record_key||mutation.visibility!=='gm'
    ||mutation.session_id!==a.data.session_id||hash(JSON.parse(mutation.after_json))!==hash(b)
    ||hash(b.declaration)!==hash(declaration(a))||event.session_id!==a.data.session_id||event.scene!==a.data.scene
    ||input.character_id!==a.data.actor||pc.id!==a.data.actor||input.source_event!==a.source_event||input.kind!=='attack'
    ||!['Strength','Finesse'].includes(input.trait)||input.private_result!==true||b.target.npc!==a.data.target_key
    ||b.origin.session!==a.data.session_id||b.origin.scene!==a.data.scene)throw fail('unarmed_native_receipt_ancestry');
  const originSource=db.getWorldEvent(guild,b.origin.source);
  if(originSource?.status!=='active'||hash(originSource.details)!==b.origin.source_hash)throw fail('unarmed_origin_source_revoked');
  const traitChoice=input.trait===b.target.trait?null:validateNativeUnarmedTraitOperation(db,guild,input,pc,event,b);
  if(!historical){
    if(db.getCityCalendar(guild).flags.gm_discretion!==true
      ||db.getCityRecord(guild,'gm_authority','campaign')?.data.gm_authority_mode==='manual'
      ||hash({...liveTarget(db,guild,a,pc,input.trait),trait:b.target.trait,trait_bonus:b.target.trait_bonus})!==hash(b.target)
      ||traitChoice&&pc.data.traits?.[input.trait]!==traitChoice.choice.to_bonus)throw fail('unarmed_current_target_or_rules_changed');
  }
  return {event,attack:{weapon:'unarmed',damage:b.target.damage,damage_type:'physical',target_id:b.target.combatant,
    encounter_id:b.target.encounter,difficulty:b.target.difficulty}};
}
