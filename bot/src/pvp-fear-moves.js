/** Authenticated immediate GM consequence decisions. Native targets/CAS/effect receipts, never banked Fear or PC reactions. */
import { createHash } from "node:crypto";
import { indexWorldEvent } from "./city-calendar.js";
import { currentScene, scenePresence, recordScenePresence } from "./scene-continuity.js";
import { pvpOwnerContext } from "./narrative-pvp.js";
import { validatePvpRoundReceipt } from "./pvp-rounds.js";
import { fearGateKey, pendingPvpFear } from "./pvp-fear-gate.js";
import { settlePvpWindow } from "./pvp-terminal.js";
import { configureSimulationEntity, submitNpcAction } from "./simulation.js";
import { assertNpcAvailability,activeCityProxy } from "./city-constraints.js";
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
// Module-private capability: model JSON, Discord commands and external adapters cannot mint it.
const AUTO_FE=Symbol("autonomous-pvp-fear");
let fearNpcContent=null;
export function setPvpFearContentIndex(content){fearNpcContent=content||null;}
function fail(message){throw Object.assign(new Error(message),{code:"NARRATIVE_PVP",expected:true});}
function closed(input,fields){
  if(!input||Array.isArray(input)||Object.keys(input).some(k=>!fields.includes(k))||fields.some(k=>!(k in input)))
    fail("Closed native Fear move fields required.");
}
function gmOnly(gm,user){if((gm!==AUTO_FE&&!gm)||!user)fail("Authenticated GM authority required for immediate Fear moves.");}
function all(db,guild,kind){
  const out=[];
  for(let offset=0;offset<10000;offset+=100){
    const page=db.listCityRecords(guild,{kind,includeGM:true,limit:100,offset});out.push(...page);if(page.length<100)return out;
  }
  fail("Native Fear history exceeds safe coverage; reviewed recovery required.");
}
function incomingEvidence(db,guild,key,options){
  try{return incomingAttackEvidence(db,guild,key,options);}
  catch(error){
    // Keep the exact failed native proof fatal to this part, but classify it at the Fear authority
    // boundary so the existing composer can quarantine it without discarding independent actions.
    if(error.code==="PC_EFFECT_AUTHORITY")fail(error.message);
    throw error;
  }
}
function target(db,guild,context){
  const d=context.data;
  if(d.move_kind==="npc_introduce_or_escalate")return db.getCityRecord(guild,"pvp_fear_threat_state",d.threat_state_ref);
  if(d.move_kind==="clock_advance"||d.move_kind==="clock_create_and_advance")return db.getClock(guild,d.target_key);
  if(d.move_kind==="access_obstacle")return db.getSimulationEntity(guild,"location",d.target_key);
  if(d.move_kind==="npc_prepare")return db.getSimulationEntity(guild,"npc",d.target_key);
  if(d.move_kind==="npc_attack"){const {row,offer}=incomingEvidence(db,guild,d.target_key);return {key:row.record_key,source_event:row.source_event,offer};}
  fail("Unsupported native Fear route remains pending review.");
}
function contextProof(db,guild,key){
  const row=db.getCityRecord(guild,"pvp_fear_context",key),d=row?.data,s=row&&db.getWorldEvent(guild,row.source_event);
  const {source_hash,...material}=d||{},scene=currentScene(db,guild);
  const auto=d?.authority==="autonomous_v1",systemMutation=auto&&db.mutationsForEntity(guild,s?.event_key,10).some(m=>m.mutation_type==="world_event_index"
    &&m.actor_type==="system"&&m.actor_id==="autonomous_pvp_fear"&&m.after_json&&hash(JSON.parse(m.after_json))===hash(s));
  const sourceAuthority=auto?s?.source_id==="native:autonomous_pvp_fear"&&systemMutation
    :s?.source_id===`gm:${d?.gm}`&&db.ownerAuthoredSource(guild,s.event_key,d.gm);
  if(!row||row.status!=="active"||d.version!==1||row.record_key!==`pvp-fear-context:${hash(d)}`
    ||s?.status!=="active"||s.kind!=="pvp_fear_context_established"||hash(s.details)!==source_hash||hash(material)!==source_hash
    ||!sourceAuthority||s.visibility!==d.visibility||s.subject_key!==(d.subject_key||null)
    ||s.scene!==d.scene||s.session_id!==d.session||s.location_key!==d.location_key
    ||row.visibility!==d.visibility||row.subject_key!==(d.subject_key||null)||row.location_key!==d.location_key
    ||scene.key!==d.scene||scene.session_id!==d.session||!target(db,guild,row))fail("Current grounded GM context/source required.");
  if(auto&&d.move_kind==="clock_create_and_advance"){const c=db.getCityRecord(guild,"pvp_fear_complication_receipt",d.complication_ref);
    const m=c&&db.getMutation(guild,c.data.creation_mutation_ref),clock=c&&db.getClock(guild,c.data.target_key);
    if(d.move_kind!=="clock_create_and_advance"||!c||c.status!=="created"||c.data.trigger!==d.trigger
      ||c.data.target_key!==d.target_key||c.data.source_event!==s.event_key||c.data.scene!==d.scene
      ||c.data.location_key!==d.location_key||c.data.initial_value!==0||c.data.creation_digest!==hash(Object.fromEntries(Object.entries(c.data).filter(([k])=>k!=="creation_digest"))))
      fail("Autonomous Fear requires its exact source-bound native complication-creation receipt.");}
  if(auto&&d.move_kind==="clock_create_and_advance"){const c=db.getCityRecord(guild,"pvp_fear_complication_receipt",d.complication_ref),m=db.getMutation(guild,c.data.creation_mutation_ref),clock=db.getClock(guild,c.data.target_key);
    const created=m&&JSON.parse(m.after_json);
    if(!m||m.actor_type!=="system"||m.actor_id!=="autonomous_pvp_fear"||m.source_layer!=="pvp_fear"
      ||m.mutation_type!=="clock_create_and_advance"||m.entity_key!==c.data.target_key||m.visibility!==c.data.visibility
      ||hash(JSON.parse(m.before_json))!==hash({})||created.value!==0||created.max_value!==c.data.initial_max
      ||clock.value<0||clock.value>clock.max_value||clock.max_value!==c.data.initial_max||clock.visibility!==c.data.visibility)
      fail("Autonomous complication creation lacks its distinct native initial-state mutation receipt.");}
  if(auto&&d.move_kind==="npc_introduce_or_escalate")validateFearThreatEstablishment(db,guild,d);
  if(auto&&d.move_kind!=="clock_create_and_advance"&&d.move_kind!=="npc_prepare"&&d.move_kind!=="npc_introduce_or_escalate")
    fail("Autonomous Fear route lacks a completed native selector/effect adapter.");
  if(auto&&d.move_kind==="npc_prepare")npcPreparation(db,guild,d.target_key,d.location_key,d.visibility);
  return row;
}
/** Explicit GM establishes a bounded connection to an existing scene obstacle/countdown, not a model recommendation. */
export function establishFearContext(db,guild,user,input,{gm=false,interactionId}={}){
  gmOnly(gm,user);closed(input,["move_kind","target_key","location_key","visibility","subject_key"]);
  if(!["clock_advance","access_obstacle","npc_prepare","npc_attack"].includes(input.move_kind)||!["party","character","gm"].includes(input.visibility)
    ||!interactionId||typeof input.target_key!=="string"||input.target_key.length>160)fail("Supported bounded native Fear context required.");
  const scene=currentScene(db,guild),location=db.getSimulationEntity(guild,"location",input.location_key);
  if(!location||input.visibility==="character"&&db.getCharacter(input.subject_key)?.guild_id!==guild
    ||input.visibility!=="character"&&input.subject_key!==null)fail("Existing location and exact audience required.");
  const original=target(db,guild,{data:input});if(!original)fail("Existing native effect target required; prose cannot create one.");
  if(input.move_kind==="clock_advance"){
    if(input.visibility!==original.visibility||input.subject_key!==(original.subject_character_id||null)
      ||original.subject_user_id)fail("Fear context cannot promote private countdown state.");
  }else if(input.move_kind==="npc_attack"){
    const {row,offer}=incomingEvidence(db,guild,input.target_key);
    if(input.visibility!=="character"||input.subject_key!==row.subject_key||db.getCharacter(row.subject_key)?.data.location!==input.location_key
      ||offer.snapshot.scene!==scene.key)fail("Native NPC attack context must stay private to its current affected owner and location.");
  }else if(input.move_kind==="npc_prepare")npcPreparation(db,guild,input.target_key,input.location_key,input.visibility);
  else if(input.target_key!==input.location_key||!["party","public"].includes(original.state.visibility||"party")
    &&input.visibility==="party")fail("Native access obstacle must be local and audience-safe.");
  return db.transaction(()=>{
    const details={version:1,...input,gm:user,scene:scene.key,session:scene.session_id,severity:1,
      native_route:input.move_kind==="clock_advance"?"changeClock":input.move_kind==="npc_prepare"?"submitNpcAction":input.move_kind==="npc_attack"?"pc_incoming":"configureSimulationEntity"};
    const s=indexWorldEvent(db,guild,{key:`pvp-fear-context-source:${hash([guild,user,interactionId])}`,
      kind:"pvp_fear_context_established",title:"GM-established immediate scene consequence context",source_id:`gm:${user}`,
      scene:scene.key,session_id:scene.session_id,location_key:input.location_key,visibility:input.visibility,
      subject_key:input.subject_key,details},user);
    if(s.status!=="active"||hash(s.details)!==hash(details))fail("Context replay changed its exact fields.");
    const data={...details,source_hash:hash(s.details)},key=`pvp-fear-context:${hash(data)}`;
    return db.getCityRecord(guild,"pvp_fear_context",key)||db.saveCityRecord(guild,{kind:"pvp_fear_context",key,status:"active",
      source_event:s.event_key,visibility:input.visibility,subject_key:input.subject_key,location_key:input.location_key,data});
  });
}
/** Trusted deterministic native fallback for a signed Fear obligation when the scene has no target. */
function createAutonomousFearContext(db,guild,t,p,proposeThreat=defaultFearNpcProposal){
  const terms=db.getCityRecord(guild,"pvp_terms_revision",p.data.terms_revision)?.data.snapshot.terms
    ||db.getCityRecord(guild,"pvp_encounter_terms",p.data.terms_revision)?.data.snapshot.terms;
  if(!terms)fail("Current immutable PvP terms required for autonomous context.");
  const scene=currentScene(db,guild),visibility=terms.audience==="bilateral_author_projection"?"party":"character",
    subjectKey=visibility==="character"?t.data.roller_character:null;
  const sceneLocation=p.data.location_key;
  const existing=all(db,guild,"pvp_fear_context").find(row=>row.data.authority==="autonomous_v1"&&row.data.trigger===t.record_key);
  if(existing){contextProof(db,guild,existing.record_key);return existing;}
  // Reuse only an explicitly source-grounded local route. Never infer a clock's scene from its name.
  const candidates=all(db,guild,"pvp_fear_context").filter(row=>row.status==="active"&&row.data.scene===scene.key
    &&row.data.session===scene.session_id&&row.location_key===sceneLocation
    &&(row.visibility===visibility&&row.subject_key===subjectKey||row.data.move_kind==="npc_attack"))
    .filter(row=>{
      try{
        contextProof(db,guild,row.record_key);
        if(row.data.move_kind==="npc_attack")incomingMoveProof(db,guild,t,row,{selecting:true});
        else if(row.data.move_kind!=="clock_advance")return false;
        applicable(db,guild,p,row,target(db,guild,row));return true;
      }catch(error){if(error.code!=="NARRATIVE_PVP")throw error;return false;}
    });
  const attacks=candidates.filter(row=>row.data.move_kind==="npc_attack"),routes=attacks.length?attacks:candidates;
  if(routes.length===1)return routes[0];
  if(routes.length>1)fail("Multiple source-grounded native Fear routes require explicit contextual selection.");
  const encounter=db.getCurrentEncounter(scene.session_id),binding=encounter?.status==="active"&&db.getCityRecord(guild,"encounter_binding",encounter.id);
  if(binding&&Array.isArray(binding.data.combatants)){
    const candidates=binding.data.combatants.filter(item=>typeof item.actor==="string").map(item=>item.actor)
      .filter(key=>{try{npcPreparation(db,guild,key,sceneLocation,visibility);return true;}catch{return false;}})
      .sort((a,b)=>a.localeCompare(b));
    if(candidates.length===1){
      const targetKey=candidates[0],details={version:1,authority:"autonomous_v1",trigger:t.record_key,move_kind:"npc_prepare",
        target_key:targetKey,location_key:sceneLocation,visibility,subject_key:subjectKey,scene:scene.key,session:scene.session_id,
        objective:terms.objective,stakes:terms.stakes.map(s=>({character:s.character,best:s.best,worst:s.worst})),severity:1,
        complication:"An established adversary immediately prepares toward its current encounter goal."};
      return db.transaction(()=>{
        const source=indexWorldEvent(db,guild,{key:"pvp-fear-context-source:"+hash([guild,t.record_key,"npc-prepare"]),
          kind:"pvp_fear_context_established",title:"Native immediate adversary preparation context",
          source_id:"native:autonomous_pvp_fear",scene:scene.key,session_id:scene.session_id,location_key:sceneLocation,visibility,
          subject_key:subjectKey,details},"autonomous_pvp_fear");
        if(source.status!=="active"||hash(source.details)!==hash(details))fail("Autonomous NPC context replay changed its exact source.");
        const data={...details,source_hash:hash(source.details)},key="pvp-fear-context:"+hash(data),
          context=db.saveCityRecord(guild,{kind:"pvp_fear_context",key,status:"active",source_event:source.event_key,visibility,
            subject_key:subjectKey,location_key:sceneLocation,data});
        contextProof(db,guild,context.record_key);return context;
      });
    }
    if(candidates.length>1)fail("More than one eligible adversary is present; an explicit contextual selection is required.");
  }
  const introduced=createFearNpcThreat(db,guild,t,p,terms,scene,visibility,subjectKey,sceneLocation,proposeThreat);
  if(introduced){contextProof(db,guild,introduced.record_key);return introduced;}
  const location=p.data.location_key,clockKey=`pvp-fear-clock:${hash([p.record_key,p.data.terms_hash,t.record_key])}`;
  const targetKey=clockKey,prior=db.getCityRecord(guild,"pvp_fear_complication_receipt",`pvp-fear-complication:${t.record_key}`);
  if(prior){
    const context=db.listCityRecords(guild,{kind:"pvp_fear_context",includeGM:true,limit:100}).find(c=>c.data.complication_ref===prior.record_key);
    if(!context)fail("Saved autonomous complication has no recoverable exact context.");
    contextProof(db,guild,context.record_key);return context;
  }
  return db.transaction(()=>{
    if(db.getClock(guild,clockKey))fail("Autonomous complication key already exists without its creation receipt.");
    const details={version:1,authority:"autonomous_v1",trigger:t.record_key,move_kind:"clock_create_and_advance",target_key:targetKey,
      location_key:location,visibility,subject_key:subjectKey,scene:scene.key,session:scene.session_id,
      objective:terms.objective,stakes:terms.stakes.map(s=>({character:s.character,best:s.best,worst:s.worst})),severity:1,
      complication_ref:`pvp-fear-complication:${t.record_key}`,
      complication:"The contest draws immediate attention to the scene; a new pressure clock begins."};
    const source=indexWorldEvent(db,guild,{key:`pvp-fear-context-source:${hash([guild,t.record_key])}`,
      kind:"pvp_fear_context_established",title:"Native immediate scene-pressure context",source_id:"native:autonomous_pvp_fear",
      scene:scene.key,session_id:scene.session_id,location_key:location,visibility,subject_key:subjectKey,details},"autonomous_pvp_fear");
    if(source.status!=="active"||hash(source.details)!==hash(details))fail("Autonomous context replay changed its exact source.");
    const initial={clock_key:clockKey,label:`Attention at ${scene.label||location}`,value:0,max_value:4,visibility,subject_user_id:null,subject_character_id:null};
    db.changeClock(guild,clockKey,0,{label:initial.label,visibility,subjectCharacterId:subjectKey,max:initial.max_value});
    const actual=db.getClock(guild,clockKey);
    if(!actual||actual.value!==0||actual.max_value!==4||actual.visibility!==visibility)fail("Native complication did not materialize at its exact initial state.");
    const mutation=db.recordMutation(guild,{sessionId:scene.session_id,actorType:"system",actorId:"autonomous_pvp_fear",sourceLayer:"pvp_fear",
      mutationType:"clock_create_and_advance",entityKey:clockKey,visibility,before:null,after:actual,
      rationale:"Source-bound immediate PvP Fear complication creation; no PC mechanics or fictional choice.",payload:{trigger:t.record_key,source:source.event_key}});
    const creationData={version:1,trigger:t.record_key,proposal:p.record_key,terms_hash:p.data.terms_hash,scene:scene.key,session:scene.session_id,
      location_key:location,target_key:targetKey,source_event:source.event_key,creation_mutation_ref:mutation.id,
      initial_value:0,initial_max:4,visibility,creation_digest:""};
    creationData.creation_digest=hash(Object.fromEntries(Object.entries(creationData).filter(([k])=>k!=="creation_digest")));
    const complication=db.saveCityRecord(guild,{kind:"pvp_fear_complication_receipt",key:`pvp-fear-complication:${t.record_key}`,
      status:"created",source_event:source.event_key,visibility, data:creationData});
    const contextData={...details,source_hash:hash(source.details)},key=`pvp-fear-context:${hash(contextData)}`;
    const context=db.saveCityRecord(guild,{kind:"pvp_fear_context",key,status:"active",source_event:source.event_key,visibility,
      subject_key:subjectKey,location_key:location,data:contextData});
    contextProof(db,guild,context.record_key);return context;
  });
}
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
function validateFearThreatEstablishment(db,guild,d){
  const established=db.getCityRecord(guild,"fear_threat_establishment",d.threat_establishment_ref),state=db.getCityRecord(guild,"pvp_fear_threat_state",d.threat_state_ref);
  const event=established&&db.getWorldEvent(guild,established.data.creation_event),npcKey=established?.data.npc_key;
  const profile=npcKey&&db.getNpcProfile(guild,npcKey),entity=npcKey&&db.getSimulationEntity(guild,"npc",npcKey),presence=npcKey&&scenePresence(db,guild,"npc",npcKey);
  const creation=established&&db.getMutation(guild,established.data.creation_mutation_ref);
  const stateMutation=established&&db.getMutation(guild,established.data.state_creation_mutation_ref);
  const creationAfter=creation?.after_json&&JSON.parse(creation.after_json),stateCreated=stateMutation?.after_json&&JSON.parse(stateMutation.after_json),
    worldRecord=npcKey&&db.getCityRecord(guild,"autonomous_entity",`npc:${npcKey}`);
  const {receipt_digest,...receiptMaterial}=established?.data||{};
  if(!established||established.status!=="established"||hash(receiptMaterial)!==receipt_digest||established.data.scene!==d.scene||established.data.session!==d.session
    ||established.data.location_key!==d.location_key||established.data.terms_hash!==d.terms_hash
    ||event?.status!=="active"||event.kind!=="ai_gm_world_create"
    ||event.source_id!=="native:autonomous_pvp_fear"||event.scene!==d.scene||event.session_id!==d.session
    ||event.details.authority!=="native_gm_world_authoring_v1"||event.details.trigger!==established.data.trigger
    ||event.details.proposal_hash!==established.data.proposal_hash
    ||event.location_key!==d.location_key||event.visibility!==d.visibility||event.subject_key!==(d.subject_key||null)
    ||!profile||!entity||entity.state.location_key!==d.location_key||entity.state.resources?.manpower!==0
    ||Object.keys(entity.state.resources||{}).some(k=>entity.state.resources[k]!==0)||Object.keys(profile.capabilities||{}).length
    ||!worldRecord||worldRecord.source_event!==event.event_key||worldRecord.data.epistemic_label!=="introduced_now"
    ||!presence||presence.source_event!==event.event_key||presence.data.scene!==d.scene||presence.location_key!==d.location_key
    ||presence.visibility!==d.visibility||presence.subject_key!==(d.subject_key||null)||!state||state.status!=="active"
    ||state.data.establishment_ref!==established.record_key||state.data.npc_key!==npcKey
    ||!creation||creation.actor_type!=="system"||creation.actor_id!=="autonomous_pvp_fear"||creation.source_layer!=="pvp_fear"
    ||creation.mutation_type!=="fear_threat_establishment"||creation.entity_key!==npcKey||!creationAfter
    ||creationAfter.npc_key!==npcKey||creationAfter.creation_event!==event.event_key||creationAfter.presence!==presence.record_key
    ||!stateMutation||stateMutation.actor_type!=="system"||stateMutation.actor_id!=="autonomous_pvp_fear"
    ||stateMutation.mutation_type!=="fear_threat_state_create"||stateMutation.entity_key!==state.record_key
    ||!stateCreated||stateCreated.data?.progress!==0||stateCreated.data?.establishment_ref!==established.record_key)
    fail("Fear-introduced NPC lacks current GM-owned identity, scene-presence, audience, source and establishment receipts.");
  return {established,state,event,profile,entity,presence};
}
function createFearNpcThreat(db,guild,t,p,terms,scene,visibility,subjectKey,location,proposeThreat=defaultFearNpcProposal){
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
  const prior=all(db,guild,"fear_threat_establishment").find(r=>r.status==="established"&&r.data.scene===scene.key
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
  contextProof(db,guild,context.record_key);return context;
}
function triggerProof(db,guild,key,{allowResolved=false,allowDeferred=false}={}){
  const t=db.getCityRecord(guild,"pvp_fear_trigger",key);
  if(t?.data.version===2)return attackTriggerProof(db,guild,t,{allowResolved,allowDeferred});
  const p=t&&db.getCityRecord(guild,"pvp_proposal",t.data.proposal);
  if(!t||!p||t.data.terms_hash!==p.data.terms_hash||currentScene(db,guild).key!==t.data.scene
    ||t.data.session!==db.getActiveSession(guild)?.id)fail("Current scene/source-bound Fear trigger required.");
  for(const who of p.data.participants)pvpOwnerContext(db,guild,who.user,p.record_key);
  const round=db.getCityRecord(guild,"pvp_round_receipt",t.data.round_receipt);
  validatePvpRoundReceipt(db,guild,p,round);
  const d=t.data,expected=`pvp-fear:${hash([p.record_key,p.data.terms_hash,round.data.round,round.record_key]).slice(0,40)}`;
  if(expected!==key||round.data.roll_id!==d.roll_id||round.data.result.duality!=="Fear"||round.source_event!==t.source_event
    ||round.data.character!==d.roller_character||d.round!==round.data.round)fail("Fear obligation must cite exact native dice.");
  const gate=db.getCityRecord(guild,"pvp_exchange_gate",fearGateKey(p,d.round));
  if(!gate||!gate.data.expected_fear_trigger_ids.includes(key)||gate.data.pair_ref!==d.paired_comparison_ref)
    fail("Fear remains sealed awaiting pair; no move selection or opposing disclosure.");
  exchangeProof(db,guild,p,gate);
  if(!allowResolved&&t.status==="resolved")fail("Fear move already resolved; replay the effect receipt, never reexecute.");
  if(!allowResolved&&!allowDeferred){
    const next=gate.data.expected_fear_trigger_ids.find(id=>db.getCityRecord(guild,"pvp_fear_trigger",id)?.status!=="resolved");
    if(next!==key)fail("Resolve immediate Fear obligations in locked participant order.");
  }
  return {t,p,gate,round};
}
function attackTriggerProof(db,guild,t,{allowResolved,allowDeferred}){
  const {receipt:round,offer,contract:p}=validatePvpAttackRoll(db,guild,t.data.attack_receipt),d=t.data;
  const expected=`pvp-fear:${hash([p.record_key,p.data.terms_hash,round.data.attack,round.record_key]).slice(0,40)}`;
  const gate=db.getCityRecord(guild,"pvp_exchange_gate",fearGateKey(p,round.data.attack)),g=gate?.data;
  if(t.record_key!==expected||d.proposal!==p.record_key||d.terms_hash!==offer.terms_hash||d.session!==offer.session||d.scene!==offer.scene
    ||d.roll_id!==round.data.roll_id||d.roller_character!==offer.actor||d.roller_principal_revision!==offer.snapshot.actor_principal
    ||d.source_event!==round.source_event||t.source_event!==round.source_event||d.duality!=="Fear"||round.data.result.duality!=="Fear"
    ||d.round!==round.data.attack||d.paired_comparison_ref!==round.record_key||d.trigger_ordinal!==0
    ||t.visibility!=="gm"||g?.version!==2||g.proposal!==p.record_key||g.terms_hash!==offer.terms_hash
    ||g.round!==round.data.attack||g.pair_ref!==round.record_key||gate.source_event!==p.source_event||gate.visibility!=="gm"
    ||hash(g.expected_fear_trigger_ids)!==hash([expected])||hash(g.resolved_effect_ids)!==hash(t.status==="resolved"?[t.data.effect]:[])
    ||gate.status!==(t.status==="resolved"?"ready":"pending_fear"))fail("Exact immediate damage-action Fear roll/gate required.");
  if(!allowResolved&&t.status==="resolved")fail("Fear move already resolved; replay native effect only.");
  if(!allowResolved&&!allowDeferred)assertBrawlFearOrder(db,guild,db.getCityRecord(guild,"pvp_attack_request",round.data.attack),t);
  return {t,p,gate,round};
}
/** Reconstruct obligation membership from saved dice, not mutable gate pointers or model labels. */
function exchangeProof(db,guild,p,gate){
  const g=gate.data,rows=p.data.participants.map(w=>all(db,guild,"pvp_round_receipt").find(r=>r.data.proposal===p.record_key
    &&r.data.terms_hash===p.data.terms_hash&&r.data.round===g.round&&r.data.character===w.character));
  for(const r of rows.filter(Boolean))validatePvpRoundReceipt(db,guild,p,r);
  if(g.version!==1||g.proposal!==p.record_key||g.terms_hash!==p.data.terms_hash
    ||gate.record_key!==fearGateKey(p,g.round)||gate.source_event!==p.source_event||gate.visibility!=="gm")
    fail("Exact native exchange gate required.");
  if(g.partial){
    const neutral=db.getCityRecord(guild,"pvp_resolution_receipt",g.pair_ref),s=neutral&&db.getWorldEvent(guild,neutral.source_event);
    if(rows.filter(Boolean).length!==1||p.data.resolution_receipt!==g.pair_ref||neutral?.status!=="resolved"
      ||neutral.data.proposal!==p.record_key||neutral.data.terms_hash!==p.data.terms_hash
      ||!["declined","withdrawn"].includes(neutral.data.outcome)||neutral.data.winner!==null||neutral.data.roll_refs.length
      ||s?.status!=="active"||s.kind!=="pvp_consent_reply"||s.details.decision!==neutral.data.outcome.replace("declined","decline").replace("withdrawn","withdraw")
      ||!p.data.participants.some(w=>w.user===s.details.author&&db.ownerAuthoredSource(guild,s.event_key,w.user)))
      fail("Exact native neutral partial-pair closure required.");
  }else{
    const pair=db.getCityRecord(guild,"pvp_strike_receipt",g.pair_ref),totals=rows.filter(Boolean).map(r=>r.data.result.total);
    const winner=totals[0]===totals[1]?null:p.data.participants[totals[0]>totals[1]?0:1]?.character;
    if(rows.some(r=>!r)||g.pair_ref!==`pvp-pair:${hash([p.record_key,p.data.terms_hash,g.round]).slice(0,40)}`
      ||pair?.status!=="resolved"||pair.source_event!==p.source_event||pair.visibility!=="gm"
      ||pair.data.proposal!==p.record_key||pair.data.terms_hash!==p.data.terms_hash||pair.data.round!==g.round
      ||hash(pair.data.round_refs)!==hash(rows.map(r=>r.record_key))||hash(pair.data.roll_refs)!==hash(rows.map(r=>r.data.roll_id))
      ||hash(pair.data.totals)!==hash(totals)||pair.data.winner!==winner)
      fail("Exact saved native paired comparison required.");
  }
  const expected=rows.filter(r=>r?.data.result.duality==="Fear").map(r=>`pvp-fear:${hash([p.record_key,p.data.terms_hash,g.round,r.record_key]).slice(0,40)}`);
  const triggers=expected.map(key=>db.getCityRecord(guild,"pvp_fear_trigger",key));
  const effects=triggers.filter(t=>t?.status==="resolved").map(t=>t.data.effect);
  if(triggers.some((t,i)=>!t||t.data.trigger_ordinal!==p.data.participants.findIndex(w=>w.character===t.data.roller_character)
      ||t.data.paired_comparison_ref!==g.pair_ref||t.data.round_receipt!==rows.filter(r=>r?.data.result.duality==="Fear")[i].record_key)
    ||hash(g.expected_fear_trigger_ids)!==hash(expected)||hash(g.resolved_effect_ids)!==hash(effects)
    ||gate.status!==(effects.length===expected.length?"ready":"pending_fear"))
    fail("Exact native Fear obligation set/order/effects required.");
}
function applicable(db,guild,p,context,before){
  if(context.data.scene!==p.data.scene||context.location_key!==p.data.location_key)fail("Fear consequence must be contextual to this exchange.");
  if(context.data.move_kind==="clock_advance"||context.data.move_kind==="clock_create_and_advance"){
    if(context.data.move_kind==="clock_create_and_advance"&&before.value!==0)fail("New complication clock must be unadvanced before its distinct immediate effect.");
    if(!Number.isSafeInteger(before.value)||before.value>=before.max_value)fail("Completed countdown cannot receive a cosmetic/no-op advance.");
  }else if(context.data.move_kind==="npc_attack")return;
  else if(context.data.move_kind==="npc_introduce_or_escalate"){
    validateFearThreatEstablishment(db,guild,context.data);
    if(!Number.isSafeInteger(before.data?.progress)||before.data.progress>=5)fail("Native threat progression has reached its bounded limit; retain Fear for review.");
  }
  else if(context.data.move_kind==="npc_prepare")npcPreparation(db,guild,context.data.target_key,context.location_key,context.visibility);
  else if(before.state.locked||before.state.sealed||before.state.removed||before.state.blocks_exit||before.state.locked_exit)
    fail("Access obstacle already applied or would trap characters; choose a new legal scene move.");
}
function npcPreparation(db,guild,key,location,visibility){
  assertNpcAvailability(db,guild,key,{type:"prepare",location_key:location});
  const session=db.getActiveSession(guild),encounter=session&&db.getCurrentEncounter(session.id);
  if(encounter?.status!=="active")fail("Current native encounter required for an immediate adversary action.");
  validateWorldEncounterActivation(db,guild,encounter);
  const binding=db.getCityRecord(guild,"encounter_binding",encounter.id),actor=binding?.data.combatants?.find(b=>b.actor===key);
  const actual=actor&&db.listCombatants(encounter.id).find(c=>c.id===actor.id&&c.status==="active");
  const npc=db.getSimulationEntity(guild,"npc",key),profile=db.getNpcProfile(guild,key);
  const presence=scenePresence(db,guild,"npc",key);
  if(visibility==="party"&&(npc?.state.hidden||!["party","public"].includes(npc?.state.visibility||"party")
    ||!presence||!["party","public"].includes(presence.visibility)||presence.data.hidden))
    fail("Hidden/private NPC action cannot be promoted to a party consequence.");
  const goals=db.listNpcGoals(guild,key,{status:"active",limit:50}).filter(g=>g.acceptable_methods.includes("prepare"));
  if(!profile||!actual||npc?.state.location_key!==location||npc.state.resources?.manpower<1||npc.state.preparation>=5
    ||goals.length!==1)fail("Current bound adversary, capacity and unique established preparation goal required.");
  return {encounter,binding,combatant:actual,goal:goals[0],presence};
}
function incomingMoveProof(db,guild,t,context,{terminal=false,selecting=false,allowPending=false}={}){
  let evidence;
  try{evidence=incomingEvidence(db,guild,context.data.target_key,{terminal});}
  catch(error){if(error.code==="NATIVE_EFFECT_PENDING"&&!allowPending)fail("Saved Fear effect has lost its native terminal outcome; retain proof hold.");throw error;}
  const {row,offer}=evidence;
  const contract=db.getCityRecord(guild,"pvp_encounter_contract",t.data.proposal);
  const profile=contract?.data.snapshot?.terms?.profile,nativeProfile=profile==='damage_enabled'
    ||contract?.data.version===4&&profile==='campaign_damage';
  if(t.data.version!==2||!nativeProfile||offer.input.source!==t.source_event
    ||offer.snapshot.scene!==t.data.scene||offer.snapshot.session!==t.data.session||context.visibility!=="character"
    ||context.subject_key!==row.subject_key||!contract.data.participants.some(w=>w.character===row.subject_key)
    ||selecting&&(row.data.roll||!["awaiting_defense","ready"].includes(row.status)))
    fail("Immediate NPC Fear attack requires the exact fresh native source, damage profile and affected-owner scope; no old result adoption.");
  return evidence;
}
/** Only an actually selected contextual native request can spend this immediate opportunity. */
export function assertFearIncomingExecution(db,guild,row,{committedRoll=false,autonomous=false}={}){
  if(!row)fail("Exact native incoming request required.");
  const source=db.getWorldEvent(guild,row.data.offer.input.source);
  if(!source?.kind.startsWith("pvp_")&&!source?.kind.startsWith("native_pvp_")&&!db.hasNativePvpSource(guild,source?.event_key)){
    if(autonomous)fail("Autonomous incoming dice require a native PvP Fear source.");return;
  }
  const matches=all(db,guild,"pvp_fear_trigger").filter(t=>t.source_event===source.event_key);
  if(matches.length!==1||matches[0].status!=="move_selected")fail("Exact current immediate Fear selection required before NPC attack dice.");
  const {t,gate}=triggerProof(db,guild,matches[0].record_key),decision=decisionProof(db,guild,t,t.data.decision),c=contextProof(db,guild,decision.data.context);
  if(autonomous&&(decision.data.authority!=="autonomous_v1"||db.getCityCalendar(guild).flags.autonomous_pvp_fear===false))
    fail("Current trusted autonomous Fear selection required; human selections are not delegated implicitly.");
  if(c.data.move_kind!=="npc_attack"||c.data.target_key!==row.record_key||decision.data.context_hash!==hash(c)
    ||decision.data.expected_target_revision!==hash(target(db,guild,c))||decision.data.gate_revision!==gate.data.revision)
    fail("Native NPC request is not the exact selected immediate Fear context.");
  // Only this PvP-caused incoming route is affected. Ordinary independent NPC
  // attacks and immutable already-applied receipts retain their native readers.
  assertPvpSafety(db,guild,[row.subject_key]);
  incomingMoveProof(db,guild,t,c,{selecting:!committedRoll});
}
function holdTargets(db,guild,p,actions){
  if(!Array.isArray(actions)||actions.length>8||new Set(actions).size!==actions.length)fail("Bounded independent pending action targets required.");
  return actions.map(key=>{
    const row=db.getCityRecord(guild,"compound_action",key),intent=row&&db.getCityRecord(guild,"typed_intent",row.data.action_id);
    const pc=row&&db.getCharacter(row.data.actor);
    if(!row||!["pending","suspended","ready"].includes(row.status)||row.data.scene!==p.data.scene||!intent
      ||intent.status!=="accepted_for_adjudication"||intent.data.type!=="search"||pc?.data.location!==p.data.location_key
      ||p.data.participants.some(w=>w.character===pc?.id))fail("Only unfinished, contextual third-party investigation may be interrupted.");
    try{consentAction(db,guild,intent.record_key);}catch(error){
      if(error.code!=="SCENE_ACTION_WINDOW")throw error;fail("Interrupted investigation needs its current owner-authored source and scene.");
    }
    return row;
  });
}
/** Only a changed native NPC target can automatically hold its unfinished accepted investigations.
 * Co-location alone never blocks a bystander, a completed result or an independent sibling. */
function autonomousInvestigationHolds(db,guild,p,context){
  if(context.data.move_kind!=="npc_prepare")return [];
  const rows=all(db,guild,"compound_action").filter(row=>["pending","suspended","ready"].includes(row.status)
    &&row.data.scene===p.data.scene&&!p.data.participants.some(w=>w.character===row.data.actor));
  const selected=[];
  for(const row of rows){
    const action=db.getCityRecord(guild,"typed_intent",row.data.action_id);
    if(action?.data.type!=="search"||action.data.target_key!==context.data.target_key)continue;
    try{holdTargets(db,guild,p,[row.record_key]);selected.push(row.record_key);}catch(error){
      if(error.code!=="NARRATIVE_PVP")throw error; // Stale declarations stay inert, never authorize an interruption.
    }
  }
  if(selected.length>8)fail("Too many target-bound investigations for a bounded Fear interruption; scoped GM review required.");
  return selected.sort();
}
function reserveFearPublication(db,guild,p,t,effect,context){
  const terms=db.getCityRecord(guild,"pvp_terms_revision",p.data.terms_revision)?.data.snapshot.terms
    ||db.getCityRecord(guild,"pvp_encounter_terms",p.data.terms_revision)?.data.snapshot.terms;
  if(!terms)fail("Immutable PvP publication terms required.");
  const party=effect.visibility==="party",who=p.data.participants.find(row=>row.character===effect.subject_key);
  if(!party&&!who)fail("Exact Fear author/owner required for private consequence publication.");
  const kind="pvp_fear_publication",notice={kind:"pvp_fear_effect",ref:effect.record_key,proposal:p.record_key,terms_hash:p.data.terms_hash,
    visibility:effect.visibility,...(party?{}:{user:who.user,character:who.character})};
  const key=`pvp-fear-publication:${hash([effect.record_key,party?"party":who.user])}`;
  const data={...notice,reservation_version:2,reservation_hash:hash([kind,key,context.source_event,notice])};
  const prior=db.getCityRecord(guild,kind,key);
  if(prior&&(prior.source_event!==context.source_event||prior.data.reservation_hash!==data.reservation_hash))
    fail("Fear publication reservation cannot change audience/source/effect identity.");
  return prior||db.saveCityRecord(guild,{kind,key,status:"queued",source_event:context.source_event,
    visibility:party?"party":"character",subject_key:party?null:who.character,data});
}
export function selectFearMove(db,guild,user,input,options={}){
  gmOnly(options.gm,user);
  try{return selectMove(db,guild,user,input,options);}catch(error){holdForReview(db,guild,user,input?.trigger,error);throw error;}
}
function selectMove(db,guild,user,input,{gm=false,interactionId}={}){
  gmOnly(gm,user);closed(input,["trigger","expected_revision","context","expected_target_revision","affected_actions"]);
  return db.transaction(()=>{
    const {t,p,gate}=triggerProof(db,guild,input.trigger),context=contextProof(db,guild,input.context),before=target(db,guild,context);
    if(t.data.revision!==input.expected_revision||hash(before)!==input.expected_target_revision)fail("Fear trigger/target revision changed; refresh selection.");
    if(context.data.move_kind==="npc_attack")incomingMoveProof(db,guild,t,context,{selecting:true});
    applicable(db,guild,p,context,before);const holds=holdTargets(db,guild,p,input.affected_actions);
    const details={version:1,trigger:t.record_key,context:context.record_key,context_hash:hash(context),
      ...(gm===AUTO_FE?{authority:"autonomous_v1"}:{}),
      native_context_hash:context.data.move_kind==="npc_prepare"
        ?hash(npcPreparation(db,guild,context.data.target_key,context.location_key,context.visibility)):null,
      selector:user,revision:t.data.revision,gate_revision:gate.data.revision,expected_target_revision:hash(before),
      affected_actions:holds.map(row=>({key:row.record_key,revision:hash(row)})),visibility:context.visibility,
      subject_key:context.subject_key,scene:p.data.scene,terms_hash:p.data.terms_hash,severity:1};
    const source=indexWorldEvent(db,guild,{key:`pvp-fear-selection:${hash([guild,user,interactionId])}`,
      kind:"pvp_fear_selection",title:gm===AUTO_FE?"Native autonomous immediate Fear move selection":"Authenticated immediate GM move selection",
      source_id:gm===AUTO_FE?"native:autonomous_pvp_fear":`gm:${user}`,visibility:"gm",session_id:p.data.session_id,scene:p.data.scene,details},user);
    if(!interactionId||source.status!=="active"||hash(source.details)!==hash(details))fail("Exact native GM selection interaction required.");
    const data={...details,source_hash:hash(source.details)},key=`pvp-fear-decision:${hash(data)}`;
    const decision=db.saveCityRecord(guild,{kind:"pvp_fear_move_decision",key,status:"selected",visibility:"gm",source_event:source.event_key,data});
    db.saveCityRecord(guild,{...t,key:t.record_key,status:"move_selected",data:{...t.data,decision:key,revision:t.data.revision+1}});
    return decision;
  });
}
function decisionProof(db,guild,t,key){
  const row=db.getCityRecord(guild,"pvp_fear_move_decision",key),d=row?.data,s=row&&db.getWorldEvent(guild,row.source_event);
  const {source_hash,...material}=d||{};
  const auto=d?.authority==="autonomous_v1",systemMutation=auto&&db.mutationsForEntity(guild,s?.event_key,10).some(m=>m.mutation_type==="world_event_index"
    &&m.actor_type==="system"&&m.actor_id==="autonomous_pvp_fear"&&hash(JSON.parse(m.after_json||"null"))===hash(s));
  if(!row||row.status!=="selected"||row.record_key!==`pvp-fear-decision:${hash(d)}`||d.trigger!==t.record_key
    ||t.data.decision!==key||d.terms_hash!==t.data.terms_hash||s?.status!=="active"||s.kind!=="pvp_fear_selection"
    ||(auto?s.source_id!=="native:autonomous_pvp_fear"||!systemMutation:s.source_id!==`gm:${d.selector}`||!db.ownerAuthoredSource(guild,s.event_key,d.selector))
    ||hash(s.details)!==source_hash||hash(material)!==source_hash
    ||s.visibility!=="gm"||row.visibility!=="gm"
    ||s.scene!==t.data.scene||s.session_id!==t.data.session||d.scene!==t.data.scene)fail("Exact authenticated GM move decision/source required.");
  return row;
}
export function applyFearMove(db,guild,user,input,options={}){
  gmOnly(options.gm,user);
  try{return applyMove(db,guild,user,input,options);}catch(error){holdForReview(db,guild,user,input?.trigger,error);throw error;}
}
function applyMove(db,guild,user,input,{gm=false,rng}={}){
  gmOnly(gm,user);closed(input,["trigger","expected_revision","decision"]);
  return db.transaction(()=>{
    const existing=db.getCityRecord(guild,"pvp_fear_effect_receipt",`pvp-fear-effect:${input.trigger}`);
    if(existing){validateFearEffect(db,guild,existing.record_key);
      if(existing.data.decision!==input.decision)fail("Effect replay cannot substitute a new decision.");return existing;}
    const {t,p,gate}=triggerProof(db,guild,input.trigger),decision=decisionProof(db,guild,t,input.decision);
    const context=contextProof(db,guild,decision.data.context),before=target(db,guild,context);
    if(t.data.revision!==input.expected_revision||hash(context)!==decision.data.context_hash
      ||hash(before)!==decision.data.expected_target_revision||gate.data.revision!==decision.data.gate_revision)
      fail("Immediate Fear move preconditions changed; reselect against current native state.");
    applicable(db,guild,p,context,before);
    if(context.data.move_kind==="npc_prepare"&&hash(npcPreparation(db,guild,context.data.target_key,context.location_key,context.visibility))!==decision.data.native_context_hash)
      fail("Native NPC encounter/goal/presence revision changed; refresh selection.");
    const holds=holdTargets(db,guild,p,decision.data.affected_actions.map(row=>row.key));
    if(holds.some((r,i)=>hash(r)!==decision.data.affected_actions[i].revision))fail("Interrupted action revision changed; do not overwrite progress.");
    db.saveCityRecord(guild,{...t,key:t.record_key,status:"executing",data:{...t.data,revision:t.data.revision+1}});
    const d=context.data;
    let npcAction=null,incoming=null,threatProgression=null;
    if(d.move_kind==="clock_advance"||d.move_kind==="clock_create_and_advance")db.changeClock(guild,d.target_key,1,{label:before.label,visibility:before.visibility,
      subjectUserId:before.subject_user_id,subjectCharacterId:before.subject_character_id,max:before.max_value});
    else if(d.move_kind==="npc_prepare"){
      const native=npcPreparation(db,guild,d.target_key,d.location_key,d.visibility);
      npcAction=submitNpcAction(db,guild,{actor_type:"npc",actor_key:d.target_key,goal_key:native.goal.goal_key,
        type:"prepare",location_key:d.location_key,significance:"routine",rationale:"Current encounter preparation, immediate GM move."},
      {approved:true,cycleKey:`pvp-fear:${t.record_key}`,roll:rng});
      if(npcAction.status!=="completed")fail("Immediate NPC action has no completed native consequence; retain Fear obligation.");
    }else if(d.move_kind==="npc_attack")incoming=incomingMoveProof(db,guild,t,context,{terminal:true,allowPending:true});
    else if(d.move_kind==="npc_introduce_or_escalate"){
      const current=target(db,guild,context),establishment=validateFearThreatEstablishment(db,guild,d).established;
      if(!current||current.data.progress>=5)fail("Native threat progression is stale or exhausted; retain Fear for review.");
      const afterData={...current.data,progress:current.data.progress+1,last_trigger:t.record_key,
        last_consequence:d.immediate_consequence,revision:current.data.revision+1};
      const afterState=db.saveCityRecord(guild,{...current,key:current.record_key,status:"active",data:afterData});
      const progressionEvent=indexWorldEvent(db,guild,{key:`fear-threat-progress:${hash([t.record_key,establishment.record_key])}`,
        kind:"pvp_fear_threat_progression",title:"Native immediate contextual NPC threat progression",
        source_id:"native:autonomous_pvp_fear",scene:d.scene,session_id:d.session,location_key:d.location_key,
        visibility:d.visibility,subject_key:d.subject_key,details:{trigger:t.record_key,threat_establishment:establishment.record_key,
          npc_key:d.npc_key,threat_label:d.threat_label,step:afterData.progress,consequence:d.immediate_consequence,
          objective:p.data.objective,terms_hash:p.data.terms_hash}},"autonomous_pvp_fear");
      const mutation=db.recordMutation(guild,{sessionId:p.data.session_id,actorType:"system",actorId:"autonomous_pvp_fear",
        sourceLayer:"pvp_fear",mutationType:d.move_kind,entityKey:d.target_key,visibility:d.visibility,before:current,after:afterState,
        rationale:"Separate immediate native NPC threat progression tied to its current-scene establishment; no PC mechanics or response.",
        payload:{trigger:t.record_key,decision:decision.record_key,establishment:establishment.record_key,progression_event:progressionEvent.event_key}});
      threatProgression=db.saveCityRecord(guild,{kind:"pvp_fear_threat_progression_receipt",
        key:`pvp-fear-threat-progression:${t.record_key}`,status:"applied",source_event:progressionEvent.event_key,
        location_key:d.location_key,visibility:d.visibility,subject_key:d.subject_key,
        data:{version:1,trigger:t.record_key,decision:decision.record_key,establishment_ref:establishment.record_key,
          state_ref:current.record_key,npc_key:d.npc_key,scene:d.scene,session:d.session,location_key:d.location_key,
          before_progress:current.data.progress,after_progress:afterData.progress,consequence:d.immediate_consequence,
          mutation_ref:mutation.id,source_hash:hash(progressionEvent.details),authority:"native_autonomous_pvp_fear_v1"}});
    }
    else configureSimulationEntity(db,guild,"location",d.target_key,{locked:true});
    const after=incoming?{...before,native_outcome:{roll:incoming.roll.record_key,effect:incoming.effect?.record_key||null}}:target(db,guild,context);
    if(hash(after)===hash(before))fail("Fear consequence did not apply a meaningful native effect.");
    const automatic=decision.data.authority==="autonomous_v1";
    const mutation=db.recordMutation(guild,{sessionId:p.data.session_id,actorType:automatic?"system":"human_gm",actorId:user,sourceLayer:"pvp_fear",
      mutationType:d.move_kind,entityKey:d.target_key,visibility:d.visibility,before,after,
      rationale:"Immediate native consequence accounting; PC effects require their distinct native receipt, never reapplication or banked Fear.",payload:{trigger:t.record_key,decision:decision.record_key}});
    const effectKey=`pvp-fear-effect:${t.record_key}`,holdRefs=[];
    for(const node of holds){
      const key=`pvp-interrupt:${hash([effectKey,node.record_key])}`;holdRefs.push(key);
      db.saveCityRecord(guild,{kind:"action_interrupt_receipt",key,status:"pending",source_event:context.source_event,visibility:node.visibility,
        subject_key:node.subject_key,data:{version:1,action:node.record_key,effect:effectKey,before_revision:hash(node),
          before_status:node.data.status,scene:p.data.scene,authority:"Changed investigation conditions; no invented failure, progress loss, cost or PC response."}});
      db.saveCityRecord(guild,{...node,key:node.record_key,status:"pending",data:{...node.data,status:"pending",
        interrupt_refs:[...(node.data.interrupt_refs||[]),key]}});
    }
    const npcMutation=npcAction&&db.mutationsForEntity(guild,npcAction.id,20).find(m=>m.source_layer==="npc_director"&&m.mutation_type==="npc_action:prepare");
    if(npcAction&&(!npcMutation||hash(JSON.parse(npcMutation.after_json))!==hash(npcAction)))fail("Exact completed native NPC action mutation required.");
    const data={version:1,trigger:t.record_key,decision:decision.record_key,context:context.record_key,source_event:context.source_event,
      source_hash:context.data.source_hash,scene:p.data.scene,session:p.data.session_id,proposal:p.record_key,terms_hash:p.data.terms_hash,
      move_kind:d.move_kind,target:d.target_key,native_mutation_refs:[mutation.id],before,after,hold_refs:holdRefs,
      ...(automatic?{complication_ref:context.data.complication_ref,authority:"autonomous_v1"}:{}),
      ...(threatProgression?{threat_establishment_ref:context.data.threat_establishment_ref,
        threat_progression_ref:threatProgression.record_key}:{}),
      npc_action_ref:npcAction?.id||null,npc_action_hash:npcAction?hash(npcAction):null,npc_mutation_ref:npcMutation?.id||null,
      ...(incoming?{incoming_attack_ref:incoming.row.record_key,incoming_roll_ref:incoming.roll.record_key,incoming_effect_ref:incoming.effect?.record_key||null}:{}),
      visibility:d.visibility,subject_key:d.subject_key,applied_by:user,idempotency_key:effectKey};
    const effect=db.saveCityRecord(guild,{kind:"pvp_fear_effect_receipt",key:effectKey,status:"resolved",source_event:context.source_event,
      visibility:d.visibility,subject_key:d.subject_key,data:{...data,effect_digest:hash(data)}});
    if(automatic)reserveFearPublication(db,guild,p,t,effect,context);
    db.saveCityRecord(guild,{...t,key:t.record_key,status:"resolved",data:{...t.data,effect:effectKey,revision:t.data.revision+2}});
    const refs=[...gate.data.resolved_effect_ids,effectKey],ready=refs.length===gate.data.expected_fear_trigger_ids.length;
    db.saveCityRecord(guild,{...gate,key:gate.record_key,status:ready?"ready":"pending_fear",
      data:{...gate.data,resolved_effect_ids:refs,revision:gate.data.revision+1}});
    if(ready&&!pendingPvpFear(db,guild,p).length&&p.data.resolution_receipt)
      settlePvpWindow(db,guild,p,db.getCityRecord(guild,"pvp_resolution_receipt",p.data.resolution_receipt));
    if(ready&&gate.data.version===2){
      settlePvpDamageAction(db,guild,gate.data.round);
      const opp=db.getCityRecord(guild,"pvp_spotlight_opportunity",`${gate.data.round}:opportunity`);
      if(opp&&!pendingPvpFear(db,guild,p).length){const w=db.getCityRecord(guild,"scene_action_window",opp.data.window);
        for(const key of w.data.pvp_brawl.requests)if(key!==gate.data.round)settlePvpDamageAction(db,guild,key);
      }
    }
    drainActionContinuations(db,guild);return effect;
  });
}
export function validateFearEffect(db,guild,key){
  const row=db.getCityRecord(guild,"pvp_fear_effect_receipt",key),d=row?.data;
  if(!row||row.status!=="resolved"||!d)fail("Native resolved Fear effect receipt required.");
  const {effect_digest,...material}=d;
  if(hash(material)!==effect_digest||key!==`pvp-fear-effect:${d.trigger}`||row.visibility!==d.visibility
    ||row.subject_key!==d.subject_key||row.source_event!==d.source_event)fail("Fear effect receipt integrity/audience changed.");
  const {t,p}=triggerProof(db,guild,d.trigger,{allowResolved:true});
  if(t.status!=="resolved"||t.data.effect!==key||t.data.decision!==d.decision)fail("Fear trigger/effect ancestry changed.");
  const decision=decisionProof(db,guild,t,d.decision),context=contextProof(db,guild,d.context);
  if(d.context!==decision.data.context||hash(context)!==decision.data.context_hash||hash(d.before)!==decision.data.expected_target_revision
    ||d.move_kind!==context.data.move_kind||d.target!==context.data.target_key||d.source_event!==context.source_event
    ||d.visibility!==context.visibility||d.subject_key!==context.subject_key||d.scene!==t.data.scene||d.session!==t.data.session
    ||d.proposal!==p.record_key||d.terms_hash!==p.data.terms_hash||!Array.isArray(d.native_mutation_refs)||d.native_mutation_refs.length!==1)
    fail("Native Fear effect must retain its exact selected context, kind, source, scene and audience proof.");
  const s=db.getWorldEvent(guild,d.source_event);
  if(s?.status!=="active"||hash(s.details)!==d.source_hash)fail("Fear scene source revoked.");
  for(const ref of d.native_mutation_refs){const m=db.getMutation(guild,ref);
    if(!m||m.source_layer!=="pvp_fear"||m.mutation_type!==d.move_kind||m.entity_key!==d.target||m.visibility!==d.visibility
      ||m.actor_id!==d.applied_by||m.session_id!==d.session||hash(JSON.parse(m.before_json))!==hash(d.before)||hash(JSON.parse(m.after_json))!==hash(d.after)
      ||JSON.parse(m.payload_json).trigger!==d.trigger||JSON.parse(m.payload_json).decision!==d.decision)
      fail("Exact native Fear mutation receipt required.");}
  if(d.authority==="autonomous_v1"){
    const m=db.getMutation(guild,d.native_mutation_refs[0]);
    if(m.actor_type!=="system"||m.actor_id!=="autonomous_pvp_fear"||d.applied_by!=="autonomous_pvp_fear")
      fail("Autonomous Fear effects require the distinct system authority and creation receipt.");
    if(d.move_kind==="clock_create_and_advance"){
      const c=db.getCityRecord(guild,"pvp_fear_complication_receipt",d.complication_ref);
      if(!c||c.status!=="created"||c.data.trigger!==t.record_key||c.data.target_key!==d.target)
        fail("Autonomous clock effects require their exact distinct creation receipt.");
    }else if(d.move_kind==="npc_prepare"&&d.complication_ref!==undefined)
      fail("Native NPC preparation cannot be laundered through a synthetic clock receipt.");
  }
  if(d.move_kind==="npc_prepare"){
    const action=db.getSimulationRecord(guild,d.npc_action_ref),m=db.getMutation(guild,d.npc_mutation_ref);
    if(action?.kind!=="action"||action.status!=="completed"||hash(action)!==d.npc_action_hash
      ||action.data.actor_type!=="npc"||action.data.actor_key!==d.target||action.data.type!=="prepare"
      ||action.data.cycle_key!==`pvp-fear:${d.trigger}`||m?.source_layer!=="npc_director"||m.entity_key!==action.id
      ||m.mutation_type!=="npc_action:prepare"||hash(JSON.parse(m.after_json))!==hash(action))
      fail("Exact native NPC action/receipt ancestry required.");
  }
  if(d.move_kind==="npc_introduce_or_escalate"){
    const established=validateFearThreatEstablishment(db,guild,context.data).established,
      progression=db.getCityRecord(guild,"pvp_fear_threat_progression_receipt",d.threat_progression_ref),
      progressionEvent=progression&&db.getWorldEvent(guild,progression.source_event),
      mutation=progression&&db.getMutation(guild,progression.data.mutation_ref);
    if(d.threat_establishment_ref!==established.record_key||!progression||progression.status!=="applied"
      ||progression.data.trigger!==d.trigger||progression.data.establishment_ref!==established.record_key
      ||progression.data.state_ref!==context.data.threat_state_ref||progression.data.after_progress!==progression.data.before_progress+1
      ||progression.data.consequence!=="interrupt_service"||progressionEvent?.status!=="active"
      ||hash(progressionEvent.details)!==progression.data.source_hash||mutation?.actor_type!=="system"
      ||mutation.actor_id!=="autonomous_pvp_fear"||mutation.mutation_type!=="npc_introduce_or_escalate"
      ||mutation.entity_key!==context.data.target_key||hash(JSON.parse(mutation.after_json))!==hash(d.after))
      fail("Native Fear threat needs distinct current establishment and immediate progression receipts.");
  }
  if(d.move_kind==="npc_attack"){
    const e=incomingMoveProof(db,guild,t,context,{terminal:true}),before=target(db,guild,context);
    if(d.target!==e.row.record_key||d.incoming_attack_ref!==e.row.record_key||d.incoming_roll_ref!==e.roll.record_key
      ||d.incoming_effect_ref!==(e.effect?.record_key||null)||hash(d.before)!==hash(before)
      ||hash(d.after)!==hash({...before,native_outcome:{roll:e.roll.record_key,effect:e.effect?.record_key||null}}))
      fail("Exact separate native NPC effect required; Fear accounting never substitutes for PC damage.");
  }
  return row;
}
export function renderFearEffect(db,guild,key,scope){
  const row=validateFearEffect(db,guild,key),d=row.data;
  if(row.visibility!=="party"&&!(row.visibility==="character"&&scope.mode==="private"&&row.subject_key===scope.actorCharacterId))
    fail("Fear consequence is not authorized for this output audience.");
  return d.move_kind==="clock_advance"?`An established scene countdown advanced by one step (${d.after.value}/${d.after.max_value}).`
    :d.move_kind==="clock_create_and_advance"?`A new scene-pressure clock was established and advanced once (${d.after.value}/${d.after.max_value}).`
    :d.move_kind==="npc_attack"?"An established adversary's immediate standard attack has a saved native outcome. No character reaction or disclosure is implied."
    :d.move_kind==="npc_prepare"?"An established adversary has taken an immediate native preparation action. No PC response or damage is implied."
      :d.move_kind==="npc_introduce_or_escalate"?"Local service area interrupted by a newly established NPC through a saved native consequence. No PC response, attack or damage is implied."
      :"An established local entrance is now locked. No character action or reaction is implied.";
}
/** Exactly-once bounded internal delegate. No caller-supplied authority or model-selected native delta. */
export function resolveAutonomousPvpFear(db,guild,key,{proposeThreat=defaultFearNpcProposal,library,rng}={}){
  const t=db.getCityRecord(guild,"pvp_fear_trigger",key);
  if(!t)return null;
  if(t.status==="resolved")return validateFearEffect(db,guild,t.data.effect);
  if(t.status==="awaiting_pair")return {status:"awaiting_pair",trigger:key};
  if(t.status==="needs_review")return {status:"needs_review",trigger:key,reason:t.data.review_reason};
  if(db.getCityCalendar(guild).flags.autonomous_pvp_fear===false
    ||["move_selected","executing"].includes(t.status)
      &&db.getCityRecord(guild,"pvp_fear_move_decision",t.data.decision)?.data.authority!=="autonomous_v1")
    return {status:"awaiting_manual",trigger:key};
  try{
    const {p,gate}=triggerProof(db,guild,key,{allowDeferred:true});
    const order=t.data.version===2?orderedBrawlFear(db,guild,db.getCityRecord(guild,"pvp_attack_request",t.data.round))
      :gate.data.expected_fear_trigger_ids.map(id=>db.getCityRecord(guild,"pvp_fear_trigger",id)).filter(row=>row.status!=="resolved");
    if(order.length&&order[0].record_key!==key)return {status:"awaiting_prior_fear",trigger:key,prior:order[0].record_key};
    triggerProof(db,guild,key);
    let current=db.getCityRecord(guild,"pvp_fear_trigger",key),decision;
    if(current.data.decision&&["move_selected","executing"].includes(current.status))
      decision=decisionProof(db,guild,current,current.data.decision);
    else{
      const context=createAutonomousFearContext(db,guild,t,p,proposeThreat),before=target(db,guild,context);
      decision=selectMove(db,guild,"autonomous_pvp_fear",{trigger:key,expected_revision:current.data.revision,context:context.record_key,
        expected_target_revision:hash(before),affected_actions:autonomousInvestigationHolds(db,guild,p,context)},
      {gm:AUTO_FE,interactionId:`autonomous-select:${key}`});
    }
    const context=contextProof(db,guild,decision.data.context);
    if(context.data.move_kind==="npc_attack"){
      const incoming=incomingMoveProof(db,guild,current,context);
      if(incoming.row.status==="ready"&&!incoming.row.data.roll){
        const nativeLibrary=library||(fearNpcContent?.root?new EncounterLibrary(fearNpcContent.root):null);
        if(!nativeLibrary)fail("Native encounter library required for autonomous standard attack; owner choices remain pending.");
        rollAutonomousFearIncomingAttack(db,guild,incoming.row.record_key,{library:nativeLibrary,rng});
      }
    }
    current=db.getCityRecord(guild,"pvp_fear_trigger",key);
    return applyMove(db,guild,"autonomous_pvp_fear",{trigger:key,expected_revision:current.data.revision,decision:decision.record_key},{gm:AUTO_FE});
  }catch(error){
    if(error.code==="NATIVE_EFFECT_PENDING")return {status:"awaiting_owner",trigger:key,reason:error.message};
    if(!["NARRATIVE_PVP","PC_EFFECT_AUTHORITY","PC_NATIVE_ELIGIBILITY"].includes(error.code))throw error;
    const latest=db.getCityRecord(guild,"pvp_fear_trigger",key);
    if(latest&&latest.status!=="resolved")db.transaction(()=>{
      db.audit(guild,latest.data.session,"system","autonomous_pvp_fear","pvp_fear_needs_review",
        {trigger:key,revision:latest.data.revision,reason:error.message,canonical:false});
      db.saveCityRecord(guild,{...latest,key:latest.record_key,status:"needs_review",data:{...latest.data,
        revision:latest.data.revision+1,review_reason:error.message}});
    });
    return {status:"needs_review",trigger:key,reason:error.message};
  }
}
/** One bounded startup/resume pass. Reviewed/invalidated obligations and dice are never retried. */
export function resumeAutonomousPvpFear(db,guild,{limit=12,proposeThreat=defaultFearNpcProposal,library,rng}={}){
  if(db.getCityCalendar(guild).flags.autonomous_pvp_fear===false)return [];
  const pending=all(db,guild,"pvp_fear_trigger").filter(t=>t.status==="awaiting_move"
    ||["move_selected","executing"].includes(t.status)
      &&db.getCityRecord(guild,"pvp_fear_move_decision",t.data.decision)?.data.authority==="autonomous_v1")
    .sort((a,b)=>{
      if(a.data.proposal===b.data.proposal){
        if(a.data.version!==2&&b.data.version!==2&&a.data.round===b.data.round)return a.data.trigger_ordinal-b.data.trigger_ordinal;
        if(a.data.version===2&&b.data.version===2){
          const aa=db.getCityRecord(guild,"pvp_spotlight_opportunity",`${a.data.round}:opportunity`),
            bb=db.getCityRecord(guild,"pvp_spotlight_opportunity",`${b.data.round}:opportunity`);
          if(aa&&bb&&aa.data.window===bb.data.window)return aa.data.ordinal-bb.data.ordinal;
        }
      }
      return a.minute-b.minute||a.record_key.localeCompare(b.record_key);
    }).slice(0,Math.max(1,Math.min(20,limit)));
  return pending.map(t=>resolveAutonomousPvpFear(db,guild,t.record_key,{proposeThreat,library,rng}));
}
export function fearInbox(db,guild,user,{gm=false}={}){
  gmOnly(gm,user);
  return {pending:all(db,guild,"pvp_fear_trigger").filter(t=>t.status!=="resolved"),
    contexts:all(db,guild,"pvp_fear_context").filter(c=>c.status==="active").map(c=>({...c,target_revision:hash(target(db,guild,c))}))};
}
/** This records a failed authority/precondition check; it NEVER forgives a genuine obligation or hides the error. */
function holdForReview(db,guild,user,key,error){
  if(error.code!=="NARRATIVE_PVP")return;
  const t=db.getCityRecord(guild,"pvp_fear_trigger",key);
  if(!t||["resolved","awaiting_pair"].includes(t.status))return;
  db.transaction(()=>{
    const data={trigger:key,revision:t.data.revision,reviewed_by:user,reason:error.message,canonical:false};
    db.audit(guild,t.data.session,"human_gm",user,"pvp_fear_needs_review",data);
    db.saveCityRecord(guild,{...t,key:t.record_key,status:"needs_review",data:{...t.data,revision:t.data.revision+1,
      review_reason:error.message}});
  });
}
/** Repair selection only after current dice/owner/source proof succeeds. No waiver, source restoration, or PC authorship. */
export function reconcileFearMove(db,guild,user,input,{gm=false,interactionId}={}){
  gmOnly(gm,user);closed(input,["trigger","expected_revision"]);
  if(!interactionId||typeof interactionId!=="string")fail("Native recovery interaction required.");
  return db.transaction(()=>{
    const {t,p}=triggerProof(db,guild,input.trigger);
    if(t.data.revision!==input.expected_revision||!["needs_review","move_selected","executing"].includes(t.status))
      fail("Current held Fear revision required; no automatic waiver or execution.");
    if(db.getCityRecord(guild,"pvp_fear_effect_receipt",`pvp-fear-effect:${t.record_key}`))
      fail("Saved effect requires publication-only recovery; never reselect or execute.");
    if(t.status==="executing"){
      const decision=decisionProof(db,guild,t,t.data.decision),context=contextProof(db,guild,decision.data.context);
      if(hash(target(db,guild,context))!==decision.data.expected_target_revision
        ||context.data.move_kind==="npc_prepare"&&hash(npcPreparation(db,guild,context.data.target_key,context.location_key,context.visibility))!==decision.data.native_context_hash)
        fail("Interrupted executing state changed; audited native-effect investigation required.");
    }
    const details={version:1,trigger:t.record_key,revision:t.data.revision,reviewer:user,previous_status:t.status,
      previous_decision:t.data.decision||null,disposition:"reselect_current_native_context_no_effect_waived"};
    const s=indexWorldEvent(db,guild,{key:`pvp-fear-recovery:${hash([guild,user,interactionId])}`,kind:"pvp_fear_recovery",
      source_id:`gm:${user}`,visibility:"gm",title:"Authenticated Fear selection recovery",scene:p.data.scene,session_id:p.data.session_id,details},user);
    if(s.status!=="active"||hash(s.details)!==hash(details))fail("Recovery interaction/revision changed.");
    const decision=t.data.decision&&db.getCityRecord(guild,"pvp_fear_move_decision",t.data.decision);
    if(decision)db.saveCityRecord(guild,{...decision,key:decision.record_key,status:"superseded"});
    db.saveCityRecord(guild,{kind:"pvp_fear_recovery",key:s.event_key,source_event:s.event_key,visibility:"gm",data:details});
    return db.saveCityRecord(guild,{...t,key:t.record_key,status:"awaiting_move",data:{...t.data,
      decision:null,review_reason:null,revision:t.data.revision+1}});
  });
}
