import {intentNativeEncounter} from './frameworks/intent/public.js';
/** Intent prompt and transitional native-provider composition. All adjudication/receipt/effect policy is implemented in Daggerheart. */
import {inspectArbitrationOrigin,buildSceneIntentBoard,currentScenePlayerInputs,arbitrationTurnOrigin} from './scene-intent-board.js';
import {matchesArbitrationSchema,gmArbitrationProposalSchema,unifiedArbitrationSchema} from './gm-arbitration-contract.js';
import {gmRulingContext,adjudicateGmRuling,nativeGmSceneContext} from './gm-action-ruling.js';
import {intentWorldPrimitives} from './frameworks/intent/public.js';
const {indexWorldEvent}=intentWorldPrimitives;
import {consentAction,historicalActionSource} from './action-consent.js';
import {isPvpIntent} from './pvp-authority.js';
import {nativeGmOpportunity,nativeReactionTarget} from './gm-action-capability.js';
import {inspectIncomingCandidate,inspectVolleyCandidate} from './pc-incoming.js';

import {intentNativeFeatureCatalog} from './frameworks/intent/public.js';
const {featureDisposition}=intentNativeFeatureCatalog;
import {intentNativeAdversaryContext} from './frameworks/intent/public.js';
const {requireNativeAdversaryFeature}=intentNativeAdversaryContext;
import {applyNativeEnvironmentProfileProposals} from './native-environment-proposals.js';
import {executeEnvironmentProposal} from './native-environment-dispatch.js';
import {authorizeFeatureChoice,reserveFeatureWindow,pendingFeatureWindows} from './native-feature-windows.js';
import {nativeAlliancePlan} from './native-encounter-relations.js';
import {intentNativeErrata} from './frameworks/intent/public.js';
const {nativeFeatureReviewContract}=intentNativeErrata;
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
import {intentNativePreparedPositions} from './frameworks/intent/public.js';
const {establishPreparedPositions,qualifyProfessionalEntry}=intentNativePreparedPositions;


function nativeService(connectUnifiedArbitration){
  if(typeof connectUnifiedArbitration!=='function')throw new TypeError('Application-supplied unified mechanics integration required.');
  return connectUnifiedArbitration({source:{inspectArbitrationOrigin,buildSceneIntentBoard,currentScenePlayerInputs,arbitrationTurnOrigin,matchesArbitrationSchema,gmArbitrationProposalSchema,unifiedArbitrationSchema},mechanics:{gmRulingContext,adjudicateGmRuling,nativeGmSceneContext,indexWorldEvent,consentAction,historicalActionSource,isPvpIntent,nativeGmOpportunity,nativeReactionTarget,inspectIncomingCandidate,inspectVolleyCandidate,EncounterLibrary:intentNativeEncounter.EncounterLibrary,featureDisposition,requireNativeAdversaryFeature,applyNativeEnvironmentProfileProposals,executeEnvironmentProposal,authorizeFeatureChoice,reserveFeatureWindow,pendingFeatureWindows,nativeAlliancePlan,nativeFeatureReviewContract,isGroupFeature,planGroupFeature,prepareNativeUnarmedAttack,reservePreRollFear,bindPreRollFearBoard,cancelPreRollFear,reservePreRollFearNotice,prepareOrdinaryRollModifier,prepareNativeRollParticipation,prepareNativeEquippedAttack,prepareCampaignPvpFromBoard,registerEnvironmentTraceRisk,reserveCampaignAttackNotices,PROFESSIONAL_ENTRY:intentNativePreparedPositions.professionalEntryFeature(),establishPreparedPositions,qualifyProfessionalEntry}});
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
