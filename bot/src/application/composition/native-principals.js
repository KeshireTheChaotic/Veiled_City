import {connectNativePrincipals,connectNativeOwnerActionTerminal,connectSessionNativeActionConsent} from '../../framework-to-framework/daggerheart--session/public.js';
/** Fixed bootstrap wiring of Session's original principal and owner action terminal functions into native rules; no state writes. */
export function initializeNativePrincipals(){connectNativeOwnerActionTerminal();connectSessionNativeActionConsent();return connectNativePrincipals();}
