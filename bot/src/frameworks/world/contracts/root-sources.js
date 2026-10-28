/** World's original root-module functions, each provided at load by the World root module that owns it; World keeps every rule. */
import {createFunctionPort} from '../../../kernel/function-port.js';
export const worldLongProjectSource=createFunctionPort(['manageLongProject','projectPhaseRevision'],{code:'WORLD_LONG_PROJECT_SOURCE_COMPOSITION',label:'World long project source'});
export const worldCityCivicSource=createFunctionPort(['updateCityCivic'],{code:'WORLD_CITY_CIVIC_SOURCE_COMPOSITION',label:'World city civic source'});
export const worldObservationSource=createFunctionPort(['renderWorldObservation'],{code:'WORLD_OBSERVATION_SOURCE_COMPOSITION',label:'World observation source'});
export const worldCityDepthSource=createFunctionPort(['validateMinorIdentity'],{code:'WORLD_CITY_DEPTH_SOURCE_COMPOSITION',label:'World city depth source'});
export const worldNarrativeBridgeSource=createFunctionPort(['worldDirectorBridgeBeats','openingOpportunityRequests'],{code:'WORLD_NARRATIVE_BRIDGE_SOURCE_COMPOSITION',label:'World narrative bridge source'});
