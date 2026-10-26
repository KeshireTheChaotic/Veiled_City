/** Descriptive relocation queries original native condition ancestry; this port never resolves movement or grants PC control. */
export function createSessionNativeMovementConsumer(){let source=null;return Object.freeze({
 bind(native){if(typeof native!=='function')throw new TypeError('Native movement-condition function required.');if(source&&source!==native)throw new Error('Native movement-condition replacement forbidden.');source=native;return this;},
 nativeMovementConditionIssue(...args){if(!source)throw Object.assign(new Error('Session native movement reader has not been composed.'),{code:'SESSION_NATIVE_MOVEMENT_COMPOSITION'});return source(...args);}
});}
export const sessionNativeMovement=createSessionNativeMovementConsumer();
