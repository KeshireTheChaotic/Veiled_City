/** Whole-turn character budget: preserve mandatory authority and omit only complete optional records. No writes or provider calls. */
const separator="\n\n---\n\n";
const encode=value=>typeof value==="string"?value:JSON.stringify(value)??"null";
const render=(section,value=section.value)=>`${section.label}:\n${encode(value)}`;
export function budgetTurnPrompt(sections,{instructions="",query="",maxChars=120000,reserveChars=6000}={}){
  const limit=maxChars-instructions.length-reserveChars;
  const required=sections.filter(section=>section.required);
  const optional=sections.filter(section=>!section.required);
  const core=required.map(section=>render(section)).join(separator);
  if(limit<2000||core.length+2000>limit) throw new Error("Mandatory turn context exceeds the safe input budget; GM review of oversized authoritative records is required.");
  const complete=sections.map(section=>render(section)).join(separator);
  if(complete.length<=limit) return {input:complete,metrics:{compacted:false,input_chars:complete.length,limit,omissions:[]}};
  const terms=[...new Set(query.toLowerCase().match(/[a-z0-9-]{3,}/g)||[])].slice(0,24);
  const selected=new Map(optional.map(section=>[section,[]]));
  const noticeFor=omissions=>`\n\nCONTEXT BUDGET (GM-private): ${JSON.stringify({omissions,
    authority:"Only complete optional records omitted. Omission is not evidence of nonexistence, consent or success. Check relevant existing authority before native effects. Ordinary new fiction may use autonomous world additions; missing descriptions alone never require human review."})}`;
  const metadataReserve=noticeFor(optional.map(section=>({section:section.label,
    records:Array.isArray(section.value)?section.value.length:1}))).length;
  const candidates=optional.flatMap((section,sectionIndex)=>{
    const rows=Array.isArray(section.value)?section.value:[section.value];
    return rows.map((value,index)=>{
      const text=encode(value).toLowerCase();
      const relevance=terms.reduce((score,term)=>score+(text.includes(term)?1:0),0);
      return {section,sectionIndex,index,value,score:(section.priority||0)+Math.min(12,relevance)*10};
    });
  }).sort((a,b)=>b.score-a.score||a.sectionIndex-b.sectionIndex||b.index-a.index);
  // Reserve metadata, section labels and separators before allocating record bodies.
  let remaining=limit-core.length-metadataReserve-optional.reduce((size,section)=>size+section.label.length+separator.length+8,0);
  for(const row of candidates){
    const serialized=Array.isArray(row.section.value)?JSON.stringify(row.value)??"null":encode(row.value);
    const size=serialized.length+1;
    if(size>remaining) continue;
    selected.get(row.section).push(row);remaining-=size;
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
  if(input.length+notice.length>limit) throw new Error("Turn context budget metadata exceeds the safe input budget.");
  return {input:input+notice,metrics:{compacted:true,input_chars:input.length+notice.length,limit,omissions}};
}
