import {characterWorldEvents,characterWorldObservation,characterObservationSource} from '../../frameworks/character/public.js';
import {indexWorldEvent,worldObservationSource,worldCharacterObservation} from '../../frameworks/world/public.js';
/** Pass World's original event index to Character unchanged. */
export function connectCharacterWorldEvents(){return characterWorldEvents.bind(indexWorldEvent);}
/** Pass World's original observation rendering to Character unchanged. */
export function connectCharacterWorldObservation(){return characterWorldObservation.bind({renderWorldObservation:worldObservationSource.renderWorldObservation});}
/** Pass Character's original departure witness capture to World unchanged. */
export function connectWorldCharacterObservation(){return worldCharacterObservation.bind({captureDepartureWitnesses:characterObservationSource.captureDepartureWitnesses});}