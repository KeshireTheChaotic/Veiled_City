import {nativeNarrativeSource} from '../../frameworks/narrative/public.js';
import {createNarrativeAuthorshipConsumer} from '../../frameworks/world/public.js';

/** Bind the original Narrative runtime object; no context, audience or source policy is copied. */
export function connectNarrativeWorld({consumer=createNarrativeAuthorshipConsumer()}={}){
  return consumer.bind(nativeNarrativeSource.nativeSource());
}

import {narrativeSourceVisible,nativeSalienceAvailable,narrativeImportanceSource,narrativeSalienceSource,narrativeAuthorityContextSource,narrativePortrayalSource} from '../../frameworks/narrative/public.js';
import {worldNarrativeSources} from '../../frameworks/world/public.js';
/** Pass Narrative's original visibility, salience, context and portrayal functions to World unchanged. */
export function connectWorldNarrativeSources(){return worldNarrativeSources.bind({narrativeSourceVisible,nativeSalienceAvailable,narrativeImportance:narrativeImportanceSource.narrativeImportance,canonicalInterestEvidence:narrativeSalienceSource.canonicalInterestEvidence,buildNarrativeContext:narrativeAuthorityContextSource.buildNarrativeContext,configurePortrayal:narrativePortrayalSource.configurePortrayal});}
