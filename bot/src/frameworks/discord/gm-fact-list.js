import {chunkDiscordLines} from './chunking.js';
export function assertGmFactReadStore(store){
  if(typeof store?.listFactsForGM!=='function')throw new TypeError('GM fact display requires the original fact reader.');
  return store;
}
/** Original private GM display; Application retains its existing GM guard. */
export async function handleGmFactListCommand(interaction,{store,formatFact}){
  const rows=store.listFactsForGM(interaction.guildId,{
    visibility:interaction.options.getString("visibility")||"all",
    category:interaction.options.getString("category")||"",
    subjectUserId:interaction.options.getUser("player")?.id||"",
    search:interaction.options.getString("search")||"",
    limit:interaction.options.getInteger("limit")||50
  });
  const chunks=chunkDiscordLines(rows.length?[`**Campaign Facts — ${rows.length} shown**`,...rows.map(formatFact)]:["No matching campaign facts found."]);
  await interaction.reply({content:chunks[0],ephemeral:true});
  for(const chunk of chunks.slice(1))await interaction.followUp({content:chunk,ephemeral:true});
  return true;
}
