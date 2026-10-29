/** Immutable authenticated player source plus additive native-consumption annotations. */
import {authoredTurnEnvelope,authoredTurnHash as hash,authoredTurnKey as keyFor,authoredAnnotationKey as annotationKey} from './frameworks/intent/public.js';
export {authoredTurnEnvelope};
import {intentSessionPrincipal} from './frameworks/intent/public.js';
function conversationPrincipal(...args){return intentSessionPrincipal.conversationPrincipal(...args);}
import { currentScene } from "./scene-continuity.js";
import {intentWorldPrimitives} from './frameworks/intent/public.js';
const {indexWorldEvent}=intentWorldPrimitives;

function fail(message){throw Object.assign(new Error(message),{code:"AUTHORED_TURN_ENVELOPE"});}

export function captureAuthoredTurnEnvelope(db,guild,user,character,messageId,rawText,{privateScene=false}={}){
  if(!messageId||!character)fail("Authenticated message and controlled character are required.");
  const principal=conversationPrincipal(db,guild,user,character);
  if(principal.kind!=="owner")fail("Only the authenticated character owner can create a player turn envelope.");
  const session=db.getActiveSession(guild),scene=currentScene(db,guild),raw=String(rawText||"");
  if(!session||!raw.trim()||raw.length>4000)fail("A bounded authored message in an active session is required.");
  const key=keyFor(messageId,principal.character_id),prior=db.getWorldEvent(guild,key);
  if(prior){
    if(prior.details.raw_hash!==hash(raw)||prior.details.author!==principal.user||
      prior.details.principal_revision!==principal.revision)fail("Authored turn envelope is immutable.");
    return authoredTurnEnvelope(db,guild,messageId,principal.character_id);
  }
  const visibility=privateScene?"character":"party",subject=privateScene?principal.character_id:"";
  indexWorldEvent(db,guild,{key,kind:"authored_turn",title:"Immutable authenticated player turn",
    source_id:`player:${principal.user}`,session_id:session.id,scene:scene.key,visibility,subject_key:subject,
    details:{version:1,discord_message_id:messageId,guild_id:guild,session_id:session.id,scene_id:scene.key,
      author:principal.user,character_id:principal.character_id,control_role:"owner",principal_revision:principal.revision,
      private_scene:privateScene,raw_text:raw,raw_hash:hash(raw),authority:"Authored intent only; never success or outcome."}},user);
  return authoredTurnEnvelope(db,guild,messageId,principal.character_id);
}

/** Source-attribution tripwire, not an English action classifier. Apostrophes inside words are not quotes. */
export function sourceSpanInsideQuote(text,start){
  let quote=null;
  for(let i=0;i<start;i++){
    const c=text[i];if(c==='\\'){i++;continue;}
    if((c==="'"||c==='’')&&/[\p{L}\p{N}]/u.test(text[i-1]||'')&&/[\p{L}\p{N}]/u.test(text[i+1]||''))continue;
    if(quote){if(c===quote)quote=null;}
    else if(c==='"'||c==="'")quote=c;else if(c==='“')quote='”';else if(c==='‘')quote='’';
  }return quote!==null;
}
export function recordNativeConsumedSpans(db,guild,user,character,messageId,spans=[]){
  const envelope=authoredTurnEnvelope(db,guild,messageId,character);
  if(!envelope||envelope.user_id!==user)fail("Current authenticated authored envelope required.");
  const normalized=spans.map(span=>{
    const start=Number(span.start),end=Number(span.end),receipt=String(span.receipt_ref||"");
    if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<=start||end>envelope.raw_text.length||!receipt)
      fail("Consumed spans require bounded raw offsets and a native receipt.");
    return {start,end,source_span:envelope.raw_text.slice(start,end),receipt_ref:receipt};
  }).sort((a,b)=>a.start-b.start||a.end-b.end);
  for(let i=1;i<normalized.length;i++)if(normalized[i].start<normalized[i-1].end)fail("Native consumed spans cannot overlap.");
  db.saveCityRecord(guild,{kind:"authored_turn_envelope",key:annotationKey(messageId,character),status:"active",
    source_event:envelope.source_event,visibility:envelope.visibility,subject_key:envelope.subject_key,
    data:{version:1,raw_hash:envelope.raw_hash,native_consumed_spans:normalized}});
  return authoredTurnEnvelope(db,guild,messageId,character);
}

export function overlapsConsumedSpan(envelope,start,end){
  return (envelope?.native_consumed_spans||[]).some(span=>start<span.end&&end>span.start);
}
import {intentAuthoredTurnSource} from './frameworks/intent/public.js';
// Provide this module's original quote span reading to the fixed Intent slot; no other authority is granted.
intentAuthoredTurnSource.bind({sourceSpanInsideQuote});
