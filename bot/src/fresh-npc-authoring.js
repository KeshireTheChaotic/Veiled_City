/** Audience-isolated fresh NPC utterances. Authoring provenance is NOT proof of their truth or a PC effect. */
import {createHash} from 'node:crypto';
import {gmWorldScope} from './frameworks/narrative/public.js';
import {narrativeWorldPrimitives} from './frameworks/narrative/public.js';
const {indexWorldEvent}=narrativeWorldPrimitives;
import {narrativeSessionPrincipal} from './frameworks/narrative/public.js';
function conversationPrincipal(...args){return narrativeSessionPrincipal.conversationPrincipal(...args);}
import {portrayalPacket} from './frameworks/narrative/public.js';
import {freshNpcFocuses as focuses} from './gm-fiction-schema.js';
export {freshNpcRequestSchema,freshNpcResponseSchema} from './gm-fiction-schema.js';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const issuer='native:fresh-npc-authoring';
export const FRESH_NPC_INSTRUCTIONS='Author one fresh, natural NPC utterance using ONLY this audience-restricted packet. '
  +'You control the speaker’s words, not any PC. Ask open questions, make nonbinding offers, or warn of attempts; never assert '
  +'PC choices, consent, injury, possession, capture, knowledge, spending, dice, or completed uncertain outcomes. '
  +'Visible knowledge constrains what the speaker knows; it is not permission to invent secrets or capabilities. '
  +'No supplied knowledge means no invented factual exposition. Return only {"utterance":"..."}. '
  +'This utterance will be explicitly attributed, never treated as objective world or PC state.';
function fail(code='NPC_AUTHORING_SCOPE'){throw Object.assign(new Error('Fresh NPC authoring needs current source, NPC, audience and authoring provenance.'),{code,expected:true});}
function shape(input){
  if(!input||Object.keys(input).sort().join(',')!=='entity_key,focus,kind,source_refs,version'||input.version!==3
    ||input.kind!=='npc_fresh_request'||typeof input.entity_key!=='string'||!/^[a-z0-9][a-z0-9-]{0,159}$/.test(input.entity_key)
    ||!focuses.includes(input.focus)||!Array.isArray(input.source_refs)||input.source_refs.length>6
    ||new Set(input.source_refs).size!==input.source_refs.length
    ||input.source_refs.some(ref=>typeof ref!=='string'||!ref||ref.length>200))fail();
}
import {hasPcReference} from './frameworks/narrative/public.js';
export {hasPcReference};
function visible(source,scope){return ['party','public'].includes(source.visibility)
  ||scope.mode==='private'&&source.visibility==='character'&&source.subject_key===scope.actorCharacterId;}
const normalizeScope=scope=>({mode:scope.mode==='private'?'private':'party',actorUserId:scope.actorUserId||null,
  actorCharacterId:scope.actorCharacterId||null});
function envelope(db,guild,request,scope,sourceRef){
  scope=normalizeScope(scope);shape(request);const state=gmWorldScope(db,guild,request.entity_key,scope),source=db.getWorldEvent(guild,sourceRef);
  state.control_history=hash(db.listNpcProxies(state.session).filter(row=>row.npc_key===request.entity_key)
    .map(row=>[row.id,row.control_revision,row.status]));
  if(!source||source.status!=='active'||source.session_id!==state.session||source.scene!==state.scene
    ||!visible(source,scope)&&!(source.kind==='native_fresh_authoring_scope'&&source.source_id===issuer))fail();
  if(source.kind==='ai_gm_input'&&(!db.ownerAuthoredSource(guild,source.event_key,scope.actorUserId)
    ||source.details.character_id!==scope.actorCharacterId||source.details.revision!==
      conversationPrincipal(db,guild,scope.actorUserId,scope.actorCharacterId).revision))fail();
  const knowledge=db.listNpcKnowledge(guild,request.entity_key,{limit:500}),evidence=[];
  for(const ref of request.source_refs){
    const s=db.getWorldEvent(guild,ref),k=knowledge.find(row=>row.source_ref===ref&&!row.is_secret&&row.belief_state==='known');
    // A public observation is not arbitrary profile prose. Both its exact content and this NPC's knowledge must agree.
    if(!s||s.status!=='active'||!visible(s,scope)||s.kind!=='observation'||s.truth_status!=='observed'
      ||s.session_id!==state.session||s.scene!==state.scene||s.location_key!==state.location
      ||s.details.npc_key!==request.entity_key||!k||k.content!==s.details.quote||k.content.length>1400)fail();
    evidence.push({ref,source_hash:hash(s),knowledge_key:k.knowledge_key,knowledge_hash:hash(k),content:k.content});
  }
  return {version:1,issuer,policy:'attributed_npc_utterance_v1',request,scope:{...scope},state,
    origin:source.event_key,origin_hash:hash(source),evidence};
}
function key(binding){return `npc-fresh:${hash(binding)}`;}
function hold(db,guild,request,scope,sourceRef,reason){
  const ref=`npc-authoring-hold:${hash([request,scope,sourceRef,reason])}`;
  if(!db.getCityRecord(guild,'npc_authoring_hold',ref))db.saveCityRecord(guild,{kind:'npc_authoring_hold',key:ref,
    status:'needs_scope_review',visibility:'gm',source_event:sourceRef,data:{version:1,reason,canonical:false}});
}
function validateWords(db,guild,words){
  if(typeof words!=='string'||!words.trim()||words.length>1400||/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(words)
    ||hasPcReference(db,guild,words))fail('NPC_AUTHORING_WORDS');
}
import {quoteNpcWords} from './frameworks/narrative/public.js';
export {quoteNpcWords};
export function renderFreshNpcPart(db,guild,id,scope){
  const row=db.getCityRecord(guild,'npc_fresh_authoring',id),d=row?.data,s=row&&db.getWorldEvent(guild,row.source_event);
  if(!d||row.status!=='authored'||d.version!==1||d.issuer!==issuer||s?.status!=='active'
    ||s.kind!=='native_fresh_npc_utterance'||s.source_id!==issuer||hash(s.details)!==hash(d)
    ||hash(normalizeScope(scope))!==hash(d.scope)||row.visibility!=='gm')fail();
  const {utterance,semantic_verification,...binding}=d;
  if(semantic_verification!==false||id!==key(binding)||hash(envelope(db,guild,d.request,scope,d.origin))!==hash(binding))fail();
  validateWords(db,guild,utterance);
  return '**NPC dialogue — attributed, nonbinding speech; no PC outcome:**\n'+quoteNpcWords(utterance);
}
export function findFreshNpcPart(db,guild,request,scope,sourceRef){
  scope=normalizeScope(scope);
  if(!sourceRef){
    const state=gmWorldScope(db,guild,request.entity_key,scope),details={issuer,state,scope};
    sourceRef=db.getWorldEvent(guild,`fresh-scope:${hash(details)}`)?.event_key;
  }
  const binding=envelope(db,guild,request,scope,sourceRef),id=key(binding);
  renderFreshNpcPart(db,guild,id,scope);return db.getCityRecord(guild,'npc_fresh_authoring',id);
}
/** Responsiveness only, not a publication/effect capability. Full native preview/commit still revalidates the speech. */
export function hasFreshNpcResponse(db,guild,result,scope,sourceRef){
  for(const request of result.gm_world_parts||[]){
    if(request?.version!==3)continue;
    try{if(findFreshNpcPart(db,guild,request,scope,sourceRef))return true;}
    catch(error){if(!['GM_WORLD_NARRATIVE','NPC_AUTHORING_SCOPE','NPC_AUTHORING_WORDS'].includes(error.code))throw error;}
  }
  return false;
}
/** One conditional isolated writer per logical turn, including replacements. No after-commit generation or model receipt. */
export async function authorFreshNpcRequests({db,guild,result,scope,sourceRef,generate,budget}){
  scope=normalizeScope(scope);
  if(result.respond===false||result.act===false)return;
  const requests=(result.gm_world_parts||[]).filter(input=>input?.version===3);
  if(!db.getActiveSession(guild)){
    for(const request of requests)hold(db,guild,request,scope,sourceRef,'active_scene_required');return;
  }
  for(const request of requests){
    let attemptKey;
    try{
      if(!sourceRef){
        const state=gmWorldScope(db,guild,request.entity_key,scope),details={issuer,state,scope};
        sourceRef=indexWorldEvent(db,guild,{key:`fresh-scope:${hash(details)}`,kind:'native_fresh_authoring_scope',
          title:'Native NPC authoring context, not a PC action',source_id:issuer,visibility:'gm',
          session_id:state.session,scene:state.scene,details},issuer).event_key;
      }
      const binding=envelope(db,guild,request,scope,sourceRef),id=key(binding);
      if(db.getCityRecord(guild,'npc_fresh_authoring',id)){renderFreshNpcPart(db,guild,id,scope);continue;}
      attemptKey=`npc-authoring-attempt:${hash([sourceRef,scope])}`;
      if(budget.used||db.getCityRecord(guild,'npc_authoring_attempt',attemptKey)
        ||db.getCityRecord(guild,'scene_authoring_attempt',`scene-authoring-attempt:${hash([sourceRef,scope])}`)){
        hold(db,guild,request,scope,sourceRef,'authoring_budget_exhausted_or_interrupted');continue;
      }
      budget.used=true;
      // Never serialize binding/profile/GM context, player text, other owners, hidden locations or true NPC keys to this writer.
      const packet={version:1,speaker_token:'npc_1',focus:request.focus,audience:scope.mode==='private'?'private':'party',
        visible_knowledge:binding.evidence.map(e=>e.content),
        public_voice_direction:portrayalPacket(db,guild,request.entity_key,{publicVoice:true})?.direction||{}};
      db.saveCityRecord(guild,{kind:'npc_authoring_attempt',key:attemptKey,status:'authoring',visibility:'gm',
        source_event:sourceRef,data:{version:1,authoring:id,context_hash:hash(packet)}});
      const answer=await generate(packet);
      if(!answer||Object.keys(answer).join(',')!=='utterance')fail('NPC_AUTHORING_WORDS');
      validateWords(db,guild,answer.utterance);
      if(hash(envelope(db,guild,request,scope,sourceRef))!==hash(binding))fail();
      const data={...binding,utterance:answer.utterance,semantic_verification:false};
      db.transaction(()=>{
        const s=indexWorldEvent(db,guild,{key:`${id}:source`,kind:'native_fresh_npc_utterance',title:'Attributed NPC speech only',
          source_id:issuer,session_id:binding.state.session,scene:binding.state.scene,visibility:'gm',details:data},issuer);
        db.saveCityRecord(guild,{kind:'npc_fresh_authoring',key:id,status:'authored',visibility:'gm',source_event:s.event_key,data});
        const attempt=db.getCityRecord(guild,'npc_authoring_attempt',attemptKey);
        db.saveCityRecord(guild,{...attempt,key:attemptKey,status:'authored'});
      });
    }catch(error){
      if(!['GM_WORLD_NARRATIVE','NPC_AUTHORING_SCOPE','NPC_AUTHORING_WORDS','NPC_AUTHORING_PROVIDER','NPC_AUTHORING_PARSE'].includes(error.code))throw error;
      const attempt=attemptKey&&db.getCityRecord(guild,'npc_authoring_attempt',attemptKey);
      if(attempt)db.saveCityRecord(guild,{...attempt,key:attemptKey,status:'needs_scope_review'});
      hold(db,guild,request,scope,sourceRef,error.code);
    }
  }
}
