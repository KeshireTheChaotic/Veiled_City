/** Source-pinned spotlight features with independent, owner-executed reaction children.
 * No model effects, PC dice, choice, or consent are executed during preparation. */
import {nativeEnvironmentNarrative} from './frameworks/daggerheart/public.js';
function narrativeSourceVisible(...args){return nativeEnvironmentNarrative.narrativeSourceVisible(...args);}
import {compileNativeFeatures} from './frameworks/daggerheart/public.js';
import {inspectNativeGmDecision,inspectCommittedGmDecision,nativeReactionTarget,commitGmActionCost} from './gm-action-capability.js';
import {featureCostPlan} from './frameworks/daggerheart/feature-costs.js';
import {nativeScenes,RANGE_BANDS} from './frameworks/daggerheart/public.js';
function currentScene(...args){return nativeScenes.currentScene(...args);}function scenePresence(...args){return nativeScenes.scenePresence(...args);}function sceneAccess(...args){return nativeScenes.sceneAccess(...args);}
import {nativeWorldProxy} from './frameworks/daggerheart/public.js';
function activeCityProxy(...args){return nativeWorldProxy.activeCityProxy(...args);}
import {nativePrincipals} from './frameworks/daggerheart/public.js';
function conversationPrincipal(...args){return nativePrincipals.conversationPrincipal(...args);}
import {nativePersonalContinuity} from './frameworks/daggerheart/public.js';
function personalCharacter(...args){return nativePersonalContinuity.personalCharacter(...args);}
import {nativeWorldEvents} from './frameworks/daggerheart/public.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import {typedRollProof} from './typed-roll-proof.js';
import {EncounterLibrary} from './frameworks/daggerheart/public.js';
import {reserveGmArbitrationNotice} from './native-publications.js';
import {applyNativeStressPassive} from './native-stress-passives.js';
import {inspectNativeConditionClearAncestry} from './native-condition-recovery.js';
import {incomingConditionOdds,movementConditionIssue} from './frameworks/daggerheart/native-condition-rules.js';
export {incomingConditionOdds} from './frameworks/daggerheart/native-condition-rules.js';
import {LANES,FLASH,REGENT,groupFeaturePolicies as policies,isGroupFeature,groupReactionRules,groupNeedsChoice as needsChoice,
  groupReactionOptions,groupFeatureStakes,validateGroupFeatureProposal} from './frameworks/daggerheart/group-feature-rules.js';
import {groupFeatureOutcome} from './frameworks/daggerheart/group-feature-outcomes.js';
export {isGroupFeature,groupReactionRules,groupReactionOptions,groupFeatureStakes} from './frameworks/daggerheart/group-feature-rules.js';
export {splitMixedReactionCohort,rollNativeNpcReaction,inspectNativeNpcReaction,prepareMixedReactionCohort} from './frameworks/daggerheart/mixed-reaction-rules.js';

import {createGroupFeatureExecutionRules} from './frameworks/daggerheart/public.js';
let nativeGroup;
function rules(){return nativeGroup??=createGroupFeatureExecutionRules({capabilities:{narrativeSourceVisible:(...args)=>narrativeSourceVisible(...args),compileNativeFeatures:(...args)=>compileNativeFeatures(...args),inspectNativeGmDecision:(...args)=>inspectNativeGmDecision(...args),inspectCommittedGmDecision:(...args)=>inspectCommittedGmDecision(...args),nativeReactionTarget:(...args)=>nativeReactionTarget(...args),commitGmActionCost:(...args)=>commitGmActionCost(...args),currentScene:(...args)=>currentScene(...args),scenePresence:(...args)=>scenePresence(...args),sceneAccess:(...args)=>sceneAccess(...args),activeCityProxy:(...args)=>activeCityProxy(...args),conversationPrincipal:(...args)=>conversationPrincipal(...args),personalCharacter:(...args)=>personalCharacter(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),typedRollProof:(...args)=>typedRollProof(...args),EncounterLibrary,reserveGmArbitrationNotice:(...args)=>reserveGmArbitrationNotice(...args),applyNativeStressPassive:(...args)=>applyNativeStressPassive(...args),inspectNativeConditionClearAncestry:(...args)=>inspectNativeConditionClearAncestry(...args),RANGE_BANDS}});}
export function planGroupFeature(...args){return rules().planGroupFeature(...args);}
export function prepareGroupFeature(...args){return rules().prepareGroupFeature(...args);}
export function inspectGroupFeature(...args){return rules().inspectGroupFeature(...args);}
export function inspectGroupFeatureChild(...args){return rules().inspectGroupFeatureChild(...args);}
export function groupReactionState(...args){return rules().groupReactionState(...args);}
export function applyGroupReactionOutcome(...args){return rules().applyGroupReactionOutcome(...args);}
export function settleGroupFeature(...args){return rules().settleGroupFeature(...args);}
export function groupReactionDetails(...args){return rules().groupReactionDetails(...args);}
export function validateGroupReactionEffect(...args){return rules().validateGroupReactionEffect(...args);}
export function chooseGroupReactionOutcome(...args){return rules().chooseGroupReactionOutcome(...args);}
export function planNativeSpotlight(...args){return rules().planNativeSpotlight(...args);}
export function recordNativeSpotlight(...args){return rules().recordNativeSpotlight(...args);}
export function validateNativeCondition(...args){return rules().validateNativeCondition(...args);}
export function activeNativeConditions(...args){return rules().activeNativeConditions(...args);}
export function nativeIncomingConditions(...args){return rules().nativeIncomingConditions(...args);}
export function validateIncomingConditions(...args){return rules().validateIncomingConditions(...args);}
export function nativeMovementConditionIssue(...args){return rules().nativeMovementConditionIssue(...args);}
export function nativeAttackExpiryRevision(...args){return rules().nativeAttackExpiryRevision(...args);}

import {nativeMovementReaderSource} from './frameworks/daggerheart/public.js';
const provideNativeMovementReader=()=>rules().nativeMovementConditionIssue;
nativeMovementReaderSource.provideSource(provideNativeMovementReader);
import {nativeMovementCondition} from './frameworks/daggerheart/public.js';
// Provide this module's original movement condition check to the fixed native slot; no other authority is granted.
nativeMovementCondition.bind({nativeMovementConditionIssue});
