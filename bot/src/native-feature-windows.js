/** Native trigger occurrences. Proposals/private prose cannot mint triggers, spotlight or costs. */
import {compileNativeFeatures,executableNativeFeatures,featureDisposition} from './frameworks/daggerheart/public.js';
import {nativeScenes} from './frameworks/daggerheart/public.js';
function currentScene(...args){return nativeScenes.currentScene(...args);}function scenePresence(...args){return nativeScenes.scenePresence(...args);}function sceneAccess(...args){return nativeScenes.sceneAccess(...args);}
import {nativeWorldProxy} from './frameworks/daggerheart/public.js';
function activeCityProxy(...args){return nativeWorldProxy.activeCityProxy(...args);}
import {validateIncomingDamageApplication,incomingAttackEvidence} from './pc-incoming.js';
import {typedRollProof} from './typed-roll-proof.js';
import {nativeWorldEvents} from './frameworks/daggerheart/public.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import {EncounterLibrary} from './frameworks/daggerheart/public.js';
import {isPvpIntent} from './pvp-authority.js';
import {inspectNativeGmDecision,nativeReactionTarget} from './gm-action-capability.js';
import {historicalActionSource} from './action-consent.js';
import {assertPcCanAct} from './pc-native-eligibility.js';
import {featureCostPlan} from './frameworks/daggerheart/feature-costs.js';
import {nativeFeatureTriggerEligible} from './frameworks/daggerheart/feature-trigger-eligibility.js';
import {featureChoiceProposalIssue} from './frameworks/daggerheart/feature-choice-policy.js';
export {featureCostPlan} from './frameworks/daggerheart/feature-costs.js';

import {createFeatureWindowRules} from './frameworks/daggerheart/public.js';
export {FEATURE_PHASES,MAX_FEATURE_DEPTH} from './frameworks/daggerheart/public.js';
let nativeWindows;
function rules(){return nativeWindows??=createFeatureWindowRules({catalog:{compileNativeFeatures:(...args)=>compileNativeFeatures(...args),executableNativeFeatures:(...args)=>executableNativeFeatures(...args),featureDisposition:(...args)=>featureDisposition(...args)},sources:{currentScene:(...args)=>currentScene(...args),scenePresence:(...args)=>scenePresence(...args),sceneAccess:(...args)=>sceneAccess(...args),activeCityProxy:(...args)=>activeCityProxy(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),EncounterLibrary},mechanics:{validateIncomingDamageApplication:(...args)=>validateIncomingDamageApplication(...args),incomingAttackEvidence:(...args)=>incomingAttackEvidence(...args),typedRollProof:(...args)=>typedRollProof(...args),isPvpIntent:(...args)=>isPvpIntent(...args),inspectNativeGmDecision:(...args)=>inspectNativeGmDecision(...args),nativeReactionTarget:(...args)=>nativeReactionTarget(...args),historicalActionSource:(...args)=>historicalActionSource(...args),assertPcCanAct:(...args)=>assertPcCanAct(...args)}});}
export function captureIncomingFeatureWindows(...args){return rules().captureIncomingFeatureWindows(...args);}
export function captureActionFeatureWindows(...args){return rules().captureActionFeatureWindows(...args);}
export function captureNoRollFeatureWindows(...args){return rules().captureNoRollFeatureWindows(...args);}
export function inspectFeatureWindow(...args){return rules().inspectFeatureWindow(...args);}
export function pendingFeatureWindows(...args){return rules().pendingFeatureWindows(...args);}
export function featureWindowChoices(...args){return rules().featureWindowChoices(...args);}
export function authorizeFeatureChoice(...args){return rules().authorizeFeatureChoice(...args);}
export function reserveFeatureWindow(...args){return rules().reserveFeatureWindow(...args);}
export function commitFeatureReactionCost(...args){return rules().commitFeatureReactionCost(...args);}
export function commitFeatureChoice(...args){return rules().commitFeatureChoice(...args);}
export function inspectFeatureUse(...args){return rules().inspectFeatureUse(...args);}
