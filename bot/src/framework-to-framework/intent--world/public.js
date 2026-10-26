import {intentArraySchema} from '../../frameworks/intent/public.js';
import {npcActionSchema} from '../../frameworks/world/public.js';

/** Existing proposal contract composition only; native rules alone validate and commit effects. */
export const npcDirectorSchema={type:'object',additionalProperties:false,
  properties:{actions:{type:'array',maxItems:4,items:npcActionSchema},ai_intents:intentArraySchema},required:['actions','ai_intents']};

import {delegationPolicy} from '../../frameworks/intent/public.js';
import {worldDelegationPolicy} from '../../frameworks/world/public.js';
export function connectWorldDelegation(){return worldDelegationPolicy.bind(delegationPolicy);}
