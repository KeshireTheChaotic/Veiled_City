/** Exact original NPC opportunity runtimes; World supplies existing budgets and callbacks, not new authority. */
export function createWorldNpcOpportunityConsumer(){let source=null;const keys=['runMotivationCycle','runStrategyOpportunity'];const current=()=>{if(!source)throw Object.assign(new Error('World NPC opportunity runtime not composed.'),{code:'WORLD_NPC_OPPORTUNITY_COMPOSITION'});return source;};return Object.freeze({
 bind(native){if(keys.some(k=>typeof native?.[k]!=='function'))throw new TypeError('Complete native NPC opportunity functions required.');if(source&&keys.some(k=>source[k]!==native[k]))throw new Error('World NPC opportunity replacement forbidden.');source=Object.freeze(Object.fromEntries(keys.map(k=>[k,native[k]])));return this;},
 runMotivationCycle(...args){return current().runMotivationCycle(...args);},runStrategyOpportunity(...args){return current().runStrategyOpportunity(...args);}
});}
export const worldNpcOpportunity=createWorldNpcOpportunityConsumer();
