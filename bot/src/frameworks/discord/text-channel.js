/** Existing non-authoritative Discord channel lookup; missing/failed lookups remain unavailable. */
export async function textChannel(guild,id){
  if(!id) return null;
  try{
    const ch=await guild.channels.fetch(id);
    return ch?.isTextBased()?ch:null;
  }catch{return null;}
}
