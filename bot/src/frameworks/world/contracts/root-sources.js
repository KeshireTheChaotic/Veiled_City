/** World's original root-module functions, each provided at load by the World root module that owns it; World keeps every rule. */
import {createFunctionPort} from '../../../kernel/function-port.js';
export const worldLongProjectSource=createFunctionPort(['manageLongProject','projectPhaseRevision'],{code:'WORLD_LONG_PROJECT_SOURCE_COMPOSITION',label:'World long project source'});
export const worldCityCivicSource=createFunctionPort(['updateCityCivic'],{code:'WORLD_CITY_CIVIC_SOURCE_COMPOSITION',label:'World city civic source'});
