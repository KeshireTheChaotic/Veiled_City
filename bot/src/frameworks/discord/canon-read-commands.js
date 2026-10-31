export function assertCanonReadStore(store){
  if(['listCanon','listCanonConflicts'].some(name=>typeof store?.[name]!=='function'))throw new TypeError('Canon displays require the original two read methods.');
  return store;
}
/** Original canon read displays; Application retains authorization and mutation authority. */
export async function handleCanonStatusCommand(interaction,{store,isGm}){
      const rows=store.listCanon(interaction.guildId,{includeGM:isGm(),limit:100});
      await interaction.reply({content:rows.length?`**Campaign Canon**\n${rows.map(r=>`• \`${r.canon_key}\` = ${r.value}${r.visibility==="gm"?" *(GM)*":""}`).join("\n")}`.slice(0,1950):"No structured canon entries yet.",ephemeral:true});
      return true;
    }

export async function handleCanonConflictsCommand(interaction,{store}){
      const rows=store.listCanonConflicts(interaction.guildId);
      await interaction.reply({content:rows.length?`**Pending Canon Conflicts**\n${rows.map(r=>`• \`${r.id.slice(0,8)}\` **${r.canon_key}**\n  existing: ${r.existing_value}\n  proposed: ${r.proposed_value}`).join("\n")}`.slice(0,1950):"No pending canon conflicts.",ephemeral:true});
      return true;
    }
