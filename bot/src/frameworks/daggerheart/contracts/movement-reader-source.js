/** Bootstrap source of the original cached native group-feature movement reader, never an alternative rule engine. */
export function createNativeMovementReaderSource(){let factory=null;return Object.freeze({
 provideSource(native){if(typeof native!=='function')throw new TypeError('Native movement reader factory required.');if(factory&&factory!==native)throw new Error('Native movement reader source replacement forbidden.');factory=native;},
 movementFunction(){if(!factory)throw Object.assign(new Error('Native movement reader source has not been provided.'),{code:'NATIVE_MOVEMENT_SOURCE_COMPOSITION'});const reader=factory();if(typeof reader!=='function')throw new TypeError('Native movement reader function required.');return reader;}
});}
export const nativeMovementReaderSource=createNativeMovementReaderSource();
