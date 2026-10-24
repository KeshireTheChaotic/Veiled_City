import {fearReservationHash,fearReservationFailure,inspectFearReservation,reservedCampaignFear} from './frameworks/daggerheart/public.js';
export {fearReservationHash,fearReservationFailure,inspectFearReservation,reservedCampaignFear} from './frameworks/daggerheart/public.js';
/** Native campaign Fear holds. Reserved funds remain in the capped pool until an acknowledged action commits. */
import {indexWorldEvent} from './city-calendar.js';
import {createFearReservationWriter} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createFearReservationWriter({indexWorldEvent:(...args)=>indexWorldEvent(...args)});}
export function writeFearReservation(...args){return rules().writeFearReservation(...args);}
