import {nativeNarrativeSource} from '../../frameworks/narrative/public.js';
import {npcNarrativeVisibility} from '../../frameworks/npc/public.js';
/** Original shared native closure, not a new grant or copied audience policy. */
export function connectNpcNarrativeVisibility(){return npcNarrativeVisibility.bind(nativeNarrativeSource.nativeSource().narrativeSourceVisible);}
