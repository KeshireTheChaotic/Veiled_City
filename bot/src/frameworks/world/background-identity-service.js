/** Original World background reader; provenance and record retrieval remain fixed source capabilities. */
import {sceneFictionFailure as fail} from '../../kernel/scene-fiction-failure.js';
import {worldIdentityOrigin} from './identity-origin.js';
import {createBackgroundIdentityRules} from './background-identities.js';
import {worldKnowledgeSources} from './contracts/knowledge-records.js';
const listNarrativeRecords=(...args)=>worldKnowledgeSources.listNarrativeRecords(...args);
export {BACKGROUND_WORLD_KINDS} from './background-identities.js';
let backgroundRules;
function background(){return backgroundRules??=createBackgroundIdentityRules({listNarrativeRecords,NARRATIVE_RECORD_LIMIT:worldKnowledgeSources.narrativeRecordLimit(),worldIdentityOrigin:(...args)=>worldIdentityOrigin(...args),fail});}
export function validateBackgroundIdentity(...args){return background().validateBackgroundIdentity(...args);}
export function backgroundIdentityContext(...args){return background().backgroundIdentityContext(...args);}
