/** Source-span ledger for mixed natural-language messages; it routes exact clauses without granting authority. */

function trimSpan(text,start,end){
  while(start<end&&/\s/.test(text[start]))start++;
  while(end>start&&/\s/.test(text[end-1]))end--;
  return {start,end,text:text.slice(start,end)};
}

/** Split only at strong author-provided boundaries; parsers still decide whether a clause is actionable. */
export function messageSpans(value){
  const text=String(value||"");
  if(!text.trim())return [];
  const cuts=[0,text.length];
  const boundary=/;\s*(?:then\s+)?|[.!?]\s+(?=(?:then\s+)?(?:I|we|what|who|where|how|remind|show|review)\b)|\s+and\s+(?=(?:then\s+)?(?:I\s+)?(?:ask|tell|leave|go|head|walk|step|enter|search|look|take|say|reply)\b)/gi;
  for(const match of text.matchAll(boundary))cuts.push(match.index,match.index+match[0].length);
  const sorted=[...new Set(cuts)].sort((a,b)=>a-b),spans=[];
  for(let i=0;i<sorted.length-1;i++){
    const span=trimSpan(text,sorted[i],sorted[i+1]);
    const cleaned=span.text.replace(/^(?:;|[.!?])\s*(?:then\s+)?|^(?:and\s+)(?:then\s+)?/i,"").trim();
    if(cleaned&&!/^(?:and|then|;|[.!?])$/i.test(cleaned))spans.push({...span,text:cleaned,id:`span:${span.start}:${span.end}`});
  }
  return spans;
}

/** Run conservative native handlers in order and preserve every unhandled source clause for the GM. */
export async function routeMessageSpans(value,handlers=[]){
  const source=String(value||""),handled_spans=[],native_receipts=[],unresolved_spans=[];
  for(const span of messageSpans(source)){
    let handled=false;
    for(const handler of handlers){
      const result=await handler.route(span);
      if(!result)continue;
      handled=true;
      handled_spans.push({...span,kind:handler.kind,delivery_status:result.delivery_status||"delivered"});
      native_receipts.push({kind:handler.kind,span_id:span.id,...result});
      break;
    }
    if(!handled)unresolved_spans.push(span);
  }
  return {source,handled_spans,native_receipts,unresolved_spans,
    remaining_text:unresolved_spans.map(span=>span.text).join(" ").trim(),
    delivery_status:native_receipts.some(row=>row.delivery_status==="failed")?"partial":"complete"};
}

export function serializeSpanLedger(ledger){
  return {handled_spans:ledger.handled_spans.map(({id,start,end,text,kind,delivery_status})=>({id,start,end,text,kind,delivery_status})),
    native_receipts:ledger.native_receipts,unresolved_spans:ledger.unresolved_spans.map(({id,start,end,text})=>({id,start,end,text}))};
}
