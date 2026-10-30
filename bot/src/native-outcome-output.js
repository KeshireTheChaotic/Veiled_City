/** Source/receipt-only narration projections. No effect adapter, RNG, consent or payment is invoked here. */
import {createHash} from 'node:crypto';
import {publicationSessionScene} from './frameworks/publication/public.js';
const {currentScene,scenePresence}=publicationSessionScene;
import {publicationSessionPrincipal} from './frameworks/publication/public.js';
function conversationPrincipal(...args){return publicationSessionPrincipal.conversationPrincipal(...args);}
import {publicationNarrativeAuthoring} from './frameworks/publication/public.js';
const {hasPcReference}=publicationNarrativeAuthoring;
import {validatedPcEffectProjection} from './pc-effects.js';
import {visibleIncomingInjury} from './pc-incoming.js';
import {renderNativeNotice} from './native-notice.js';
import {nativeOutcomeKinds as kinds} from './gm-fiction-schema.js';
import {ordinaryEffectProjection} from './ordinary-effect-proof.js';
import {publicationWorldReceipts} from './frameworks/publication/public.js';
function worldSimulationReceiptForAudience(...args){return publicationWorldReceipts.worldSimulationReceiptForAudience(...args);}
import {validatePvpAttackRoll} from './pvp-attacks.js';
import {validatePvpDamageApplication,validatePvpDamageRoll} from './pvp-damage.js';
import {nativeEnvironmentOutput} from './native-environment-output.js';
export {nativeOutcomeSchema} from './gm-fiction-schema.js';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
function fail(){throw Object.assign(new Error('Native output needs the exact committed outcome, current owner and audience.'),{code:'NARRATIVE_PVP'});}
function visible(source,scope){return ['party','public'].includes(source.visibility)||scope.mode==='private'
  &&(source.visibility==='character'&&source.subject_key===scope.actorCharacterId||source.visibility==='player'&&source.subject_key===scope.actorUserId);}
export function nativeOutcomeProjection(db,guild,input,scope){
  if(!input||Object.keys(input).sort().join(',')!=='kind,receipt_kind,ref,version'||input.version!==4
    ||input.kind!=='native_outcome'||!kinds.includes(input.receipt_kind)||typeof input.ref!=='string'||!input.ref||input.ref.length>200)fail();
  if(nativeOutcomeConsumer.handlesOutcome(input.receipt_kind))return nativeOutcomeConsumer.projectMechanicalOutcome(db,guild,input,scope);
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
  if(input.receipt_kind==='scene_entry'){
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

import {nativeOutcomeConsumer} from './frameworks/publication/public.js';
nativeOutcomeConsumer.provideSources(()=>({currentScene:(...args)=>currentScene(...args),validatedPcEffectProjection:(...args)=>validatedPcEffectProjection(...args),visibleIncomingInjury:(...args)=>visibleIncomingInjury(...args),renderNativeNotice:(...args)=>renderNativeNotice(...args),ordinaryEffectProjection:(...args)=>ordinaryEffectProjection(...args),validatePvpAttackRoll:(...args)=>validatePvpAttackRoll(...args),validatePvpDamageApplication:(...args)=>validatePvpDamageApplication(...args),validatePvpDamageRoll:(...args)=>validatePvpDamageRoll(...args),nativeEnvironmentOutput:(...args)=>nativeEnvironmentOutput(...args)}));
