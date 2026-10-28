import {createOpeningNarrativeCapability} from '../../frameworks/narrative/public.js';
import {createOpeningAuthoringPort} from '../../frameworks/session/public.js';

/** Session requests → narrative author; exact result/error and assertCurrent callback return unchanged. */
export function connectOpeningNarrative(author){
  return createOpeningAuthoringPort(createOpeningNarrativeCapability(author));
}

import {narrativeSourceVisible,pvpAgreementConsumer} from '../../frameworks/narrative/public.js';
import {sessionNarrativeSources} from '../../frameworks/session/public.js';
/** Pass Narrative's original source visibility and PvP agreement validation to Session unchanged. */
export function connectSessionNarrativeSources(){return sessionNarrativeSources.bind({narrativeSourceVisible,validatePvpAgreement:pvpAgreementConsumer.validatePvpAgreement});}
