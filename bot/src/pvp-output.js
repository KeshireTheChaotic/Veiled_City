/** Receipt-rendered output authority, independent of triggering user. Raw candidates never certify their own contents. */
import { createHash } from "node:crypto";
import { currentScene } from "./scene-continuity.js";
import { conversationPrincipal } from "./conversation-principal.js";
import { pvpProjection, validatePvpClause } from "./pvp-authorship.js";
import { observationQueries, ambientWorldQueries, renderObservation } from "./character-observation.js";
import { activeEvidence, objectiveEvidence,evidenceType } from "./epistemic.js";
import { renderFearEffect } from "./pvp-fear-moves.js";
import { indexWorldEvent } from "./city-calendar.js";
import {renderContinuationNotice} from "./action-continuation.js";
import {renderNativeNotice} from "./native-notice.js";
import {establishGmWorldPart,renderGmWorldPart} from "./gm-world-narrative.js";
import {operationalMetrics} from './operational-metrics.js';
import {decodeNonmaterialGrammar,establishGrammarScope,renderNonmaterialGrammar,grammarHash} from './nonmaterial-grammar.js';
import {splitDiscordText} from './discord/chunking.js';
import {findFreshNpcPart,renderFreshNpcPart,hasPcReference} from './fresh-npc-authoring.js';
import {nativeHookProjection} from './native-hook-output.js';
import {nativeOutcomeProjection} from './native-outcome-output.js';
import {validatePostTurnStateReview} from './director.js';
import {projectSceneDescription,defaultSceneDescription} from './scene-description.js';
import {turnTraceFor} from './turn-trace-context.js';
import {assemblyOrientation} from './assembly-state.js';
import {findFreshScenePart,renderFreshScenePart} from './fresh-scene-authoring.js';
import {establishSceneFiction,renderSceneFiction,holdSceneFiction} from './scene-fiction-authority.js';
import {establishNarrativeUnits,renderNarrativeUnit} from './narrative-authority.js';
import {validateNarrativeCompleteness} from './narrative-completeness.js';

const hash=v=>createHash("sha256").update(JSON.stringify(v??null)).digest("hex");
const prepared=new WeakMap();
const archiveCaptures=new WeakMap();
const neutral="No additional character response has been established. Independently authorized actions remain in effect.";
const disclosureDependencies=['events','world_additions','scene_actions','world_conflicts','context_memories','handouts',
  'relationships','npc_memories','npc_knowledge','npc_goals','canon_proposals','simulation_updates','ai_intents','authored_candidates',
  'ordinary_effect_proposals','narrative_interpretation'];
/** Conservative separation proof, not a waiver of disclosure/knowledge authority or arbitrary prose analysis. */
export function canQuarantineDisclosure(db,guild,output,claim,scope,eventResults){
  if(db.getCityCalendar(guild).flags.scoped_disclosure_recovery!==true)return false;
  const proof=prepared.get(output),span=claim.output_claim_span??claim.source_span;
  if(!proof||proof.scope!==hash(scope)||proof.fingerprint!==fingerprint(output)||eventResults?.length
    ||claim.action!=='disclosure'||claim.entity_type!=='world'||claim.actor||claim.authored_source_span
    ||claim.mutation_index!==-1||!span||proof.hasDisclosureDependencies)return false;
  // Only a whole independently held surface may be dropped. No substring/semantic guesses.
  const held=Object.values(proof.raw).filter(text=>text.trim());
  if(held.length!==1||held[0]!==span||Object.keys(proof.privateParts).length)return false;
  assertPvpOutput(db,guild,output,scope,{publication:true});
  return proof.parts.length>0&&proof.parts.every(ref=>{
    const part=validateOutputPart(db,guild,ref);
    if(part.data.text.includes(span)||claim.proposed&&part.data.text.includes(claim.proposed))return false;
    if(part.data.kind==='neutral')return true;
    if(part.data.kind!=='gm_world_narrative')return false;
    const input=db.getCityRecord(guild,'gm_world_narrative',part.data.ref)?.data.input;
    // Closed ephemeral atmosphere has no fact/text interpolation or secret-dependent effect.
    return input?.version===1&&input.kind==='scene_atmosphere';
  });
}
/** Optional-field recovery may carry only untrusted candidate data; every renderer still needs fresh native proof. */
export function restoreGmWorldCandidates(original,recovered){
  const proposals=prepared.get(original)?.drafts?.gm_world_parts;
  if(Array.isArray(proposals))recovered.gm_world_parts=structuredClone(proposals);
  return recovered;
}
function fail(){throw Object.assign(new Error("PvP output needs current independently verified clauses and audience proof."),{code:"NARRATIVE_PVP"});}
function records(db,guild,kind){
  const out=[];
  for(let offset=0;offset<10000;offset+=100){
    const page=db.listCityRecords(guild,{kind,includeGM:true,limit:100,offset});out.push(...page);
    if(page.length<100)return out;
  }
  fail(); // No silent truncation of a security boundary.
}
function protectedAgreements(db,guild){return [...records(db,guild,"pvp_proposal"),...records(db,guild,"pvp_encounter_contract")];}
/** Actual scene and recipient/control scope, not membership of the player who happened to post. */
export function protectedPvpScope(db,guild,scope={mode:"party"}){
  const session=db.getActiveSession(guild);if(!session)return [];
  const scene=currentScene(db,guild),roster=db.roster(session.id);
  let character=scope.actorCharacterId;
  if(scope.recipientUserId)character=db.activeAssignment(session.id,scope.recipientUserId)?.character_id;
  return protectedAgreements(db,guild).filter(p=>p.data.session_id===session.id&&p.data.scene===scene.key
    &&(scope.mode!=="private"?p.data.participants.some(w=>roster.some(r=>r.character_id===w.character))
      :!character||p.data.participants.some(w=>w.character===character)
        ||db.getCharacter(character)?.data.location===p.data.location_key));
}
/** A safe prose projection does not authorize a parallel free-text fact/reference mutation. */
export function assertProtectedModelEvents(db,guild,events,scope){
  if(!protectedPvpScope(db,guild,scope).length)return;
  for(const event of events||[]){
    if(!["fact","clue","canon","npc_update","location_update","thread"].includes(event.type))continue;
    const refs=event.epistemic?.source_refs||[];
    const existing=refs.map(ref=>db.getFact(guild,ref)).find(row=>row&&!row.archived&&row.content===event.value
      &&activeEvidence(db,guild,row.id)&&objectiveEvidence(db,guild,row)
      &&(["party","public"].includes(row.visibility)||scope.mode==="private"&&row.subject_character_id===scope.actorCharacterId));
    // Free text is not a native receipt. Existing exact facts may be recalled; new unsupported state fails/rolls back.
    if(!existing)fail();
  }
}
function surfaces(result){
  return ["narration","public_narration","player_summary"].map(k=>[k,String(result[k]||"")])
    .concat((result.private_messages||[]).map(m=>[`private:${m.discord_user_id}`,String(m.content||"")]));
}
function fingerprint(result){return hash(surfaces(result));}
/** Original annotations are validation inputs, not publication authority. Never reconstruct them from projected prose. */
export function candidateNarrative(result){
  const proof=prepared.get(result);
  if(proof&&proof.fingerprint!==fingerprint(result))fail();
  return structuredClone(proof?.candidate||{narration:result.narration||'',public_narration:result.public_narration||'',
    player_summary:result.player_summary||'',private_messages:result.private_messages||[],narrative_claims:result.narrative_claims||[],events:result.events||[]});
}
function audienceScope(scope,surface){
  if(!surface.startsWith("private:"))return scope;
  return {...scope,mode:"private",recipientUserId:surface.slice(8)};
}
function renderPart(db,guild,part){
  const {scope,scene,session,kind,ref}=part;
  if(!db.getActiveSession(guild)||currentScene(db,guild).key!==scene||db.getActiveSession(guild)?.id!==session)fail();
  const source=db.getWorldEvent(guild,part.source_ref);
  if(!source||source.status!=="active"||hash(source.details)!==part.source_hash)fail();
  if(part.principal_revision&&conversationPrincipal(db,guild,scope.actorUserId,scope.actorCharacterId).revision!==part.principal_revision)fail();
  if(scope.mode==="private"){
    const assignment=db.activeAssignment(session,scope.actorUserId);
    if(!assignment||assignment.character_id!==scope.actorCharacterId)fail();
  }
  if(kind==="neutral")return neutral;
  if(kind==='scene_fiction_review')return 'The surroundings could not be safely described from the current viewpoint. That description is held for review; independently authorized actions remain in effect.';
  if(kind==='gm_fresh_scene')return renderFreshScenePart(db,guild,ref,scope);
  if(kind==='gm_scene_fiction'){
    try{return renderSceneFiction(db,guild,ref,scope);}catch(error){if(error.code!=='SCENE_FICTION')throw error;fail();}
  }
  if(kind==='gm_narrative_unit'){
    try{return renderNarrativeUnit(db,guild,ref,scope);}catch(error){if(error.code!=='SCENE_FICTION')throw error;fail();}
  }
  if(kind==='assembly_orientation'){
    const projection=assemblyOrientation(db,guild,ref,scope);
    if(projection.revision!==part.projection_revision)fail();return projection.text;
  }
  if(kind==='scene_description'){
    const view=projectSceneDescription(db,guild,part.input,scope,part.source_ref);
    if(view.revision!==part.scene_revision)fail();return view.text;
  }
  if(kind==='native_simulation_hook'){
    const hook=nativeHookProjection(db,guild,ref,scope);if(hook.revision!==part.hook_revision)fail();return hook.text;
  }
  if(kind==='native_outcome'){
    const outcome=nativeOutcomeProjection(db,guild,part.input,scope);if(outcome.revision!==part.outcome_revision)fail();return outcome.text;
  }
  if(kind==="nonmaterial_grammar")return renderNonmaterialGrammar(db,guild,part);
  if(kind==="gm_world_narrative")return renderGmWorldPart(db,guild,ref,scope);
  if(kind==='gm_fresh_npc'){
    try{return renderFreshNpcPart(db,guild,ref,scope);}catch(error){
      if(!['GM_WORLD_NARRATIVE','NPC_AUTHORING_SCOPE','NPC_AUTHORING_WORDS'].includes(error.code))throw error;
      fail();
    }
  }
  if(kind==="action_continuation_notice")return renderContinuationNotice(db,guild,ref,scope);
  if(kind==="native_notice"){
    const n=db.getCityRecord(guild,"native_notice",ref);
    if(n?.status!=="verified"||scope.mode==="private"&&(n.data.user!==scope.actorUserId||n.data.character!==scope.actorCharacterId)
      ||scope.mode!=="private"&&n.data.user)fail();
    return renderNativeNotice(db,guild,n.data);
  }
  if(kind==="private_owner_clause"){
    const clause=validatePvpClause(db,guild,ref);
    if(scope.mode!=="private"||clause.subject_key!==scope.actorCharacterId
      ||clause.data.owning_user!==scope.actorUserId)fail();
    return clause.data.source_span;
  }
  if(kind==="owner_clause"){
    const projection=pvpProjection(db,guild,ref);
    if(scope.mode==="private"&&!protectedPvpScope(db,guild,scope).some(p=>p.record_key===projection.data.proposal))fail();
    return projection.data.text;
  }
  if(kind==="observation_answer"){
    const answer=renderObservation(db,guild,part.query,scope);
    if(part.evidence_refs&&hash(answer.proof_refs)!==hash(part.evidence_refs))fail();
    return answer.text;
  }
  if(kind==="pvp_fear_publication_part")return renderFearEffect(db,guild,ref,scope);
  if(kind==="verified_action"){
    const arrival=db.getWorldEvent(guild,ref),source=arrival&&db.getWorldEvent(guild,arrival.details.input_source);
    const pc=arrival&&db.getCharacter(arrival.details.entity_key);
    if(!arrival||arrival.status!=="active"||arrival.kind!=="arrival"||arrival.details.entity_type!=="character"
      ||arrival.scene!==scene||arrival.session_id!==session||source?.status!=="active"||source.kind!=="ai_gm_input"
      ||source.details.character_id!==pc?.id||arrival.details.owner_user_id!==pc.owner_user_id
      ||pc.data.location!==arrival.location_key||!db.ownerAuthoredSource(guild,source.event_key,pc.owner_user_id)
      ||conversationPrincipal(db,guild,pc.owner_user_id,pc.id).revision!==source.details.revision)fail();
    if(scope.mode!=="private"&&arrival.visibility!=="party"&&arrival.visibility!=="public")fail();
    if(scope.mode==="private"&&!["party","public"].includes(arrival.visibility)&&arrival.subject_key!==scope.actorCharacterId)fail();
    return `${pc.name} has arrived at ${arrival.location_key}.`;
  }
  fail();
}
function savePart(db,guild,part){
  if(part.kind==="observation_answer")part={...part,evidence_refs:renderObservation(db,guild,part.query,part.scope).proof_refs};
  const text=renderPart(db,guild,part),data={version:1,...part,text,content_hash:hash(text)},key=`pvp-output:${hash(data)}`;
  return db.getCityRecord(guild,"pvp_output_part",key)||db.saveCityRecord(guild,{kind:"pvp_output_part",key,
    status:"verified",visibility:part.scope.mode==="private"?"character":"party",subject_key:part.scope.actorCharacterId||null,
    source_event:part.source_ref,data});
}
function saveOutputGroup(db,guild,parts){
  const data={version:1,parts:parts.map(p=>p.record_key),text:parts.map(p=>p.data.text).join('\n')};
  const key=`output-group:${hash(data)}`;
  if(!db.getCityRecord(guild,'pvp_output_group',key))db.saveCityRecord(guild,{kind:'pvp_output_group',key,
    status:'verified',visibility:'gm',source_event:parts[0].source_event,data});
}
function reusableParts(db,guild,text,scope){
  if(scope.mode==='private'){
    const session=db.getActiveSession(guild),assignment=session&&db.activeAssignment(session.id,scope.actorUserId);
    if(!assignment||assignment.character_id!==scope.actorCharacterId||db.getCharacter(scope.actorCharacterId)?.owner_user_id!==scope.actorUserId)fail();
  }
  const candidates=records(db,guild,'pvp_output_part').filter(p=>p.data.text===text).map(p=>[p.record_key]);
  for(const group of records(db,guild,'pvp_output_group')){
    if(group.status==='verified'&&group.record_key===`output-group:${hash(group.data)}`&&group.data.text===text)
      candidates.push(group.data.parts);
  }
  for(const ids of candidates){
    try{
      const parts=ids.map(id=>validateOutputPart(db,guild,id));
      if(!parts.length||parts.map(p=>p.data.text).join('\n')!==text)continue;
      if(parts.some(p=>scope.mode!=='private'?p.visibility!=='party'||p.data.scope.mode==='private'
        :p.visibility!=='party'&&(p.visibility!=='character'||p.subject_key!==scope.actorCharacterId||p.data.scope.actorUserId!==scope.actorUserId)
          ||p.data.kind==='observation_answer'&&(p.data.query.observer!==scope.actorCharacterId||p.data.query.user!==scope.actorUserId)))continue;
      return ids;
    }catch(error){if(!['NARRATIVE_PVP','CHARACTER_OBSERVATION','WORLD_OBSERVATION'].includes(error.code))throw error;}
  }
  fail();
}
/** Native continuation status only; private source/owner proof revalidates at every output sink. */
export function prepareContinuationOutput(db,guild,task,scope){
  const source=db.getWorldEvent(guild,task.source_event),scene=currentScene(db,guild);
  const part=savePart(db,guild,{render_version:1,scene:scene.key,session:scene.session_id,scope:{...scope},origin:"native_continuation",
    kind:"action_continuation_notice",ref:task.record_key,source_ref:source?.event_key,source_hash:hash(source?.details),
    principal_revision:conversationPrincipal(db,guild,scope.actorUserId,scope.actorCharacterId).revision});
  const result={narration:part.data.text,player_summary:part.data.text,private_messages:[],narrative_claims:[]};
  prepared.set(result,{raw:{},drafts:{},parts:[part.record_key],scope:hash(scope),fingerprint:fingerprint(result)});return result;
}
export function prepareNativeNoticeOutput(db,guild,notice,scope){
  const source=db.getWorldEvent(guild,notice.source_event),scene=currentScene(db,guild);
  const part=savePart(db,guild,{render_version:1,scene:scene.key,session:scene.session_id,scope:{...scope},origin:"native_notice",
    kind:"native_notice",ref:notice.record_key,source_ref:source?.event_key,source_hash:hash(source?.details),
    principal_revision:scope.mode==="private"?conversationPrincipal(db,guild,scope.actorUserId,scope.actorCharacterId).revision:null});
  const result={narration:part.data.text,player_summary:part.data.text,private_messages:[],narrative_claims:[]};
  prepared.set(result,{raw:{},drafts:{},parts:[part.record_key],scope:hash(scope),fingerprint:fingerprint(result)});return result;
}
/** Native assembly UI plus independently validated GM fiction; raw model hooks never become authority. */
export function assemblyNarrativeCandidate(db,guild,sessionId,scope){
  const view=assemblyOrientation(db,guild,sessionId,scope),plan=db.getAssemblyPlan(sessionId)||{};
  const entry=scope.mode==='private'?(plan.character_entries||[]).find(e=>e.discord_user_id===scope.actorUserId):null;
  const candidate={narration:scope.mode==='private'?entry?.private_hook||'':plan.public_opening||'',private_messages:[],narrative_claims:[],
    gm_world_parts:(scope.mode==='private'?entry?.private_parts:plan.public_parts)||[]};
  if(!Array.isArray(candidate.gm_world_parts)||candidate.gm_world_parts.length>4)candidate.gm_world_parts=[];
  if(db.getCityCalendar(guild).flags.playable_narration===true&&scope.actorCharacterId)
    candidate.gm_world_parts=[...candidate.gm_world_parts.slice(0,3),{version:7,kind:'scene_fiction_request',operation:'describe_scene',source_refs:[]}];
  const source=indexWorldEvent(db,guild,{key:`assembly-scope:${hash(view.state)}`,kind:'native_assembly_scope',
    title:'Native assembly orientation scope',source_id:'native:assembly',visibility:scope.mode==='private'?'character':'party',
    subject_key:scope.mode==='private'?scope.actorCharacterId:null,session_id:sessionId,scene:view.state.scene,
    details:{version:1,revision:view.revision,scope}},'native:assembly');
  return {view,candidate,source};
}
export function prepareAssemblyOutput(db,guild,sessionId,scope){
  const {view,candidate,source}=assemblyNarrativeCandidate(db,guild,sessionId,scope);
  const inputs=structuredClone(candidate.gm_world_parts);
  prepareAuthorizedTurnOutput(db,guild,candidate,scope,{sourceRef:source.event_key,origin:'assembly-candidate'});
  // Assembly is not a replay of every saved Fear/PvP projection in this scene.
  const narrativeParts=prepared.get(candidate).parts.map(ref=>validateOutputPart(db,guild,ref)).filter(p=>
    ['gm_world_narrative','gm_fresh_npc','gm_scene_fiction'].includes(p.data.kind)||p.data.kind==='native_outcome'
      &&inputs.some(input=>hash(input)===hash(p.data.input)));
  const orientation=savePart(db,guild,{render_version:1,scene:view.state.scene,session:sessionId,scope:{...scope},origin:'native_assembly',
    kind:'assembly_orientation',ref:sessionId,projection_revision:view.revision,source_ref:source.event_key,source_hash:hash(source.details),
    principal_revision:view.state.principal});
  const parts=[orientation,...narrativeParts],text=parts.map(p=>p.data.text).join('\n');saveOutputGroup(db,guild,parts);
  const result={narration:text,player_summary:text,narrative_claims:[],private_messages:[]};
  prepared.set(result,{raw:{},drafts:{},parts:parts.map(p=>p.record_key),privateParts:{},scope:hash(scope),fingerprint:fingerprint(result)});
  return result;
}
export function prepareNativeHookOutput(db,guild,hook,scope){
  const projection=nativeHookProjection(db,guild,hook.id,scope),scene=currentScene(db,guild);
  const part=savePart(db,guild,{render_version:1,scene:scene.key,session:scene.session_id,scope:{...scope},origin:'native_hook',
    kind:'native_simulation_hook',ref:hook.id,hook_revision:projection.revision,
    source_ref:projection.source.event_key,source_hash:hash(projection.source.details)});
  const result={narration:part.data.text,player_summary:part.data.text,narrative_claims:[],private_messages:[]};
  prepared.set(result,{raw:{},drafts:{},parts:[part.record_key],scope:hash(scope),fingerprint:fingerprint(result)});return result;
}
export function validateOutputPart(db,guild,id){
  const row=db.getCityRecord(guild,"pvp_output_part",id),d=row?.data;
  if(!row||row.status!=="verified"||d.version!==1||id!==`pvp-output:${hash(d)}`
    ||hash(renderPart(db,guild,d))!==d.content_hash||hash(d.text)!==d.content_hash)fail();
  return row;
}
/** Trusted orchestration only; a model cannot manufacture the in-process capability or native proofs. */
export function prepareAuthorizedTurnOutput(db,guild,result,scope,{sourceRef=null,world=[],nativeEntries=[],nativeEffects=[],origin="turn"}={}){
  const prior=prepared.get(result),raw=prior?.raw||Object.fromEntries(surfaces(result));
  const hasDisclosureDependencies=prior?.hasDisclosureDependencies??(disclosureDependencies.some(field=>{
    const value=result[field];return Array.isArray(value)?value.length>0:!!value;
  })||(result.player_intents||[]).some(intent=>intent.type!=='other'||intent.framing!=='immediate'
    ||intent.resolution!=='conversational'||!['wait','describe_scene','current_situation'].includes(intent.operation)
    ||intent.gm_ruling||intent.native_adjudication));
  const candidate=candidateNarrative(result);
  const drafts=prior?.drafts||Object.fromEntries(["context_memories","handouts","npc_memories","npc_knowledge","npc_goals","gm_world_parts"]
    .map(field=>[field,result[field]||[]]));
  if(!db.getActiveSession(guild)){
    quarantineGeneratedOutput(db,guild,'no-active-scene',{raw,drafts,candidate,producer:origin});
    for(const field of ['narration','public_narration','player_summary'])if(field in result)result[field]='';
    for(const field of ['private_messages','narrative_claims',...Object.keys(drafts)])if(field in result)result[field]=[];
    prepared.set(result,{raw,drafts,candidate,hasDisclosureDependencies,parts:[],privateParts:{},scope:hash(scope),fingerprint:fingerprint(result),draftOnly:true});
    return result; // No fictional scene is fabricated. Independent native events still execute.
  }
  const proposals=protectedPvpScope(db,guild,scope);
  const queries=observationQueries(db,guild,result.player_intents||[],scope,sourceRef);
  if(proposals.length)queries.push(...ambientWorldQueries(db,guild,scope,sourceRef));
  const worldParts=[...(Array.isArray(drafts.gm_world_parts)?drafts.gm_world_parts:[]).slice(0,4),
    ...nativeEntries.map(ref=>({version:4,kind:'native_outcome',receipt_kind:'scene_entry',ref})),
    ...nativeEffects.filter(ref=>{
      const visibility=db.getCityRecord(guild,'ordinary_effect_receipt',ref)?.visibility;
      return visibility==='party'||scope.mode==='private'&&visibility==='character';
    })
      .map(ref=>({version:4,kind:'native_outcome',receipt_kind:'ordinary_effect_receipt',ref}))];
  if(result.act===false&&!surfaces(result).some(([,text])=>text.trim()))return result;
  operationalMetrics.record('narrative_projection',{guildId:guild});
  const scene=currentScene(db,guild),parts=[];
  const nativeSource=sourceRef||proposals[0]?.source_event||null;
  const common={render_version:1,scene:scene.key,session:scene.session_id,scope:{...scope},origin,
    source_ref:nativeSource,source_hash:hash(db.getWorldEvent(guild,nativeSource)?.details),
    principal_revision:scope.actorUserId&&scope.actorCharacterId
      ?conversationPrincipal(db,guild,scope.actorUserId,scope.actorCharacterId).revision:null};
  if(!proposals.length){
    const grammar=decodeNonmaterialGrammar(db,guild,raw.narration||raw.public_narration||'',scope);
    if(grammar){
      const source=sourceRef?db.getWorldEvent(guild,sourceRef):establishGrammarScope(db,guild,grammar,scope);
      parts.push(savePart(db,guild,{...common,kind:'nonmaterial_grammar',input_text:grammar.text,
        grammar_hash:grammarHash(grammar),source_ref:source.event_key,source_hash:hash(source.details)}));
    }
  }
  for(const proposal of worldParts){
    try{
      if(proposal?.version===8){
        for(const row of establishNarrativeUnits(db,guild,proposal,scope,sourceRef)){
          const event=db.getWorldEvent(guild,row.source_event);
          parts.push(savePart(db,guild,{...common,kind:'gm_narrative_unit',ref:row.record_key,source_ref:event.event_key,source_hash:hash(event.details)}));
        }continue;
      }
      if(proposal?.version===7){
        const row=establishSceneFiction(db,guild,proposal,scope,sourceRef),event=db.getWorldEvent(guild,row.source_event);
        parts.push(savePart(db,guild,{...common,kind:'gm_scene_fiction',ref:row.record_key,source_ref:event.event_key,source_hash:hash(event.details)}));continue;
      }
      if(proposal?.version===6){
        const row=findFreshScenePart(db,guild,proposal,scope,sourceRef),event=db.getWorldEvent(guild,row.source_event);
        parts.push(savePart(db,guild,{...common,kind:'gm_fresh_scene',ref:row.record_key,source_ref:event.event_key,source_hash:hash(event.details)}));continue;
      }
      if(proposal?.version===5){
        const view=projectSceneDescription(db,guild,proposal,scope,sourceRef);
        const trace=turnTraceFor(guild);if(trace)trace.category='observation';
        parts.push(savePart(db,guild,{...common,kind:'scene_description',input:proposal,scene_revision:view.revision}));continue;
      }
      if(proposal?.version===4){
        const outcome=nativeOutcomeProjection(db,guild,proposal,scope);
        parts.push(savePart(db,guild,{...common,kind:'native_outcome',input:proposal,outcome_revision:outcome.revision,
          source_ref:outcome.source.event_key,source_hash:hash(outcome.source.details)}));continue;
      }
      const fresh=proposal?.version===3;
      const row=fresh?findFreshNpcPart(db,guild,proposal,scope,sourceRef):establishGmWorldPart(db,guild,proposal,scope,{sourceRef,origin});
      const event=db.getWorldEvent(guild,row.source_event);
      parts.push(savePart(db,guild,{...common,kind:fresh?'gm_fresh_npc':"gm_world_narrative",ref:row.record_key,
        source_ref:event.event_key,source_hash:hash(event.details)}));
    }catch(error){
      if(!['SCENE_FICTION','SCENE_DESCRIPTION','SCENE_AUTHORING_SCOPE','SCENE_AUTHORING_WORDS','GM_WORLD_NARRATIVE','NPC_AUTHORING_SCOPE','NPC_AUTHORING_WORDS','NARRATIVE_PVP','PC_EFFECT_AUTHORITY','NATIVE_NOTICE'].includes(error.code))throw error;
      if(error.code==='SCENE_FICTION')holdSceneFiction(db,guild,proposal,scope,sourceRef,error.diagnostic?.category);
      // Unsupported parts stay in the private draft quarantine. Independent native work is preserved.
    }
  }
  if(!sourceRef&&parts.length){
    const source=db.getWorldEvent(guild,parts[0].source_event);
    common.source_ref=source.event_key;common.source_hash=hash(source.details);
  }
  for(const query of queries)parts.push(savePart(db,guild,{...common,kind:"observation_answer",query}));
  for(const action of world.filter(r=>r.status==="arrived"&&r.source_event))
    parts.push(savePart(db,guild,{...common,kind:"verified_action",ref:action.source_event}));
  for(const row of records(db,guild,"pvp_fear_effect_receipt")){
    if(row.data.scene!==scene.key||row.visibility!=="party"
      &&!(scope.mode==="private"&&row.visibility==="character"&&row.subject_key===scope.actorCharacterId))continue;
    try{parts.push(savePart(db,guild,{...common,kind:"pvp_fear_publication_part",ref:row.record_key}));}
    catch(error){
      if(error.code!=="NARRATIVE_PVP")throw error;
      // Hold this stale read-side projection only. Do not reexecute/revoke its saved effect or abort independent native actions.
      const key=`pvp-fear-publication-hold:${hash([row.record_key,sourceRef,origin,error.message])}`;
      if(!db.getCityRecord(guild,"pvp_fear_publication_hold",key))db.saveCityRecord(guild,{
        kind:"pvp_fear_publication_hold",key,status:"needs_review",visibility:"gm",source_event:row.source_event,
        data:{version:1,effect:row.record_key,scene:scene.key,reason:error.message,canonical:false,source_ref:sourceRef}});
    }
  }
  // Projection rows are independently revalidated; unapproved drafts are never candidates for rendering.
  for(const row of records(db,guild,"pvp_public_projection")){
    if(!proposals.some(p=>p.record_key===row.data.proposal)||row.data.version!==2)continue;
    try{parts.push(savePart(db,guild,{...common,kind:"owner_clause",ref:row.record_key}));}
    catch(e){if(e.code!=="NARRATIVE_PVP")throw e;} // Stale records stay inert; raw prose is not a fallback.
  }
  if(db.getCityCalendar(guild).flags.post_projection_answers===true&&!parts.some(p=>['scene_description','gm_fresh_scene','gm_scene_fiction','gm_narrative_unit'].includes(p.data.kind))&&sourceRef){
    const input=defaultSceneDescription(db,guild,scope,sourceRef);
    if(input){
      const trace=turnTraceFor(guild);if(trace)trace.category='observation';
      operationalMetrics.record('answerless_projection',{guildId:guild});
      const view=projectSceneDescription(db,guild,input,scope,sourceRef);
      parts.push(savePart(db,guild,{...common,kind:'scene_description',input,scene_revision:view.revision}));
    }
  }
  if(!parts.length&&db.getCityCalendar(guild).flags.playable_narration===true&&worldParts.some(p=>[7,8].includes(p?.version))&&sourceRef)
    parts.push(savePart(db,guild,{...common,kind:'scene_fiction_review'}));
  if(!parts.length){
    if(!common.source_ref){
      const details={version:1,issuer:'native:output-review',session:scene.session_id,scene:scene.key,
        scope:{...scope},origin,principal_revision:common.principal_revision};
      const source=indexWorldEvent(db,guild,{key:`output-review-scope:${hash(details)}`,kind:'native_output_review_scope',
        title:'Unresolved output review scope; no fictional outcome',source_id:details.issuer,visibility:'gm',
        session_id:scene.session_id,scene:scene.key,details},details.issuer);
      common.source_ref=source.event_key;common.source_hash=hash(source.details);
    }
    parts.push(savePart(db,guild,{...common,kind:"neutral"}));
  }
  if(parts.some(p=>p.data.kind==='neutral'))operationalMetrics.record('neutral_fallback',{guildId:guild});
  const text=parts.map(p=>p.data.text).join("\n"),quarantineKey=`pvp-quarantine:${hash([scene.key,origin,sourceRef,raw])}`;
  if(!db.getCityRecord(guild,"pvp_output_quarantine",quarantineKey))db.saveCityRecord(guild,{
    kind:"pvp_output_quarantine",key:quarantineKey,status:"needs_scope_review",visibility:"gm",source_event:common.source_ref,
    data:{version:1,scene:scene.key,session:scene.session_id,origin,source_ref:sourceRef,raw,drafts,candidate,
      hash:hash([raw,drafts,candidate]),canonical:false}});
  result.narration=text;
  if("public_narration" in result)result.public_narration=text;
  result.player_summary=text;result.private_messages=[];
  const privateParts={};
  // A proposed private message is only a lookup, never evidence. Preserve exact independently owner-authorized clauses.
  for(const [surface,content] of Object.entries(raw).filter(([s])=>s.startsWith("private:"))){
    const user=surface.slice(8),assignment=db.activeAssignment(scene.session_id,user);
    if(!assignment?.character_id||scope.mode==="private"&&user!==scope.actorUserId
      ||!db.roster(scene.session_id).some(r=>r.discord_user_id===user&&["present","late","guest"].includes(r.presence)))continue;
    for(const clause of records(db,guild,"pvp_narrative_clause")){
      if(clause.data.source_span!==content||clause.subject_key!==assignment.character_id||clause.data.owning_user!==user)continue;
      try{
        const privateScope={mode:"private",actorUserId:user,actorCharacterId:assignment.character_id};
        const source=db.getWorldEvent(guild,clause.source_event);
        const part=savePart(db,guild,{...common,scope:privateScope,kind:"private_owner_clause",ref:clause.record_key,
          source_ref:source?.event_key,source_hash:hash(source?.details),
          principal_revision:conversationPrincipal(db,guild,user,assignment.character_id).revision});
        privateParts[user]=[part.record_key];result.private_messages.push({discord_user_id:user,content:part.data.text});break;
      }catch(error){if(error.code!=="NARRATIVE_PVP")throw error;}
    }
  }
  if(scope.mode==='party')for(const ref of nativeEffects){
    const receipt=db.getCityRecord(guild,'ordinary_effect_receipt',ref);
    if(receipt?.visibility!=='character')continue;
    const privateScope={mode:'private',actorUserId:receipt.data.owner,actorCharacterId:receipt.data.actor};
    const input={version:4,kind:'native_outcome',receipt_kind:'ordinary_effect_receipt',ref};
    const outcome=nativeOutcomeProjection(db,guild,input,privateScope);
    const part=savePart(db,guild,{...common,scope:privateScope,kind:'native_outcome',input,outcome_revision:outcome.revision,
      source_ref:outcome.source.event_key,source_hash:hash(outcome.source.details)});
    privateParts[privateScope.actorUserId]=[...(privateParts[privateScope.actorUserId]||[]),part.record_key];
    const message=result.private_messages.find(m=>m.discord_user_id===privateScope.actorUserId);
    if(message)message.content+=`\n${part.data.text}`;
    else result.private_messages.push({discord_user_id:privateScope.actorUserId,content:part.data.text});
  }
  if("gm_notes" in result)result.gm_notes="Unverified generated prose is held in private scope review; native receipts are unchanged.";
  // Claims annotated against the quarantined paragraph are not claims about the renderer's output.
  result.narrative_claims=[];
  // Preserve source-owned descriptive referents, not the model's alleged facts or suppressed narration.
  // saveContextMemories takes the exact audience-bound source excerpt and ignores each proposed summary.
  const inputSource=sourceRef&&db.getWorldEvent(guild,sourceRef),inputText=inputSource?.details?.text||'';
  result.context_memories=inputSource?.status==='active'&&scope.actorUserId&&db.ownerAuthoredSource(guild,sourceRef,scope.actorUserId)
    ?(drafts.context_memories||[]).filter(row=>typeof row.name==='string'&&row.name&&inputText.toLocaleLowerCase().includes(row.name.toLocaleLowerCase())):[];
  for(const field of ["handouts","npc_memories","npc_knowledge","npc_goals"])
    if(result[field]?.length)result[field]=[];
  if(result.state_review_normalization?.version===1){
    const priorCorrections=result.state_review_normalization.corrections||[];
    validatePostTurnStateReview(result);
    const corrections=[...new Map([...priorCorrections,...result.state_review_normalization.corrections]
      .map(c=>[JSON.stringify(c),c])).values()];
    result.state_review_normalization={...result.state_review_normalization,normalized:corrections.length>0,corrections};
  }
  if("gm_world_parts" in result)result.gm_world_parts=[];
  if(JSON.stringify(raw)!==JSON.stringify(Object.fromEntries(surfaces(result)))){
    operationalMetrics.record('narrative_quarantine',{guildId:guild});
    operationalMetrics.incident('narrative',{guildId:guild,reference:quarantineKey,code:'NARRATIVE_PVP'});
  }
  saveOutputGroup(db,guild,parts);
  prepared.set(result,{raw,drafts,candidate,hasDisclosureDependencies,parts:parts.map(p=>p.record_key),privateParts,scope:hash(scope),fingerprint:fingerprint(result)});
  if(db.getCityCalendar(guild).flags.narrative_authority===true)result.narrative_completion=validateNarrativeCompleteness(db,guild,result,parts,worldParts);
  return result;
}
/** Direct unprepared boundaries reject. High-level callers deliberately prepare before entering them. */
export function assertPvpOutput(db,guild,result,scope={mode:"party"},{publication=false}={}){
  const proof=prepared.get(result);
  if(proof){
    if(proof.scope!==hash(scope)||proof.fingerprint!==fingerprint(result))fail();
    if(proof.draftOnly){if(publication)fail();return {publicationAuthorized:false};}
    for(const id of proof.parts)validateOutputPart(db,guild,id);
    for(const ids of Object.values(proof.privateParts||{}))for(const id of ids)validateOutputPart(db,guild,id);
    return {publicationAuthorized:true};
  }
  if(publication)fail();
  for(const [surface,text] of surfaces(result)){
    if(!text.trim())continue;
    const proposals=protectedPvpScope(db,guild,audienceScope(scope,surface));
    if(!proposals.length){
      if((result.narrative_claims||[]).length)continue; // Declared claims are still checked by their native validator; never queue authority.
      if(db.getActiveSession(guild)&&decodeNonmaterialGrammar(db,guild,text,audienceScope(scope,surface)))continue;
      if(hasPcReference(db,guild,text))fail();
      // Legacy validation can provisionally accept unowned scene prose, but never grants queue/send authority.
      // Identity scoping is conservative, NOT a semantic detector. Even accepted prose needs native preparation to publish.
      continue;
    }
    const row=records(db,guild,"pvp_public_projection").find(p=>p.data.text===text&&proposals.some(v=>v.record_key===p.data.proposal));
    if(!row)fail();pvpProjection(db,guild,row.record_key);
  }
  return {publicationAuthorized:false};
}
function publicationChunk(db,guild,publication,ids){
  if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length)fail();
  const parts=ids.map(id=>validateOutputPart(db,guild,id));
  const privateUser=publication.surface.startsWith('private_user:');
  if(!['party','private_scene'].includes(publication.surface)&&!privateUser)fail();
  for(const part of parts){
    const scope=part.data.scope;
    if(publication.surface==='party'){
      if(scope.mode==='private'||publication.visibility!=='party'||publication.target_user_id)fail();
    }else{
      const user=publication.target_user_id,character=publication.target_character_id,assignment=db.activeAssignment(part.data.session,user);
      if(publication.visibility!=='character'||!assignment||assignment.character_id!==character
        ||db.getCharacter(character)?.owner_user_id!==user||privateUser&&publication.surface!==`private_user:${user}`
        ||scope.mode==='private'&&(user!==scope.actorUserId||character!==scope.actorCharacterId)
        ||part.data.kind==='observation_answer'&&(character!==part.data.query.observer||user!==part.data.query.user))fail();
    }
  }
  const text=(privateUser?'**Veilkeeper — private:**\n':'')+parts.map(part=>part.data.text).join('\n');
  const chunks=splitDiscordText(text),siblings=db.listTurnPublications(guild,publication.turn_id)
    .filter(row=>row.surface===publication.surface);
  const index=siblings.findIndex(row=>row.id===publication.id);
  if(index<0||chunks[index]!==publication.payload)fail();
  return {text_hash:hash(text),chunk_index:index,chunk_count:chunks.length};
}
export function bindOutputPublication(db,guild,result,publication,payload){
  const proof=prepared.get(result);if(!proof||proof.fingerprint!==fingerprint(result))fail();
  const parts=publication.surface.startsWith("private_user:")?proof.privateParts?.[publication.target_user_id]:proof.parts;
  if(!parts?.length||payload!==publication.payload)fail();
  const chunk=publicationChunk(db,guild,publication,parts);
  db.saveCityRecord(guild,{kind:"pvp_output_publication",key:publication.id,status:"verified",visibility:"gm",
    source_event:validateOutputPart(db,guild,parts[0]).source_event,
    data:{version:2,parts,...chunk,turn:publication.turn_id,ordinal:publication.ordinal,
      payload_hash:hash(payload),surface:publication.surface,recipient:publication.target_user_id||null,
      visibility:publication.visibility,character:publication.target_character_id||null}});
}
export function revalidateOutputPublication(db,guild,row){
  const record=db.getCityRecord(guild,"pvp_output_publication",row.id);
  if(record){
    if(record.status!=="verified"||![1,2].includes(record.data.version)
      ||record.data.payload_hash!==hash(row.payload)||record.data.surface!==row.surface
      ||record.data.recipient!==(row.target_user_id||null)||record.data.visibility!==row.visibility
      ||record.data.character!==(row.target_character_id||null))fail();
    const chunk=publicationChunk(db,guild,row,record.data.parts);
    if(record.data.version===2&&(record.data.turn!==row.turn_id||record.data.ordinal!==row.ordinal
      ||['text_hash','chunk_index','chunk_count'].some(key=>record.data[key]!==chunk[key])))fail();
    for(const id of record.data.parts){
      const part=validateOutputPart(db,guild,id);
      if(part.visibility==="character"&&(row.visibility!=="character"||row.target_character_id!==part.subject_key
        ||row.target_user_id!==part.data.scope.actorUserId))fail();
      if(part.data.kind==="observation_answer"&&row.visibility!=="party"
        &&(row.target_character_id!==part.data.query.observer||row.target_user_id!==part.data.query.user))fail();
    }
  }else fail();
  return row;
}
/** Classify the actual acknowledged chunk from its native parts, never from a model's safety/response label. */
export function substantivePublication(db,guild,row){
  revalidateOutputPublication(db,guild,row);
  const proof=db.getCityRecord(guild,'pvp_output_publication',row.id),parts=proof.data.parts.map(id=>validateOutputPart(db,guild,id));
  const prefix=row.surface.startsWith('private_user:')?'**Veilkeeper — private:**\n':'';
  const text=prefix+parts.map(p=>p.data.text).join('\n'),chunks=splitDiscordText(text);
  const {chunk_index:index}=publicationChunk(db,guild,row,proof.data.parts);let cursor=0,start=0;
  for(let i=0;i<=index;i++){start=text.indexOf(chunks[i],cursor);if(start<0)fail();cursor=start+chunks[i].length;}
  let at=prefix.length;
  for(const part of parts){const end=at+part.data.text.length;
    if(!['neutral','scene_fiction_review'].includes(part.data.kind)&&start<end&&cursor>at)return true;at=end+1;
  }
  return false;
}
/** Conservative direct-delivery metric: mixed neutral groups are not counted here (outbox has exact chunk accounting). */
export function substantivePreparedOutput(db,guild,result,scope){
  assertPvpOutput(db,guild,result,scope,{publication:true});
  const proof=prepared.get(result);return proof.parts.length>0&&proof.parts.every(ref=>!['neutral','scene_fiction_review'].includes(validateOutputPart(db,guild,ref).data.kind));
}
export function deliveredPartyOutput(db,guild,turnId){
  return db.listTurnPublications(guild,turnId).filter(r=>r.status==="delivered"&&r.visibility==="party")
    .map(r=>revalidateOutputPublication(db,guild,r).payload).join("\n");
}

const archiveRowHash=row=>hash({kind:row.kind,key:row.record_key,status:row.status,visibility:row.visibility,
  subject:row.subject_key,source:row.source_event,data:row.data});
/** Snapshot a live-validated public dependency closure, not raw text or a GM approval. Hashes stay GM-private. */
export function captureOutputArchive(db,guild,publication){
  const proof=db.getCityRecord(guild,"pvp_output_publication",publication.id);
  if(!proof||publication.visibility!=="party")return null;
  revalidateOutputPublication(db,guild,publication);
  const inventory=records(db,guild,""),byKey=new Map(),refs=[],seen=new Set(),owners=new Map();
  for(const row of inventory){const list=byKey.get(row.record_key)||[];list.push(row);byKey.set(row.record_key,list);}
  function scan(value,field=""){
    if(seen.size>1000)fail();
    if(Array.isArray(value)){for(const item of value)scan(item,field);return;}
    if(value&&typeof value==="object"){
      for(const who of Array.isArray(value.participants)?value.participants:[])if(who.character&&who.user)owners.set(who.character,who.user);
      if(value.actorCharacterId&&value.actorUserId)owners.set(value.actorCharacterId,value.actorUserId);
      if(value.subject_character&&value.owning_user)owners.set(value.subject_character,value.owning_user);
      if(value.character&&value.user&&db.getCharacter(value.character))owners.set(value.character,value.user);
      for(const [k,v] of Object.entries(value))scan(v,k);return;
    }
    if(typeof value!=="string"&&!(Number.isSafeInteger(value)&&["roll_id","roll_refs"].includes(field)))return;
    if(["roll_id","roll_refs"].includes(field)){
      const roll=db.getSavedRoll(guild,value),key=`roll:${value}`;
      if(roll&&!seen.has(key)){seen.add(key);refs.push({type:"roll",key:value,digest:hash(roll)});}return;
    }
    const event=db.getWorldEvent(guild,value),eventKey=`event:${value}`;
    if(event&&!seen.has(eventKey)){
      if(event.status!=="active")fail();seen.add(eventKey);refs.push({type:"event",key:value,digest:hash(event)});scan(event.details);
    }
    const fact=db.getFact(guild,value),factKey=`fact:${value}`;
    if(fact&&!seen.has(factKey)){
      if(!['party','public'].includes(fact.visibility)||!activeEvidence(db,guild,fact.id))fail();
      seen.add(factKey);refs.push({type:'fact',key:fact.id,digest:hash(fact)});scan(evidenceType(fact).source_refs);
    }
    for(const row of byKey.get(value)||[]){
      const key=`${row.kind}:${value}`;if(seen.has(key))continue;seen.add(key);
      refs.push({type:"record",kind:row.kind,key:value,digest:archiveRowHash(row)});scan(row.source_event);scan(row.data);
      if(row.kind==="npc_attack_roll_receipt")scan(row.data.roll,"roll_id");
      // Party disclosure proofs are separate from content-authority clauses.
      if(row.kind==="pvp_authored_narrative")for(const share of inventory.filter(r=>r.kind==="pvp_narration_disclosure"&&r.data.narrative===value))scan(share.record_key);
    }
  }
  for(const id of proof.data.parts)scan(id);
  const attempt=db.getTurnAttempt(publication.turn_id);
  const capture={version:1,publication:publication.id,session:attempt.session_id,payload_hash:hash(publication.payload),
    refs,owners:[...owners].map(([character,user])=>({character,user})),authority:"Previously verified delivered output only; no new outcome or current observation."};
  archiveCaptures.set(capture,hash(capture));return capture;
}
function archiveEvidence(db,guild,data){
  for(const ref of data.refs){
    const row=ref.type==="record"?db.getCityRecord(guild,ref.kind,ref.key):ref.type==="event"?db.getWorldEvent(guild,ref.key)
      :ref.type==='fact'?db.getFact(guild,ref.key):db.getSavedRoll(guild,ref.key);
    if(!row||(ref.type==="record"?archiveRowHash(row):hash(row))!==ref.digest||ref.type==="event"&&row.status!=="active")fail();
    if(ref.type==='fact'&&(!['party','public'].includes(row.visibility)||!activeEvidence(db,guild,row.id)))fail();
  }
  for(const owner of data.owners)if(db.getCharacter(owner.character)?.owner_user_id!==owner.user)fail();
}
export function recordOutputArchive(db,guild,publication,data){
  if(!data)return;
  if(archiveCaptures.get(data)!==hash(data)||publication.status!=="delivered"||data.publication!==publication.id
    ||data.payload_hash!==hash(publication.payload))fail();
  archiveEvidence(db,guild,data);
  db.saveCityRecord(guild,{kind:"pvp_delivered_archive",key:publication.id,status:"verified",visibility:"gm",
    source_event:db.getCityRecord(guild,"pvp_output_publication",publication.id).source_event,
    data:{...data,digest:hash(data)}});
}
function archivedPublication(db,guild,row,sessionId){
  const certificate=db.getCityRecord(guild,"pvp_delivered_archive",row.id),{digest,...data}=certificate?.data||{};
  if(row?.status!=="delivered"||row.visibility!=="party"||certificate?.status!=="verified"||digest!==hash(data)
    ||data.publication!==row.id||data.payload_hash!==hash(row.payload)||sessionId&&data.session!==sessionId)fail();
  archiveEvidence(db,guild,data);return row.payload;
}
/** Receipt-rendered transcript excerpt, explicitly historical; no model synthesis enters shared archives. */
export function certifiedSessionRecap(db,guild,sessionId){
  const parts=[];
  for(const certificate of records(db,guild,"pvp_delivered_archive").reverse()){
    if(certificate.data.session!==sessionId)continue;
    const row=db.getPublication(guild,certificate.record_key);
    try{
      const text=archivedPublication(db,guild,row,sessionId);
      parts.push(text===neutral?`[Historical output-review acknowledgment, not a scene description or resolved action]\n${text}`:text);
    }catch(error){if(error.code!=="NARRATIVE_PVP")throw error;}
  }
  return parts.length?`Previously delivered, source-verified session excerpts (not new or current observations):\n\n${parts.join("\n\n")}`:"";
}
export function scopedSessionRecap(db,guild,session){
  return !session?'':certifiedSessionRecap(db,guild,session.id);
}
/** Reuse only a current native-rendered part at an exactly compatible audience. Raw hooks confer no claim authority. */
export function prepareStoredOutput(db,guild,text,scope){
  const parts=reusableParts(db,guild,text,scope);
  const result={narration:text,player_summary:text,narrative_claims:[],private_messages:[]};
  prepared.set(result,{raw:{},drafts:{},parts,scope:hash(scope),fingerprint:fingerprint(result)});
  return result;
}
export function quarantineSimulationHook(db,guild,hook){
  const key=`pvp-hook-review:${hash([hook.id,hook.data])}`;
  const source=indexWorldEvent(db,guild,{key,kind:"pvp_hook_review",title:"Unsupported hook held for source review",
    source_id:"native:hook-review",visibility:"gm",details:{hook:hook.id,canonical:false}},"native_output_guard");
  db.saveCityRecord(guild,{kind:"pvp_output_quarantine",key,status:"needs_scope_review",visibility:"gm",source_event:source.event_key,
    data:{version:1,origin:"simulation-hook",hook:hook.id,raw:{narration:hook.data.content},canonical:false}});
  return db.putSimulationRecord(guild,{...hook,id:hook.id,entityKey:hook.entity_key,status:"needs_scope_review",data:hook.data});
}
/** Missing output proof is a GM-private review, not a new fact, player choice or effect receipt. */
export function quarantineGeneratedOutput(db,guild,origin,raw,sessionId=null){
  const data={version:1,origin,session:sessionId,raw,canonical:false},key=`output-review:${hash(data)}`;
  const source=indexWorldEvent(db,guild,{key:`${key}:source`,kind:'native_output_review',source_id:'native:output-review',
    title:'Generated output held for source review',visibility:'gm',session_id:sessionId,details:{origin,canonical:false}},'native:output-review');
  return db.getCityRecord(guild,'pvp_output_quarantine',key)||db.saveCityRecord(guild,{kind:'pvp_output_quarantine',key,
    status:'needs_scope_review',visibility:'gm',source_event:source.event_key,data});
}
export function protectedHookSource(db,guild,hook){
  const context=hook.data.source_context;
  return protectedAgreements(db,guild).some(p=>!context||p.data.session_id===context.session&&p.data.scene===context.scene);
}
/** Archives can refer to earlier scenes/ended sessions. Current-trigger scope alone is not an archive authorization. */
export function archivePvpHistory(db,guild,sessionId=null){
  const session=sessionId||db.getActiveSession(guild)?.id;
  return protectedAgreements(db,guild).filter(p=>!session||p.data.session_id===session);
}
export function assertArchiveOutput(db,guild,text,{sessionId=null}={}){
  if(!String(text||"").trim())return;
  for(const certificate of records(db,guild,"pvp_delivered_archive")){
    const row=db.getPublication(guild,certificate.record_key);
    if(row?.payload===text){archivedPublication(db,guild,row,sessionId);return;}
  }
  if(sessionId&&text===certifiedSessionRecap(db,guild,sessionId))return;
  if(!db.getActiveSession(guild))fail();
  try{reusableParts(db,guild,text,{mode:'party'});return;}catch(error){if(error.code!=='NARRATIVE_PVP')throw error;}
  const projection=records(db,guild,"pvp_public_projection").find(r=>r.visibility==="party"&&r.data.text===text);
  if(projection){pvpProjection(db,guild,projection.record_key);return;}
  fail();
}
/** Ending a session does not certify the model's synthesis. Hold it outside shared facts, recaps and retrieval. */
export function quarantineSessionRecap(db,guild,session,text){
  const key=`pvp-quarantine:${hash([session.id,"session-recap",text])}`;
  const source=indexWorldEvent(db,guild,{key:`${key}:review`,kind:"pvp_archive_review",source_id:"native:recap-review",
    title:"Unverified archive held for source review",visibility:"gm",session_id:session.id,
    details:{session:session.id,content_hash:hash(String(text||"")),canonical:false}},"native_output_guard");
  return db.getCityRecord(guild,"pvp_output_quarantine",key)||db.saveCityRecord(guild,{
    kind:"pvp_output_quarantine",key,status:"needs_scope_review",visibility:"gm",source_event:source.event_key,
    data:{version:1,session:session.id,origin:"session-recap",raw:{narration:String(text||"")},canonical:false,
      reason:"Unverified archive synthesis; session closure supplies no PC authorship or disclosure authority."}});
}
