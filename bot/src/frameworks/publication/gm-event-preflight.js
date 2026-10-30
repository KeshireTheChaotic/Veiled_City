import {protectedPvpScope} from './protected-scope.js';
import {publicationKnowledgeDisclosure} from './contracts/knowledge-disclosure.js';
import {fail} from './output-records.js';
const {activeEvidence,objectiveEvidence}=publicationKnowledgeDisclosure;

/** A safe prose projection does not authorize a parallel free-text fact/reference mutation. */
export function assertProtectedModelEvents(db,guild,events,scope){
  if(!protectedPvpScope(db,guild,scope).length)return;
  for(const event of events||[]){
    if(!["fact","clue","canon","npc_update","location_update","thread"].includes(event.type))continue;
    const refs=event.epistemic?.source_refs||[];
    const existing=refs.map(ref=>db.getFact(guild,ref)).find(row=>row&&!row.archived&&row.content===event.value
      &&activeEvidence(db,guild,row.id)&&objectiveEvidence(db,guild,row)
      &&(["party","public"].includes(row.visibility)||scope.mode==="private"&&row.subject_character_id===scope.actorCharacterId));
    // Free text is not a native receipt. Existing exact facts may be recalled; new unsupported state fails/rolls back.
    if(!existing)fail();
  }
}
