import {connectSessionWorldEvents} from '../../framework-to-framework/session--world/public.js';
import {sessionWorldEvents} from '../../frameworks/session/public.js';
let composed=null;
/** Fixed bootstrap-only native issuer wiring; no database/client/model or state writes. */
export function initializeSessionWorldEvents(){return composed??=connectSessionWorldEvents({consumer:sessionWorldEvents});}
