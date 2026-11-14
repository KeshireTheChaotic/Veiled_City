const snowflake=v=>typeof v==='string'&&/^\d{5,25}$/.test(v);
/** The existing human command's closed attachment declaration; content and
 * export labels never confer GM, canon, disclosure or character-control rights.
 */
export function gmHookImportInput(e){
 if(e?.isChatInputCommand?.()!==true||!(e.commandName==='vc-character'||e.commandName==='vc'&&e.options.getSubcommandGroup(false)==='character')||e.options.getSubcommand()!=='import-gm-hooks')return null;
 function attachment(value,extension,maximum){
  if(!value||!snowflake(value.id)||!snowflake(e.channelId)||typeof value.name!=='string'||!value.name.toLowerCase().endsWith(extension)||value.name.length>256||!Number.isSafeInteger(value.size)||value.size<1||value.size>maximum)throw new Error('Bounded native GM hook attachment required');
  const url=new URL(value.url),path=/^\/attachments\/(\d{5,25})\/(\d{5,25})\/[^/]+$/.exec(url.pathname);
  if(url.protocol!=='https:'||!['cdn.discordapp.com','media.discordapp.net'].includes(url.hostname)||url.username||url.password||url.port||url.hash||!path||path[1]!==e.channelId||path[2]!==value.id)throw new Error('Exact Discord command attachment URL required');
  return {id:value.id,name:value.name,size:value.size,url:url.href};
 }
 const character=e.options.getString('character')??'';if(typeof character!=='string'||character.length>256)throw new Error('Bounded GM hook character selection required');
 const file=attachment(e.options.getAttachment('file',true),'.json',2_000_000),narrative=e.options.getAttachment('narrative');
 const result={character,file,narrative:narrative?attachment(narrative,'.md',128*1024):null};if(file.size+(result.narrative?.size??0)>2_000_000)throw new Error('Bounded combined GM import required');return result;
}
