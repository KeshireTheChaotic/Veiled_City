import {fearReservationHash,fearReservationFailure,inspectFearReservation,reservedCampaignFear} from './frameworks/daggerheart/public.js';
export {fearReservationHash,fearReservationFailure,inspectFearReservation,reservedCampaignFear} from './frameworks/daggerheart/public.js';
/** Native campaign Fear holds. Reserved funds remain in the capped pool until an acknowledged action commits. */
import {nativeWorldEvents} from './frameworks/daggerheart/public.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import {createFearReservationWriter} from './frameworks/daggerheart/public.js';
import {reservedCampaignFearPeer} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createFearReservationWriter({indexWorldEvent:(...args)=>indexWorldEvent(...args)});}
export function writeFearReservation(...args){return rules().writeFearReservation(...args);}
// Provide this module's original reservedCampaignFear to the fixed port; no other authority is granted.
reservedCampaignFearPeer.bind({reservedCampaignFear});
