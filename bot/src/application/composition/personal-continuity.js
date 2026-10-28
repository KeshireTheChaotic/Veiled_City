import {connectNativePersonalContinuity} from '../../framework-to-framework/daggerheart--knowledge/public.js';
import {connectSessionPersonalContinuity} from '../../framework-to-framework/knowledge--session/public.js';
import {connectWorldPersonalContinuity} from '../../framework-to-framework/knowledge--world/public.js';
let composed=null;
/** Fixed bootstrap wiring of Knowledge's original personal continuity readers into native rules, Session and World; no state writes. */
export function initializePersonalContinuity(){
 return composed??=(connectNativePersonalContinuity(),connectSessionPersonalContinuity(),connectWorldPersonalContinuity(),true);
}
