/** Original still-mixed Narrative ranking producer. Registration does not claim full source isolation. */
export function createNarrativeImportanceSource(){let source=null;return Object.freeze({
 provide(native){if(typeof native!=='function')throw new TypeError('Original narrativeImportance function required.');if(source&&source!==native)throw new Error('Narrative importance replacement forbidden.');source=native;},
 narrativeImportance(...args){if(!source)throw Object.assign(new Error('Narrative importance source not composed.'),{code:'NARRATIVE_IMPORTANCE_COMPOSITION'});return source(...args);}
});}
export const narrativeImportanceSource=createNarrativeImportanceSource();
