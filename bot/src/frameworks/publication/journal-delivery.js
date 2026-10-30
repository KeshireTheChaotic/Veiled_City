/** Original journal publications; caller supplies unchanged archive validator. */
import {publicationDiscordChannels,publicationDiscordText} from './contracts/discord-channels.js';
import {lifecycleProjection} from './lifecycle-output.js';
import {notSent} from './delivery-receipts.js';
const {textChannel}=publicationDiscordChannels;
const {splitDiscordText:chunks}=publicationDiscordText;
export function createJournalPublications({assertArchiveOutput}){
  if(typeof assertArchiveOutput!=='function')throw new TypeError('Journal publications require the original archive validator.');
async function publishJournal({db,guild,session,recap}){
  assertArchiveOutput(db,guild.id,recap,{sessionId:session.id});
  const c=db.getCampaign(guild.id);
  const ch=await textChannel(guild,c?.journal_channel_id);
  if(!ch) return false;
  const head=`## Session ${session.session_number}`;
  const parts=chunks(`${head}\n\n${recap}`);
  for(const p of parts){assertArchiveOutput(db,guild.id,recap,{sessionId:session.id});await ch.send(p);}
  return true;
}

async function postJournalEntry({db,guild,title="Campaign Update",content="",nativeEncounterId=null,nativeLifecycleKey=null}){
  assertArchiveOutput(db,guild.id,content);
  const encounter=nativeEncounterId&&db.getEncounter(nativeEncounterId);
  const checkLifecycle=()=>{
    if(!nativeLifecycleKey)return false;
    const view=lifecycleProjection(db,guild.id,nativeLifecycleKey,{mode:'party',actorUserId:null,actorCharacterId:null});
    if(view.text!==content||view.title!==title)throw notSent('Exact native lifecycle title and body required.');
    return true;
  };
  if(title!=="Campaign Update"
    &&!(encounter?.guild_id===guild.id&&title===`Encounter ${encounter.encounter_number} Aftermath`)&&!checkLifecycle())
    throw Object.assign(new Error("PvP archive title requires a native source-bound projection."),{code:"NARRATIVE_PVP"});
  const c=db.getCampaign(guild.id);
  const ch=await textChannel(guild,c?.journal_channel_id);
  if(!ch) return false;
  for(const p of chunks(`## ${title}\n\n${content}`)){assertArchiveOutput(db,guild.id,content);checkLifecycle();await ch.send(p);}
  return true;
}
  return Object.freeze({publishJournal,postJournalEntry});
}
