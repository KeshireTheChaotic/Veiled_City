import {openingEntryEvidence,assemblyCoverageEvidence,openingCohortNarrativeCandidate,openingEntryProjection,openingEntryNarrativeCandidate,assertSessionOpeningPublication,assemblyHookSelection,assemblyOrientation} from '../../frameworks/session/public.js';
import {publicationSessionEvidence} from '../../frameworks/publication/public.js';

/** Bind Session's original evidence readers to Publication's fixed consumer. */
export function connectPublicationSessionEvidence(){return publicationSessionEvidence.bind({openingEntryEvidence,assemblyCoverageEvidence,openingCohortNarrativeCandidate,openingEntryProjection,openingEntryNarrativeCandidate,assertSessionOpeningPublication,assemblyHookSelection,assemblyOrientation});}

import {publicationSessionPrincipal} from '../../frameworks/publication/public.js';
import {conversationPrincipal} from '../../frameworks/session/public.js';
/** Bind the original Session reader without evaluating player state. */
export function connectPublicationSessionPrincipal(){return publicationSessionPrincipal.bind({conversationPrincipal});}

import {publicationSessionRecapSource} from '../../frameworks/publication/public.js';
import {sessionPublicationRecap} from '../../frameworks/session/public.js';
export function connectSessionPublicationRecap(){return sessionPublicationRecap.bind({scopedSessionRecap:publicationSessionRecapSource.scopedSessionRecap});}

import {sessionPublicationContinuation,sessionContinuationNoticeSource} from '../../frameworks/session/public.js';
import {publicationContinuationOutputSource,publicationOpeningQueue,publicationSessionContinuation} from '../../frameworks/publication/public.js';
export function connectSessionPublicationContinuation(){sessionPublicationContinuation.bind({prepareContinuationOutput:publicationContinuationOutputSource.prepareContinuationOutput,queueTurnPublications:publicationOpeningQueue.queueTurnPublications});return publicationSessionContinuation.bind({renderContinuationNotice:sessionContinuationNoticeSource.renderContinuationNotice});}

import {publicationSessionScene} from '../../frameworks/publication/public.js';
import {currentScene,scenePresence} from '../../frameworks/session/public.js';
export function connectPublicationSessionScene(){return publicationSessionScene.bind({currentScene,scenePresence});}
