/** Native exact owner roll preauthorization review; no prose routing. */
import {personalCharacter} from './personal-continuity.js';
import {nativeWorldSource} from './frameworks/daggerheart/public.js';
function requireCitySource(...args){return nativeWorldSource.requireCitySource(...args);}
import {adjudicateRollSource,contributeRoll} from './roll-collaboration.js';

import {createRollDeclarationReviewRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createRollDeclarationReviewRules({capabilities:{personalCharacter:(...args)=>personalCharacter(...args),requireCitySource:(...args)=>requireCitySource(...args),adjudicateRollSource:(...args)=>adjudicateRollSource(...args),contributeRoll:(...args)=>contributeRoll(...args)}});}
export function reviewRollDeclaration(...args){return rules().reviewRollDeclaration(...args);}
