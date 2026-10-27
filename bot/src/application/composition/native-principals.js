import {connectNativePrincipals} from '../../framework-to-framework/daggerheart--session/public.js';
/** Fixed bootstrap wiring of Session's original principal readers into native rules; no state writes. */
export function initializeNativePrincipals(){return connectNativePrincipals();}
