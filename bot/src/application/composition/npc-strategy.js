import {connectNpcWorldStrategy} from '../../framework-to-framework/npc--world/public.js';
import {connectNpcIntentStrategy,connectIntentNpcPolicy} from '../../framework-to-framework/intent--npc/public.js';
export function initializeNpcStrategy(){connectIntentNpcPolicy();connectNpcWorldStrategy();return connectNpcIntentStrategy();}
