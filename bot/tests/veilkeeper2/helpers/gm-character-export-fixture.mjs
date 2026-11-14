import {readFileSync} from 'node:fs';
import {ChannelType,PermissionsBitField,PermissionFlagsBits as P} from 'discord.js';
import {characterExportFixture} from './character-export-fixture.mjs';
export function gmCharacterExportFixture(t){
 const f=characterExportFixture(t),schema=readFileSync(new URL('../../../sql/schema.sql',import.meta.url),'utf8');
 for(const table of ['clocks','threads','reference_entries','character_gm_hooks','canon_events','canon_conflicts','canon_proposals']){
  const sql=schema.match(new RegExp('CREATE TABLE IF NOT EXISTS '+table+' \\([\\s\\S]*?\\n\\);'))?.[0];if(!sql)throw new Error('Missing source schema '+table);f.db.exec(sql);
 }
 f.db.exec(`INSERT INTO campaigns VALUES('foreign','foreign-gm');UPDATE facts SET subject_character_id='pc' WHERE id='GM-FACT-CANARY';
 INSERT INTO clocks(guild_id,clock_key,label,value,max_value,visibility,subject_character_id) VALUES('c','danger','Secret clock',2,6,'gm','pc');
 INSERT INTO threads(id,guild_id,label,visibility,subject_user_id,notes) VALUES('thread','c','Secret thread','gm','u','GM thread');
 INSERT INTO reference_entries(guild_id,kind,entity_key,display_name,summary,visibility,subject_character_id) VALUES('c','npc','watcher','Watcher','GM reference','gm','pc');
 INSERT INTO character_gm_hooks(id,guild_id,character_id,hook_key,title,hook_type,premise,payload_json,status) VALUES('hook','c','pc','entry','Entry','other','GM imported hook','{"permission":"open_question"}','resolved');
 INSERT INTO canon_events(id,guild_id,canon_key,value,visibility,source_id) VALUES('canon','c','mira.secret','Stored canon','gm','pc'),('unrelated','c','other.secret','Other canon','gm','other');
 INSERT INTO canon_conflicts(id,guild_id,canon_key,existing_event_id,proposed_value,proposed_visibility) VALUES('conflict','c','mira.secret','canon','Disputed value','gm');
 INSERT INTO canon_proposals(id,guild_id,character_id,canon_key,proposed_value,proposed_visibility,status) VALUES('proposal','c','pc','mira.suggestion','Suggested value','gm','pending');`);
 const member={id:'gm',guild:{id:'c'},user:{id:'gm',bot:false},roles:{cache:new Map([['gm-role',{}]])},permissions:new PermissionsBitField(0n)};
 const channel={id:'public-channel',guildId:'c',type:ChannelType.GuildText,permissionsFor:()=>new PermissionsBitField(P.ViewChannel|P.SendMessages)};
 let reads=0,hook=null;f.guild.members.fetch=async()=>{reads++;await hook?.(reads);return member;};f.guild.roles={fetch:async()=>new Map([['gm-role',{}]])};f.guild.channels={fetch:async()=>channel};
 const event=(id,options={})=>f.event(id,{sub:'export-gm',user:{id:'gm',bot:false},createdTimestamp:Date.now(),...options});
 return {...f,get root(){return f.root;},event,member,channel,get gmReads(){return reads;},gmHook(fn){hook=fn;}};
}
