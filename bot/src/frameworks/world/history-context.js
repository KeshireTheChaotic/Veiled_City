/** Bounded historical summaries are context, never campaign canon. */
export function historyContext(db,guildId,query){
  const found=new Map(),terms=String(query).toLowerCase().match(/[a-z0-9-]{4,}/g)||[];
  for(const term of terms.slice(0,6)) for(const row of db.listCityRecords(guildId,{kind:"history",query:term,includeGM:true,limit:4})) found.set(row.record_key,row);
  const summaries=[...found.values()].slice(0,4);
  const out=[];let budget=0;
  for(const row of summaries){
    const result={summary:row.data,authority:"SUMMARY_NOT_CANON",sources:row.data.source_events.slice(0,8)
      .map(key=>db.getWorldEvent(guildId,key)).filter(Boolean).map(event=>({event_key:event.event_key,title:event.title,status:event.status,
        truth_status:event.truth_status,source_kind:event.source_kind,source_id:event.source_id,minute:event.minute}))};
    const size=JSON.stringify(result).length;if(budget+size>10000) break;budget+=size;out.push(result);
  }
  return out;
}
