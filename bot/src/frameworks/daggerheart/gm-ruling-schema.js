/** Existing shared-contract provider. Intent/runtime public adoption remains an explicit integration obligation. */
import {createGmRulingContract} from './gm-ruling-contract.js';
export const {gmRulingSchema,validateGmRulingProposal}=createGmRulingContract();
