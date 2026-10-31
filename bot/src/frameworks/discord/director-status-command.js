export function assertDirectorStatusStore(store){
  if(['getDirectorState','isDirectorPaused'].some(name=>typeof store?.[name]!=='function'))throw new TypeError('Director status requires its complete original read interface.');
  return store;
}
/** Original status text; Application retains GM guard and active-session selection. */
export async function handleDirectorStatusCommand(interaction,{store,session}){
        const state=session?store.getDirectorState(session.id):null;
        await interaction.reply({content:[
          `**World Director** — ${store.isDirectorPaused(interaction.guildId)?"PAUSED":"active"}`,
          session?`Session ${session.session_number} • Round cadence ${state.round_number} • Scene ${state.scene_number}${state.scene_label?` (${state.scene_label})`:""}`:"No active session.",
          state?.pending_pass?`Pending: **${state.pending_pass.layer}** — ${state.pending_pass.reason||"no reason recorded"}`:"Pending: none",
          state?`Completed passes: round ${state.pass_counts?.round||0}, scene ${state.pass_counts?.scene||0}, downtime ${state.pass_counts?.downtime||0}`:""
        ].filter(Boolean).join("\n"),ephemeral:true}); return true;
      }
