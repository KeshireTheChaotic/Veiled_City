/** GM status projection only; check-in never generates or delivers an opening. */
export function assemblyReadiness(db,session){
  const plan=db.getAssemblyPlan(session.id)||{},states=Object.values(plan.delivery_state||{});
  const pending=session.assembly_mode==='auto'&&session.assembly_phase==='assembly';
  const present=db.roster(session.id).filter(row=>['present','late','guest'].includes(row.presence)).length;
  return {pending,present,plan:!!(plan.public_opening||plan.character_entries?.length),
    delivered:states.filter(row=>row.status==='delivered').length,uncertain:states.filter(row=>['uncertain','delivering'].includes(row.status)).length,
    guidance:pending?(present?'Players are checked in, but assembly is not complete. GM: run `/vc-session assemble` to create or continue the saved opening/hooks. Uncertain parts require reconciliation, never blind resend.':'Waiting for check-in; then GM runs `/vc-session assemble`.')
      :session.assembly_phase==='party'?'Established party: no new convergence opening is required.':'Use the current assembly mode; check-in alone does not deliver an opening.'};
}
