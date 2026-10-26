import {nativeNarrativeSource} from '../../frameworks/narrative/public.js';
import {createNarrativeAuthorshipConsumer} from '../../frameworks/world/public.js';

/** Bind the original Narrative runtime object; no context, audience or source policy is copied. */
export function connectNarrativeWorld({consumer=createNarrativeAuthorshipConsumer()}={}){
  return consumer.bind(nativeNarrativeSource.nativeSource());
}
