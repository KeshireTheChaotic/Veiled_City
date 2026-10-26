/** Fixed original source function; does not confer execution or player authority. */
export function createWorldDelegationConsumer(){let source=null;return Object.freeze({
 bind(native){if(typeof native!=='function')throw new TypeError('Native delegationPolicy required.');if(source&&source!==native)throw new Error('delegationPolicy replacement forbidden.');source=native;return this;},
 delegationPolicy(...args){if(!source)throw Object.assign(new Error('delegationPolicy has not been composed.'),{code:'WORLD_SOURCE_COMPOSITION'});return source(...args);}
});}
export const worldDelegationPolicy=createWorldDelegationConsumer();
