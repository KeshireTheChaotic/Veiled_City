import {decodeNonmaterialGrammar,establishGrammarScope,renderNonmaterialGrammar,grammarHash} from '../../frameworks/narrative/public.js';
import {publicationNarrativeGrammar} from '../../frameworks/publication/public.js';
/** Bind only original Narrative grammar functions; Narrative retains text/source/current-context rules. */
export function connectPublicationNarrativeGrammar(){return publicationNarrativeGrammar.bind({decodeNonmaterialGrammar,establishGrammarScope,renderNonmaterialGrammar,grammarHash});}

import {establishGmWorldPart,renderGmWorldPart} from '../../frameworks/narrative/public.js';
import {publicationNarrativeWorld} from '../../frameworks/publication/public.js';
export function connectPublicationNarrativeWorld(){return publicationNarrativeWorld.bind({establishGmWorldPart,renderGmWorldPart});}

import {projectSceneDescription,defaultSceneDescription} from '../../frameworks/narrative/public.js';
import {publicationNarrativeScene} from '../../frameworks/publication/public.js';
export function connectPublicationNarrativeScene(){return publicationNarrativeScene.bind({projectSceneDescription,defaultSceneDescription});}

import {findFreshScenePart,renderFreshScenePart,hasPcReference} from '../../frameworks/narrative/public.js';
import {publicationNarrativeAuthoring} from '../../frameworks/publication/public.js';
export function connectPublicationNarrativeAuthoring(){return publicationNarrativeAuthoring.bind({findFreshScenePart,renderFreshScenePart,hasPcReference});}

import {findFreshNpcPart,renderFreshNpcPart} from '../../frameworks/narrative/public.js';
import {publicationNarrativeNpc} from '../../frameworks/publication/public.js';
export function connectPublicationNarrativeNpc(){return publicationNarrativeNpc.bind({findFreshNpcPart,renderFreshNpcPart});}

import {establishSceneFiction,renderSceneFiction,holdSceneFiction} from '../../frameworks/narrative/public.js';
import {publicationNarrativeSceneFiction} from '../../frameworks/publication/public.js';
export function connectPublicationNarrativeSceneFiction(){return publicationNarrativeSceneFiction.bind({establishSceneFiction,renderSceneFiction,holdSceneFiction});}

import {protectedPvpScope} from '../../frameworks/publication/public.js';
import {narrativePublicationProtectedScope} from '../../frameworks/narrative/public.js';
export function connectNarrativePublicationProtectedScope(){return narrativePublicationProtectedScope.bind({protectedPvpScope});}

import {publicationOutcomeProjectionSource} from '../../frameworks/publication/public.js';
import {narrativePublicationOutcomeProjection} from '../../frameworks/narrative/public.js';
export function connectNarrativePublicationOutcomeProjection(){return narrativePublicationOutcomeProjection.bind({nativeOutcomeProjection:publicationOutcomeProjectionSource.nativeOutcomeProjection});}

import {projectNarrativeArtifact} from '../../frameworks/narrative/public.js';
import {publicationNarrativeArtifact} from '../../frameworks/publication/public.js';
export function connectPublicationNarrativeArtifact(){return publicationNarrativeArtifact.bind({projectNarrativeArtifact});}

import {narrativeTasks} from '../../frameworks/narrative/public.js';
import {publicationNarrativeTasks} from '../../frameworks/publication/public.js';
export function connectPublicationNarrativeTasks(){return publicationNarrativeTasks.bind({narrativeTasks});}
