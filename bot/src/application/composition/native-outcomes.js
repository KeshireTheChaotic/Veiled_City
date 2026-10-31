import {connectPublicationNativeEnvironmentOutput,connectPublicationNativeFear,connectNativeOutcomes} from '../../framework-to-framework/daggerheart--publication/public.js';
import {nativeOutcomeConsumer} from '../../frameworks/publication/public.js';
let composed=null;
/** Bind once before services, without DB/client/provider construction or game mutation. */
export function initializeNativeOutcomes(){connectPublicationNativeEnvironmentOutput();connectPublicationNativeFear();return composed??=connectNativeOutcomes({consumer:nativeOutcomeConsumer,capabilities:nativeOutcomeConsumer.sourceCapabilities()});}
