export function assertCharacterListStore(store){
  if(typeof store?.listCharacters!=='function')throw new TypeError('Character list requires the original character reader.');
  return store;
}
/** Original owner-private list; Application retains its receipt and ensure-player workflow. */
export async function handleCharacterListCommand(interaction,{store}){
      const rows=store.listCharacters(interaction.guildId,interaction.user.id,{includeClosed:true});
      await interaction.reply({content:rows.length?rows.map(c=>`• **${c.name}** — ${c.status}${c.is_guest?" / guest":""}`).join("\n"):"You have no characters yet.",ephemeral:true});
      return true;
    }
