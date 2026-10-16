/** GM status projection only; check-in never generates or delivers an opening. */
import {assemblyDeliverySummary} from './assembly-state.js';
import {assemblyPlanFreshness} from './assembly-context.js';
export function assemblyReadiness(db,session){
  const plan=db.getAssemblyPlan(session.id)||{},states=Object.values(plan.delivery_state||{});
  const slots=assemblyDeliverySummary(db,session.guild_id,session),native=slots.some(s=>s.job);
  const pending=session.assembly_mode==='auto'&&session.assembly_phase==='assembly';
  const present=db.roster(session.id).filter(row=>['present','late','guest'].includes(row.presence)).length;
  return {pending,present,plan:!!(plan.public_opening||plan.character_entries?.length),
    freshness:assemblyPlanFreshness(db,session.guild_id,session,plan),
    narrative_delivery:slots.map(s=>({name:s.name,status:s.narrative_status,previous:s.previously_delivered,
      source_status:plan.character_entries?.find(e=>e.discord_user_id===s.scope.actorUserId)?.source_diagnostics?.status||'legacy_untracked'})),
    delivered:native?slots.reduce((n,s)=>n+s.rows.filter(r=>r.status==='delivered').length,0):states.filter(row=>row.status==='delivered').length,
    uncertain:native?slots.filter(s=>s.status==='uncertain').length:states.filter(row=>['uncertain','delivering'].includes(row.status)).length,
    guidance:pending?(present?'Players are checked in, but assembly is not complete. GM: run `/vc-session assemble` to create or continue the saved opening/hooks. Uncertain parts require reconciliation, never blind resend.':'Waiting for check-in; then GM runs `/vc-session assemble`.')
      :session.assembly_phase==='party'?'Established party: no new convergence opening is required.':'Use the current assembly mode; check-in alone does not deliver an opening.'};
}
