/** Existing NPC identity/world producer and explicit native Fear composition. No world authoring moved into Daggerheart. */
import { createHash } from "node:crypto";
import {nativeWorldEvents} from './frameworks/daggerheart/public.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import {nativeScenes} from './frameworks/daggerheart/public.js';
function currentScene(...args){return nativeScenes.currentScene(...args);}function scenePresence(...args){return nativeScenes.scenePresence(...args);}function recordScenePresence(...args){return nativeScenes.recordScenePresence(...args);}
import { pvpOwnerContext } from "./narrative-pvp.js";
import { validatePvpRoundReceipt } from "./pvp-rounds.js";
import { fearGateKey, pendingPvpFear } from "./pvp-fear-gate.js";
import { settlePvpWindow } from "./pvp-terminal.js";
import {nativeWorldActions} from './frameworks/daggerheart/public.js';
function configureSimulationEntity(...args){return nativeWorldActions.configureSimulationEntity(...args);}function submitNpcAction(...args){return nativeWorldActions.submitNpcAction(...args);}
import {nativeWorldProxy,nativeNpcAvailability} from './frameworks/daggerheart/public.js';
function activeCityProxy(...args){return nativeWorldProxy.activeCityProxy(...args);}function assertNpcAvailability(...args){return nativeNpcAvailability.assertNpcAvailability(...args);}
import { validateWorldEncounterActivation, EncounterLibrary } from "./frameworks/daggerheart/public.js";
import { validatePvpAttackRoll } from "./pvp-attacks.js";
import {settlePvpDamageAction} from "./pvp-damage.js";
import {assertBrawlFearOrder,orderedBrawlFear} from "./pvp-brawl.js";
import {incomingAttackEvidence,rollAutonomousFearIncomingAttack} from "./pc-incoming.js";
import {nativeActionContinuation} from './frameworks/daggerheart/public.js';
function drainActionContinuations(...args){return nativeActionContinuation.drainActionContinuations(...args);}
function validateMinorIdentity(...args){return nativeWorldActions.validateMinorIdentity(...args);}
function preflightNpcIdentity(...args){return nativeWorldActions.preflightNpcIdentity(...args);}
import {nativeWorldAutonomy} from './frameworks/daggerheart/public.js';
function worldAuthority(...args){return nativeWorldAutonomy.worldAuthority(...args);}
import {consentAction} from "./action-consent.js";
import {assertPvpSafety} from './pvp-campaign-policy.js';
export const fearRevision=v=>createHash("sha256").update(JSON.stringify(v)??"undefined").digest("hex");
const hash=fearRevision;
let fearNpcContent=null;
export function setPvpFearContentIndex(content){fearNpcContent=content||null;}
function fail(message){throw Object.assign(new Error(message),{code:"NARRATIVE_PVP",expected:true});}
import {nativeWorldFearThreat} from './frameworks/daggerheart/public.js';
let worldFearProducer;
function fearProducer(){return worldFearProducer??=nativeWorldFearThreat.createFearNpcThreatProducer({getFearNpcContent:()=>fearNpcContent,hash:(...args)=>hash(...args),fail:(...args)=>fail(...args)});}
function defaultFearNpcProposal(...args){return fearProducer().defaultFearNpcProposal(...args);}
function createFearNpcThreat(...args){return fearProducer().createFearNpcThreat(...args);}

import {createPvpFearMoveRules} from './frameworks/daggerheart/public.js';
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
import {nativeFearEffectSource} from './frameworks/daggerheart/public.js';
// Provide this module's original Fear effect validation to the fixed native slot; no other authority is granted.
nativeFearEffectSource.bind({validateFearEffect});
