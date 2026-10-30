import {createHash} from 'node:crypto';
import {normalizeEntityKey as normalizeNpcKey} from '../../kernel/entity-key.js';
import {applyGMEvents} from './gm-event-dispatch.js';

/** An NPC's unsupported disclosure becomes testimony-weighted evidence from that NPC, never objective truth,
 * plus the NPC's own knowledge of it so a later repeat passes the disclosure check. Failure records nothing. */
export function recordNpcTestimony(db,guildId,sessionId,claim,diagnostic,scope,sourceRef,provenance={}){
  if(diagnostic?.reason_code!=='fact_missing'||claim?.entity_type!=='npc'||!sourceRef||!String(claim.proposed||'').trim())return null;
  const npc=normalizeNpcKey(claim.entity);
  if(!db.getNpcProfile(guildId,npc))return null;
  const key=`testimony:${npc}:${createHash('sha256').update(String(claim.proposed)).digest('hex').slice(0,16)}`;
  try{
    const [result]=applyGMEvents(db,guildId,sessionId,[{type:'fact',key,value:claim.proposed,
      epistemic:{kind:'testimony',source_refs:[sourceRef],perspective:`npc:${npc}`}}],scope,provenance);
    if(!result?.ok)return null;
    db.upsertNpcKnowledge(guildId,{npcKey:npc,knowledgeKey:key,content:claim.proposed,sourceType:'testimony',sourceRef:result.id});
    return result.id;
  }catch{return null;}
}
