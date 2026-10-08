/** Read-only material consistency findings; subjective beliefs, aliases and disputed title are deliberately excluded. */
import { sceneView } from "./scene-continuity.js";
export function reconcileHistory(db,guild,{handout_id="",record_kind="",record_key=""}={}){
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
  const kinds=["strategy","commitment","long_project","organization_request","roll_request","roll_operation","consent_reply"];
  if(record_kind&&!kinds.includes(record_kind)) throw new Error("Unsupported targeted material record kind.");
  const records=record_kind&&record_key?[db.getCityRecord(guild,record_kind,record_key)].filter(Boolean):
    kinds.flatMap(kind=>db.listCityRecords(guild,{kind,includeGM:true,limit:100}));
  const open=new Set(["active","pending","consented","awaiting_consent","awaiting_partner","awaiting_selection","awaiting_damage","awaiting_damage_type"]);
  for(const row of records){
    if(row.kind!=="roll_operation"&&row.kind!=="consent_reply"&&open.has(row.status)){
      const dependencies=[row.source_event,...(row.kind==="long_project"?row.data.phases?.[row.data.index]?.prerequisites||[]:[])].filter(Boolean);
      for(const key of new Set(dependencies)){
        const seen=new Set();let event=db.getWorldEvent(guild,key),depth=0;
        while(event&&depth++<16){
          if(seen.has(event.event_key)){add("source_lineage_cycle",[row.record_key],[...seen],"Review cyclic event ancestry; create a new independent sourced revision without erasing testimony.");break;}
          seen.add(event.event_key);
          if(event.status!=="active"){add("stale_source_authority",[row.kind,row.record_key],[event.event_key],
            "Pause new dependent effects through native review; verify a replacement source. Preserve past outcomes and subjective memories.");break;}
          if(event.source_kind!=="event") break;
          const parent=db.getWorldEvent(guild,event.source_id);
          if(!parent){add("missing_source_lineage",[row.record_key],[event.event_key,event.source_id],"Restore/verify the missing ancestor before approving new dependent effects.");break;}
          event=parent;
        }
        if(!event) add("missing_source_authority",[row.kind,row.record_key],[key],"Verify/restore the actual governing source; do not fabricate retrospective authority.");
        if(depth>16) add("lineage_depth_unverified",[row.record_key],[key],"Inspect this lineage explicitly; the bounded audit cannot establish authority beyond sixteen ancestors.",50);
      }
      if(row.kind==="strategy"){
        const goal=row.data.actor_type==="npc"?db.getNpcGoal(guild,row.data.actor_key,row.data.goal_key):db.getSimulationRecord(guild,row.data.goal_key);
        if(!goal||goal.status!=="active") add("stale_plan_objective",[row.record_key,row.data.goal_key],[row.source_event],
          "Review the actor's actual objective and pause/replan using native strategy services; do not invent a new goal or execute stale steps.");
        if(Number.isInteger(row.data.deadline_minute)&&db.getSimulationClock(guild).minute>=row.data.deadline_minute)
          add("stale_plan_deadline",[row.record_key],[row.source_event],"Review/replan an expired fictional-time deadline; no wall-time escalation or automatic completion.");
      }
    }
    if(row.kind==="roll_operation") for(const resource of row.data.resource_deltas||[]){
      for(const name of ["hope","stress"]){const values=resource[name];
        if(!values||![values.before,values.after,values.delta].every(Number.isInteger)||values.after-values.before!==values.delta)
          add("inconsistent_actual_resource_receipt",[row.record_key,resource.character,name],[row.source_event],
            "Compare native saved rolls and mutation ledger before/after values under human review; never refund, charge or reroll automatically.");
      }
      if(["help","experience"].includes(row.data.op)&&resource.character===row.subject_key&&resource.hope?.delta!==-1)
        add("roll_cost_receipt_mismatch",[row.record_key,resource.character],[row.source_event],"Verify the actual one-Hope authorization and ledger receipt; preserve saved dice and seek reviewed repair.");
    }
  }
  const commitments=records.filter(row=>row.kind==="commitment"&&row.status==="active"&&Number.isInteger(row.data.start)&&Number.isInteger(row.data.end));
  for(let i=0;i<commitments.length;i++) for(const other of commitments.slice(i+1)){
    const row=commitments[i];if(row.data.start<other.data.end&&other.data.start<row.data.end
      &&row.data.participants?.some(actor=>other.data.participants?.includes(actor))) add("overlapping_actual_commitments",[row.record_key,other.record_key],
      [row.source_event,other.source_event],"Verify actual overlapping commitments and explicit participants. Human review may cancel/delegate using native services; competing wishes are not obligations.");
  }
  return {enabled:true,visibility:"gm",read_only:true,findings:findings.slice(0,32),coverage:{handouts:Math.min(handouts.length,500),canon:canon.length,cases:cases.length,
    material_records:records.length,targeted:!!(record_kind&&record_key),possibly_truncated:handouts.length>500||canon.length===500||cases.length===100||records.length>=100||findings.length>32},
    limits:"Structural current-record comparisons only. Same-minute sequential arrivals, incomplete records, aliases, competing beliefs/claims and past-vs-present changes are not contradictions. Use targeted handout_id for an old item. No semantic truth adjudication."};
}
