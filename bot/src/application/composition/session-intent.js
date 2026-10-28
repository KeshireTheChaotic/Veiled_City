import {connectSessionIntent,connectSessionIntentLanguage} from '../../framework-to-framework/intent--session/public.js';
/** Fixed bootstrap wiring of Intent's original action, authored-text, quote-span, silence and response-obligation functions into Session; no state writes. */
export function initializeSessionIntent(){connectSessionIntentLanguage();return connectSessionIntent();}
