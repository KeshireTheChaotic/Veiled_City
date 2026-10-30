export function assertPartyStatusStore(store){
  if(['getPartyState','getActiveSession'].some(name=>typeof store?.[name]!=='function'))throw new TypeError('Party status requires the complete original storage interface.');
  return store;
}
/** Original party status display; no establishment or consent operation. */
export async function handlePartyStatusCommand(interaction,{store}){
      const party=store.getPartyState(interaction.guildId);
      const s=store.getActiveSession(interaction.guildId);
      const members=party.members?.length?party.members.map(m=>m.name).join(", "):"none";
      const bonds=party.bonds?.length?party.bonds.slice(0,5).map(b=>`• ${b.from_character} → ${b.to_character}: ${b.reason}`).join("\n"):"No stored practical links.";
      await interaction.reply({content:[
        `**Continuing Party**`,
        `Established: **${party.established?"yes":"no"}**${party.name?` • Name: **${party.name}**`:""}`,
        `Members: ${members}`,
        s?`Current session phase: **${s.assembly_phase}**`:"",
        bonds
      ].filter(Boolean).join("\n").slice(0,1900),ephemeral:true});
      return true;
    }
