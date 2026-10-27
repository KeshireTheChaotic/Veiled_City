import {connectNativeWorldEvents} from '../../framework-to-framework/daggerheart--world/public.js';
/** Fixed bootstrap wiring of World's original event index/audit into native rules; no state writes. */
export function initializeNativeWorldEvents(){return connectNativeWorldEvents();}
