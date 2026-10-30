import {persistenceNativeFear} from '../../frameworks/persistence/public.js';
import {reservedCampaignFear,fearReservationFailure} from '../../frameworks/daggerheart/public.js';
import {reservedCampaignFearPeer} from '../../frameworks/daggerheart/public.js';
export function connectPersistenceNativeFear(){reservedCampaignFearPeer.bind({reservedCampaignFear});return persistenceNativeFear.bind({reservedCampaignFear,fearReservationFailure});}
