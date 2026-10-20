/** Source/receipt-only narration projections. No effect adapter, RNG, consent or payment is invoked here. */
import {createHash} from 'node:crypto';
import {currentScene,scenePresence} from './scene-continuity.js';
import {conversationPrincipal} from './conversation-principal.js';
import {hasPcReference} from './fresh-npc-authoring.js';
import {validatedPcEffectProjection} from './pc-effects.js';
import {visibleIncomingInjury} from './pc-incoming.js';
import {renderNativeNotice,noticeHash} from './native-notice.js';
import {nativeOutcomeKinds as kinds} from './gm-fiction-schema.js';
import {ordinaryEffectProjection} from './ordinary-effect-proof.js';
import {worldSimulationReceiptForAudience} from './world-simulation-receipts.js';
import {validatePvpAttackRoll} from './pvp-attacks.js';
import {validatePvpDamageApplication,validatePvpDamageRoll} from './pvp-damage.js';
export {nativeOutcomeSchema} from './gm-fiction-schema.js';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
function fail(){throw Object.assign(new Error('Native output needs the exact committed outcome, current owner and audience.'),{code:'NARRATIVE_PVP'});}
function visible(source,scope){return ['party','public'].includes(source.visibility)||scope.mode==='private'
  &&(source.visibility==='character'&&source.subject_key===scope.actorCharacterId||source.visibility==='player'&&source.subject_key===scope.actorUserId);}
export function nativeOutcomeProjection(db,guild,input,scope){
  if(!input||Object.keys(input).sort().join(',')!=='kind,receipt_kind,ref,version'||input.version!==4
    ||input.kind!=='native_outcome'||!kinds.includes(input.receipt_kind)||typeof input.ref!=='string'||!input.ref||input.ref.length>200)fail();
  if(input.receipt_kind==='ordinary_effect_receipt'){
    try{return ordinaryEffectProjection(db,guild,input.ref,scope);}catch(error){
      if(!['ORDINARY_EFFECT','SCENE_ACTION_WINDOW','TYPED_ROLL_PROOF'].includes(error.code))throw error;
      fail(); // Invalid read-side proposals are quarantined by the common composer, not treated as native outcomes.
    }
  }
  if(input.receipt_kind==='world_simulation_observation'){
    const row=db.getCityRecord(guild,'world_simulation_observation',input.ref),proof=row&&worldSimulationReceiptForAudience(db,guild,row.data.action_id,scope,{sourceRef:input.ref});
    if(proof?.status!=='verified_native_observation'||proof.outcome!=='observed_arrival')fail();
    const source=db.getWorldEvent(guild,proof.observation_ref),npc=db.getNpcProfile(guild,proof.actor.key),
      location=db.getSimulationEntity(guild,'location',proof.location_key),name=npc?.display_name,place=location?.state.name;
    if(!name||!place||[name,place].some(s=>typeof s!=='string'||s.length>160||/[\r\n\x00-\x1f`*_<>\[\]\\]/u.test(s)||hasPcReference(db,guild,s)))fail();
    return {text:`Observed NPC arrival: ${JSON.stringify(name)} is present at ${JSON.stringify(place)}.`,source,revision:hash([row,proof,source,name,place])};
  }
  const row=db.getCityRecord(guild,input.receipt_kind,input.ref),d=row?.data,source=row&&db.getWorldEvent(guild,row.source_event),scene=currentScene(db,guild);
  if(!row||!source||source.status!=='active')fail();
  let text;
  if(['pvp_attack_roll_receipt','pvp_damage_roll_receipt'].includes(input.receipt_kind)){
    const proof=input.receipt_kind==='pvp_attack_roll_receipt'?validatePvpAttackRoll(db,guild,input.ref):validatePvpDamageRoll(db,guild,input.ref);
    if(scope.mode!=='private'||scope.actorCharacterId!==proof.offer.actor||scope.actorUserId!==proof.offer.snapshot.actor_owner
      ||proof.offer.session!==scene.session_id||proof.offer.scene!==scene.key)fail();
    const result=proof.receipt.data.result;
    text=input.receipt_kind==='pvp_attack_roll_receipt'
      ?`Your saved native attack roll: ${result.total}, ${result.duality}; ${result.hit?'hit':'miss'}. No target response or HP change is implied.`
      :`Your saved native damage roll: ${result.total} ${result.type}. Target defenses and owner choices still govern any HP effect.`;
  }else if(input.receipt_kind==='scene_entry'){
    const pc=db.getCharacter(d.character),arrival=db.getWorldEvent(guild,d.arrival),
      presence=scenePresence(db,guild,'character',d.character),location=arrival&&db.getSimulationEntity(guild,'location',arrival.location_key);
    const name=String(location?.state.name||location?.entity_key||'');
    if(row.status!=='approved'||d.session_id!==scene.session_id||d.scene!==scene.key||pc?.guild_id!==guild
      ||pc.owner_user_id!==d.user||scope.actorUserId!==d.user||scope.actorCharacterId!==pc.id
      ||conversationPrincipal(db,guild,d.user,pc.id).revision!==d.principal_revision
      ||!db.ownerAuthoredSource(guild,source.event_key,d.user)||source.kind!=='player_declaration'
      ||source.details.character_id!==pc.id||arrival?.status!=='active'||arrival.kind!=='arrival'
      ||arrival.details.declaration!==source.event_key||arrival.details.entity_key!==pc.id
      ||arrival.details.owner_user_id!==d.user||arrival.session_id!==scene.session_id||arrival.scene!==scene.key
      ||presence?.source_event!==arrival.event_key||presence.location_key!==arrival.location_key
      ||pc.data.location!==arrival.location_key||!visible(arrival,scope)||d.private_scene&&scope.mode!=='private'
      ||!name||name.length>160||/[\r\n\x00-\x1f`*_<>\[\]\\]/u.test(name)||hasPcReference(db,guild,name))fail();
    text=`You have entered the ${name}.`;
    return {text,source,revision:hash([row,source,arrival,presence,location,pc.owner_user_id])};
  }else if(input.receipt_kind==='pc_effect_receipt'){
    if(scope.mode!=='private'||scope.actorCharacterId!==row.subject_key
      ||db.getCharacter(row.subject_key)?.owner_user_id!==scope.actorUserId||d.session!==scene.session_id||d.scene!==scene.key)fail();
    if(d.cause_type==='verified_pvp_damage'){
      validatePvpDamageApplication(db,guild,row.record_key);
      text=`Your native resource receipt: HP marked +${d.hp_marks}; Armor spent ${d.armor?1:0}. No reaction, dialogue or death choice is implied.`;
    }else if(d.cause_type==='verified_npc_attack'){
      visibleIncomingInjury(db,guild,row.record_key,row.subject_key);
      text=`Native resource receipt: hp marked +${d.hp_marks}; before ${d.before.hp.current}, after ${d.after.hp.current}.`;
    }else{
      validatedPcEffectProjection(db,guild,row.record_key);
      text=`Native resource receipt: ${d.resource} changed ${d.amount>=0?'+':''}${d.amount}; before ${d.before}, after ${d.after}.`;
    }
  }else if(input.receipt_kind==='roll_request'){
    if(row.status!=='resolved'||d.session_id!==scene.session_id||d.scene!==scene.key)fail();
    const privateMode=scope.mode==='private';
    text=renderNativeNotice(db,guild,{kind:privateMode?'roll_private':'roll_party',ref:row.record_key,
      revision:noticeHash([row.status,row.data]),session:scene.session_id,scene:scene.key,
      ...(privateMode?{user:scope.actorUserId,character:scope.actorCharacterId}:{})});
  }else if(input.receipt_kind==='evidence_receipt'){
    const artifact=db.getHandout(d.handout_id),e=artifact?.metadata?.evidence,latest=e?.history?.at(-1);
    if(artifact?.guild_id!==guild||artifact.status!=='active'||!latest||`${artifact.id}:${latest.key}`!==row.record_key
      ||latest.source_event!==source.event_key||latest.op!==d.operation||e.pending||!visible(source,scope)
      ||!['party','public'].includes(artifact.visibility)&&!(scope.mode==='private'&&artifact.subject_character_id===scope.actorCharacterId))fail();
    text=`Native custody record: ${JSON.stringify({artifact:artifact.id,copy:latest.copy,holder:latest.holder,state:latest.state})}.`;
  }else{
    const offer=db.getCityRecord(guild,'commitment_offer',row.record_key),p=offer?.data.proposal;
    if(row.status!=='active'||offer?.status!=='accepted'||offer.data.commitment!==row.record_key||!p
      ||scope.mode!=='private'||!d.participants.includes(`character:${scope.actorCharacterId}`)
      ||db.getCharacter(scope.actorCharacterId)?.owner_user_id!==scope.actorUserId||offer.source_event!==source.event_key
      ||Object.entries(p).some(([key,value])=>hash(d[key])!==hash(value)))fail();
    const replies=db.listCityRecords(guild,{kind:'consent_reply',includeGM:true,limit:100});
    for(const actor of d.participants.filter(id=>id.startsWith('character:'))){
      const pc=db.getCharacter(actor.slice(10));
      if(!pc||!d.accepted_by.includes(pc.owner_user_id)||!replies.some(reply=>reply.subject_key===pc.id
        &&db.hasOwnerConsent(guild,{proposal:`commitment_offer:${offer.record_key}`,revision:reply.data.revision,
          terms:JSON.stringify(p),character:pc.id,user:pc.owner_user_id})))fail();
    }
    text=`Native commitment record — exact agreed terms (not PC dialogue or a new action): ${JSON.stringify(d.terms).replaceAll('`','\\`')}.`;
  }
  return {text,source,revision:hash([row,source])};
}
