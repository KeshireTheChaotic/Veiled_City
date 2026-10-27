/** Original native NPC review functions; no approval or player-consent authority is added. */
export function createOperationsNpcReviewConsumer(){let source=null;const keys=['reviewGoalTransition','manageStrategy'];const current=()=>{if(!source)throw Object.assign(new Error('Operations NPC review not composed.'),{code:'OPERATIONS_NPC_REVIEW_COMPOSITION'});return source;};return Object.freeze({
 bind(native){if(keys.some(k=>typeof native?.[k]!=='function'))throw new TypeError('Complete original NPC review functions required.');if(source&&keys.some(k=>source[k]!==native[k]))throw new Error('Operations NPC review replacement forbidden.');source=Object.freeze(Object.fromEntries(keys.map(k=>[k,native[k]])));return this;},
 reviewGoalTransition(...args){return current().reviewGoalTransition(...args);},manageStrategy(...args){return current().manageStrategy(...args);}
});}
export const operationsNpcReview=createOperationsNpcReviewConsumer();
