import {connectNativeWorldEvents,connectNativeNpcAvailability,connectNativeWorldSource,connectNativeWorldAutonomy} from '../../framework-to-framework/daggerheart--world/public.js';
/** Fixed bootstrap wiring of World's original event index/audit and NPC availability, source and autonomous authority into native rules; no state writes. */
export function initializeNativeWorldEvents(){connectNativeNpcAvailability();connectNativeWorldSource();connectNativeWorldAutonomy();return connectNativeWorldEvents();}
