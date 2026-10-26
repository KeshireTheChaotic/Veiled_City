/** One World appointment service, retaining original transaction and consent rules. */
import {createWorldCommitments} from './commitments.js';
import {worldOwnerConsent} from './contracts/owner-consent.js';
import {activeCityProxy} from './active-proxy.js';
export const {establishCommitment}=createWorldCommitments({hasOwnerConsent:(...args)=>worldOwnerConsent.hasOwnerConsent(...args),activeCityProxy});
