import {connectIntentNativeRollReview} from '../../framework-to-framework/daggerheart--intent/public.js';

let composed=null;
/** Connect Intent's roll consumer to the original Native source before dispatch; no database access or state mutation. */
export function initializeIntentNativeRolls(){return composed??=(connectIntentNativeRollReview(),true);}
