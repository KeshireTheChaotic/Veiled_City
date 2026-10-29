import {EXPANSION_FEATURES} from '../../frameworks/narrative/public.js';
import {createCityFlagService} from '../../frameworks/world/public.js';
/** One eagerly constructed service, matching the original catalog snapshot and frozen flag list. */
export const {CITY_FEATURE_FLAGS,configureCityFlags}=createCityFlagService(EXPANSION_FEATURES);
