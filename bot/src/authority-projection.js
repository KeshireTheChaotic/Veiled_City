/** Compact authority indexes preserve identity/source/revision while complete pages remain retrievable. */
import { createHash } from "node:crypto";
const digest=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0,16);
export function projectAuthorityRecords(kind,records,{pageSize=25}={}){
  const rows=records.map((row,index)=>({kind,index,id:row.id||row.event_key||row.canon_key||row.ruling_key||row.record_key,
    key:row.canon_key||row.ruling_key||row.record_key||row.entity_key||"",status:row.status||"current",visibility:row.visibility||"gm",
    revision:row.revision||row.updated_at||row.created_at||"",source:row.source_id||row.source_ref||row.source_type||"",
    content_hash:digest(row),detail_locator:`${kind}:${index}`}));
  return {kind,count:rows.length,page_size:pageSize,pages:Math.ceil(rows.length/pageSize),records:rows,
    authority:"Index only. A hash/locator never replaces the complete authoritative record."};
}
export function authorityRecordPage(kind,records,{page=0,pageSize=25}={}){
  const start=Math.max(0,Number(page)||0)*Math.max(1,Math.min(100,Number(pageSize)||25));
  const rows=records.slice(start,start+pageSize);
  return {kind,page,start,count:rows.length,total:records.length,records:structuredClone(rows),next_page:start+rows.length<records.length?page+1:null};
}
