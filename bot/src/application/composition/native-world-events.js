import {connectNativeWorldEvents,connectNativeNpcAvailability} from '../../framework-to-framework/daggerheart--world/public.js';
/** Fixed bootstrap wiring of World's original event index/audit and NPC availability into native rules; no state writes. */
export function initializeNativeWorldEvents(){connectNativeNpcAvailability();return connectNativeWorldEvents();}
