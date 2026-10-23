/** Transitional native provider wiring; all saved-result validation is implemented in Daggerheart. */
import {historicalActionSource} from "./action-consent.js";
import {validateBlazeSavedRoll} from "./pc-death.js";
import {inspectAdversaryDamageDefense} from './native-feature-damage.js';
import {inspectNativeDefenseAura,inspectNativeFormationDefense} from './native-defense-aura.js';
import {validateSavedNativeExperienceEligibility} from './native-experience-eligibility.js';
import {inspectNativeUnarmedAttack} from './native-unarmed-attacks.js';
import {inspectOrdinaryRollModifier} from './native-roll-modifiers.js';
import {inspectNativeRollParticipation} from './native-roll-participation.js';
import {inspectNativeEquippedAttack} from './native-equipped-attacks.js';
import {createTypedRollProof} from './frameworks/daggerheart/public.js';
const prove=createTypedRollProof({historicalActionSource:(...args)=>historicalActionSource(...args),validateBlazeSavedRoll:(...args)=>validateBlazeSavedRoll(...args),inspectAdversaryDamageDefense:(...args)=>inspectAdversaryDamageDefense(...args),inspectNativeDefenseAura:(...args)=>inspectNativeDefenseAura(...args),inspectNativeFormationDefense:(...args)=>inspectNativeFormationDefense(...args),validateSavedNativeExperienceEligibility:(...args)=>validateSavedNativeExperienceEligibility(...args),inspectNativeUnarmedAttack:(...args)=>inspectNativeUnarmedAttack(...args),inspectOrdinaryRollModifier:(...args)=>inspectOrdinaryRollModifier(...args),inspectNativeRollParticipation:(...args)=>inspectNativeRollParticipation(...args),inspectNativeEquippedAttack:(...args)=>inspectNativeEquippedAttack(...args)});
export function typedRollProof(...args){return prove(...args);}
