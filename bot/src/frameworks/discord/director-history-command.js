import {chunkDiscordLines} from './chunking.js';
export function assertDirectorHistoryStore(store){
  if(typeof store?.listDirectorHistory!=='function')throw new TypeError('Director history requires the original history reader.');
  return store;
}
/** Original private history display; Application retains its existing GM guard. */
export async function handleDirectorHistoryCommand(interaction,{store}){
        const rows=store.listDirectorHistory(interaction.guildId,interaction.options.getInteger("limit")||15);
        const chunks=chunkDiscordLines(rows.length?["**World Director History**",...rows.map(r=>`• \`${r.id.slice(0,8)}\` **${r.layer}** • ${r.status} • ${r.acted?"acted":"no move"} • ${r.created_at}\n  ${r.rationale||r.error||"No rationale recorded."}`)]:["No director history recorded yet."]);
        await interaction.reply({content:chunks[0],ephemeral:true}); for(const c of chunks.slice(1)) await interaction.followUp({content:c,ephemeral:true}); return true;
      }
