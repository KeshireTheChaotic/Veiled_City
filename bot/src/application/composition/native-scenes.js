import {connectNativeScenes,connectSessionRangeBands} from '../../framework-to-framework/daggerheart--session/public.js';
/** Fixed bootstrap wiring of Session's original scene functions into native rules, and Daggerheart's range bands into Session; no state writes. */
export function initializeNativeScenes(){connectSessionRangeBands();return connectNativeScenes();}
