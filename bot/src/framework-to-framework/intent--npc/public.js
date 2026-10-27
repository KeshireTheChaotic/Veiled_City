import {nativeStrategyDelegateSource} from '../../frameworks/intent/public.js';
import {npcIntentStrategy} from '../../frameworks/npc/public.js';
export function connectNpcIntentStrategy(){return npcIntentStrategy.bind(nativeStrategyDelegateSource.delegateFunction());}

import {intentNpcPolicy} from '../../frameworks/intent/public.js';
import {actorSource,proposeGoalTransition,reviewGoalTransition,manageStrategy} from '../../frameworks/npc/public.js';
export function connectIntentNpcPolicy(){return intentNpcPolicy.bind({actorSource,proposeGoalTransition,reviewGoalTransition,manageStrategy});}

import {intentNpcEvidence} from '../../frameworks/intent/public.js';
import {actorReferenceVisible} from '../../frameworks/npc/public.js';
export function connectIntentNpcEvidence(){return intentNpcEvidence.bind(actorReferenceVisible);}
