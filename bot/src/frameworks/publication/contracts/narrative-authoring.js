import {createFunctionPort} from '../../../kernel/function-port.js';
/** Read original fresh Narrative records and lexical PC-reference check; no generator or truth/effect grant. */
export const publicationNarrativeAuthoring=createFunctionPort(['findFreshScenePart','renderFreshScenePart','hasPcReference'],{code:'PUBLICATION_NARRATIVE_AUTHORING_COMPOSITION',label:'Publication Narrative authoring'});
