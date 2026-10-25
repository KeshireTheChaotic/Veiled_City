/** Native city-record API pages at 100. Bounded continuity scans must page explicitly. */
export const NARRATIVE_RECORD_LIMIT=5000;
export function listNarrativeRecords(db,guild,kind){
  const rows=[];
  for(let offset=0;offset<NARRATIVE_RECORD_LIMIT;offset+=100){
    const page=db.listCityRecords(guild,{kind,includeGM:true,offset,limit:100});rows.push(...page);if(page.length<100)break;
  }
  return rows;
}
