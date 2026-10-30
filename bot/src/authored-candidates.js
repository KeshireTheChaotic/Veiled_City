/** Source-backed semantic candidates from the existing GM call. Native consequences remain separate. */
import {intentSessionPrincipal} from './frameworks/intent/public.js';
function conversationPrincipal(...args){return intentSessionPrincipal.conversationPrincipal(...args);}
import { contextSourceKey } from "./narrative-context.js";
import { interpretAuthoredText, captureDeclaration } from "./frameworks/intent/public.js";
import {intentSessionEntry} from "./frameworks/intent/public.js";
function prepareSceneEntry(...args){return intentSessionEntry.prepareSceneEntry(...args);}
import {intentSessionDialogue} from './frameworks/intent/public.js';
const {captureDialogue}=intentSessionDialogue;
import {intentSessionScene} from './frameworks/intent/public.js';
const {currentScene}=intentSessionScene;
import {sourceSpanInsideQuote,isCharacterSourceSpan} from './frameworks/intent/public.js';
import {explicitSilence} from './frameworks/intent/public.js';
import {authoredCandidatesSchema,currentAuthoredCandidatesSchema,AUTHORED_CANDIDATES_PROMPT} from './frameworks/intent/authored-candidate-schema.js';
export {authoredCandidatesSchema,currentAuthoredCandidatesSchema,AUTHORED_CANDIDATES_PROMPT};
export function persistAuthoredCandidates(db,guild,candidates,scope,provenance={}){
  if(candidates==null)return [];
  if(!Array.isArray(candidates)||candidates.length>6)throw new Error("Bounded authored candidates required.");
  if(candidates.length&&db.getCityCalendar(guild).flags.natural_language!==true)throw new Error("Natural-language candidates are opt-in.");
  const principal=conversationPrincipal(db,guild,scope.actorUserId,scope.actorCharacterId);
  const source=db.getWorldEvent(guild,contextSourceKey(provenance.messageId,principal.character_id));
  if(!provenance.messageId||!source||source.status!=="active"||source.details.author!==principal.user
    ||source.details.principal?.revision!==principal.revision||source.details.private_scene!==(scope.mode==="private")
    ||!db.ownerAuthoredSource(guild,source.event_key,principal.user))throw new Error("Current authenticated candidate source required.");
  const authored=source.details.text;
  if(source.session_id!==db.getActiveSession(guild)?.id)throw new Error('Current candidate session required.');
  if(explicitSilence(authored)&&candidates.length)throw new Error('Explicit OOC is not native authored action.');
  return candidates.map((candidate,index)=>{
    const v2=candidate.version===2,fields=v2?'end,framing,kind,quote,source_ref,source_span,start,target,version':'kind,quote,source_ref,source_span,target';
    if(Object.keys(candidate).sort().join()!==fields||!["action","entry","speech"].includes(candidate.kind)
      ||typeof candidate.source_span!=="string"||!candidate.source_span.trim()||candidate.source_span.length>1500
      ||!authored.includes(candidate.source_span)||candidate.source_ref!==source.event_key
      ||typeof candidate.target!=="string"||candidate.target.length>160||typeof candidate.quote!=="string"||candidate.quote.length>1000)
      throw new Error("Exact current authored span required; quotation is not actor authorization.");
    const start=v2?candidate.start:authored.indexOf(candidate.source_span),end=v2?candidate.end:start+candidate.source_span.length;
    if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<=start||end>authored.length||authored.slice(start,end)!==candidate.source_span
      ||!v2&&authored.indexOf(candidate.source_span,start+1)!==-1)throw new Error('Candidate offsets/span must be unambiguous and exact.');
    if(v2&&!['immediate','hypothetical','conditional','quoted','reported','ooc'].includes(candidate.framing))throw new Error('Clause framing required.');
    if((!v2||candidate.framing==='immediate')&&!isCharacterSourceSpan(authored,start,end))throw new Error('Explicit OOC span is not an actor declaration.');
    if((!v2||candidate.framing==='immediate')&&sourceSpanInsideQuote(authored,start))throw new Error('Quoted source span is not actor authorization.');
    if(!v2){
      // Historical producer compatibility only: inspect the containing clause, never unrelated earlier sentences.
      const clause=authored.slice(Math.max(authored.lastIndexOf('.',start-1),authored.lastIndexOf(';',start-1),authored.lastIndexOf('\n',start-1))+1,end).trim();
      if(/^["“]/.test(candidate.source_span)||/^(?:he|she|they) (?:said|says|told)\b/i.test(clause)||interpretAuthoredText(clause,{natural:true}).kind==='planning_or_ooc')
        throw new Error('Hypothetical/quoted legacy clause requires scoped semantic review.');
    }
    if(!v2&&candidate.kind==="entry"&&(!candidate.target||!candidate.source_span.toLowerCase().includes(candidate.target.toLowerCase())))
      throw new Error("Native entry candidate needs an explicitly named target; contextual meaning can stay nonbinding.");
    if(candidate.kind==="speech"&&(!candidate.quote||!candidate.source_span.includes(candidate.quote)))throw new Error("Speech cannot be paraphrased as an utterance.");
    const scene=currentScene(db,guild),matching=v2&&db.listCityRecords(guild,{kind:'typed_intent',includeGM:true,limit:120}).filter(row=>
      row.status==='accepted_for_adjudication'&&row.data.actor===principal.character_id&&row.data.owner_user_id===principal.user
      &&row.data.actor_principal_revision===principal.revision&&row.data.session_id===scene.session_id&&row.data.scene===scene.key
      &&row.data.start===start&&row.data.end===end&&row.data.source_span===candidate.source_span&&row.data.framing==='immediate'
      &&db.getWorldEvent(guild,row.source_event)?.status==='active'&&db.getWorldEvent(guild,row.source_event)?.details.discord_message_id===provenance.messageId
      &&db.ownerAuthoredSource(guild,row.source_event,principal.user));
    const accepted=matching?.length===1?matching[0]:null,status=!v2?'pending':candidate.framing!=='immediate'?'interpretation_only':accepted?'pending':'needs_scope_review';
    const key=v2?`candidate:${source.event_key}:${start}:${end}:${candidate.kind}`:`candidate:${source.event_key}:${index}`,
      prior=db.getCityRecord(guild,"authored_candidate",key);if(prior)return prior;
    const row=db.saveCityRecord(guild,{kind:"authored_candidate",key,status,source_event:source.event_key,
      visibility:"character",subject_key:principal.context_id,data:{...candidate,start,end,principal:principal.revision,typed_intent_key:accepted?.record_key||null,
        authority:"Authored interpretation; not consent or completed consequences"}});
    // Compatibility candidates may stage pending, source-backed review records. They never execute movement,
    // consent, spending or rolls; accepted typed intents own the normal immediate route.
    if(!v2&&principal.kind==="owner"){
      if(candidate.kind==="entry")prepareSceneEntry(db,guild,principal.user,principal.character_id,provenance.messageId,authored,
        {privateScene:scope.mode==="private",candidate});
      if(candidate.kind==="action")captureDeclaration(db,guild,principal.user,principal.character_id,provenance.messageId,authored,{candidate,privateScene:scope.mode==="private"});
      if(candidate.kind==="speech")captureDialogue(db,guild,principal.user,principal.character_id,provenance.messageId,authored,
        {privateScene:scope.mode==="private",candidate});
    }
    return row;
  });
}
