import {publicationCharacterObservation} from '../../frameworks/publication/public.js';
import {observationQueries,ambientWorldQueries,renderObservation,characterSelfDescriptionForQuery,renderCharacterSelfDescription} from '../../frameworks/character/public.js';
export function connectPublicationCharacterObservation(){return publicationCharacterObservation.bind({observationQueries,ambientWorldQueries,renderObservation,characterSelfDescriptionForQuery,renderCharacterSelfDescription});}
