/** Whole-turn character budget: preserve mandatory authority and omit only complete optional records. No writes or provider calls. */
import {createHash} from 'node:crypto';
const separator="\n\n---\n\n";
const encode=value=>typeof value==="string"?value:JSON.stringify(value)??"null";
const render=(section,value=section.value)=>`${section.label}:\n${encode(value)}`;
/** Alias duplicate storage only when the complete identical assembly detail is retained separately. */
export function referenceSessionContext(session,assembly){
  if(!session||typeof session.assembly_plan_json!=='string'||assembly==null)return session;
  try{if(JSON.stringify(JSON.parse(session.assembly_plan_json))!==JSON.stringify(assembly))return session;}
  catch{return session;}
  const {assembly_plan_json,...projected}=session;
  return {...projected,assembly_plan_detail:{section:'ASSEMBLY PLAN (GM-PRIVATE; protect per-character hooks)',session_id:session.id}};
}
// Only known descriptive fields are deferrable. Unknown fields, mechanics, inventory, permissions,
// owner/control and accessibility remain mandatory; this is not a sheet migration or authority classifier.
const descriptiveSheetFields=new Set(['background','notes','backstory','personality','appearance','description','biography']);
export function partitionRosterContext(rows){
  const background=[];
  const roster=rows.map(row=>{
    if(!row.character_id||!row.sheet||typeof row.sheet!=='object'||Array.isArray(row.sheet))return row;
    const sheet={},refs=[];
    for(const [field,value] of Object.entries(row.sheet)){
      if(!descriptiveSheetFields.has(field)||typeof value!=='string'){sheet[field]=value;continue;}
      const content_hash=createHash('sha256').update(JSON.stringify(value)).digest('hex');
      const locator=`character:${row.character_id}:field:${field}`;
      refs.push({field,content_hash,locator});
      background.push({character_id:row.character_id,user_id:row.user_id,field,value,content_hash,locator,visibility:'gm'});
    }
    return {...row,sheet,sheet_detail_refs:refs};
  });
  return {roster,background};
}
/** Only identical native fact records in this same scoped plan may reference an already rendered detail section.
 * No text similarity, cross-plan cache, source-only replacement or merging of conflicting revisions. */
export function referenceContextPlan(plan,facts){
  const details=new Map(facts.filter(row=>row?.id&&row.guild_id&&row.visibility)
    .map(row=>[`fact:${row.id}`,JSON.stringify(row)]));
  return {...plan,segments:plan.segments.map(row=>{
    if(details.get(row.source)!==JSON.stringify(row.data))return row;
    const {data,...reference}=row;
    return {...reference,detail_ref:row.source,detail_section:'GM-PRIVATE + ALL KNOWN FACTS',
      scope:plan.scope,actor:plan.actor};
  })};
}
export function budgetTurnPrompt(sections,{instructions="",query="",maxChars=120000,reserveChars=6000}={}){
  const overflow=(message,diagnostic)=>{throw Object.assign(new Error(message),{code:"CONTEXT_OVERFLOW",diagnostic});};
  const limit=maxChars-instructions.length-reserveChars;
  const required=sections.filter(section=>section.required);
  const optional=sections.filter(section=>!section.required);
  const core=required.map(section=>render(section)).join(separator);
  if(core.length>limit)overflow("Mandatory turn context exceeds the safe input budget; retry with a narrower scene or query.",
    {stage:"mandatory_authority",required_chars:core.length,limit,retryable:true,committed:false});
  const complete=sections.map(section=>render(section)).join(separator);
  if(complete.length<=limit) return {input:complete,metrics:{compacted:false,input_chars:complete.length,limit,omissions:[]}};
  const terms=[...new Set(query.toLowerCase().match(/[a-z0-9-]{3,}/g)||[])].slice(0,24);
  const selected=new Map(optional.map(section=>[section,[]]));
  const noticeFor=omissions=>`\n\nCONTEXT BUDGET (GM-private): ${JSON.stringify({omissions,
    authority:"Only complete optional records omitted. Omission is not evidence of nonexistence, consent or success. Check relevant existing authority before native effects. Ordinary new fiction may use autonomous world additions; missing descriptions alone never require human review."})}`;
  const omissionsFor=(extra=null,extraCount=1)=>optional.flatMap(section=>{
    const count=Array.isArray(section.value)?section.value.length:1;
    const omitted=count-selected.get(section).length-(section===extra?extraCount:0);
    return omitted>0?[{section:section.label,records:omitted}]:[];
  });
  const minimalBodies=sections.flatMap(section=>section.required?[render(section)]:
    Array.isArray(section.value)?[render(section,[])]:[]);
  let bodyChars=minimalBodies.join(separator).length,bodyCount=minimalBodies.length;
  const candidates=optional.flatMap((section,sectionIndex)=>{
    const rows=Array.isArray(section.value)?section.value:[section.value];
    return rows.map((value,index)=>{
      const text=encode(value).toLowerCase();
      const relevance=terms.reduce((score,term)=>score+(text.includes(term)?1:0),0);
      const serialized=Array.isArray(section.value)?JSON.stringify(value)??"null":encode(value);
      return {section,sectionIndex,index,value,serialized,score:(section.priority||0)+Math.min(12,relevance)*10};
    });
  }).sort((a,b)=>b.score-a.score||a.sectionIndex-b.sectionIndex||b.index-a.index);
  // A tiny complete section can be cheaper than describing its omission. Keep such sections
  // before testing the minimum; otherwise even exact metadata budgeting can reject a fitting packet.
  for(const section of optional){
    const rows=candidates.filter(row=>row.section===section);if(!rows.length)continue;
    const array=Array.isArray(section.value),size=array?encode(section.value).length-2:
      render(section).length+(bodyCount?separator.length:0);
    if(size+noticeFor(omissionsFor(section,rows.length)).length>noticeFor(omissionsFor()).length)continue;
    selected.set(section,rows);bodyChars+=size;if(!array)bodyCount++;
  }
  const minimum=bodyChars+noticeFor(omissionsFor()).length;
  if(minimum>limit)overflow("Turn context budget metadata exceeds the safe input budget.",
    {stage:"budget_metadata",required_chars:minimum,limit,retryable:true,committed:false});
  // Count actual JSON escaping, array commas, labels, separators and the updated omission notice.
  // Retry/provider-wrapper headroom is already reserved by the caller; no extra arbitrary margin.
  for(const row of candidates){
    const array=Array.isArray(row.section.value),rows=selected.get(row.section);
    if(rows.includes(row))continue;
    const size=array?row.serialized.length+(rows.length?1:0):render(row.section,row.value).length+(bodyCount?separator.length:0);
    if(bodyChars+size+noticeFor(omissionsFor(row.section)).length>limit)continue;
    rows.push(row);bodyChars+=size;if(!array)bodyCount++;
  }
  const omissions=[];
  const input=sections.flatMap(section=>{
    if(section.required) return [render(section)];
    const rows=selected.get(section).sort((a,b)=>a.index-b.index);
    const count=Array.isArray(section.value)?section.value.length:1;
    if(rows.length<count) omissions.push({section:section.label,records:count-rows.length});
    if(Array.isArray(section.value)) return [render(section,rows.map(row=>row.value))];
    return rows.length?[render(section,rows[0].value)]:[];
  }).join(separator);
  const notice=noticeFor(omissions);
  if(input.length+notice.length>limit)overflow("Turn context budget metadata exceeds the safe input budget.",
    {stage:"budget_metadata",required_chars:input.length+notice.length,limit,retryable:true,committed:false});
  return {input:input+notice,metrics:{compacted:true,input_chars:input.length+notice.length,limit,omissions}};
}
