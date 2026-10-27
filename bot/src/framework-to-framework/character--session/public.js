import {characterSession} from '../../frameworks/character/public.js';
import {currentScene,sceneAccess,scenePresence,conversationPrincipal} from '../../frameworks/session/public.js';
/** Pass Session's original scene and principal readers to Character unchanged. */
export function connectCharacterSession(){return characterSession.bind({currentScene,sceneAccess,scenePresence,conversationPrincipal});}
