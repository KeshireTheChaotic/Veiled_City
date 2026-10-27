import {knowledgeSessionScene} from '../../frameworks/knowledge/public.js';
import {currentScene,sceneView,scenePresence,conversationPrincipal} from '../../frameworks/session/public.js';
/** Pass Session's original scene and principal readers to Knowledge unchanged. */
export function connectKnowledgeSessionScene(){return knowledgeSessionScene.bind({currentScene,sceneView,scenePresence,conversationPrincipal});}
