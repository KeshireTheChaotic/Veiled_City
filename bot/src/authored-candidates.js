/** Source-backed semantic candidates from the existing GM call. Native consequences remain separate. */
import { conversationPrincipal } from "./conversation-principal.js";
import { contextSourceKey } from "./narrative-context.js";
import { interpretAuthoredText, captureDeclaration } from "./player-language.js";
import { prepareSceneEntry } from "./scene-entry.js";
import { captureDialogue } from "./dialogue-continuity.js";
export const authoredCandidatesSchema={anyOf:[{type:"null"},{type:"array",maxItems:6,items:{type:"object",additionalProperties:false,
  properties:{kind:{type:"string",enum:["action","entry","speech"]},source_ref:{type:"string",maxLength:200},
    source_span:{type:"string",maxLength:1500},target:{type:"string",maxLength:160},quote:{type:"string",maxLength:1000}},
  required:["kind","source_ref","source_span","target","quote"]}}]};
export const AUTHORED_CANDIDATES_PROMPT="authored_candidates is optional source-span-backed extraction of the current authored message, not world truth. "
  +"Understand fragments, indirect actions, unquoted dialogue and multiword names. Copy source_span as the whole authored clause including speech attribution, and spoken quote exactly; source_ref is the supplied current input_source. "
  +"Do not extract hypothetical/OOC/quoted examples, planning, third-person reported speech or another PC's acts. Entry target must be explicitly named in the span; otherwise preserve an action candidate and resolve ordinary context without claiming arrival. "
  +"Mixed speech/action uses separate spans. Candidates never authorize rolls, consent, spending, access, travel or presence.";
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
  if(interpretAuthoredText(authored,{natural:true}).kind==="planning_or_ooc"&&candidates.length)throw new Error("Planning/OOC is not native authored action.");
  return candidates.map((candidate,index)=>{
    if(Object.keys(candidate).sort().join()!=="kind,quote,source_ref,source_span,target"||!["action","entry","speech"].includes(candidate.kind)
      ||typeof candidate.source_span!=="string"||!candidate.source_span.trim()||candidate.source_span.length>1500
      ||!authored.includes(candidate.source_span)||candidate.source_ref!==source.event_key
      ||typeof candidate.target!=="string"||candidate.target.length>160||typeof candidate.quote!=="string"||candidate.quote.length>1000
      ||/^["“]|^(?:ooc\b|\(\(|\/\/)/i.test(candidate.source_span))throw new Error("Exact current authored span required; quotation is not actor authorization.");
    const prefix=authored.slice(0,authored.indexOf(candidate.source_span));
    if((prefix.match(/["“”]/g)||[]).length%2||/\b(?:he|she|they) (?:said|says|told)|\b(?:example|hypothetical|reports? that|might|would|could|imagine|suppose|planning)\b|\bif\s*$/i.test(prefix))
      throw new Error("Reported/quoted examples cannot become native actor actions.");
    if(interpretAuthoredText(candidate.source_span,{natural:true}).kind==="planning_or_ooc")throw new Error("Hypothetical candidate is meaning, not native action.");
    if(candidate.kind==="entry"&&(!candidate.target||!candidate.source_span.toLowerCase().includes(candidate.target.toLowerCase())))
      throw new Error("Native entry candidate needs an explicitly named target; contextual meaning can stay nonbinding.");
    if(candidate.kind==="speech"&&(!candidate.quote||!candidate.source_span.includes(candidate.quote)))throw new Error("Speech cannot be paraphrased as an utterance.");
    const key=`candidate:${source.event_key}:${index}`,prior=db.getCityRecord(guild,"authored_candidate",key);if(prior)return prior;
    const row=db.saveCityRecord(guild,{kind:"authored_candidate",key,status:"pending",source_event:source.event_key,
      visibility:"character",subject_key:principal.context_id,data:{...candidate,principal:principal.revision,authority:"Authored interpretation; not consent or completed consequences"}});
    // Compatibility candidates may stage pending, source-backed review records. They never execute movement,
    // consent, spending or rolls; accepted typed intents own the normal immediate route.
    if(principal.kind==="owner"){
      if(candidate.kind==="entry")prepareSceneEntry(db,guild,principal.user,principal.character_id,provenance.messageId,authored,
        {privateScene:scope.mode==="private",candidate});
      if(candidate.kind==="action")captureDeclaration(db,guild,principal.user,principal.character_id,provenance.messageId,authored,{candidate,privateScene:scope.mode==="private"});
      if(candidate.kind==="speech")captureDialogue(db,guild,principal.user,principal.character_id,provenance.messageId,authored,
        {privateScene:scope.mode==="private",candidate});
    }
    return row;
  });
}
