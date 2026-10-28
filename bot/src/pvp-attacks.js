/** Native PC attacks. A model cannot select mechanics, sign for either owner, roll or mint receipts. */
import {validateDamageAttackIntent} from "./pvp-profiles.js";
import {nativePersonalContinuity} from './frameworks/daggerheart/public.js';
function personalCharacter(...args){return nativePersonalContinuity.personalCharacter(...args);}
import {nativeScenes,RANGE_BANDS} from './frameworks/daggerheart/public.js';
function scenePresence(...args){return nativeScenes.scenePresence(...args);}function sceneAccess(...args){return nativeScenes.sceneAccess(...args);}
import {nativeWorldEvents} from './frameworks/daggerheart/public.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import {rollTraitBreakdown} from "./roll-requests.js";
import {captureAttackFear,pendingPvpFear} from "./pvp-fear-gate.js";
import {assertPcCanAct,assertPcAttackable} from "./pc-native-eligibility.js";
import {blazeActionAuthorization,blazeCriticalResult,validateBlazeSavedRoll} from "./pc-death.js";
import {brawlAdmission,reserveBrawlAttack,verifyBrawlAttack,consumeBrawlAttack,brawlBatchMayFinish} from "./pvp-brawl.js";
import {resolveAutonomousPvpFear} from "./pvp-fear-moves.js";
import {assertPvpSafety} from './pvp-campaign-policy.js';
import {selectRuleBasis} from './rules-arbitration.js';
import {assertPreRollFearRollAllowed} from './pre-roll-fear.js';
import {inspectArbitrationOrigin} from './scene-intent-board.js';
import {stageDamagePvp} from './pvp-profiles.js';
import {reserveCampaignAttackNotices} from './native-publications.js';
import {settlePvpDamageAction} from './pvp-damage.js';
import {consentAction} from './action-consent.js';

import {createPvpAttackRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createPvpAttackRules({capabilities:{validateDamageAttackIntent:(...args)=>validateDamageAttackIntent(...args),personalCharacter:(...args)=>personalCharacter(...args),scenePresence:(...args)=>scenePresence(...args),sceneAccess:(...args)=>sceneAccess(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),rollTraitBreakdown:(...args)=>rollTraitBreakdown(...args),captureAttackFear:(...args)=>captureAttackFear(...args),pendingPvpFear:(...args)=>pendingPvpFear(...args),assertPcCanAct:(...args)=>assertPcCanAct(...args),assertPcAttackable:(...args)=>assertPcAttackable(...args),blazeActionAuthorization:(...args)=>blazeActionAuthorization(...args),blazeCriticalResult:(...args)=>blazeCriticalResult(...args),validateBlazeSavedRoll:(...args)=>validateBlazeSavedRoll(...args),brawlAdmission:(...args)=>brawlAdmission(...args),reserveBrawlAttack:(...args)=>reserveBrawlAttack(...args),verifyBrawlAttack:(...args)=>verifyBrawlAttack(...args),consumeBrawlAttack:(...args)=>consumeBrawlAttack(...args),brawlBatchMayFinish:(...args)=>brawlBatchMayFinish(...args),resolveAutonomousPvpFear:(...args)=>resolveAutonomousPvpFear(...args),assertPvpSafety:(...args)=>assertPvpSafety(...args),selectRuleBasis:(...args)=>selectRuleBasis(...args),assertPreRollFearRollAllowed:(...args)=>assertPreRollFearRollAllowed(...args),inspectArbitrationOrigin:(...args)=>inspectArbitrationOrigin(...args),stageDamagePvp:(...args)=>stageDamagePvp(...args),reserveCampaignAttackNotices:(...args)=>reserveCampaignAttackNotices(...args),settlePvpDamageAction:(...args)=>settlePvpDamageAction(...args),consentAction:(...args)=>consentAction(...args),RANGE_BANDS}});}
export const campaignAttackActorHash=(...args)=>rules().campaignAttackActorHash(...args);
export function attackReviewAuthority(...args){return rules().attackReviewAuthority(...args);}
export function inspectPvpAttackRequest(...args){return rules().inspectPvpAttackRequest(...args);}
export function preparePvpAttack(...args){return rules().preparePvpAttack(...args);}
export function prepareCampaignPvpAttack(...args){return rules().prepareCampaignPvpAttack(...args);}
export function prepareCampaignPvpFromBoard(...args){return rules().prepareCampaignPvpFromBoard(...args);}
export function pvpAttackOwnerStatus(...args){return rules().pvpAttackOwnerStatus(...args);}
export function reviewPvpAttack(...args){return rules().reviewPvpAttack(...args);}
export function authorizePvpAttack(...args){return rules().authorizePvpAttack(...args);}
export function validatePvpAttackRoll(...args){return rules().validatePvpAttackRoll(...args);}
export function rollPvpAttack(...args){return rules().rollPvpAttack(...args);}
