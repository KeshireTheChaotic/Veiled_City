import {decodeNonmaterialGrammar,establishGrammarScope,renderNonmaterialGrammar,grammarHash} from '../../frameworks/narrative/public.js';
import {publicationNarrativeGrammar} from '../../frameworks/publication/public.js';
/** Bind only original Narrative grammar functions; Narrative retains text/source/current-context rules. */
export function connectPublicationNarrativeGrammar(){return publicationNarrativeGrammar.bind({decodeNonmaterialGrammar,establishGrammarScope,renderNonmaterialGrammar,grammarHash});}
