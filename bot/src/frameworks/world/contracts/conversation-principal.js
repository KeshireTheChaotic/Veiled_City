/** Fixed original source function; does not confer execution or player authority. */
export function createWorldPrincipalConsumer(){let source=null;return Object.freeze({
 bind(native){if(typeof native!=='function')throw new TypeError('Native conversationPrincipal required.');if(source&&source!==native)throw new Error('conversationPrincipal replacement forbidden.');source=native;return this;},
 conversationPrincipal(...args){if(!source)throw Object.assign(new Error('conversationPrincipal has not been composed.'),{code:'WORLD_SOURCE_COMPOSITION'});return source(...args);}
});}
export const worldConversationPrincipal=createWorldPrincipalConsumer();
