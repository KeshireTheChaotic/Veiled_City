import {nativeMovementReaderSource} from '../../frameworks/daggerheart/public.js';
import {sessionNativeMovement} from '../../frameworks/session/public.js';
/** Uses the original native source engine; callback is never supplied by a model or source JSON. */
export function connectNativeSessionMovement(){return sessionNativeMovement.bind(nativeMovementReaderSource.movementFunction());}
