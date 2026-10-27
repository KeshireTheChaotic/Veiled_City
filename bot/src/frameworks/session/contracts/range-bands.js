/** Session validates descriptive ranges against Daggerheart's original range-band list; Session defines no ranges of its own. */
export function createSessionRangeBandsConsumer(){
 let source=null;
 return Object.freeze({
  bind(bands){if(!Array.isArray(bands))throw new TypeError('Daggerheart range bands required.');if(source&&source!==bands)throw new Error('Session range band replacement forbidden.');source=bands;return this;},
  bands(){if(!source)throw Object.assign(new Error('Session range bands have not been composed.'),{code:'SESSION_RANGE_BANDS_COMPOSITION'});return source;}
 });
}
export const sessionRangeBands=createSessionRangeBandsConsumer();
