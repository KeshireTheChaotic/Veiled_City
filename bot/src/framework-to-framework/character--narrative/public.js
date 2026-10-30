import {narrativeCharacterObservation} from '../../frameworks/narrative/public.js';
import {renderObservation} from '../../frameworks/character/public.js';
export function connectNarrativeCharacterObservation(){return narrativeCharacterObservation.bind({renderObservation});}
