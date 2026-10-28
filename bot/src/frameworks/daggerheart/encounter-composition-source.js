/** One original lazy native encounter composition instance. */
import {randomInt} from 'node:crypto';
import {createEncounterCompositionRules} from './encounter-composition-rules.js';

export function livePcRoster(...args){return compositionRules().livePcRoster(...args);}
export function partyTier(...args){return compositionRules().partyTier(...args);}
export function autoBuildComposition(...args){return compositionRules().autoBuildComposition(...args);}

let nativeComposition;
function compositionRules(){return nativeComposition??=createEncounterCompositionRules({randomInt});}
