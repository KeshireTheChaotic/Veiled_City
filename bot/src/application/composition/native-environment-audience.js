import {connectNativeNarrativeContext,connectNativeEnvironmentNarrative} from '../../framework-to-framework/daggerheart--narrative/public.js';
import {connectNativeEnvironmentSession} from '../../framework-to-framework/daggerheart--session/public.js';
export function initializeNativeEnvironmentAudience(){connectNativeNarrativeContext();connectNativeEnvironmentNarrative();return connectNativeEnvironmentSession();}
