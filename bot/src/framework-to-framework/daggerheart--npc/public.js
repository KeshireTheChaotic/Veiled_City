import {nativeNpcEvidence} from '../../frameworks/daggerheart/public.js';
import {actorSource,actorReferenceVisible} from '../../frameworks/npc/public.js';
/** Native policies receive original NPC evidence only, not model-authored authority flags. */
export function connectNativeNpcEvidence(){return nativeNpcEvidence.bind({actorSource,actorReferenceVisible});}
