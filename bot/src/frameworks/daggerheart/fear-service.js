/** Existing NPC identity/world producer and explicit native Fear composition. No world authoring moved into Daggerheart. */
import { createHash } from "node:crypto";
import {nativeWorldEvents} from './contracts/world-events.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import {nativeScenes} from './contracts/scenes.js';
function currentScene(...args){return nativeScenes.currentScene(...args);}function scenePresence(...args){return nativeScenes.scenePresence(...args);}function recordScenePresence(...args){return nativeScenes.recordScenePresence(...args);}
import {nativeNarrativePvpOwner} from './contracts/narrative-pvp-owner.js';
function pvpOwnerContext(...args){return nativeNarrativePvpOwner.pvpOwnerContext(...args);}
import {nativeFearRoundSource} from './contracts/fear-peer-sources.js';
const {validatePvpRoundReceipt}=nativeFearRoundSource;
import {nativeFearGateSource} from './contracts/fear-peer-sources.js';
const {fearGateKey,pendingPvpFear}=nativeFearGateSource;
import {nativeFearTerminalSource} from './contracts/fear-peer-sources.js';
const {settlePvpWindow}=nativeFearTerminalSource;
import {nativeWorldActions} from './contracts/world-actions.js';
function configureSimulationEntity(...args){return nativeWorldActions.configureSimulationEntity(...args);}function submitNpcAction(...args){return nativeWorldActions.submitNpcAction(...args);}
import {nativeWorldProxy} from './contracts/world-proxy.js';
import {nativeNpcAvailability} from './contracts/npc-availability.js';
function activeCityProxy(...args){return nativeWorldProxy.activeCityProxy(...args);}function assertNpcAvailability(...args){return nativeNpcAvailability.assertNpcAvailability(...args);}
import {validateWorldEncounterActivation} from './encounter-service.js';
import {EncounterLibrary} from './encounter-library.js';
import {nativeFearAttackSource} from './contracts/fear-peer-sources.js';
const {validatePvpAttackRoll}=nativeFearAttackSource;
import {nativeFearDamageSource} from './contracts/fear-peer-sources.js';
const {settlePvpDamageAction}=nativeFearDamageSource;
import {nativeFearBrawlSource} from './contracts/fear-peer-sources.js';
const {assertBrawlFearOrder,orderedBrawlFear}=nativeFearBrawlSource;
import {nativeFearIncomingSource} from './contracts/fear-peer-sources.js';
const {incomingAttackEvidence,rollAutonomousFearIncomingAttack}=nativeFearIncomingSource;
import {nativeActionContinuation} from './contracts/action-continuation.js';
function drainActionContinuations(...args){return nativeActionContinuation.drainActionContinuations(...args);}
function validateMinorIdentity(...args){return nativeWorldActions.validateMinorIdentity(...args);}
function preflightNpcIdentity(...args){return nativeWorldActions.preflightNpcIdentity(...args);}
import {nativeWorldAutonomy} from './contracts/world-autonomy.js';
function worldAuthority(...args){return nativeWorldAutonomy.worldAuthority(...args);}
import {nativeActionConsentSource} from './contracts/action-consent-source.js';
function consentAction(...args){return nativeActionConsentSource.consentAction(...args);}
import {nativeFearSafetySource} from './contracts/fear-peer-sources.js';
const {assertPvpSafety}=nativeFearSafetySource;
export const fearRevision=v=>createHash("sha256").update(JSON.stringify(v)??"undefined").digest("hex");
const hash=fearRevision;
let fearNpcContent=null;
export function setPvpFearContentIndex(content){fearNpcContent=content||null;}
function fail(message){throw Object.assign(new Error(message),{code:"NARRATIVE_PVP",expected:true});}
import {nativeWorldFearThreat} from './contracts/world-fear-threat.js';
let worldFearProducer;
function fearProducer(){return worldFearProducer??=nativeWorldFearThreat.createFearNpcThreatProducer({getFearNpcContent:()=>fearNpcContent,hash:(...args)=>hash(...args),fail:(...args)=>fail(...args)});}
function defaultFearNpcProposal(...args){return fearProducer().defaultFearNpcProposal(...args);}
function createFearNpcThreat(...args){return fearProducer().createFearNpcThreat(...args);}

import {createPvpFearMoveRules} from './pvp-fear-move-rules.js';
let nativeRules;
function rules(){return nativeRules??=createPvpFearMoveRules({capabilities:{indexWorldEvent:(...args)=>indexWorldEvent(...args),currentScene:(...args)=>currentScene(...args),scenePresence:(...args)=>scenePresence(...args),pvpOwnerContext:(...args)=>pvpOwnerContext(...args),validatePvpRoundReceipt:(...args)=>validatePvpRoundReceipt(...args),fearGateKey:(...args)=>fearGateKey(...args),pendingPvpFear:(...args)=>pendingPvpFear(...args),settlePvpWindow:(...args)=>settlePvpWindow(...args),configureSimulationEntity:(...args)=>configureSimulationEntity(...args),submitNpcAction:(...args)=>submitNpcAction(...args),assertNpcAvailability:(...args)=>assertNpcAvailability(...args),validateWorldEncounterActivation:(...args)=>validateWorldEncounterActivation(...args),validatePvpAttackRoll:(...args)=>validatePvpAttackRoll(...args),settlePvpDamageAction:(...args)=>settlePvpDamageAction(...args),assertBrawlFearOrder:(...args)=>assertBrawlFearOrder(...args),orderedBrawlFear:(...args)=>orderedBrawlFear(...args),incomingAttackEvidence:(...args)=>incomingAttackEvidence(...args),rollAutonomousFearIncomingAttack:(...args)=>rollAutonomousFearIncomingAttack(...args),drainActionContinuations:(...args)=>drainActionContinuations(...args),consentAction:(...args)=>consentAction(...args),assertPvpSafety:(...args)=>assertPvpSafety(...args),hash:(...args)=>hash(...args),fail:(...args)=>fail(...args),defaultFearNpcProposal:(...args)=>defaultFearNpcProposal(...args),createFearNpcThreat:(...args)=>createFearNpcThreat(...args),getFearNpcContent:()=>fearNpcContent,createEncounterLibrary:root=>new EncounterLibrary(root)}});}
export function establishFearContext(...args){return rules().establishFearContext(...args);}
export function assertFearIncomingExecution(...args){return rules().assertFearIncomingExecution(...args);}
export function selectFearMove(...args){return rules().selectFearMove(...args);}
export function applyFearMove(...args){return rules().applyFearMove(...args);}
export function validateFearEffect(...args){return rules().validateFearEffect(...args);}
export function renderFearEffect(...args){return rules().renderFearEffect(...args);}
export function resolveAutonomousPvpFear(...args){return rules().resolveAutonomousPvpFear(...args);}
export function resumeAutonomousPvpFear(...args){return rules().resumeAutonomousPvpFear(...args);}
export function fearInbox(...args){return rules().fearInbox(...args);}
export function reconcileFearMove(...args){return rules().reconcileFearMove(...args);}
import {nativeFearEffectSource} from './contracts/fear-effect-source.js';
// Provide this module's original Fear effect validation to the fixed native slot; no other authority is granted.
nativeFearEffectSource.bind({validateFearEffect});
