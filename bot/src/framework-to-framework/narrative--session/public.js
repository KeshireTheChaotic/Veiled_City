import {createOpeningNarrativeCapability} from '../../frameworks/narrative/public.js';
import {createOpeningAuthoringPort} from '../../frameworks/session/public.js';

/** Session requests → narrative author; exact result/error and assertCurrent callback return unchanged. */
export function connectOpeningNarrative(author){
  return createOpeningAuthoringPort(createOpeningNarrativeCapability(author));
}
