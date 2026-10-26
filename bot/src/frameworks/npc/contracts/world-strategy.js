/** Original World collaborators for unchanged NPC strategy; native costs/execution remain World-owned. */
export function createNpcWorldStrategyConsumer(){let source=null;const keys=["cityObject","cityKey","cityInteger","cityAudit","submitInstitutionAction","reviewInstitutionAction","actorState","submitNpcAction","nativeWorldOperationAllows","nativeWorldOperationOrigin","nativeWorldStrategyAllowed","withNativeStrategyExecution"];const current=()=>{if(!source)throw Object.assign(new Error('NPC World strategy source has not been composed.'),{code:'NPC_WORLD_STRATEGY_COMPOSITION'});return source;};return Object.freeze({
 bind(native){if(keys.some(k=>typeof native?.[k]!=='function')||!Array.isArray(native?.ACTION_TYPES)||!native?.ACTION_COSTS||typeof native.ACTION_COSTS!=='object')throw new TypeError('Complete native World strategy functions/catalog required.');if(source&&[...keys,'ACTION_TYPES','ACTION_COSTS'].some(k=>source[k]!==native[k]))throw new Error('NPC World strategy replacement forbidden.');source=Object.freeze(Object.fromEntries([...keys,'ACTION_TYPES','ACTION_COSTS'].map(k=>[k,native[k]])));return this;},
 actionTypes(){return current().ACTION_TYPES;},actionCosts(){return current().ACTION_COSTS;},
 cityObject(...args){return current().cityObject(...args);},
 cityKey(...args){return current().cityKey(...args);},
 cityInteger(...args){return current().cityInteger(...args);},
 cityAudit(...args){return current().cityAudit(...args);},
 submitInstitutionAction(...args){return current().submitInstitutionAction(...args);},
 reviewInstitutionAction(...args){return current().reviewInstitutionAction(...args);},
 actorState(...args){return current().actorState(...args);},
 submitNpcAction(...args){return current().submitNpcAction(...args);},
 nativeWorldOperationAllows(...args){return current().nativeWorldOperationAllows(...args);},
 nativeWorldOperationOrigin(...args){return current().nativeWorldOperationOrigin(...args);},
 nativeWorldStrategyAllowed(...args){return current().nativeWorldStrategyAllowed(...args);},
 withNativeStrategyExecution(...args){return current().withNativeStrategyExecution(...args);}
});}
export const npcWorldStrategy=createNpcWorldStrategyConsumer();
