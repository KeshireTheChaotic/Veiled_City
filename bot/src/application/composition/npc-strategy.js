import {connectNpcWorldStrategy} from '../../framework-to-framework/npc--world/public.js';
import {connectNpcIntentStrategy} from '../../framework-to-framework/intent--npc/public.js';
export function initializeNpcStrategy(){connectNpcWorldStrategy();return connectNpcIntentStrategy();}
