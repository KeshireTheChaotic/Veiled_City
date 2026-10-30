/** Closed native renderers. Persisted text is never an authorization or a model-controlled template. */
import {nativePersonalContinuity} from './frameworks/daggerheart/public.js';
function personalCharacter(...args){return nativePersonalContinuity.personalCharacter(...args);}
import {formatRollRequest} from './roll-requests.js';
import {inspectNativeEquippedAttack} from './native-equipped-attacks.js';
import {inspectOrdinaryRollModifier} from './native-roll-modifiers.js';
import {inspectNativeRollParticipation} from './native-roll-participation.js';
import {formatSharedRoll,validateRollSharePreview,sourceConfirmedRollAttempt} from './roll-sharing.js';
import {pvpOwnerContext} from './narrative-pvp.js';
import {progressPvp,validatePvpRoundReceipt,validatePvpResolutionReceipt} from './pvp-rounds.js';
import {pvpProjection} from './pvp-authorship.js';
import {nativeScenes} from './frameworks/daggerheart/public.js';
function currentScene(...args){return nativeScenes.currentScene(...args);}
import {typedRollProof} from './typed-roll-proof.js';
import {renderFearEffect,validateFearEffect} from './frameworks/daggerheart/public.js';
import {damagePvpOwnerContext} from './pvp-profiles.js';
import {assertGmRulingRequest} from './gm-action-ruling.js';
import {nativeGmNotice} from './gm-arbitration-output.js';
import {inspectNativeUnarmedAttack} from './native-unarmed-attacks.js';
import {renderPreRollFearNotice} from './pre-roll-fear-notice.js';
import {pvpAttackOwnerStatus} from './pvp-attacks.js';
import {pvpDamageOwnerStatus} from './pvp-damage.js';
import {createNativeNoticeRules} from './frameworks/daggerheart/public.js';
export {noticeHash} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createNativeNoticeRules({capabilities:{personalCharacter:(...args)=>personalCharacter(...args),formatRollRequest:(...args)=>formatRollRequest(...args),inspectNativeEquippedAttack:(...args)=>inspectNativeEquippedAttack(...args),inspectOrdinaryRollModifier:(...args)=>inspectOrdinaryRollModifier(...args),inspectNativeRollParticipation:(...args)=>inspectNativeRollParticipation(...args),formatSharedRoll:(...args)=>formatSharedRoll(...args),validateRollSharePreview:(...args)=>validateRollSharePreview(...args),sourceConfirmedRollAttempt:(...args)=>sourceConfirmedRollAttempt(...args),pvpOwnerContext:(...args)=>pvpOwnerContext(...args),progressPvp:(...args)=>progressPvp(...args),validatePvpRoundReceipt:(...args)=>validatePvpRoundReceipt(...args),validatePvpResolutionReceipt:(...args)=>validatePvpResolutionReceipt(...args),pvpProjection:(...args)=>pvpProjection(...args),currentScene:(...args)=>currentScene(...args),typedRollProof:(...args)=>typedRollProof(...args),renderFearEffect:(...args)=>renderFearEffect(...args),validateFearEffect:(...args)=>validateFearEffect(...args),damagePvpOwnerContext:(...args)=>damagePvpOwnerContext(...args),assertGmRulingRequest:(...args)=>assertGmRulingRequest(...args),nativeGmNotice:(...args)=>nativeGmNotice(...args),inspectNativeUnarmedAttack:(...args)=>inspectNativeUnarmedAttack(...args),renderPreRollFearNotice:(...args)=>renderPreRollFearNotice(...args),pvpAttackOwnerStatus:(...args)=>pvpAttackOwnerStatus(...args),pvpDamageOwnerStatus:(...args)=>pvpDamageOwnerStatus(...args)}});}
export function renderNativeNotice(...args){return rules().renderNativeNotice(...args);}
