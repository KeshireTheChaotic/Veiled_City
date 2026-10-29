import {createFunctionPort} from '../../../kernel/function-port.js';
export const publicationSessionScene=createFunctionPort(["currentScene","scenePresence"],{code:'PUBLICATION_SESSION_SCENE_COMPOSITION',label:'Publication Session scene'});
