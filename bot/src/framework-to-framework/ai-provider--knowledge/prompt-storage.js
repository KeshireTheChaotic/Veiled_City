import {referenceTurnStorage} from '../../frameworks/ai-provider/public.js';
import {factVisibleTo} from '../../frameworks/knowledge/public.js';

/** Preserves the Knowledge framework's native recipient predicate for request-local source deduplication. */
export function referenceKnowledgeScopedTurnStorage(sections,options={}){
  return referenceTurnStorage(sections,{...options,factVisibleTo});
}
