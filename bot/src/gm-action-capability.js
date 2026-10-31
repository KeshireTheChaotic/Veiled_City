import {nativeNpcEvidence} from './frameworks/daggerheart/public.js';
const {actorReferenceVisible}=nativeNpcEvidence;
/** Durable native AI-GM capability inspection. No model role, approval flag or simulation score grants execution. */
import {nativeNarrativeContext} from './frameworks/daggerheart/public.js';
const {buildNarrativeContext}=nativeNarrativeContext;
import {nativeWorldProxy} from './frameworks/daggerheart/public.js';
function activeCityProxy(...args){return nativeWorldProxy.activeCityProxy(...args);}
import {consentAction,historicalActionSource} from './action-consent.js';
import {nativeScenes,RANGE_BANDS} from './frameworks/daggerheart/public.js';
function scenePresence(...args){return nativeScenes.scenePresence(...args);}function sceneAccess(...args){return nativeScenes.sceneAccess(...args);}
import {nativePrincipals} from './frameworks/daggerheart/public.js';
function conversationPrincipal(...args){return nativePrincipals.conversationPrincipal(...args);}
import {typedRollProof} from './typed-roll-proof.js';
import {isPvpIntent} from './pvp-authority.js';
import {nativeEnvironmentNarrative} from './frameworks/daggerheart/public.js';
function narrativeSourceVisible(...args){return nativeEnvironmentNarrative.narrativeSourceVisible(...args);}
import {compileNativeFeatures} from './native-feature-catalog.js';
import {inspectGroupFeatureChild,planNativeSpotlight,recordNativeSpotlight} from './native-group-features.js';
import {nativeActorControl} from './frameworks/daggerheart/public.js';
import {preRollFearOpportunity,commitPreRollFearCost} from './pre-roll-fear.js';

import {createGmCapabilityRules} from './frameworks/daggerheart/public.js';
import {nativeGmOpportunityPeer} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createGmCapabilityRules({capabilities:{buildNarrativeContext:(...args)=>buildNarrativeContext(...args),activeCityProxy:(...args)=>activeCityProxy(...args),consentAction:(...args)=>consentAction(...args),historicalActionSource:(...args)=>historicalActionSource(...args),scenePresence:(...args)=>scenePresence(...args),sceneAccess:(...args)=>sceneAccess(...args),conversationPrincipal:(...args)=>conversationPrincipal(...args),actorReferenceVisible:(...args)=>actorReferenceVisible(...args),typedRollProof:(...args)=>typedRollProof(...args),isPvpIntent:(...args)=>isPvpIntent(...args),narrativeSourceVisible:(...args)=>narrativeSourceVisible(...args),compileNativeFeatures:(...args)=>compileNativeFeatures(...args),inspectGroupFeatureChild:(...args)=>inspectGroupFeatureChild(...args),planNativeSpotlight:(...args)=>planNativeSpotlight(...args),recordNativeSpotlight:(...args)=>recordNativeSpotlight(...args),nativeActorControl:(...args)=>nativeActorControl(...args),preRollFearOpportunity:(...args)=>preRollFearOpportunity(...args),commitPreRollFearCost:(...args)=>commitPreRollFearCost(...args),RANGE_BANDS}});}
export function nativeReactionTarget(...args){return rules().nativeReactionTarget(...args);}
export function inspectNativeGmDecision(...args){return rules().inspectNativeGmDecision(...args);}
export function inspectCommittedGmDecision(...args){return rules().inspectCommittedGmDecision(...args);}
export function nativeGmOpportunity(...args){return rules().nativeGmOpportunity(...args);}
export function commitGmActionCost(...args){return rules().commitGmActionCost(...args);}
// Provide this module's original nativeGmOpportunity to the fixed port; no other authority is granted.
nativeGmOpportunityPeer.bind({nativeGmOpportunity});
