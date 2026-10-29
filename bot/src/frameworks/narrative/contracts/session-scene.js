import {createFunctionPort} from '../../../kernel/function-port.js';
export const narrativeSessionScene=createFunctionPort(["currentScene","lastVerifiedCharacterPresence","npcEvidenceActive","sceneAccess","scenePresence"],{code:'NARRATIVE_SESSION_SCENE_COMPOSITION',label:'Narrative Session scene'});
