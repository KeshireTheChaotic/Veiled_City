/** Original source composition for NPC strategy; no duplicated plan or outcome rules. */
import { cityObject, cityKey, cityInteger, cityAudit } from "./city-calendar.js";
import { submitInstitutionAction, reviewInstitutionAction } from "./city-core.js";
import { actorSource } from "./simulation-motivation.js";
import { ACTION_TYPES, ACTION_COSTS, actorState, submitNpcAction } from "./simulation.js";
import { delegateStrategy } from "./ai-intents.js";
import {nativeWorldOperationAllows,nativeWorldOperationOrigin,nativeWorldStrategyAllowed,withNativeStrategyExecution} from './native-world-operations.js';
import {createNpcStrategyRules} from './frameworks/npc/public.js';
let strategyRules;
function strategy(){return strategyRules??=createNpcStrategyRules({cityObject:(...args)=>cityObject(...args),cityKey:(...args)=>cityKey(...args),cityInteger:(...args)=>cityInteger(...args),cityAudit:(...args)=>cityAudit(...args),submitInstitutionAction:(...args)=>submitInstitutionAction(...args),reviewInstitutionAction:(...args)=>reviewInstitutionAction(...args),actorSource:(...args)=>actorSource(...args),ACTION_TYPES,ACTION_COSTS,actorState:(...args)=>actorState(...args),submitNpcAction:(...args)=>submitNpcAction(...args),delegateStrategy:(...args)=>delegateStrategy(...args),nativeWorldOperationAllows:(...args)=>nativeWorldOperationAllows(...args),nativeWorldOperationOrigin:(...args)=>nativeWorldOperationOrigin(...args),nativeWorldStrategyAllowed:(...args)=>nativeWorldStrategyAllowed(...args),withNativeStrategyExecution:(...args)=>withNativeStrategyExecution(...args)});}
export function manageStrategy(...args){return strategy().manageStrategy(...args);}
export function executeStrategyStep(...args){return strategy().executeStrategyStep(...args);}
export function runStrategyOpportunity(...args){return strategy().runStrategyOpportunity(...args);}
