/** Original native action inspection; never rolls, spends or grants execution. */
import {assertQueuedCompatibility} from './execution-source.js';
import {validateAction} from './action-eligibility.js';
import {ACTION_COSTS as COSTS} from './action-costs.js';
export function inspectNpcAction(db,guildId,id){
  const row=db.getSimulationRecord(guildId,id);
  if(!row||row.kind!=="action") throw new Error("Existing NPC action required.");
  assertQueuedCompatibility(db,guildId,row);
  const {state}=validateAction(db,guildId,row.data);
  if(state.resources[COSTS[row.data.type]]<1) throw new Error("Insufficient native action resources.");
  return {action_id:id,status:row.status,cost_resource:COSTS[row.data.type],cost:1,authority:"diagnostic_only_no_roll_or_spending"};
}
