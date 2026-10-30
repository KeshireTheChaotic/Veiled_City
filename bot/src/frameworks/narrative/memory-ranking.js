/** Original read-only prompt selection; ranking confers no truth or persistence. */
import {nativeSalienceAvailable} from './context-eligibility.js';
import {narrativeImportanceSource} from './importance-source.js';
const {narrativeImportance}=narrativeImportanceSource;
import {narrativeRelevanceSource} from './contracts/root-sources.js';
const {narrativeQueryRelevance,narrativeIdentityRelevance}=narrativeRelevanceSource;
export function rankNarrativeMemory(db,guild,scope,rows,{query='',location=null,maxChars=9000}={}){
  if(!nativeSalienceAvailable(db,guild)){
    const selected=[];let used=0;
    for(const row of rows){const size=JSON.stringify(row).length;if(used+size>maxChars)continue;
      selected.push(row);used+=size;if(selected.length>=12)break;}
    return selected;
  }
  const ranked=rows.map(row=>{
    const unit=db.getCityRecord(guild,'narrative_unit',row.unit)?.data.unit;
    const entity=unit?.subject_key?`npc:${unit.subject_key}`:row.location?`location:${row.location}`:null;
    const importance=entity&&narrativeImportance(db,guild,entity,scope),exact=entity&&narrativeIdentityRelevance(db,guild,entity,scope,query)>0;
    return {row,score:narrativeQueryRelevance(row.text,query)+(exact?1000:0)+(row.location===location?500:0)+(importance?.pins.length?300:0)+(importance?.score||0),
      archived:importance?.status==='prompt_archived'&&!exact&&!importance.pins.length};
  }).filter(r=>!r.archived).sort((a,b)=>b.score-a.score||a.row.unit.localeCompare(b.row.unit));
  const selected=[];let used=0,novelty=0;
  for(const item of ranked){const size=JSON.stringify(item.row).length;if(!item.score&&novelty>=2||used+size>maxChars)continue;
    selected.push(item.row);used+=size;if(!item.score)novelty++;if(selected.length>=16)break;}
  return selected;
}
