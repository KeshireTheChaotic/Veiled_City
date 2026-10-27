/** Existing NPC identity/world producer and explicit native Fear composition. No world authoring moved into Daggerheart. */
import { createHash } from "node:crypto";
import {nativeWorldEvents} from './frameworks/daggerheart/public.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import {nativeScenes} from './frameworks/daggerheart/public.js';
function currentScene(...args){return nativeScenes.currentScene(...args);}function scenePresence(...args){return nativeScenes.scenePresence(...args);}function recordScenePresence(...args){return nativeScenes.recordScenePresence(...args);}
import { pvpOwnerContext } from "./narrative-pvp.js";
import { validatePvpRoundReceipt } from "./pvp-rounds.js";
import { fearGateKey, pendingPvpFear } from "./pvp-fear-gate.js";
import { settlePvpWindow } from "./pvp-terminal.js";
import { configureSimulationEntity, submitNpcAction } from "./simulation.js";
import {nativeWorldProxy,nativeNpcAvailability} from './frameworks/daggerheart/public.js';
function activeCityProxy(...args){return nativeWorldProxy.activeCityProxy(...args);}function assertNpcAvailability(...args){return nativeNpcAvailability.assertNpcAvailability(...args);}
import { validateWorldEncounterActivation, EncounterLibrary } from "./encounter.js";
import { validatePvpAttackRoll } from "./pvp-attacks.js";
import {settlePvpDamageAction} from "./pvp-damage.js";
import {assertBrawlFearOrder,orderedBrawlFear} from "./pvp-brawl.js";
import {incomingAttackEvidence,rollAutonomousFearIncomingAttack} from "./pc-incoming.js";
import {drainActionContinuations} from "./action-continuation.js";
import {validateMinorIdentity} from "./city-depth.js";
import {preflightNpcIdentity} from "./location-language.js";
import {worldAuthority} from "./autonomous-world.js";
import {consentAction} from "./action-consent.js";
import {assertPvpSafety} from './pvp-campaign-policy.js';
export const fearRevision=v=>createHash("sha256").update(JSON.stringify(v)??"undefined").digest("hex");
const hash=fearRevision;
let fearNpcContent=null;
export function setPvpFearContentIndex(content){fearNpcContent=content||null;}
function fail(message){throw Object.assign(new Error(message),{code:"NARRATIVE_PVP",expected:true});}
const FEAR_NPC_FIELDS=["key","name","occupation","public_identity","portrayal","threat_label","immediate_consequence"];
function defaultFearNpcProposal({scene,location,objective}){
  const name=String(location.name||""),description=String(location.description||"");
  const venue=`${name} ${description}`.toLowerCase();
  // A bounded, non-mechanical proposal is available only when the established venue supports it.
  // It does not grant the proposed NPC knowledge, powers, combat statistics or PC authority.
  const venueProfile=/diner|restaurant|cafe|coffee shop|bar|tavern/.test(venue)
    ?{name:"Counter Attendant",role:"Service attendant",subject:"service area"}
    :/terminal|station|platform/.test(venue)?{name:"Station Attendant",role:"Transit attendant",subject:"platform access"}:null;
  if(!venueProfile)return null;
  return {key:`fear-attendant-${hash([scene.key,location.key]).slice(0,12)}`,name:venueProfile.name,occupation:venueProfile.role,
    public_identity:`A staff member at ${name}`,portrayal:"A present, ordinary staff member trying to keep the public area clear.",
    threat_label:`${venueProfile.subject} interrupted`,
    immediate_consequence:"interrupt_service"};
}
function validateFearNpcProposal(proposal){
  if(!proposal||Array.isArray(proposal)||Object.keys(proposal).length!==FEAR_NPC_FIELDS.length
    ||Object.keys(proposal).some(k=>!FEAR_NPC_FIELDS.includes(k))||FEAR_NPC_FIELDS.some(k=>!Object.hasOwn(proposal,k)))
    fail("Bounded NPC/threat proposal fields required; model fields are never native authority.");
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(proposal.key)||proposal.key.length>100
    ||["name","occupation","public_identity","portrayal","threat_label"].some(k=>typeof proposal[k]!=="string"||!proposal[k].trim()||proposal[k].length>180)
    ||proposal.immediate_consequence!=="interrupt_service")fail("Unsupported or ungrounded NPC threat proposal; retain Fear for review.");
  return proposal;
}
function createFearNpcThreat(db,guild,t,p,terms,scene,visibility,subjectKey,location,proposeThreat=defaultFearNpcProposal,{validateContext,inventory}){
  const authority=worldAuthority(db,guild);
  if(authority.gm_authority_mode!=="autonomous"||authority.auto_create_npcs!==true)
    fail("Autonomous GM NPC world-authoring authority is disabled; retain Fear for review.");
  if(db.getCityCalendar(guild).flags.scene_continuity!==true)
    fail("Native scene-presence authority is disabled; cannot establish a new NPC threat safely.");
  const locationRow=db.getSimulationEntity(guild,"location",location);
  if(!locationRow||locationRow.state.removed||locationRow.state.locked||locationRow.state.sealed)
    fail("Current accessible scene location is not eligible for a new NPC threat.");
  for(const participant of p.data.participants){
    const pc=db.getCharacter(participant.character),presence=scenePresence(db,guild,"character",participant.character);
    if(pc?.guild_id!==guild||pc.data.location!==location)fail("All negotiated PCs must already be at the exact threat location; no movement is inferred.");
    if(db.getCityCalendar(guild).flags.scene_continuity===true&&(!presence||presence.data.state!=="actually_present"
      ||presence.data.scene!==scene.key||presence.location_key!==location))
      fail("Current established PC scene presence is required before a new threat can enter.");
  }
  const locationReference=db.getReference(guild,"location",location),locationVisibility=locationRow.state.visibility||locationReference?.visibility||"party",
    locationSubject=locationRow.state.subject_character_id||locationReference?.subject_character_id;
  if(!( ["public","party"].includes(locationVisibility)
    ||visibility==="character"&&locationVisibility==="character"&&locationSubject===subjectKey))
    fail("Scene location is outside the authorized Fear audience; retain obligation for review.");
  const prior=inventory(db,guild,"fear_threat_establishment").find(r=>r.status==="established"&&r.data.scene===scene.key
    &&r.data.session===scene.session_id&&r.data.location_key===location);
  let establishment=prior;
  if(!establishment){
    let proposal;
    const locationEvidence={key:location,name:String(locationRow.state.name||""),description:String(locationRow.state.description||""),
      visibility:locationRow.state.visibility||"party"};
    const proposalInput={scene:{key:scene.key,session_id:scene.session_id,label:scene.label||""},location:locationEvidence,
      objective:terms.objective,stakes:terms.stakes.map(s=>({character:s.character,best:s.best,worst:s.worst})),
      permitted_consequence:"interrupt_service",max_threat_progress:5};
    try{
      const proposed=proposeThreat(proposalInput);
      if(proposed&&typeof proposed.then==="function")fail("Threat proposal must be one bounded synchronous result; async retries are not permitted.");
      proposal=validateFearNpcProposal(proposed);
    }
    catch(error){if(error.code==="NARRATIVE_PVP")throw error;fail(`NPC identity proposal unavailable: ${error.message}`);}
    if(!proposal)fail("No bounded context-grounded NPC proposal is available for this scene.");
    const scope={mode:visibility==="character"?"private":"party",actorCharacterId:subjectKey};
    const collision=preflightNpcIdentity(db,guild,{key:proposal.key,name:proposal.name,scope});
    if(collision.status!=="clear")fail(collision.status==="protected_collision"?"Proposed NPC identity collides with protected campaign identity; retain Fear for review."
      :"Proposed NPC identity is ambiguous or already established; retain Fear for review.");
    if(activeCityProxy(db,guild,proposal.key))fail("Proposed NPC identity belongs to a human-controlled proxy; retain Fear for review.");
    try{validateMinorIdentity(db,fearNpcContent||{read:()=>""},guild,proposal.key,{name:proposal.name,occupation:proposal.occupation,
      public_identity:proposal.public_identity,portrayal:proposal.portrayal});}
    catch(error){fail(`Proposed NPC identity failed native identity validation: ${error.message}`);}
    // A native creation receipt cannot certify arbitrary prose's cross-character meaning.
    // This adapter supports one source-grounded venue projection, not freeform model narration.
    const nativeProjection=defaultFearNpcProposal(proposalInput);
    if(!nativeProjection||FEAR_NPC_FIELDS.some(field=>proposal[field]!==nativeProjection[field]))
      fail("NPC proposal needs a supported source-grounded native projection; freeform material requires GM-private scope review.");
    const establishmentKey=`fear-threat:${hash([guild,t.record_key,scene.key,proposal.key])}`;
    establishment=db.getCityRecord(guild,"fear_threat_establishment",establishmentKey);
    if(!establishment){
      establishment=db.transaction(()=>{
        if(db.getNpcProfile(guild,proposal.key)||db.getSimulationEntity(guild,"npc",proposal.key))fail("NPC key was concurrently claimed; retain Fear for review.");
        db.upsertNpcProfile(guild,{npcKey:proposal.key,displayName:proposal.name,role:proposal.occupation,
          publicIdentity:proposal.public_identity,portrayal:proposal.portrayal,activityTier:"background",
          knowledgeBoundaries:["No knowledge inferred from this creation; only later witnessed or delivered evidence."],capabilities:[],source:"pvp_fear_native_world_authoring"});
        db.setSimulationEntity(guild,"npc",proposal.key,{name:proposal.name,activity_tier:"background",location_key:location,
          ai_gm_origin:true,resources:{influence:0,materials:0,information:0,manpower:0,leverage:0,wounds:0,stress:0,favors:0},
          visibility,subject_character_id:subjectKey});
        const creationEvent=indexWorldEvent(db,guild,{key:`fear-threat-world-create:${hash([t.record_key,proposal.key])}`,
          kind:"ai_gm_world_create",title:"Autonomous Fear NPC threat established",source_id:"native:autonomous_pvp_fear",
          session_id:scene.session_id,scene:scene.key,location_key:location,visibility,subject_key:subjectKey,
          details:{authority:"native_gm_world_authoring_v1",trigger:t.record_key,proposal_hash:hash(proposal),entity_type:"npc",
            entity_key:proposal.key,location_key:location,terms_hash:p.data.terms_hash,objective:terms.objective,
            stakes:terms.stakes.map(s=>({character:s.character,best:s.best,worst:s.worst})),knowledge_grant:[],combat_template:null}} ,"autonomous_pvp_fear");
        const world=db.saveCityRecord(guild,{kind:"autonomous_entity",key:`npc:${proposal.key}`,source_event:creationEvent.event_key,
          location_key:location,visibility,subject_key:subjectKey,data:{kind:"npc",key:proposal.key,name:proposal.name,
            summary:proposal.public_identity,epistemic_label:"introduced_now",session_id:scene.session_id,scene:scene.key,
            fear_threat:true,trigger:t.record_key}});
        if(visibility!=="gm")db.upsertReference(guild,{kind:"npc",key:proposal.key,name:proposal.name,summary:proposal.public_identity,
          visibility,subjectCharacterId:subjectKey});
        const presence=recordScenePresence(db,guild,{source_event:creationEvent.event_key,entity_type:"npc",entity_key:proposal.key,
          location_key:location,zone:"scene",visibility,subject_key:subjectKey},"autonomous_pvp_fear");
        const after={npc_key:proposal.key,profile:db.getNpcProfile(guild,proposal.key),entity:db.getSimulationEntity(guild,"npc",proposal.key),
          autonomous_entity:world.record_key,presence:presence.record_key,creation_event:creationEvent.event_key,proposal_hash:hash(proposal)};
        const mutation=db.recordMutation(guild,{sessionId:scene.session_id,actorType:"system",actorId:"autonomous_pvp_fear",
          sourceLayer:"pvp_fear",mutationType:"fear_threat_establishment",entityKey:proposal.key,visibility,before:null,after,
          rationale:"Native current-scene world authoring only; no combat profile, resources, learned knowledge or PC effect.",
          payload:{trigger:t.record_key,scene:scene.key,terms_hash:p.data.terms_hash}});
        const stateKey=`pvp-fear-threat-state:${hash([scene.key,proposal.key])}`,
          state=db.saveCityRecord(guild,{kind:"pvp_fear_threat_state",key:stateKey,status:"active",source_event:creationEvent.event_key,
            location_key:location,visibility,subject_key:subjectKey,data:{version:1,npc_key:proposal.key,scene:scene.key,
              session:scene.session_id,location_key:location,establishment_ref:establishmentKey,progress:0,
              threat_label:proposal.threat_label,immediate_consequence:proposal.immediate_consequence,revision:0}}),
          stateMutation=db.recordMutation(guild,{sessionId:scene.session_id,actorType:"system",actorId:"autonomous_pvp_fear",
            sourceLayer:"pvp_fear",mutationType:"fear_threat_state_create",entityKey:state.record_key,visibility,before:null,after:state,
            rationale:"Initialize a source-bound threat progression; the separate Fear move must advance it before resolution.",
            payload:{trigger:t.record_key,establishment:establishmentKey}}),
          data={version:1,trigger:t.record_key,proposal:proposal,proposal_hash:hash(proposal),npc_key:proposal.key,
            scene:scene.key,session:scene.session_id,location_key:location,terms_hash:p.data.terms_hash,
            creation_event:creationEvent.event_key,creation_mutation_ref:mutation.id,state_creation_mutation_ref:stateMutation.id,
            world_record:world.record_key,presence_ref:presence.record_key,state_ref:state.record_key,
            visibility,subject_key:subjectKey,authority:"native_gm_world_authoring_v1"},
          receipt=db.saveCityRecord(guild,{kind:"fear_threat_establishment",key:establishmentKey,status:"established",
            source_event:creationEvent.event_key,location_key:location,visibility,subject_key:subjectKey,
            data:{...data,receipt_digest:hash(data)}});
        return receipt;
      });
    }
  }
  const establishedData=establishment?.data;
  if(!establishment||establishment.status!=="established"||establishedData.scene!==scene.key||establishedData.session!==scene.session_id
    ||establishedData.location_key!==location||establishedData.visibility!==visibility||establishedData.subject_key!==subjectKey
    ||establishedData.terms_hash!==p.data.terms_hash)
    fail("Existing native Fear threat is outside current scene/audience scope.");
  const npcKey=establishedData.npc_key,stateKey=establishedData.state_ref,state=db.getCityRecord(guild,"pvp_fear_threat_state",stateKey);
  if(!state||state.status!=="active"||state.data.scene!==scene.key||state.visibility!==visibility||state.subject_key!==subjectKey)
    fail("Threat progression state is stale or audience-incompatible.");
  const details={version:1,authority:"autonomous_v1",trigger:t.record_key,move_kind:"npc_introduce_or_escalate",
    target_key:state.record_key,threat_state_ref:state.record_key,threat_establishment_ref:establishment.record_key,
    creation_event_ref:establishedData.creation_event,npc_key:npcKey,location_key:location,visibility,subject_key:subjectKey,
    scene:scene.key,session:scene.session_id,objective:terms.objective,
    terms_hash:p.data.terms_hash,
    stakes:terms.stakes.map(s=>({character:s.character,best:s.best,worst:s.worst})),severity:1,
    threat_label:establishedData.data?.threat_label||state.data.threat_label,immediate_consequence:state.data.immediate_consequence};
  const source=indexWorldEvent(db,guild,{key:`pvp-fear-context-source:${hash([guild,t.record_key,"npc-threat"])}`,
    kind:"pvp_fear_context_established",title:"Native autonomous NPC threat context",source_id:"native:autonomous_pvp_fear",
    scene:scene.key,session_id:scene.session_id,location_key:location,visibility,subject_key:subjectKey,details},"autonomous_pvp_fear");
  if(source.status!=="active"||hash(source.details)!==hash(details))fail("Autonomous NPC threat context replay changed its exact source.");
  const contextData={...details,source_hash:hash(source.details)},key=`pvp-fear-context:${hash(contextData)}`,
    context=db.saveCityRecord(guild,{kind:"pvp_fear_context",key,status:"active",source_event:source.event_key,
      visibility,subject_key:subjectKey,location_key:location,data:contextData});
  validateContext(db,guild,context.record_key);return context;
}

import {createPvpFearMoveRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createPvpFearMoveRules({capabilities:{indexWorldEvent:(...args)=>indexWorldEvent(...args),currentScene:(...args)=>currentScene(...args),scenePresence:(...args)=>scenePresence(...args),pvpOwnerContext:(...args)=>pvpOwnerContext(...args),validatePvpRoundReceipt:(...args)=>validatePvpRoundReceipt(...args),fearGateKey:(...args)=>fearGateKey(...args),pendingPvpFear:(...args)=>pendingPvpFear(...args),settlePvpWindow:(...args)=>settlePvpWindow(...args),configureSimulationEntity:(...args)=>configureSimulationEntity(...args),submitNpcAction:(...args)=>submitNpcAction(...args),assertNpcAvailability:(...args)=>assertNpcAvailability(...args),validateWorldEncounterActivation:(...args)=>validateWorldEncounterActivation(...args),validatePvpAttackRoll:(...args)=>validatePvpAttackRoll(...args),settlePvpDamageAction:(...args)=>settlePvpDamageAction(...args),assertBrawlFearOrder:(...args)=>assertBrawlFearOrder(...args),orderedBrawlFear:(...args)=>orderedBrawlFear(...args),incomingAttackEvidence:(...args)=>incomingAttackEvidence(...args),rollAutonomousFearIncomingAttack:(...args)=>rollAutonomousFearIncomingAttack(...args),drainActionContinuations:(...args)=>drainActionContinuations(...args),consentAction:(...args)=>consentAction(...args),assertPvpSafety:(...args)=>assertPvpSafety(...args),hash:(...args)=>hash(...args),fail:(...args)=>fail(...args),defaultFearNpcProposal:(...args)=>defaultFearNpcProposal(...args),createFearNpcThreat:(...args)=>createFearNpcThreat(...args),getFearNpcContent:()=>fearNpcContent,createEncounterLibrary:root=>new EncounterLibrary(root)}});}
export function establishFearContext(...args){return rules().establishFearContext(...args);}
export function assertFearIncomingExecution(...args){return rules().assertFearIncomingExecution(...args);}
export function selectFearMove(...args){return rules().selectFearMove(...args);}
export function applyFearMove(...args){return rules().applyFearMove(...args);}
export function validateFearEffect(...args){return rules().validateFearEffect(...args);}
export function renderFearEffect(...args){return rules().renderFearEffect(...args);}
export function resolveAutonomousPvpFear(...args){return rules().resolveAutonomousPvpFear(...args);}
export function resumeAutonomousPvpFear(...args){return rules().resumeAutonomousPvpFear(...args);}
export function fearInbox(...args){return rules().fearInbox(...args);}
export function reconcileFearMove(...args){return rules().reconcileFearMove(...args);}
