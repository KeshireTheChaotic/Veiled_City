/** Exact original NPC native policy methods; opaque native authority/options remain unchanged. */
export function createIntentNpcPolicyConsumer(){let source=null;const keys=["actorSource","proposeGoalTransition","reviewGoalTransition","manageStrategy"];const current=()=>{if(!source)throw Object.assign(new Error('Intent NPC policy not composed.'),{code:'INTENT_NPC_POLICY_COMPOSITION'});return source;};return Object.freeze({
 bind(native){if(keys.some(k=>typeof native?.[k]!=='function'))throw new TypeError('Complete original NPC policy functions required.');if(source&&keys.some(k=>source[k]!==native[k]))throw new Error('Intent NPC policy replacement forbidden.');source=Object.freeze(Object.fromEntries(keys.map(k=>[k,native[k]])));return this;},
 actorSource(...args){return current().actorSource(...args);},
 proposeGoalTransition(...args){return current().proposeGoalTransition(...args);},
 reviewGoalTransition(...args){return current().reviewGoalTransition(...args);},
 manageStrategy(...args){return current().manageStrategy(...args);}
});}
export const intentNpcPolicy=createIntentNpcPolicyConsumer();
