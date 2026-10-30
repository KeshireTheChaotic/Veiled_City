/** Original campaign status response; caller supplies qualified storage and Operations routing validator. */
export async function replyWithCampaignStatus(interaction,{store,validateChannelRouting}){
  const db=store;
      const c=db.ensureCampaign(interaction.guildId);
      const s=db.getActiveSession(interaction.guildId);
      const routing=validateChannelRouting(c);
      const ch=(id)=>id?`<#${id}>`:"—";
      await interaction.reply({content:[
        `**${c.name}**`,
        `Play: ${ch(c.play_channel_id)} • Mode: **${c.response_mode}**`,
        `Rules: ${ch(c.rules_channel_id)} • Case board: ${ch(c.case_board_channel_id)} • Journal: ${ch(c.journal_channel_id)}`,
        `Known NPCs: ${ch(c.known_npcs_channel_id)} • Known locations: ${ch(c.known_locations_channel_id)}`,
        `GM log: ${ch(c.gm_log_channel_id)} • State errors: ${ch(c.state_errors_channel_id)}`,
        `Veil Exposure: ${c.veil_exposure}/6 • Fear: ${c.fear??0}/12`,
        `Session: ${s?`#${s.session_number} ${s.title||""} • ${s.assembly_phase||"assembly"}`:"none active"}`,
        ...(s?(()=>{ const d=db.getDirectorState(s.id); return [`World Director: round ${d.round_number||1} • scene ${d.scene_number||1}${d.scene_label?` (${d.scene_label})`:""} • pending **${d.pending_pass?.layer||"none"}**`]; })():[]),
        `Party: ${db.getPartyState(interaction.guildId).established?"established":"not established"}`,
        `Channel routing: ${routing.ok?"valid":`INVALID (${routing.conflicts.map(row=>row.roles.join("/")).join(", ")})`}`
      ].join("\n"),ephemeral:true});
      return true;

}
