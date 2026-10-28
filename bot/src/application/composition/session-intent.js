import {connectSessionIntent} from '../../framework-to-framework/intent--session/public.js';
/** Fixed bootstrap wiring of Intent's original action and authored-text functions into Session; no state writes. */
export function initializeSessionIntent(){return connectSessionIntent();}
