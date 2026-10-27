/** Opt-in ordinary GM ruling proposals: source-verified arbitration only, never capability or effect authority. */
import {adjudicateAcceptedIntent,selectRuleBasis} from "./rules-arbitration.js";
import {consentAction,historicalActionSource} from "./action-consent.js";
import {nativePrincipals} from './frameworks/daggerheart/public.js';
function conversationPrincipal(...args){return nativePrincipals.conversationPrincipal(...args);}
import {nativeScenes} from './frameworks/daggerheart/public.js';
function currentScene(...args){return nativeScenes.currentScene(...args);}function scenePresence(...args){return nativeScenes.scenePresence(...args);}
import {isPvpIntent} from "./pvp-authority.js";
import {assertPcCanAct} from "./pc-native-eligibility.js";
import {nativeDeviceUseIssue} from './native-feature-effects.js';

import {gmRulingSchema,validateGmRulingProposal} from './gm-ruling-schema.js';
export {gmRulingSchema,validateGmRulingProposal} from './gm-ruling-schema.js';

import {createGmRulingRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createGmRulingRules({capabilities:{adjudicateAcceptedIntent:(...args)=>adjudicateAcceptedIntent(...args),selectRuleBasis:(...args)=>selectRuleBasis(...args),consentAction:(...args)=>consentAction(...args),historicalActionSource:(...args)=>historicalActionSource(...args),conversationPrincipal:(...args)=>conversationPrincipal(...args),currentScene:(...args)=>currentScene(...args),scenePresence:(...args)=>scenePresence(...args),isPvpIntent:(...args)=>isPvpIntent(...args),assertPcCanAct:(...args)=>assertPcCanAct(...args),nativeDeviceUseIssue:(...args)=>nativeDeviceUseIssue(...args),validateGmRulingProposal:(...args)=>validateGmRulingProposal(...args)}});}
export function nativeGmSceneContext(...args){return rules().nativeGmSceneContext(...args);}
export function gmRulingContext(...args){return rules().gmRulingContext(...args);}
export function adjudicateGmRuling(...args){return rules().adjudicateGmRuling(...args);}
export function assertGmRulingRequest(...args){return rules().assertGmRulingRequest(...args);}
export function gmRulingDetails(...args){return rules().gmRulingDetails(...args);}

export const GM_RULING_PROMPT=[
  "When GM ACTION RULING CONTEXT is enabled, ordinary creative actions may include gm_ruling version 1 in their existing player_intent.",
  "Use narrative_no_roll only for costless, uncontested observation/ordinary attempts; standard_action_roll for meaningful uncertainty.",
  "Reference actual current observed/established scene evidence, explain Difficulty derivation and disclose stakes before native dice.",
  "An empty raw_refs list selects the verified generic srd:action-rolls procedure, never a new feature or special rule.",
  "Respect relevant saved rulings/overrides; provide their real refs. Missing special capabilities/rules/adapters use needs_review and blocked resolution.",
  "Shadow Tell is expression, not remote scouting. Generic rolls cannot grant magic, resources, PC reactions, damage, custody or access.",
  "Use effect_class observation or attempt_only for ordinary rulings; material effects require a separate supported native adapter.",
  "standard_action_roll uses resolution roll_required; narrative_no_roll uses auto; needs_review uses blocked with a useful safe explanation.",
  "Do not also supply native_adjudication, costs, gm:true or claimed receipts. Owner privately chooses optional traits/Experiences before dice.",
  "Pending action reviews are non-actionable status, not approved powers or outcomes. A changed tactic requires the owner's new declaration; never substitute it."
].join(" ");
