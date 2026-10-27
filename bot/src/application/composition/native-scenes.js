import {connectNativeScenes} from '../../framework-to-framework/daggerheart--session/public.js';
/** Fixed bootstrap wiring of Session's original scene functions into native rules; no state writes. */
export function initializeNativeScenes(){return connectNativeScenes();}
