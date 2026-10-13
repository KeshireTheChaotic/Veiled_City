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
export function semanticResponseObligation(value,intents,{authenticated=false}={}){
  const source=String(value||'');
  const needed=authenticated&&!explicitSilence(source)&&(intents||[]).some(row=>
    row.framing==='immediate'&&typeof row.source_span==='string'&&row.source_span.length>0&&source.includes(row.source_span));
  return {needed,reason:needed?'source_grounded_semantic_input':'no_immediate_semantic_input'};
}
