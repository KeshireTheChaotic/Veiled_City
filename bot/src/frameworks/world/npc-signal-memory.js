/** Source-owned read-only NPC memory resolution for causal signal selection and saved-reference replay. */
import {jsonHash as hash} from '../../kernel/json-hash.js';
import {worldNpcVisibility} from './contracts/npc-visibility.js';
export function findNpcConversationMemory(db,guild,npc,speechRef,scope){
 return db.listNpcMemories(guild,npc,{status:'active',limit:200}).find(row=>row.source_ref===speechRef
   &&row.source_type==='heard'&&worldNpcVisibility.actorEvidenceVisible(db,guild,npc,row,scope));
}
export function npcSignalMemoryReferenceValid(db,guild,ref,scope){
 if(typeof ref.actor!=='string'||!ref.actor||typeof ref.key!=='string')return false;
 const memory=db.listNpcMemories(guild,ref.actor,{status:'active',limit:200}).find(m=>m.id===ref.key);
 return !!memory&&hash(memory)===ref.hash&&worldNpcVisibility.actorEvidenceVisible(db,guild,ref.actor,memory,scope);
}

/** Replay the original NPC actor-relative eligibility decision without granting disclosure. */
export function npcConversationMemoryVisible(...args){return worldNpcVisibility.actorEvidenceVisible(...args);}
