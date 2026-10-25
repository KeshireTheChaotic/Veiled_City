import {npcEvidenceProvider} from '../../frameworks/npc/public.js';
import {createNpcEvidenceConsumer} from '../../frameworks/world/public.js';
/** Exact actor/source/evidence arguments and original checked result; no authority inferred from JSON. */
export function connectNpcWorldEvidence({consumer=createNpcEvidenceConsumer(),source=npcEvidenceProvider.actorSourceFunction()}={}){return consumer.bind(source);}
