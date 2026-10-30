import {nativeNarrativeSource} from '../../frameworks/narrative/public.js';
import {createNarrativeAuthorshipConsumer} from '../../frameworks/world/public.js';

/** Bind the original Narrative runtime object; no context, audience or source policy is copied. */
export function connectNarrativeWorld({consumer=createNarrativeAuthorshipConsumer()}={}){
  return consumer.bind(nativeNarrativeSource.nativeSource());
}

import {narrativeSourceVisible,nativeSalienceAvailable,narrativeImportanceSource,narrativeSalienceSource,narrativeAuthorityContextSource,narrativePortrayalSource} from '../../frameworks/narrative/public.js';
import {worldNarrativeSources} from '../../frameworks/world/public.js';
/** Pass Narrative's original visibility, salience, context and portrayal functions to World unchanged. */
export function connectWorldNarrativeSources(){return worldNarrativeSources.bind({narrativeSourceVisible,nativeSalienceAvailable,narrativeImportance:narrativeImportanceSource.narrativeImportance,canonicalInterestEvidence:narrativeSalienceSource.canonicalInterestEvidence,buildNarrativeContext:narrativeAuthorityContextSource.buildNarrativeContext,configurePortrayal:narrativePortrayalSource.configurePortrayal});}
import {narrativeEnvironmentalText} from '../../frameworks/narrative/public.js';
import {environmentalText} from '../../frameworks/world/public.js';
/** Bind World's original environmental text function to Narrative's fixed consumer. */
export function connectNarrativeEnvironmentalText(){return narrativeEnvironmentalText.bind({environmentalText});}

import {narrativeWorldEncounters} from '../../frameworks/narrative/public.js';
import {configureWorldEncounterCatalog,snapshotNativeEncounterCandidates} from '../../frameworks/world/public.js';
/** Bind World's original encounter catalog configuration and candidate snapshot to Narrative's fixed consumer. */
export function connectNarrativeWorldEncounters(){return narrativeWorldEncounters.bind({configureWorldEncounterCatalog,snapshotNativeEncounterCandidates});}

import {narrativeWorldSimulation} from '../../frameworks/narrative/public.js';
import {prepareWorldSimulationObservation} from '../../frameworks/world/public.js';
/** Bind World's original simulation observation preparation to Narrative's fixed consumer. */
export function connectNarrativeWorldSimulation(){return narrativeWorldSimulation.bind({prepareWorldSimulationObservation});}

import {narrativeWorldConstraints} from '../../frameworks/narrative/public.js';
import {activeCityProxy,assertNpcAvailability} from '../../frameworks/world/public.js';
/** Bind World's original proxy and availability rules to Narrative's fixed consumer. */
export function connectNarrativeWorldConstraints(){return narrativeWorldConstraints.bind({activeCityProxy,assertNpcAvailability});}

import {narrativeWorldPrimitives} from '../../frameworks/narrative/public.js';
import {cityObject,cityKey,cityAudit,requireCitySource,indexWorldEvent} from '../../frameworks/world/public.js';
export function connectNarrativeWorldPrimitives(){return narrativeWorldPrimitives.bind({cityObject,cityKey,cityAudit,requireCitySource,indexWorldEvent});}

export {CITY_FEATURE_FLAGS,configureCityFlags} from './city-flags.js';

import {narrativeWorldIdentityOrigin} from '../../frameworks/narrative/public.js';
import {worldIdentityOrigin} from '../../frameworks/world/public.js';
export function connectNarrativeWorldIdentityOrigin(){return narrativeWorldIdentityOrigin.bind({worldIdentityOrigin});}

import {narrativeWorldIdentityPersistence} from '../../frameworks/narrative/public.js';
import {maintainIdentityPersistence} from '../../frameworks/world/public.js';
export function connectNarrativeWorldIdentityPersistence(){return narrativeWorldIdentityPersistence.bind({maintainIdentityPersistence});}

import {narrativeWorldBackground} from '../../frameworks/narrative/public.js';
import {backgroundIdentityContext,BACKGROUND_WORLD_KINDS} from '../../frameworks/world/public.js';
const backgroundWorldKinds=()=>BACKGROUND_WORLD_KINDS;
export function connectNarrativeWorldBackground(){return narrativeWorldBackground.bind({backgroundIdentityContext,backgroundWorldKinds});}

import {narrativeWorldMaterialization} from '../../frameworks/narrative/public.js';
import {establishNarrativeEntity} from '../../frameworks/world/public.js';
export function connectNarrativeWorldMaterialization(){return narrativeWorldMaterialization.bind({establishNarrativeEntity});}

export {rankEligibleWorldSignals,worldNarrativeBridgePacket,revalidateWorldNarrativeSignal,openingOpportunityRequests} from './signals.js';
export {nativeFearClockConsequenceSnapshot} from './fear-clock-signals.js';
export {worldDirectorBridgeBeats} from './beats.js';
export {canonicalNarrativeCause} from './cause.js';
import {worldNarrativeBridgeSource} from '../../frameworks/world/public.js';
import {worldDirectorBridgeBeats} from './beats.js';
import {openingOpportunityRequests,worldNarrativeBridgePacket} from './signals.js';
import {nativeFearClockConsequenceSnapshot} from './fear-clock-signals.js';
import {canonicalNarrativeCause} from './cause.js';
import {narrativeWorldBridge} from '../../frameworks/narrative/public.js';
// Preserve the original module-load source registration; no effects or grants are created.
worldNarrativeBridgeSource.bind({worldDirectorBridgeBeats,openingOpportunityRequests});
export function connectNarrativeWorldBridge(){return narrativeWorldBridge.bind({worldNarrativeBridgePacket,worldDirectorBridgeBeats,nativeFearClockConsequenceSnapshot,canonicalNarrativeCause});}
