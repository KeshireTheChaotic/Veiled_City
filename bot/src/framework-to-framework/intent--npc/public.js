import {nativeStrategyDelegateSource} from '../../frameworks/intent/public.js';
import {npcIntentStrategy} from '../../frameworks/npc/public.js';
export function connectNpcIntentStrategy(){return npcIntentStrategy.bind(nativeStrategyDelegateSource.delegateFunction());}
