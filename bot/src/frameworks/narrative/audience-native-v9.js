/** Compatibility reader; the Narrative package owns the opaque grant and revalidation logic. */
import {nativeNarrativeSource} from './native-source.js';
import {narrativeAuthorityContextSource} from './contracts/root-sources.js';
const {buildNarrativeContext}=narrativeAuthorityContextSource;
import {sceneFictionHash,sceneFictionFailure,narrativeSourceVisible} from './scene-fiction-context.js';
import {narrativeAudienceSource} from './contracts/environment-sources.js';
function nativeNarrativeContext(){return {buildNarrativeContext,sceneFictionHash,sceneFictionFailure,narrativeSourceVisible};}
nativeNarrativeSource.provideContext(nativeNarrativeContext);
function nativeAudienceAdapter(){return nativeNarrativeSource.nativeSource();}
export function registerNarrativeContext(...args){return nativeAudienceAdapter().registerNarrativeContext(...args);}
export function mintNarrativeAudience(...args){return nativeAudienceAdapter().mintNarrativeAudience(...args);}
export function revalidateNarrativeAudience(...args){return nativeAudienceAdapter().revalidateNarrativeAudience(...args);}
// Provide this module's original mintNarrativeAudience, revalidateNarrativeAudience to the fixed port; no other authority is granted.
narrativeAudienceSource.bind({mintNarrativeAudience,revalidateNarrativeAudience});
