import {connectNarrativeIntentCommunication,connectNarrativeIntentEngagement,connectIntentNarrativeContext} from '../../framework-to-framework/intent--narrative/public.js';
export function initializeIntentNarrative(){connectNarrativeIntentCommunication();connectNarrativeIntentEngagement();return connectIntentNarrativeContext();}
