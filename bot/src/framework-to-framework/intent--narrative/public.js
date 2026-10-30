import {narrativeAuthorityContextSource,narrativeSourceVisible} from '../../frameworks/narrative/public.js';
import {intentNarrativeContext} from '../../frameworks/intent/public.js';
/** Forward original shared builder source and visibility; never construct another context/grant store. */
export function connectIntentNarrativeContext(){return intentNarrativeContext.bind({buildNarrativeContext:narrativeAuthorityContextSource.buildNarrativeContext,narrativeSourceVisible});}
