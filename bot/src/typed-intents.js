/** Original typed-intent composition facade; implementations and source policy belong to Intent. */
import {gmRulingSchema,validateGmRulingProposal} from './gm-ruling-schema.js';
import {createPlayerIntentContract,createPlayerIntentValidation,createTypedIntentPersistence,currentAcceptedIntent,intentTypedIntentReaders} from './frameworks/intent/public.js';
export {validateProposal,proposeIntents,acceptIntentForAdjudication,resolvePendingReferent,currentAcceptedIntent} from './frameworks/intent/public.js';
export const {playerIntentSchema,PLAYER_INTENT_PROMPT}=createPlayerIntentContract({gmRulingSchema});
export const {validatePlayerIntents,recoverPlayerIntents}=createPlayerIntentValidation({validateGmRulingProposal});
export const {persistPlayerIntentDiagnostics,persistPlayerIntents,persistTypedDialogue,currentTypedMovement,autoCompleteOrdinaryMovements,validateIntentResolutions}=createTypedIntentPersistence({validatePlayerIntents});
// Provide this module's original typed-intent readers to the fixed Intent slot; no other authority is granted.
intentTypedIntentReaders.bind({currentAcceptedIntent,currentTypedMovement});
