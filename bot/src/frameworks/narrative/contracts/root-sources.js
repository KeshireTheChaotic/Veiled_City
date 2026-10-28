/** Narrative's original root-composed functions, each provided at load by the Narrative root module that composes it; Narrative keeps every rule. */
import {createFunctionPort} from '../../../kernel/function-port.js';
export const narrativeSalienceSource=createFunctionPort(['canonicalInterestEvidence'],{code:'NARRATIVE_SALIENCE_SOURCE_COMPOSITION',label:'Narrative salience source'});
export const narrativeAuthorityContextSource=createFunctionPort(['narrativeVisible','buildNarrativeContext'],{code:'NARRATIVE_AUTHORITY_CONTEXT_SOURCE_COMPOSITION',label:'Narrative authority context source'});
export const narrativePortrayalSource=createFunctionPort(['configurePortrayal'],{code:'NARRATIVE_PORTRAYAL_SOURCE_COMPOSITION',label:'Narrative portrayal source'});
