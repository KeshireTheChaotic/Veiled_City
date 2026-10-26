/** Original NPC acquired-source attribution only; never objective truth or disclosure permission. */
import {jsonHash} from '../../kernel/json-hash.js';
const motivationKey=value=>jsonHash(value).slice(0,32);
export function ownedKnowledgeSource(db,guild,npc,known){
  const direct=db.getWorldEvent(guild,known.source_ref);if(direct) return direct;
  const link=db.getCityRecord(guild,"seed_knowledge_source",`source-link:${motivationKey([npc,known.knowledge_key])}`);
  if(link?.actor_key===`npc:${npc}`&&link.data.original_source_ref===known.source_ref
    &&link.data.content_hash===motivationKey([known.content,known.belief_state,known.source_ref])) return db.getWorldEvent(guild,link.source_event);
  return null;
}
