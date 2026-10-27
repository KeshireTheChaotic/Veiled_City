/** Original read-only exact GM-ruling snapshot proof, not a new establishment operation. */
import {jsonHash as hash} from '../../kernel/json-hash.js';
import {arbitrationFailure as fail} from '../../kernel/arbitration-failure.js';
import {worldEstablishedEvidence} from './contracts/established-evidence.js';
import {worldNarrativeAuthorship} from './contracts/narrative-authorship.js';
const {evidenceType,objectiveEvidence}=worldEstablishedEvidence;
const narrativeSourceVisible=(...args)=>worldNarrativeAuthorship.narrativeSourceVisible(...args);
export function nativeEstablishedFact(db,guild,id,scope){
  const fact=db.getFact(guild,id),epistemic=fact&&evidenceType(fact),
    ruling=epistemic?.source_refs?.length===1&&db.getWorldEvent(guild,epistemic.source_refs[0]);
  if(!objectiveEvidence(db,guild,fact)||epistemic.kind!=='established'||ruling?.status!=='active'||ruling.kind!=='gm_fact_ruling'
    ||!ruling.details.reviewed_by||ruling.source_id!==ruling.details.reviewed_by||ruling.details.fact_id!==id
    ||epistemic.perspective!==`gm:${ruling.details.reviewed_by}`||!narrativeSourceVisible(db,guild,id,scope)
    ||!narrativeSourceVisible(db,guild,ruling.event_key,scope))throw fail('native_established_fact_source_required');
  const mutations=db.db.prepare("SELECT id,after_json FROM mutation_ledger WHERE guild_id=? AND mutation_type='fact_establish' AND entity_key=? AND actor_id=? AND source_layer='city'")
    .all(guild,id,ruling.details.reviewed_by),audit=mutations.find(m=>hash(JSON.parse(m.after_json))===hash(fact));
  if(!audit)throw fail('native_established_fact_exact_reviewed_snapshot_required');
  return {fact,ruling,mutation:audit.id};
}
