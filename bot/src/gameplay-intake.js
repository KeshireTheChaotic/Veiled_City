/** Non-authorizing full-message intake; semantic proposals, never English verbs, decide engagement. */
export function explicitSilence(value){
  return !String(value||'').trim()||/^\s*(?:ooc\b|\(\(|\/\/)/i.test(String(value));
}

/** No freeform clause is consumed by a lexical read-only handler. Slash commands remain separate. */
export async function routeGameplayIntake(value){
  const source=String(value||'');
  return {source,handled_spans:[],native_receipts:[],
    unresolved_spans:source.trim()?[{id:`span:0:${source.length}`,start:0,end:source.length,text:source}]:[],
    remaining_text:source,delivery_status:'complete'};
}

/** Failure fallback only admits input to the existing semantic turn; it authorizes no PC action. */
export function routerFailureEngagement(value,{authenticated=false,directMention=false,mode='assisted'}={}){
  if(directMention)return true;
  return mode!=='mention'&&authenticated&&!explicitSilence(value);
}

/** Called after exact-source recovery, before native preview. A proposal is still not an outcome. */
export function semanticResponseObligation(value,intents,{authenticated=false,engagement=null}={}){
  const source=String(value||'');
  const immediate=(intents||[]).filter(row=>
    row.framing==='immediate'&&typeof row.source_span==='string'&&row.source_span.length>0&&source.includes(row.source_span));
  if(!authenticated||explicitSilence(source))return {needed:false,state:'does_not_need_world_response',reason:'unauthenticated_or_explicit_silence'};
  const noResponse=engagement?.engagement_kind==='no_response'&&engagement.respond===false;
  const material=immediate.some(row=>!['speak','other','observe'].includes(row.type)||row.resolution!=='conversational');
  const needed=material||!noResponse&&(immediate.length>0||engagement?.respond===true);
  return {needed,state:needed?'needs_world_response':noResponse?'does_not_need_world_response':'uncertain',
    reason:needed?'source_grounded_semantic_engagement':noResponse?'classified_non_world_communication':'no_current_semantic_engagement',
    authority:'Response obligation only; never a listener, action, roll, consent or effect receipt.'};
}
