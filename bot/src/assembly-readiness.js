/** GM status projection only; attendance and delivered opportunities never establish fictional arrival. */
import {assemblyDeliverySummary} from './assembly-state.js';
import {assemblyPlanFreshness} from './assembly-context.js';
import {inspectSessionOpening} from './session-opening.js';
export function assemblyReadiness(db,session){
  const plan=db.getAssemblyPlan(session.id)||{},states=Object.values(plan.delivery_state||{});
  const slots=assemblyDeliverySummary(db,session.guild_id,session),native=slots.some(s=>s.job);
  let opening=null;
  if(db.getCityRecord(session.guild_id,'session_opening_job',session.id)){
    try{opening=inspectSessionOpening(db,session.guild_id,session.id);}
    catch(error){if(error.code!=='SESSION_OPENING')throw error;opening={status:'source_review_required'};}
  }
  const pending=opening?!['completed','held_manual'].includes(opening.status):session.assembly_mode!=='manual'&&session.assembly_phase==='assembly';
  const present=db.roster(session.id).filter(row=>['present','late','guest'].includes(row.presence)).length;
  const guidance=session.assembly_mode==='manual'?'Manual introductions remain with the GM; attendance does not create an opening.'
    :opening?.status==='completed'?'Native opening delivery completed. Players may continue independently; assemble is inspection/recovery, not a required startup ritual.'
    :opening&&['queued','held_paused'].includes(opening.status)?'Native opening is scheduled automatically; a paused Director must be resumed by its operator. No extra assembly command is required.'
    :opening&&['planning','publishing'].includes(opening.status)?'Native opening is in progress. Preserve existing work; do not generate or send a competing opening.'
    :opening?'Native opening needs scoped review. Inspect assemble/status for exact recovery; never blindly resend uncertain parts.'
    :pending?(present?'Legacy assembly: inspect `/vc-session assemble` to prepare or recover the saved opening.':'Legacy assembly is waiting for check-in; inspect assemble/status when ready.')
    :session.assembly_phase==='party'?'Established party: no new convergence opening is required.':'Use the current assembly mode; attendance is not fictional presence.';
  return {pending,present,plan:!!(plan.assembly_contract||plan.public_opening||plan.character_entries?.length),opening_status:opening?.status||null,
    freshness:assemblyPlanFreshness(db,session.guild_id,session,plan),
    narrative_delivery:slots.map(s=>({name:s.name,status:s.narrative_status,previous:s.previously_delivered,
      narrative_generated:s.evidence.narrative_generated===true,narrative_verified:s.evidence.narrative_verified===true,
      narrative_quarantined:s.evidence.narrative_quarantined===true,
      source_status:plan.character_entries?.find(e=>e.discord_user_id===s.scope.actorUserId)?.source_diagnostics?.status||'legacy_untracked'})),
    delivered:native?slots.reduce((n,s)=>n+s.rows.filter(r=>r.status==='delivered').length,0):states.filter(row=>row.status==='delivered').length,
    uncertain:native?slots.filter(s=>s.status==='uncertain').length:states.filter(row=>['uncertain','delivering'].includes(row.status)).length,
    guidance};
}
