import {nativeNpcEvidence} from './frameworks/daggerheart/public.js';
const {actorReferenceVisible}=nativeNpcEvidence;
/** Nightclub accounts remain attributed testimony. No truth, knowledge or PC-state minting. */
import {nativeArbitrationOrigin} from './frameworks/daggerheart/public.js';
const {inspectArbitrationOrigin}=nativeArbitrationOrigin;
import {inspectNativeEnvironmentInstance} from './frameworks/daggerheart/public.js';
import {featureDisposition} from './native-feature-catalog.js';
import {nativeGmOpportunity} from './gm-action-capability.js';
import {nativeNarrativeUnitRenderer} from './frameworks/daggerheart/public.js';
const {renderNarrativeUnit}=nativeNarrativeUnitRenderer;
import {nativeWorldProxy,nativeNpcAvailability} from './frameworks/daggerheart/public.js';
function activeCityProxy(...args){return nativeWorldProxy.activeCityProxy(...args);}function assertNpcAvailability(...args){return nativeNpcAvailability.assertNpcAvailability(...args);}
import {nativeActorControl} from './frameworks/daggerheart/public.js';
import {nativeScenes} from './frameworks/daggerheart/public.js';
function scenePresence(...args){return nativeScenes.scenePresence(...args);}function currentScene(...args){return nativeScenes.currentScene(...args);}
import {nativeKnowledgeEvidence} from './frameworks/daggerheart/public.js';
function objectiveEvidence(...args){return nativeKnowledgeEvidence.objectiveEvidence(...args);}function evidenceType(...args){return nativeKnowledgeEvidence.evidenceType(...args);}
import {nativeWorldEstablishedEvidence} from './frameworks/daggerheart/public.js';
const {nativeEstablishedFact}=nativeWorldEstablishedEvidence;
import {jsonHash as hash} from './kernel/json-hash.js';
import {nativeEnvironmentNarrative} from './frameworks/daggerheart/public.js';
function narrativeSourceVisible(...args){return nativeEnvironmentNarrative.narrativeSourceVisible(...args);}
import {assertEnvironmentAudience} from './frameworks/daggerheart/public.js';
import {nativeWorldEvents} from './frameworks/daggerheart/public.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import {arbitrationFailure as fail} from './gm-arbitration-contract.js';
import {createEnvironmentWitnessRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createEnvironmentWitnessRules({capabilities:{inspectArbitrationOrigin:(...args)=>inspectArbitrationOrigin(...args),inspectNativeEnvironmentInstance:(...args)=>inspectNativeEnvironmentInstance(...args),featureDisposition:(...args)=>featureDisposition(...args),nativeGmOpportunity:(...args)=>nativeGmOpportunity(...args),renderNarrativeUnit:(...args)=>renderNarrativeUnit(...args),actorReferenceVisible:(...args)=>actorReferenceVisible(...args),activeCityProxy:(...args)=>activeCityProxy(...args),assertNpcAvailability:(...args)=>assertNpcAvailability(...args),nativeActorControl:(...args)=>nativeActorControl(...args),scenePresence:(...args)=>scenePresence(...args),currentScene:(...args)=>currentScene(...args),objectiveEvidence:(...args)=>objectiveEvidence(...args),evidenceType:(...args)=>evidenceType(...args),nativeEstablishedFact:(...args)=>nativeEstablishedFact(...args),hash:(...args)=>hash(...args),narrativeSourceVisible:(...args)=>narrativeSourceVisible(...args),assertEnvironmentAudience:(...args)=>assertEnvironmentAudience(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),fail:(...args)=>fail(...args)}});}
export function applyEnvironmentWitnessAccounts(...args){return rules().applyEnvironmentWitnessAccounts(...args);}
export function inspectEnvironmentWitnessAccounts(...args){return rules().inspectEnvironmentWitnessAccounts(...args);}
export function environmentWitnessAccountsProjection(...args){return rules().environmentWitnessAccountsProjection(...args);}
