import {replyOrEdit} from './reply-or-edit.js';
export function assertRulesRulingReadStore(store){
  if(typeof store?.searchRulesRulings!=='function')throw new TypeError('Saved rulings require the original search reader.');
  return store;
}
/** Original saved-rulings display; no new authority or audience policy. */
export async function handleRulesRulingsCommand(interaction,{store}){
  const rows=store.searchRulesRulings(interaction.guildId,"");
  await replyOrEdit(interaction,{content:rows.length?`**Campaign GM Rulings**\n${rows.map(r=>`• \`${r.ruling_key}\` — ${r.question}: **${r.ruling}**`).join("\n")}`.slice(0,1950):"No saved GM rulings.",ephemeral:true});
  return true;
}
