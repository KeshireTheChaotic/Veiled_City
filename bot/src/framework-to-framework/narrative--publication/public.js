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
