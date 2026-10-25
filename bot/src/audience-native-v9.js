/** Compatibility reader; the Narrative package owns the opaque grant and revalidation logic. */
import {createNativeAudienceGrantAdapter} from './frameworks/narrative/public.js';
import {buildNarrativeContext} from './narrative-authority-context.js';
import {sceneFictionHash,sceneFictionFailure} from './scene-fiction-context.js';
let adapter;
function nativeAudienceAdapter(){return adapter??=createNativeAudienceGrantAdapter({buildNarrativeContext,sceneFictionHash,sceneFictionFailure});}
export function registerNarrativeContext(...args){return nativeAudienceAdapter().registerNarrativeContext(...args);}
export function mintNarrativeAudience(...args){return nativeAudienceAdapter().mintNarrativeAudience(...args);}
export function revalidateNarrativeAudience(...args){return nativeAudienceAdapter().revalidateNarrativeAudience(...args);}
