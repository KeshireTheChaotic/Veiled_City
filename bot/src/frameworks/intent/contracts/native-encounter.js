import {createFunctionPort} from '../../../kernel/function-port.js';
const methods=createFunctionPort(["encounterProposalContext","proposeWorldEncounter","activateDelegatedEncounter","inspectNativeEncounterActivation","nativeEnvironmentBinding"],{code:'INTENT_NATIVE_ENCOUNTER_COMPOSITION',label:'Intent native encounter'});
let Library=null;
export const intentNativeEncounter=Object.freeze({
 encounterProposalContext:methods.encounterProposalContext,proposeWorldEncounter:methods.proposeWorldEncounter,activateDelegatedEncounter:methods.activateDelegatedEncounter,inspectNativeEncounterActivation:methods.inspectNativeEncounterActivation,nativeEnvironmentBinding:methods.nativeEnvironmentBinding,
 get EncounterLibrary(){if(!Library)throw Object.assign(new Error('Intent native encounter library has not been composed.'),{code:'INTENT_NATIVE_ENCOUNTER_COMPOSITION'});return Library;},
 bind(source){if(typeof source?.EncounterLibrary!=='function')throw new TypeError('Original native EncounterLibrary required.');if(Library&&Library!==source.EncounterLibrary)throw new Error('Native encounter library replacement forbidden.');methods.bind(source);Library=source.EncounterLibrary;return this;}
});
