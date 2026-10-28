import {createFunctionPort} from '../../../kernel/function-port.js';

/** Narrative renders scene facts through the original World environmental grammar. */
export const narrativeEnvironmentalText=createFunctionPort(['environmentalText'],{
 code:'NARRATIVE_ENVIRONMENTAL_TEXT_COMPOSITION',label:'Narrative World environmental text'
});
