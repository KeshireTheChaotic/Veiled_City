import {isCharacterSourceSpan} from './source-communication.js';
import {sourceSpanInsideQuote} from './source-quote-boundaries.js';
/** Original attempt/source boundary only; passing does not authorize success or an effect. */
export function assertSceneActionSource(authoredInput,narrative){
    if(authoredInput?.kind==='ai_gm_input')for(const action of narrative?.scene_actions||[]){
      const raw=authoredInput.details.text,span=action.source_span,start=typeof span==='string'?raw.indexOf(span):-1;
      if(span&&start>=0&&(!isCharacterSourceSpan(raw,start,start+span.length)||sourceSpanInsideQuote(raw,start)))
        throw Object.assign(new Error('Quoted or explicitly OOC source cannot authorize a native scene action.'),{code:'PLAYER_INTENT'});
    }
}
