import {connectNativeScenes,connectSessionRangeBands,connectNativeSessionActionWindow,connectNativeActionContinuation} from '../../framework-to-framework/daggerheart--session/public.js';
/** Fixed bootstrap wiring of Session's original scene functions and continuation drain into native rules, and Daggerheart's range bands into Session; no state writes. */
export function initializeNativeScenes(){connectSessionRangeBands();connectNativeSessionActionWindow();connectNativeActionContinuation();return connectNativeScenes();}
