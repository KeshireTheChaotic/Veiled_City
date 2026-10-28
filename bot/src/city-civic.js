/** Compatibility reader and original registration point for World civic rules. */
import {worldCityCivicSource,updateCityCivic} from './frameworks/world/public.js';
export {CIVIC_KINDS,updateCityCivic,reviewCivicChange,transmitCityBelief,attemptCityInfluence,historyContext,connectCity,changeCityService,applyNpcServiceOutcome} from './frameworks/world/public.js';
worldCityCivicSource.bind({updateCityCivic});
