import {knowledgeSessionScene,knowledgeSessionOwnerTerminal} from '../../frameworks/knowledge/public.js';
import {currentScene,sceneView,scenePresence,conversationPrincipal,overlapsOwnerActionTerminal} from '../../frameworks/session/public.js';
/** Pass Session's original scene and principal readers to Knowledge unchanged. */
export function connectKnowledgeSessionScene(){return knowledgeSessionScene.bind({currentScene,sceneView,scenePresence,conversationPrincipal});}
export function connectKnowledgeSessionOwnerTerminal(){return knowledgeSessionOwnerTerminal.bind({overlapsOwnerActionTerminal});}
