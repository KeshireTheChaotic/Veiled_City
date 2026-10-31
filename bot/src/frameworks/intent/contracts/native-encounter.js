import {createFunctionPort} from '../../../kernel/function-port.js';
const methods=createFunctionPort(["encounterProposalContext","proposeWorldEncounter","activateDelegatedEncounter","inspectNativeEncounterActivation","nativeEnvironmentBinding"],{code:'INTENT_NATIVE_ENCOUNTER_COMPOSITION',label:'Intent native encounter'});
let Library=null;
export const intentNativeEncounter=Object.freeze({
 encounterProposalContext:methods.encounterProposalContext,proposeWorldEncounter:methods.proposeWorldEncounter,activateDelegatedEncounter:methods.activateDelegatedEncounter,inspectNativeEncounterActivation:methods.inspectNativeEncounterActivation,nativeEnvironmentBinding:methods.nativeEnvironmentBinding,
 get EncounterLibrary(){if(!Library)throw Object.assign(new Error('Intent native encounter library has not been composed.'),{code:'INTENT_NATIVE_ENCOUNTER_COMPOSITION'});return Library;},
 bind(source){if(typeof source?.EncounterLibrary!=='function')throw new TypeError('Original native EncounterLibrary required.');if(Library&&Library!==source.EncounterLibrary)throw new Error('Native encounter library replacement forbidden.');methods.bind(source);Library=source.EncounterLibrary;return this;}
});

/** Original Native adversary context checks only; no copied execution policy. */
export const intentNativeAdversaryContext=createFunctionPort(['nativeAdversaryFeatureContext','requireNativeAdversaryFeature'],{code:'INTENT_NATIVE_ADVERSARY_COMPOSITION',label:'Intent Native adversary context'});

/** Original Native control classification only; never execution authority. */
export const intentNativeActorControl=createFunctionPort(['nativeActorControl'],{code:'INTENT_NATIVE_ACTOR_CONTROL_COMPOSITION',label:'Intent Native actor control'});

/** Native catalog reads; classification and source rules remain in Native. */
export const intentNativeFeatureCatalog=createFunctionPort(['featureDisposition','executableNativeFeatures','compileNativeActors'],{code:'INTENT_NATIVE_CATALOG_COMPOSITION',label:'Intent Native catalog'});

/** Native review diagnosis only; no execution or effect authority. */
export const intentNativeErrata=createFunctionPort(['nativeFeatureReviewContract'],{code:'INTENT_NATIVE_ERRATA_COMPOSITION',label:'Intent Native errata review'});

/** Original Native prepared-position evidence functions; no copied feature identifier or policy. */
export const intentNativePreparedPositions=createFunctionPort(['professionalEntryFeature','establishPreparedPositions','preparedPositionCandidates','qualifyProfessionalEntry'],{code:'INTENT_NATIVE_PREPARED_POSITION_COMPOSITION',label:'Intent Native prepared positions'});
