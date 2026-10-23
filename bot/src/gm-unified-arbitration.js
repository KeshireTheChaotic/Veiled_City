/** Intent prompt and transitional native-provider composition. All adjudication/receipt/effect policy is implemented in Daggerheart. */
import {inspectArbitrationOrigin,buildSceneIntentBoard,currentScenePlayerInputs,arbitrationTurnOrigin} from './scene-intent-board.js';
import {matchesArbitrationSchema,gmArbitrationProposalSchema,unifiedArbitrationSchema} from './gm-arbitration-contract.js';
import {gmRulingContext,adjudicateGmRuling,nativeGmSceneContext} from './gm-action-ruling.js';
import {indexWorldEvent} from './city-calendar.js';
import {consentAction,historicalActionSource} from './action-consent.js';
import {isPvpIntent} from './pvp-authority.js';
import {nativeGmOpportunity,nativeReactionTarget} from './gm-action-capability.js';
import {inspectIncomingCandidate,inspectVolleyCandidate} from './pc-incoming.js';
import {EncounterLibrary} from './encounter.js';
import {featureDisposition} from './native-feature-catalog.js';
import {requireNativeAdversaryFeature} from './native-adversary-context.js';
import {applyNativeEnvironmentProfileProposals} from './native-environment-proposals.js';
import {executeEnvironmentProposal} from './native-environment-dispatch.js';
import {authorizeFeatureChoice,reserveFeatureWindow,pendingFeatureWindows} from './native-feature-windows.js';
import {nativeAlliancePlan} from './native-encounter-relations.js';
import {nativeFeatureReviewContract} from './native-house-errata.js';
import {isGroupFeature,planGroupFeature} from './native-group-features.js';
import {prepareNativeUnarmedAttack} from './native-unarmed-attacks.js';
import {reservePreRollFear,bindPreRollFearBoard,cancelPreRollFear} from './pre-roll-fear.js';
import {reservePreRollFearNotice} from './pre-roll-fear-notice.js';
import {prepareOrdinaryRollModifier} from './native-roll-modifiers.js';
import {prepareNativeRollParticipation} from './native-roll-participation.js';
import {prepareNativeEquippedAttack} from './native-equipped-attacks.js';
import {prepareCampaignPvpFromBoard} from './pvp-attacks.js';
import {registerEnvironmentTraceRisk} from './native-environment-trace.js';
import {reserveCampaignAttackNotices} from './native-publications.js';
import {PROFESSIONAL_ENTRY,establishPreparedPositions,qualifyProfessionalEntry} from './native-professional-entry.js';

export const UNIFIED_ARBITRATION_PROMPT="Evaluate unified_arbitration in this SAME GM call. "
  +"Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes. "
  +"Select player:<original player_intents index> or exact shared/NPC intent_ref. "
  +"NPC proposals select native local actor and native knowledge refs; no PC declaration or secret disclosure may be invented. "
  +"Each decision needs current rules, reason, stakes before dice, and justified Difficulty for an action/reaction. "
  +"NPC attack uses actual PC Evasion, never invented Difficulty. "
  +"Ordinary NPC fiction normally uses npc_no_roll. "
  +"PC roll questions are adjudication only: player alone executes dice. "
  +"At Storm Drain Shrine, apply the exact Local Memory advantage only to the player's declared question about recent local movement after their respectful offering; the player owns the action, dice and resource choices. "
  +"For an exact owner unarmed_attack against a local native NPC, use feature_ref=unarmed_attack, request_pc_action_roll, stakes_kind=native_attack, "
  +"srd:attack-rolls, Strength or Finesse, difficulty=null; native rules derive Proficiency d4 physical at Melee. No inferred weapon or PC target. "
  +"A triggered feature decision uses proposal_version=2 and the EXACT trigger_ref and feature_ref from feature_windows; a Reaction does not mint normal spotlight. "
  +"An action from action_features uses the v1 default variant: OMIT proposal_version and trigger_ref. "
  +"Select its exact feature_ref, operation, trait, Difficulty and source-derived target policy, stakes_kind=native_feature. "
  +"Do not omit an entitled target from an all_in_range feature. "
  +"Blood Rush currently permits Stress recovery while electing the current position only; other relocation remains reviewed. "
  +"For exact owner weapon_attack against a local native NPC, equipped_attack requests native preparation ONLY from a unique already-approved, currently equipped weapon/rule/exact-target source. No approval, ambiguous gear or unsupported range stays reviewed; an inventory name alone does not authorize acquisition or mechanics. "
  +"Unsupported features/proxies remain review-only. PC attacks use their separate native campaign path only when campaign PvP is explicitly enabled; "
  +"use the exact accepted actor/PC target, unarmed_attack or equipped_attack, request_pc_action_roll, native_attack and srd:attack-rolls. "
  +"PC Difficulty is current target Evasion (or null for native derivation), never adversary Difficulty. This prepares an owner-private request, not dice, damage, target consent or optional spending. "
  +"Disabled campaign mode retains historical bilateral PvP. Never invent a signature or waive an owner safety-stop. "
  +"Do not emit duplicate gm_ruling/native_adjudication for a unified decision. "
  +"No dice faces, role waiver, outcome or automatic Fear spending. "
  +"Optional pre-roll Fear requires unified_arbitration version=2 and one exact pre_roll_fear request_ref/npc_intent_ref from the current board. "
  +"Select one otherwise-legal standard NPC attack against that pending action owner only; native code reserves 1 existing Fear and requires acknowledged notice before dice. "
  +"No printed feature, Experience, added modifier, extra action or owner choice is purchased. Version1 with no interrupt remains valid. "
  +"Version3 additionally accepts environment_profiles (at most one exact supported environment template at the current location); use [] unless its supported native capabilities are supplied. "
  +"A profile is GM-private provenance, not a feature effect, PC knowledge, new actor, attack or encounter. Unsupported profiles remain held without blocking independent actions. "
  +"Version4 adds environment_actions (at most one), only for supplied executable capabilities. Sirens Outside uses its exact native environment instance, feature_ref and ordinary NPC identity/category; native code validates a current GM opportunity, printed Fear, identity collisions and audience. No combat statistics, PC response or custody is authorized. Use [] when unavailable. "
  +"Version5 also admits exact source-defined environment scene actions: Code Blue medical_emergency, Emergency Cascade service_emergency with an actual local service, or Automatic Correction mundane_detail using the closed native property/value domain. These establish a local complication, never PC injury, a decision, automatic service damage or an invented numerical modifier. Unsupported actions stay private review. "
  +"Version6 admits Upload in Progress: upload_start requires an existing clear local video with native creation and pending-upload provenance, never a camera assertion; upload_advance selects one actual new native fictional occurrence and contextual ruling; upload_adjust requires the affected owner's own successful tick_back_upload/redirect_upload action. No timer, assumed PC act, invented recording, recipient knowledge or duplicate tick. "
  +"Version7 admits Everybody Saw Something Different only with an independently GM-established local supernatural incident, exactly three actual local unproxied NPCs, their already native-authored attributed speech and own evidence, an exact established true detail per account, and three pairwise contradictory quote anchors. This is contextual GM comparison, never truth promotion, forced testimony or invented knowledge. "
  +"Version9 also admits Apartment Veil Breach Door Chain: submit its exact supported feature_ref, current environment and one ordinary resident identity at the environment_actions boundary. Native code establishes source-bound presence; do not answer for the PC, move them, decide access or charge a resource. The player chooses whether to answer, refuse or take another route. "
  +"Version10 also admits After-Hours Emergency Department Something in Imaging: submit its exact feature_ref, current environment, modality (scan, monitor or lab_result), one impossible detail and the clue it offers. This records a source-bound audience-scoped diagnostic finding; do not invent a patient, treatment, PC response or mechanical outcome. Preserve creative detail and let the GM narrate it naturally. "
  +"Version11 may establish up to four prepared_positions from established scene fiction before the roll; use exact participant target_refs and a concise description for a fortified position, prepared defense, ambush or barricade. Do not invent preparation retroactively or treat mere alert/enmity as preparation. For Aster Vale Contractor Professional Entry, use proposal_version=4, exact feature_ref, feature_intent action (breach/restrain/surprise) and position_ref; native code applies Advantage only to the first qualifying roll in this encounter when the prior authoritative position evidence matches this target. Otherwise leave that passive available and adjudicate the independent action normally. Never set proposal Advantage for this passive. "
  +"Only when supplied as an executable local environment capability, Everything Logs may use its exact feature_ref on an ordinary request_pc_action_roll/attempt_only intrusion ruling, without advantage/disadvantage. Native code records this classification before dice and opens an owner-private response only on an actual action failure. No second reaction or post-hoc success claim; exactly 1 Hope is optional and owner-chosen, never automatic. "
  +"For an explicit GM-owned alliance choice between currently active local unproxied NPC combatants, use set_allies or clear_allies, exact other NPC target_refs, npc_no_roll, srd:gm-moves, stakes=none, no feature or dice. "
  +"This does not enroll PCs or prove a powered device, movement, NPC knowledge or disclosure. "
  +"Group membership and relationship scores alone never grant Local Mesh. "
  +"For source-grounded collaboration eligibility only, use proposal_version=3, disposition=native_feature_resolution, stakes_kind=attempt_only, null trait/Difficulty, no feature/Experience/odds, and collaboration {kind,request,partner_request}. "
  +"Help requires an exact owner-authored help_ally intent targeting the pending request PC, srd:help-an-ally, and empty partner_request. "
  +"Tag uses the initiator's accepted original action and two actual pending request refs with srd:tag-team-rolls. Eligibility is not consent: both owners separately authorize; native code alone charges/rolls.";


function nativeService(connectUnifiedArbitration){
  if(typeof connectUnifiedArbitration!=='function')throw new TypeError('Application-supplied unified mechanics integration required.');
  return connectUnifiedArbitration({source:{inspectArbitrationOrigin,buildSceneIntentBoard,currentScenePlayerInputs,arbitrationTurnOrigin,matchesArbitrationSchema,gmArbitrationProposalSchema,unifiedArbitrationSchema},mechanics:{gmRulingContext,adjudicateGmRuling,nativeGmSceneContext,indexWorldEvent,consentAction,historicalActionSource,isPvpIntent,nativeGmOpportunity,nativeReactionTarget,inspectIncomingCandidate,inspectVolleyCandidate,EncounterLibrary,featureDisposition,requireNativeAdversaryFeature,applyNativeEnvironmentProfileProposals,executeEnvironmentProposal,authorizeFeatureChoice,reserveFeatureWindow,pendingFeatureWindows,nativeAlliancePlan,nativeFeatureReviewContract,isGroupFeature,planGroupFeature,prepareNativeUnarmedAttack,reservePreRollFear,bindPreRollFearBoard,cancelPreRollFear,reservePreRollFearNotice,prepareOrdinaryRollModifier,prepareNativeRollParticipation,prepareNativeEquippedAttack,prepareCampaignPvpFromBoard,registerEnvironmentTraceRisk,reserveCampaignAttackNotices,PROFESSIONAL_ENTRY,establishPreparedPositions,qualifyProfessionalEntry}});
}
export function applyUnifiedArbitration(db,guild,result,playerRows,options={}){
  return nativeService(options.connectUnifiedArbitration).applyUnifiedArbitration(db,guild,result,playerRows,options);
}
export function prepareUnifiedCollaboration(db,guild,result,playerRows,{connectUnifiedArbitration}={}){
  return nativeService(connectUnifiedArbitration).prepareUnifiedCollaboration(db,guild,result,playerRows);
}
export function adjudicateSceneBoard(db,guild,origin,board,proposals,options={}){
  return nativeService(options.connectUnifiedArbitration).adjudicateSceneBoard(db,guild,origin,board,proposals,options);
}
