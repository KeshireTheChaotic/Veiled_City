import {connectNativeWorldAuthoring} from '../../framework-to-framework/daggerheart--world/public.js';
import {connectNativeNarrativeAudience,connectNarrativeNativeEnvironment} from '../../framework-to-framework/daggerheart--narrative/public.js';
import {connectIntentNativeActorControl,connectIntentNativeAdversaryContext,connectIntentNativeEncounter,connectNativeArbitrationOrigin,connectNativeArbitrationOriginCreator,connectIntentNativeEnvironment} from '../../framework-to-framework/daggerheart--intent/public.js';
let composed=null;
/** Bootstrap-only fixed wiring of the Daggerheart-owned native environment engine to World, Narrative and Intent original sources. Constructs no database, provider, scene or client. */
export function initializeEnvironmentScene(){
 return composed??=(connectIntentNativeEncounter(),connectIntentNativeAdversaryContext(),connectIntentNativeActorControl(),connectNativeWorldAuthoring(),connectNativeNarrativeAudience(),connectNarrativeNativeEnvironment(),connectNativeArbitrationOrigin(),connectNativeArbitrationOriginCreator(),connectIntentNativeEnvironment(),true);
}
