import {connectOpeningNarrative} from '../../framework-to-framework/narrative--session/public.js';
import {connectPublicationTransport} from '../../framework-to-framework/discord--publication/public.js';
import {composeServices} from './compose-services.js';

/** Explicit composition only. Existing native runners adopt these interfaces in later scoped migrations. */
export function createOpeningServices({author,transport}){
  const services=composeServices([
    {name:'openingAuthor',dependencies:['author'],create:({author})=>connectOpeningNarrative(author)},
    {name:'publicationTransport',dependencies:['transport'],create:({transport})=>connectPublicationTransport(transport)}
  ],{values:{author,transport}});
  return Object.freeze({openingAuthor:services.get('openingAuthor'),transport:services.get('publicationTransport')});
}
