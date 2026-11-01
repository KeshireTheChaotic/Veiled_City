import {chunkDiscordLines} from './chunking.js';
import {playerFactLine} from './fact-text.js';

export function assertPlayerFactReadStore(store){
  if(typeof store?.playerFactsFor!=='function')throw new TypeError('Player fact display requires the original player-safe reader.');
  return store;
}

/** Original player facts/clues display; caller supplies the current controlled character scope. */
export async function handlePlayerFactListCommand(interaction,{store,characterId=null}={}){
  const sub=interaction.options.getSubcommand();
  if(!['facts','clues'].includes(sub))return false;
  const clues=sub==='clues',rows=store.playerFactsFor(interaction.guildId,interaction.user.id,
    {characterId,category:clues?'clue':'fact',limit:80});
  const chunks=chunkDiscordLines(rows.length
    ?[clues?'**Clues Available to You**':'**Facts Available to You**',...rows.map(playerFactLine)]
    :[clues?'No recorded clues are available to you.':'No recorded facts are available to you.']);
  await interaction.reply({content:chunks[0],ephemeral:true});
  for(const chunk of chunks.slice(1))await interaction.followUp({content:chunk,ephemeral:true});
  return true;
}
