/** Original read-only native Director ranking; eligibility is rechecked at execution. */
import {normalizeEntityKey as normalizeNpcKey} from '../../kernel/entity-key.js';
import {validateAction} from './action-eligibility.js';
import {ACTION_COSTS as COSTS} from './action-costs.js';
import {keyOf} from './simulation-query-primitives.js';
export function rankDirectorActions(db,{guildId,candidates,proposed,query=""}){
  const tokens=new Set(String(query).toLowerCase().match(/[a-z0-9]{3,}/g)||[]);
  const recent=db.listSimulationRecords(guildId,{kind:"action",status:"completed",limit:32});
  return (proposed.actions||[]).slice(0,32).flatMap((action,index)=>{
    if(!candidates.some(row=>row.type===action.actor_type&&row.key===normalizeNpcKey(action.actor_key))) return [];
    try{
      const {state,goal}=validateAction(db,guildId,action);if(state.resources[COSTS[action.type]]<1) return [];
      const knowledge=action.actor_type==="npc"?db.getNpcKnowledge(guildId,normalizeNpcKey(action.actor_key),action.information_key):null;
      const source=knowledge?.source_ref?db.getWorldEvent(guildId,knowledge.source_ref):null;
      if(source&&source.status!=="active") return [];
      const grounding=`${goal.objective||goal.data?.objective||""} ${knowledge?.content||""}`.toLowerCase();
      const overlap=[...tokens].filter(token=>grounding.includes(token)).length;
      const repetition=recent.filter(row=>row.entity_key===keyOf(action.actor_type,normalizeNpcKey(action.actor_key))
        &&row.data.type===action.type&&row.data.target_key===action.target_key&&row.data.information_key===action.information_key).length;
      const sourceProximity=source&&source.session_id===db.getActiveSession(guildId)?.id?4:0;
      const score=overlap*10+sourceProximity+Math.min(5,Number(goal.priority||0)/20)-repetition*8;
      return [{action,score,index,reason:{known_source:source?.event_key||null,overlap,repetition,source_proximity:sourceProximity}}];
    }catch{return [];}
  }).sort((a,b)=>b.score-a.score||a.index-b.index);
}
