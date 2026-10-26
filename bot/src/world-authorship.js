/** Original World provenance provider: one shared seeded-context identity map across all exports. */
import {factVisibleTo} from './disclosure-authority.js';
import {worldHookSeedForGm} from './world-sanctioned-sources.js';
import {listNarrativeRecords} from './narrative-records.js';
import {createWorldAuthorshipRules,worldNarrativeAuthorship} from './frameworks/world/public.js';
const {mintNarrativeAudience,revalidateNarrativeAudience,narrativeSourceVisible,fail}=worldNarrativeAuthorship;
let worldAuthorship;
function authorship(){return worldAuthorship??=createWorldAuthorshipRules({mintNarrativeAudience:(...args)=>mintNarrativeAudience(...args),revalidateNarrativeAudience:(...args)=>revalidateNarrativeAudience(...args),narrativeSourceVisible:(...args)=>narrativeSourceVisible(...args),factVisibleTo:(...args)=>factVisibleTo(...args),worldHookSeedForGm:(...args)=>worldHookSeedForGm(...args),listNarrativeRecords:(...args)=>listNarrativeRecords(...args),fail:(...args)=>fail(...args)});}
export function createSeededWorldContext(...args){return authorship().createSeededWorldContext(...args);}
export function assertWorldIdentityNames(...args){return authorship().assertWorldIdentityNames(...args);}
export function assertIndependentWorldIdentity(...args){return authorship().assertIndependentWorldIdentity(...args);}
export function verifiedWorldAuthoringContext(...args){return authorship().verifiedWorldAuthoringContext(...args);}
export function privateWorldIdentityForGm(...args){return authorship().privateWorldIdentityForGm(...args);}
export function worldIdentityOrigin(...args){return authorship().worldIdentityOrigin(...args);}
