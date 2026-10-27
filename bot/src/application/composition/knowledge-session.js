import {connectKnowledgeSessionScene,connectKnowledgeSessionOwnerTerminal} from '../../framework-to-framework/knowledge--session/public.js';
/** Fixed bootstrap wiring of Session's original scene and principal readers into Knowledge; no state writes. */
export function initializeKnowledgeSession(){connectKnowledgeSessionOwnerTerminal();return connectKnowledgeSessionScene();}
