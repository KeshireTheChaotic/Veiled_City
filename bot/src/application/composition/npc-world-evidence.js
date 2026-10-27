import {connectNpcWorldEvidence,connectWorldNpcSeed} from '../../framework-to-framework/npc--world/public.js';
import {worldNpcEvidence} from '../../frameworks/world/public.js';
let composed=null;
/** Fixed bootstrap-only composition. No database/client/model or game-state writes. */
export function initializeNpcWorldEvidence(){connectWorldNpcSeed();return composed??=connectNpcWorldEvidence({consumer:worldNpcEvidence});}
