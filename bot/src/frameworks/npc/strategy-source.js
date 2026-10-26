/** One original NPC strategy runtime; actual World outcomes and original Intent dispatcher remain separate authorities. */
import {createNpcStrategyRules} from './strategy.js';
import {actorSource} from './motivation-source.js';
import {npcWorldStrategy} from './contracts/world-strategy.js';
import {npcIntentStrategy} from './contracts/intent-strategy.js';
let runtime;
function strategy(){return runtime??=createNpcStrategyRules({cityObject:(...args)=>npcWorldStrategy.cityObject(...args),cityKey:(...args)=>npcWorldStrategy.cityKey(...args),cityInteger:(...args)=>npcWorldStrategy.cityInteger(...args),cityAudit:(...args)=>npcWorldStrategy.cityAudit(...args),submitInstitutionAction:(...args)=>npcWorldStrategy.submitInstitutionAction(...args),reviewInstitutionAction:(...args)=>npcWorldStrategy.reviewInstitutionAction(...args),actorState:(...args)=>npcWorldStrategy.actorState(...args),submitNpcAction:(...args)=>npcWorldStrategy.submitNpcAction(...args),nativeWorldOperationAllows:(...args)=>npcWorldStrategy.nativeWorldOperationAllows(...args),nativeWorldOperationOrigin:(...args)=>npcWorldStrategy.nativeWorldOperationOrigin(...args),nativeWorldStrategyAllowed:(...args)=>npcWorldStrategy.nativeWorldStrategyAllowed(...args),withNativeStrategyExecution:(...args)=>npcWorldStrategy.withNativeStrategyExecution(...args),actorSource,ACTION_TYPES:npcWorldStrategy.actionTypes(),ACTION_COSTS:npcWorldStrategy.actionCosts(),delegateStrategy:(...args)=>npcIntentStrategy.delegateStrategy(...args)});}
export function manageStrategy(...args){return strategy().manageStrategy(...args);}
export function executeStrategyStep(...args){return strategy().executeStrategyStep(...args);}
export function runStrategyOpportunity(...args){return strategy().runStrategyOpportunity(...args);}
