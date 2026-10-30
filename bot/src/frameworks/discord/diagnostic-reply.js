import {chunkDiscordLines} from './chunking.js';
/** Original doctor command private line delivery; no diagnostic or authorization policy. */
export async function replyWithDiagnosticLines(interaction,lines){
  const chunks=chunkDiscordLines(lines);
  await interaction.reply({content:chunks[0],ephemeral:true});
  for(const content of chunks.slice(1))await interaction.followUp({content,ephemeral:true});
  return true;
}
