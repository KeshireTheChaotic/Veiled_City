import {nativeNpcEvidence} from './frameworks/daggerheart/public.js';
const {actorReferenceVisible}=nativeNpcEvidence;
/** Nightclub accounts remain attributed testimony. No truth, knowledge or PC-state minting. */
import {inspectArbitrationOrigin} from './scene-intent-board.js';
import {inspectNativeEnvironmentInstance} from './native-environment-instance.js';
import {featureDisposition} from './native-feature-catalog.js';
import {nativeGmOpportunity} from './gm-action-capability.js';
import {renderNarrativeUnit} from './narrative-authority.js';
import {activeCityProxy,assertNpcAvailability} from './city-constraints.js';
import {nativeActorControl} from './native-actor-control.js';
import {scenePresence,currentScene} from './scene-continuity.js';
import {objectiveEvidence,evidenceType} from './epistemic.js';
import {nativeWorldEstablishedEvidence} from './frameworks/daggerheart/public.js';
const {nativeEstablishedFact}=nativeWorldEstablishedEvidence;
import {sceneFictionHash as hash,narrativeSourceVisible} from './scene-fiction-context.js';
import {assertEnvironmentAudience} from './native-environment-audience.js';
import {indexWorldEvent} from './city-calendar.js';
import {arbitrationFailure as fail} from './gm-arbitration-contract.js';
import {createEnvironmentWitnessRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createEnvironmentWitnessRules({capabilities:{inspectArbitrationOrigin:(...args)=>inspectArbitrationOrigin(...args),inspectNativeEnvironmentInstance:(...args)=>inspectNativeEnvironmentInstance(...args),featureDisposition:(...args)=>featureDisposition(...args),nativeGmOpportunity:(...args)=>nativeGmOpportunity(...args),renderNarrativeUnit:(...args)=>renderNarrativeUnit(...args),actorReferenceVisible:(...args)=>actorReferenceVisible(...args),activeCityProxy:(...args)=>activeCityProxy(...args),assertNpcAvailability:(...args)=>assertNpcAvailability(...args),nativeActorControl:(...args)=>nativeActorControl(...args),scenePresence:(...args)=>scenePresence(...args),currentScene:(...args)=>currentScene(...args),objectiveEvidence:(...args)=>objectiveEvidence(...args),evidenceType:(...args)=>evidenceType(...args),nativeEstablishedFact:(...args)=>nativeEstablishedFact(...args),hash:(...args)=>hash(...args),narrativeSourceVisible:(...args)=>narrativeSourceVisible(...args),assertEnvironmentAudience:(...args)=>assertEnvironmentAudience(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),fail:(...args)=>fail(...args)}});}
export function applyEnvironmentWitnessAccounts(...args){return rules().applyEnvironmentWitnessAccounts(...args);}
export function inspectEnvironmentWitnessAccounts(...args){return rules().inspectEnvironmentWitnessAccounts(...args);}
export function environmentWitnessAccountsProjection(...args){return rules().environmentWitnessAccountsProjection(...args);}
