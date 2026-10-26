/** Fixed original native World capabilities; no policy, grant or receipt copied into adapter. */
export function createIntentWorldActionsConsumer(){let source=null;const keys=["inspectNpcAction","inspectInstitutionAction","submitInstitutionAction","executeInstitutionAction"];const current=()=>{if(!source)throw Object.assign(new Error('Intent native world-actions source not composed.'),{code:'INTENT_WORLD_NATIVE_COMPOSITION'});return source;};return Object.freeze({
 bind(native){if(keys.some(k=>typeof native?.[k]!=='function'))throw new TypeError('Complete original native World world-actions functions required.');if(source&&keys.some(k=>source[k]!==native[k]))throw new Error('Intent native World source replacement forbidden.');source=Object.freeze(Object.fromEntries(keys.map(k=>[k,native[k]])));return this;},
 inspectNpcAction(...args){return current().inspectNpcAction(...args);},
 inspectInstitutionAction(...args){return current().inspectInstitutionAction(...args);},
 submitInstitutionAction(...args){return current().submitInstitutionAction(...args);},
 executeInstitutionAction(...args){return current().executeInstitutionAction(...args);}
});}
export const intentWorldActions=createIntentWorldActionsConsumer();
