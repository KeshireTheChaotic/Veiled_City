import {createFunctionPort} from '../../../kernel/function-port.js';

/** Persistence delegates GM hook package normalization to the original Narrative function. */
export const persistenceGmHookImport=createFunctionPort(['normalizeGmHookImport'],{
 code:'PERSISTENCE_GM_HOOK_IMPORT_COMPOSITION',label:'Persistence GM hook package normalization'
});
