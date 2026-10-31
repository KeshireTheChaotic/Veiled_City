import {nativeNpcEvidence} from './contracts/npc-evidence.js';
const {actorReferenceVisible}=nativeNpcEvidence;
/** Nightclub accounts remain attributed testimony. No truth, knowledge or PC-state minting. */
import {nativeArbitrationOrigin} from './contracts/environment-sources.js';
const {inspectArbitrationOrigin}=nativeArbitrationOrigin;
import {inspectNativeEnvironmentInstance} from './native-environment-instance.js';
import {featureDisposition} from './native-feature-catalog.js';
import {nativeGmOpportunityPeer} from './contracts/environment-sources.js';
const {nativeGmOpportunity}=nativeGmOpportunityPeer;
import {nativeNarrativeUnitRenderer} from './contracts/narrative-unit-renderer.js';
const {renderNarrativeUnit}=nativeNarrativeUnitRenderer;
import {nativeWorldProxy} from './contracts/world-proxy.js';
import {nativeNpcAvailability} from './contracts/npc-availability.js';
function activeCityProxy(...args){return nativeWorldProxy.activeCityProxy(...args);}function assertNpcAvailability(...args){return nativeNpcAvailability.assertNpcAvailability(...args);}
import {nativeActorControl} from './actor-control-source.js';
import {nativeScenes} from './contracts/scenes.js';
function scenePresence(...args){return nativeScenes.scenePresence(...args);}function currentScene(...args){return nativeScenes.currentScene(...args);}
import {nativeKnowledgeEvidence} from './contracts/knowledge-evidence.js';
function objectiveEvidence(...args){return nativeKnowledgeEvidence.objectiveEvidence(...args);}function evidenceType(...args){return nativeKnowledgeEvidence.evidenceType(...args);}
import {nativeWorldEstablishedEvidence} from './contracts/world-established-evidence.js';
const {nativeEstablishedFact}=nativeWorldEstablishedEvidence;
import {jsonHash as hash} from '../../kernel/json-hash.js';
import {nativeEnvironmentNarrative} from './contracts/environment-narrative.js';
function narrativeSourceVisible(...args){return nativeEnvironmentNarrative.narrativeSourceVisible(...args);}
import {assertEnvironmentAudience} from './environment-audience-source.js';
import {nativeWorldEvents} from './contracts/world-events.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import {arbitrationFailure as fail} from '../../kernel/arbitration-failure.js';
import {createEnvironmentWitnessRules} from './environment-witness-rules.js';
let nativeRules;
function rules(){return nativeRules??=createEnvironmentWitnessRules({capabilities:{inspectArbitrationOrigin:(...args)=>inspectArbitrationOrigin(...args),inspectNativeEnvironmentInstance:(...args)=>inspectNativeEnvironmentInstance(...args),featureDisposition:(...args)=>featureDisposition(...args),nativeGmOpportunity:(...args)=>nativeGmOpportunity(...args),renderNarrativeUnit:(...args)=>renderNarrativeUnit(...args),actorReferenceVisible:(...args)=>actorReferenceVisible(...args),activeCityProxy:(...args)=>activeCityProxy(...args),assertNpcAvailability:(...args)=>assertNpcAvailability(...args),nativeActorControl:(...args)=>nativeActorControl(...args),scenePresence:(...args)=>scenePresence(...args),currentScene:(...args)=>currentScene(...args),objectiveEvidence:(...args)=>objectiveEvidence(...args),evidenceType:(...args)=>evidenceType(...args),nativeEstablishedFact:(...args)=>nativeEstablishedFact(...args),hash:(...args)=>hash(...args),narrativeSourceVisible:(...args)=>narrativeSourceVisible(...args),assertEnvironmentAudience:(...args)=>assertEnvironmentAudience(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),fail:(...args)=>fail(...args)}});}
export function applyEnvironmentWitnessAccounts(...args){return rules().applyEnvironmentWitnessAccounts(...args);}
export function inspectEnvironmentWitnessAccounts(...args){return rules().inspectEnvironmentWitnessAccounts(...args);}
export function environmentWitnessAccountsProjection(...args){return rules().environmentWitnessAccountsProjection(...args);}
