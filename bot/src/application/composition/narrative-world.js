import {connectNarrativeEnvironmentalText,connectNarrativeWorldEncounters,connectNarrativeWorldSimulation,connectNarrativeWorld,connectWorldNarrativeSources,connectNarrativeWorldConstraints,connectNarrativeWorldPrimitives} from '../../framework-to-framework/narrative--world/public.js';
import {worldNarrativeAuthorship} from '../../frameworks/world/public.js';
let composed=null;
/** Fixed startup binding, before service construction; no database/client/model or state writes. */
export function initializeNarrativeWorld(){
  if(!composed){connectWorldNarrativeSources();connectNarrativeEnvironmentalText();connectNarrativeWorldEncounters();connectNarrativeWorldSimulation();connectNarrativeWorldConstraints();connectNarrativeWorldPrimitives();composed=connectNarrativeWorld({consumer:worldNarrativeAuthorship});}
  return composed;
}
