/** One original recursive visibility closure; bootstrap only supplies exact native policies. */
import {jsonHash as sceneFictionHash} from '../../kernel/json-hash.js';
import {createNarrativeSourceVisibility} from './source-visibility.js';
import {narrativeKnowledgeEvidence} from './contracts/knowledge-evidence.js';
import {narrativeNpcEvidence} from './contracts/npc-evidence.js';
const visible=(row,scope)=>row&&narrativeKnowledgeEvidence.factVisibleTo({...row,subject_character_id:row.subject_character_id||row.subject_key,subject_user_id:row.subject_user_id||row.subject_key},scope);
export const {narrativeSourceVisible}=createNarrativeSourceVisibility({sceneFictionHash,visible,activeEvidence:(...args)=>narrativeKnowledgeEvidence.activeEvidence(...args),evidenceType:(...args)=>narrativeKnowledgeEvidence.evidenceType(...args),actorReferenceVisible:(...args)=>narrativeNpcEvidence.actorReferenceVisible(...args)});
