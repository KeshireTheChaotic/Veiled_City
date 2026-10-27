/** Narrative's original audience minting, provided by its composing module at load, and Daggerheart's native environment situation for Narrative context. */
import {createFunctionPort} from '../../../kernel/function-port.js';
export const narrativeAudienceSource=createFunctionPort(['mintNarrativeAudience','revalidateNarrativeAudience'],{code:'NARRATIVE_AUDIENCE_SOURCE_COMPOSITION',label:'Narrative audience source'});
export const narrativeNativeEnvironment=createFunctionPort(['nativeEnvironmentSituation'],{code:'NARRATIVE_NATIVE_ENVIRONMENT_COMPOSITION',label:'Narrative native environment'});
