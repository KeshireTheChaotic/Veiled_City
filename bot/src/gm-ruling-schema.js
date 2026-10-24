/** Existing shared-contract provider. Intent/runtime public adoption remains an explicit integration obligation. */
import {createGmRulingContract} from './frameworks/daggerheart/public.js';
export const {gmRulingSchema,validateGmRulingProposal}=createGmRulingContract();
