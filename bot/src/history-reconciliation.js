/** Read-only material consistency findings; subjective beliefs, aliases and disputed title are deliberately excluded. */
import { sceneView } from "./scene-continuity.js";
export function reconcileHistory(db,guild,{handout_id=""}={}){
  if(db.getCityCalendar(guild).flags.history_reconciliation!==true) return {enabled:false,findings:[]};
  const findings=[],add=(type,keys,sources,repair,confidence=95)=>findings.push({type,records:keys,sources,confidence,
    impact:"GM-private inconsistency proposal only; original records and past consequences remain unchanged.",
    repair_proposal:repair,requires:"Explicit human review, a new sourced native revision and backup; never automatic canon or PC decisions."});
  const handouts=handout_id?[db.getHandout(handout_id)].filter(row=>row?.guild_id===guild):db.listHandoutsFor(guild,"",{includeGM:true,limit:501});
  const originals=new Map();
  for(const row of handouts.slice(0,500)){
    const original=row.metadata.evidence?.original;if(!original||["missing","destroyed","archived"].includes(original.state)||typeof original.holder!=="string") continue;
    const key=original.key||row.id,prior=originals.get(key);
    if(prior&&prior.holder!==original.holder) add("incompatible_unique_original_custody",[prior.id,row.id],
      [...new Set([...(prior.history||[]),...(row.metadata.evidence.history||[])].map(item=>item.source_event))].slice(-8),
      "Verify original identity and physical custody; explicitly label copies or correct current metadata with source provenance.");
    originals.set(key,{id:row.id,holder:original.holder,history:row.metadata.evidence.history});
  }
  if(db.getActiveSession(guild)&&db.getCityCalendar(guild).flags.scene_continuity===true){
    for(const row of sceneView(db,guild,{gm:true}).occupants.filter(item=>item.data.entity_type==="npc"&&item.data.state==="actually_present")){
      const actual=db.getSimulationEntity(guild,"npc",row.data.entity_key)?.state;
      if(actual?.location_key&&actual.location_key!==row.location_key) add("stale_actual_npc_position",[row.record_key,`npc:${row.data.entity_key}`],[row.source_event],
        "Reconcile descriptive presence with authoritative completed travel/position using a fresh native scene source; do not invent arrival.");
    }
  }
  const canon=db.listCanon(guild,{includeGM:true,limit:500}),current=new Map();
  for(const row of canon){
    if(row.status!=="current") continue;
    const prior=current.get(row.canon_key);
    if(prior&&prior.value!==row.value) add("exclusive_current_canon",[prior.id,row.id],[prior.source_id,row.source_id].filter(Boolean),
      "Use existing canon conflict/ruling review. Preserve both historical assertions and fixed mystery truth; do not select a winner automatically.");
    current.set(row.canon_key,row);
  }
  const cases=db.listCityRecords(guild,{kind:"case",status:"active",includeGM:true,limit:100});
  for(const row of cases) for(const key of row.data.evidence_reports||[]){
    const report=db.getCityRecord(guild,"report",key);
    if(report&&report.actor_key!==row.data.institution) add("case_report_authorization_mismatch",[row.record_key,key],[row.source_event,report.source_event],
      "Verify current institutional report ownership/access and source-linked case references; preserve historical actions and private knowledge.");
  }
  return {enabled:true,visibility:"gm",read_only:true,findings:findings.slice(0,32),coverage:{handouts:Math.min(handouts.length,500),canon:canon.length,cases:cases.length,
    possibly_truncated:handouts.length>500||canon.length===500||cases.length===100||findings.length>32},
    limits:"Structural current-record comparisons only. Same-minute sequential arrivals, incomplete records, aliases, competing beliefs/claims and past-vs-present changes are not contradictions. Use targeted handout_id for an old item. No semantic truth adjudication."};
}
