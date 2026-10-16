/** Backward-compatible GM proposal ingestion. Export metadata never confers canon or disclosure authority. */
import {createHash} from 'node:crypto';
const schemas=new Set(['veiled-city-gm-hooks-import-v3.3.1','veiled-city-gm-hooks-import-v3.3.2',
  'veiled-city-gm-hooks-import-v3.3.3','veiled-city-gm-hooks-v3.3.3']);
export function normalizeGmHookImport(packet){
  if(!packet||typeof packet!=='object'||Array.isArray(packet))throw new Error('GM hook package must be an object.');
  const schema=packet.schema||packet.export_meta?.schema;
  if(schema&&!schemas.has(schema))throw new Error(`Unsupported GM hook schema: ${schema}`);
  for(const field of ['hooks','imported_gm_hooks','gm_hooks','entry_hooks','canon_suggestions']){
    if(packet[field]!==undefined&&!Array.isArray(packet[field]))throw new Error(`GM hook ${field} must be an array.`);
  }
  const records=[...(packet.hooks||[]),...(packet.imported_gm_hooks||[])];
  const hooks=records.map(h=>{
    if(!h||typeof h!=='object'||Array.isArray(h))throw new Error('Structured GM hook must be an object.');
    const payload=h.payload&&typeof h.payload==='object'?h.payload:{};
    const result={...payload,...h};delete result.payload;
    if(!String(result.premise||result.suggested_entry||'').trim())throw new Error('GM hook needs a premise or suggested entry.');
    if(result.status&&!['active','resolved','discarded'].includes(result.status))throw new Error('Unsupported GM hook status.');
    return result;
  });
  for(const field of ['gm_hooks','entry_hooks'])for(const [i,value] of (packet[field]||[]).entries()){
    const premise=typeof value==='string'?value:value?.text||value?.premise;
    if(!String(premise||'').trim())throw new Error(`Empty or malformed ${field} record.`);
    const digest=createHash('sha256').update(`${field}:${i}:${premise}`).digest('hex').slice(0,24);
    hooks.push({key:`sheet-${digest}`,title:`Imported ${field} ${i+1}`,premise,permission:'open_question',type:'entry_seed'});
  }
  const unique=new Map(hooks.map((h,i)=>[h.key||`record-${i}`,h]));
  const canon=packet.canon_suggestions||[];
  if(!unique.size&&!canon.length)throw new Error('No recognized GM hooks or canon suggestions; nothing imported.');
  return {...packet,character_name:packet.character_name||packet.character?.name||packet.export_meta?.name,
    hooks:[...unique.values()],canon_suggestions:canon};
}
