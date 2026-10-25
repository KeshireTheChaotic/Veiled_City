/** Compatibility reader; the Narrative package owns the opaque grant and revalidation logic. */
import {createNativeAudienceGrantAdapter} from './frameworks/narrative/public.js';
import {buildNarrativeContext} from './narrative-authority-context.js';
import {sceneFictionHash,sceneFictionFailure} from './scene-fiction-context.js';
const adapter=createNativeAudienceGrantAdapter({buildNarrativeContext,sceneFictionHash,sceneFictionFailure});
export const {registerNarrativeContext,mintNarrativeAudience,revalidateNarrativeAudience}=adapter;
