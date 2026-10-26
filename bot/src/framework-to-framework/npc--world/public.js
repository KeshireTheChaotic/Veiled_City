import {ownedKnowledgeSource} from '../../frameworks/npc/public.js';
import {worldNpcKnowledge} from '../../frameworks/world/public.js';
import {npcEvidenceProvider} from '../../frameworks/npc/public.js';
import {createNpcEvidenceConsumer} from '../../frameworks/world/public.js';
/** Exact actor/source/evidence arguments and original checked result; no authority inferred from JSON. */
export function connectNpcWorldEvidence({consumer=createNpcEvidenceConsumer(),source=npcEvidenceProvider.actorSourceFunction()}={}){worldNpcKnowledge.bind(ownedKnowledgeSource);return consumer.bind(source);}
