/** One native consent reader; revision is the same neutral function formerly reexported by Intent. */
import {stateRevision} from '../../kernel/state-revision.js';
import {createOwnerConsentRules} from './owner-consent-rules.js';
export const {externalConsentTerms,externalConsentKey,hasOwnerConsent}=createOwnerConsentRules({capabilities:{stateRevision}});
