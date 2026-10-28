import {connectKnowledgeSessionScene,connectKnowledgeSessionOwnerTerminal,connectSessionKnowledgeSources} from '../../framework-to-framework/knowledge--session/public.js';
import {connectKnowledgeIntentAuthoredTurn} from '../../framework-to-framework/intent--knowledge/public.js';
/** Fixed bootstrap wiring of Session's original scene and principal readers into Knowledge; no state writes. */
export function initializeKnowledgeSession(){connectKnowledgeSessionOwnerTerminal();connectKnowledgeIntentAuthoredTurn();connectSessionKnowledgeSources();return connectKnowledgeSessionScene();}
