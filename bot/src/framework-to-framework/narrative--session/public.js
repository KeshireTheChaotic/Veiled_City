import {createOpeningNarrativeCapability} from '../../frameworks/narrative/public.js';
import {createOpeningAuthoringPort} from '../../frameworks/session/public.js';

/** Session requests → narrative author; exact result/error and assertCurrent callback return unchanged. */
export function connectOpeningNarrative(author){
  return createOpeningAuthoringPort(createOpeningNarrativeCapability(author));
}

import {narrativeSourceVisible,pvpAgreementConsumer} from '../../frameworks/narrative/public.js';
import {sessionNarrativeSources} from '../../frameworks/session/public.js';
/** Pass Narrative's original source visibility and PvP agreement validation to Session unchanged. */
export function connectSessionNarrativeSources(){return sessionNarrativeSources.bind({narrativeSourceVisible,validatePvpAgreement:pvpAgreementConsumer.validatePvpAgreement});}

import {narrativeBridgeSessionSources} from '../../frameworks/narrative/public.js';
import {sessionOpeningAttendanceSource,sessionOpeningSource,sessionAssemblyStateSource,assemblyWriterBrief,assemblyOrientation} from '../../frameworks/session/public.js';
/** Pass Session's original opening readers and assembly writer brief through Narrative's fixed consumer. */
export function connectNarrativeBridgeSessionSources(){return narrativeBridgeSessionSources.bind({inspectOpeningEntryOpportunity:sessionOpeningAttendanceSource.inspectOpeningEntryOpportunity,inspectSessionOpening:sessionOpeningSource.inspectSessionOpening,assemblyDeliverySummary:sessionAssemblyStateSource.assemblyDeliverySummary,assemblyWriterBrief,assemblyOrientation});}
import {narrativeOpeningCohort} from '../../frameworks/narrative/public.js';
import {inspectOpeningCohortSource,openingEntryProjection} from '../../frameworks/session/public.js';
/** Pass Session's original opening cohort source inspection to Narrative's fixed consumer. */
export function connectNarrativeOpeningCohort(){return narrativeOpeningCohort.bind({inspectOpeningCohortSource,openingEntryProjection});}

import {narrativeSessionPrincipal} from '../../frameworks/narrative/public.js';
import {conversationPrincipal} from '../../frameworks/session/public.js';
/** Bind the original Session reader without evaluating player state. */
export function connectNarrativeSessionPrincipal(){return narrativeSessionPrincipal.bind({conversationPrincipal});}
