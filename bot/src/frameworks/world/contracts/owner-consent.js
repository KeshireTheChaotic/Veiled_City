/** Read only native exact-owner receipts; scheduling cannot invent acceptance. */
export function createWorldOwnerConsentConsumer(){let source=null;return Object.freeze({
 bind(native){if(typeof native!=='function')throw new TypeError('Native owner consent function required.');if(source&&source!==native)throw new Error('Native owner consent replacement forbidden.');source=native;return this;},
 hasOwnerConsent(...args){if(!source)throw Object.assign(new Error('Native World owner consent has not been composed.'),{code:'WORLD_OWNER_CONSENT_COMPOSITION'});return source(...args);}
});}
export const worldOwnerConsent=createWorldOwnerConsentConsumer();
