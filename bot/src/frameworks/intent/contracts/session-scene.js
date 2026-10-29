import {createFunctionPort} from '../../../kernel/function-port.js';
export const intentSessionScene=createFunctionPort(["currentScene","recordScenePresence","scenePresence","sceneView"],{code:'INTENT_SESSION_SCENE_COMPOSITION',label:'Intent Session scene'});
