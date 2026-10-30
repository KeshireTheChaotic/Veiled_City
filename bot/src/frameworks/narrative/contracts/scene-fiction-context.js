import {createFunctionPort} from '../../../kernel/function-port.js';
/** Original legacy context source, registered once at load; never a second context or source authority. */
export const narrativeSceneFictionContextSource=createFunctionPort(['buildSceneFictionContext','sceneFictionHash'],{code:'NARRATIVE_SCENE_FICTION_CONTEXT_COMPOSITION',label:'Narrative scene fiction context'});
