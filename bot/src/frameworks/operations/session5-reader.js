import {operationsPersistenceSnapshot} from './contracts/persistence-snapshot.js';
/** Diagnostics-only, private SQLite handle and allowlisted SELECTs. Never instantiate VeiledDB or expose SQL execution. */
import {createHmac,randomBytes} from 'node:crypto';
import {operationsKnowledgeDisclosure} from './contracts/knowledge-disclosure.js';
const {disclosureFailureReason,factVisibleTo}=operationsKnowledgeDisclosure;
const tables=new Set(['facts','characters','sessions','turn_attempts','city_records','publication_outbox','world_events','audit_log','operation_receipts']);
const parse=text=>{try{return JSON.parse(text||'{}');}catch{return {};}};
export class Session5Reader{
  #db;
  #salt=randomBytes(32);
  constructor(file){
    this.#db=operationsPersistenceSnapshot.openDiagnosticSnapshot(file);
  }
  close(){this.#db.close();}
  columns(table){
    if(!tables.has(table))throw new Error('Diagnostics table allowlist required.');
    return this.#db.prepare(`PRAGMA table_info(${table})`).all().map(r=>r.name);
  }
  #ref(value){return createHmac('sha256',this.#salt).update(String(value)).digest('hex').slice(0,16);}
  incident({factId,characterId,sessionNumber=5}){
    // Derive/validate named columns before fixed queries; arbitrary table/column/SQL parameters are never accepted.
    for(const [table,fields] of Object.entries({characters:['id','guild_id','owner_user_id'],facts:['id','guild_id','content','visibility',
      'subject_character_id','subject_user_id','archived','provenance_json'],sessions:['id','guild_id','session_number','assembly_plan_json'],
      city_records:['guild_id','kind','record_key','data_json'],turn_attempts:['guild_id','session_id','stage','terminal_code']})){
      const columns=this.columns(table);if(fields.some(c=>!columns.includes(c)))throw new Error('Diagnostic schema mismatch; no fallback query.');
    }
    const actor=this.#db.prepare('SELECT id,guild_id,owner_user_id FROM characters WHERE id=? LIMIT 1').get(characterId);
    if(!actor)return {evidence_gap:'character_not_present',fact:{present:false}};
    const guild=actor.guild_id,fact=this.#db.prepare('SELECT id,content,visibility,subject_character_id,subject_user_id,archived,provenance_json FROM facts WHERE guild_id=? AND id=? LIMIT 1').get(guild,factId);
    const session=this.#db.prepare('SELECT id,status,assembly_mode,assembly_phase,assembly_plan_json,started_at,ended_at FROM sessions WHERE guild_id=? AND session_number=? LIMIT 1').get(guild,sessionNumber);
    const scope={mode:'party',actorCharacterId:actor.id,actorUserId:actor.owner_user_id};
    const turnRows=session?this.#db.prepare('SELECT stage,committed,terminal_code,model_attempts,created_at,updated_at FROM turn_attempts WHERE guild_id=? AND session_id=? ORDER BY rowid DESC LIMIT 30').all(guild,session.id):[];
    const records=this.#db.prepare("SELECT kind,record_key,data_json FROM city_records WHERE guild_id=? AND kind IN ('pvp_output_quarantine','candidate_claim_review','pvp_output_part') ORDER BY rowid DESC LIMIT 100").all(guild);
    const predicates=[];
    for(const row of records){const d=parse(row.data_json),candidate=d.candidate;
      for(const c of candidate?.narrative_claims||[]){
        if(c.action!=='disclosure'||c.source_ref!==factId)continue;
        predicates.push({reference:this.#ref(row.record_key),reason:disclosureFailureReason(fact,c.proposed,[scope]),
          same_session:!!session&&(d.session||d.session_id)===session.id});
      }
    }
    const receipts=session?this.#db.prepare("SELECT command_key,count(*) count FROM operation_receipts WHERE guild_id=? AND created_at>=? AND created_at<=COALESCE(?,CURRENT_TIMESTAMP) AND command_key LIKE 'session:%' GROUP BY command_key LIMIT 20")
      .all(guild,session.started_at,session.ended_at):[];
    const plan=parse(session?.assembly_plan_json),parts=Object.values(plan.delivery_state||{});
    return {snapshot_only:true,session:session?{number:sessionNumber,status:session.status,assembly_mode:session.assembly_mode,
      assembly_phase:session.assembly_phase,plan_present:Object.keys(plan).length>0,delivery_parts:parts.length,
      acknowledged_parts:parts.filter(p=>p.status==='delivered'||p.delivered).length}:null,
      fact:{present:!!fact,archived:!!fact?.archived,visibility:fact?.visibility||null,
        visible_to_party:!!fact&&factVisibleTo(fact,scope),visible_to_owner:!!fact&&factVisibleTo(fact,{...scope,mode:'private'}),
        ancestry_count:parse(fact?.provenance_json).epistemic?.source_refs?.length||0},
      disclosure_predicates:predicates,exact_candidate_evidence:predicates.length?'persisted_candidate':'not_retained_or_outside_bounded_inventory',
      failed_turns:turnRows.filter(r=>r.stage==='failed'),turn_count_bounded:turnRows.length,
      session_command_counts:receipts,record_counts:records.reduce((a,r)=>(a[r.kind]=(a[r.kind]||0)+1,a),{}),
      disclosure_reason:!fact?'fact_missing':fact.archived?'fact_archived':!factVisibleTo(fact,scope)?'audience_denied':'exact_content_unknown',
      evidence_gap:'Configured-path snapshot; live process cwd and unsaved failed candidate bytes cannot be inferred.'};
  }
}
