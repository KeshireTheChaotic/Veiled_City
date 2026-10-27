import {connectNpcWorldStrategy} from '../../framework-to-framework/npc--world/public.js';
import {connectNpcIntentStrategy,connectIntentNpcPolicy,connectIntentNpcEvidence} from '../../framework-to-framework/intent--npc/public.js';
export function initializeNpcStrategy(){connectIntentNpcEvidence();connectIntentNpcPolicy();connectNpcWorldStrategy();return connectNpcIntentStrategy();}
