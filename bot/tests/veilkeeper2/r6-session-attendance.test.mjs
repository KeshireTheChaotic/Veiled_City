import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {ChannelType,PermissionsBitField,PermissionFlagsBits as P,MessageFlags} from 'discord.js';
import {openSceneStore} from '../../src/v2/scene-store.js';
import {openSourceRegistry} from '../../src/v2/source-registry.js';
import {createSourceAuthority} from '../../src/v2/source-authority.js';
import {openInteractionReceipts} from '../../src/v2/interaction-receipts.js';
import {createDiscordSessionAttendance,createCharacterIdentityReader} from '../../src/v2/discord-session-attendance.js';
import {openActionStore} from '../../src/v2/rules/action-store.js';
import {openRollStore} from '../../src/v2/rules/roll-store.js';
import {createOrdinaryRollPreparation} from '../../src/v2/rules/ordinary-roll-preparation.js';
import {createOwnerRollEvidence} from '../../src/v2/rules/owner-roll-evidence.js';
import {createRollActionLifecycle} from '../../src/v2/rules/roll-action-lifecycle.js';
function fixture(t){
  const dir=mkdtempSync(join(tmpdir(),'vk3-attendance-')),client=new EventEmitter(),characters=new Map(['u','v'].map((owner,i)=>[`pc${i+1}`,{id:`pc${i+1}`,guild_id:'c',owner_user_id:owner,status:'active',data:{location:i?'distant_office':'cafe',gm_private:'Private hook',resources:{hp:{current:i+1,max:6}}}}]));
  const readCharacter=createCharacterIdentityReader({repository:{getCharacter:id=>characters.get(id)}}),member=id=>({id,permissions:new PermissionsBitField([]),roles:{cache:new Map()}}),members=new Map(['bot','u','v'].map(id=>[id,member(id)]));let scenes,registry,receipts,actions,rolls,authority,attendance,sequence=0,defers=0;const replies=[],errors=[];
  const channel={id:'party',guildId:'c',type:ChannelType.GuildText,permissionsFor:()=>new PermissionsBitField([P.ViewChannel,P.SendMessages])},guild={id:'c',memberCount:3,members:{fetch:async()=>members},roles:{fetch:async()=>new Map()},channels:{fetch:async()=>channel}};client.user={id:'bot'};client.guilds={fetch:async()=>guild};
  const route=(c,u,query)=>{const character=query?characters.get(query):[...characters.values()].find(v=>v.owner_user_id===u);return character?{campaignId:c,ownerUserId:character.owner_user_id,actorId:character.id,sceneId:'s',sessionId:'session'}:null;};
  function open(){scenes=openSceneStore(join(dir,'scenes.sqlite'));registry=openSourceRegistry(join(dir,'sources.sqlite'));receipts=openInteractionReceipts(join(dir,'interactions.sqlite'));actions=openActionStore(join(dir,'actions.sqlite'));rolls=openRollStore(join(dir,'rolls.sqlite'));authority=createSourceAuthority({...scenes.readers,sourceRegistry:registry});attendance=createDiscordSessionAttendance({client,sceneStore:scenes,interactionReceipts:receipts,readOwnerSession:route,readCharacter,onError:(error,meta)=>errors.push({error,meta})});}
  function close(){attendance.close();rolls.close();actions.close();receipts.close();registry.close();scenes.close();}
  open();t.after(()=>{close();assert.ok(resolve(dir).startsWith(resolve(tmpdir())+sep));rmSync(dir,{recursive:true,force:true});});
  const check=()=>{},records=[{kind:'session',data:{id:'session',campaignId:'c',status:'active'}},{kind:'scene',data:{id:'s',campaignId:'c',sessionId:'session',status:'active',participants:[{actorId:'pc1',userId:'u',presence:'present'},{actorId:'pc2',userId:'v',presence:'absent'}]}},{kind:'channel',data:{id:'party',campaignId:'c',sceneId:'s',kind:'party',permissionsVerified:true,recipientIds:['u','v'],writerIds:['u','v']}}];
  for(const character of characters.values()){records.push({kind:'actor',data:{id:character.id,campaignId:'c',sceneId:'s',kind:'pc',status:'active',ownerUserId:character.owner_user_id,controllerUserId:character.owner_user_id,controlRole:'owner'}});records.push({kind:'message',data:{id:`message-${character.owner_user_id}`,campaignId:'c',userId:character.owner_user_id,channelId:'party',deleted:false,text:'Ready to play.'}});}
  scenes.commitSnapshot({campaignId:'c',principal:'admin',sourceRef:'setup',records:records.map(r=>({...r,expectedRevision:null}))},{check});
  for(const character of characters.values()){const actorId=character.id,ownerUserId=character.owner_user_id;actions.initializePcDefenses({campaignId:'c',actorId,ownerUserId,controlRevision:'1',hp:character.data.resources.hp,armorSlots:{current:0,max:3}},{check});actions.initializeHope({campaignId:'c',actorId,ownerUserId,hope:3,cap:6},{check});actions.initializePcLife({campaignId:'c',actorId,ownerUserId,controlRevision:'1',sourceRef:'native-profile',sourceRevision:'1',level:2,stress:{current:2,max:6}},{check});}
  function event({owner='v',sub='arrive',commandName='vc-session',query='',mode='offscreen'}={}){return {id:`attendance-${++sequence}`,client,guildId:'c',channelId:'party',user:{id:owner,bot:false},commandName,isChatInputCommand:()=>true,options:{getSubcommandGroup:()=> 'session',getSubcommand:()=>sub,getString:name=>name==='character'?query:name==='mode'?mode:null},deferred:false,replied:false,async deferReply(options){assert.equal(options.flags,MessageFlags.Ephemeral);defers++;this.deferred=true;},async editReply(options){assert.deepEqual(options.allowedMentions,{parse:[]});replies.push(options.content);this.replied=true;}};}
  async function run(e){client.emit('interactionCreate',e);return attendance.handle(e);}
  function scenePatch(patch){const old=scenes.readers.readScene('c','s');return scenes.commitSnapshot({campaignId:'c',principal:'admin',sourceRef:`scene-patch-${++sequence}`,records:[{kind:'scene',data:{id:old.id,campaignId:old.campaignId,sessionId:old.sessionId,status:old.status,participants:old.participants,...patch},expectedRevision:Number(old.revision)}]},{check});}
  return {client,characters,readCharacter,event,run,scenePatch,replies,errors,route,get scenes(){return scenes;},get registry(){return registry;},get receipts(){return receipts;},get authority(){return authority;},get actions(){return actions;},get rolls(){return rolls;},get attendance(){return attendance;},get defers(){return defers;},reopen(){close();open();},addOutsider(){members.set('outsider',member('outsider'));guild.memberCount=members.size;}};
}
const ownerEvent={campaignId:'c',messageId:'message-u',userId:'u',actorId:'pc1'};
test('late attendance preserves another owner source and a real pending native roll across reopening',async t=>{
  const f=fixture(t),source=f.authority.authenticate(ownerEvent),before=[...f.characters.values()].map(c=>structuredClone(c)),nativeBefore=f.actions.readPcLife('c','pc1');
  function lifecycle(){const adjudication={id:'adjudication',revision:'1',status:'accepted',sourceRef:source.id,sourceRevision:source.revision,actorId:'pc1',campaignId:'c',sceneId:'s',difficulty:12,stakes:'The guard hears.',modifier:0,experience:0,advantage:0,disadvantage:0},preparation=createOrdinaryRollPreparation({sourceAuthority:f.authority,readActor:f.scenes.readers.readActor,readAdjudication:()=>adjudication,rollStore:f.rolls}),ownerInspector=createOwnerRollEvidence({sourceAuthority:f.authority,readActor:f.scenes.readers.readActor,readRequest:f.rolls.readRequest,readRoll:f.rolls.readRoll,readDelivery:f.rolls.readDelivery});return createRollActionLifecycle({sourceAuthority:f.authority,preparation,rollStore:f.rolls,actionStore:f.actions,ownerInspector});}
  const q=lifecycle().prepare(source,'pc1',{adjudication_ref:'adjudication'});f.rolls.acknowledgeDelivery('c',q.id,{messageId:'notice',recipientIds:['u','v']},{check:()=>{}});lifecycle().noticeDelivered(source,q.id);
  assert.equal((await f.run(f.event())).status,'committed');assert.equal(f.authority.revalidate(source),true);assert.equal(f.scenes.readers.readScene('c','s').participants[1].presence,'late');f.reopen();assert.equal(f.authority.revalidate(source),true);f.rolls.recordOwnerRoll('c',q.id,{id:'owner-dice',ownerUserId:'u',hope:8,fear:4},{check:()=>{}});const result=lifecycle().ownerRolled(source,q.id,'owner-dice');assert.equal(result.result.success,true);assert.equal(result.effectsCommitted,false);assert.equal(f.actions.read('c',q.id).status,'ready_to_resolve');assert.deepEqual(f.actions.readPcLife('c','pc1'),nativeBefore);assert.deepEqual([...f.characters.values()],before);assert.equal(f.scenes.readers.readActor('c','pc1').controlRevision,'1');assert.match(f.replies[0],/does not establish fictional arrival/);
});
test('own absence and rejoin revoke the old issued source without resurrecting it',async t=>{
  const f=fixture(t),source=f.authority.authenticate(ownerEvent);await f.run(f.event({owner:'u',sub:'leave'}));assert.equal(f.authority.revalidate(source),false);await f.run(f.event({owner:'u',sub:'present',commandName:'vc'}));assert.equal(f.authority.revalidate(source),false);assert.throws(()=>f.authority.authenticate(ownerEvent));assert.equal(f.scenes.readers.readActor('c','pc1').controlRevision,'1');assert.equal(f.scenes.readers.readActor('c','pc1').controlRole,'owner');
});
test('scene lifecycle close/reopen cannot resurrect issued owner authority',t=>{
  const f=fixture(t),source=f.authority.authenticate(ownerEvent);f.scenePatch({status:'closed'});assert.equal(f.authority.revalidate(source),false);f.scenePatch({status:'active'});assert.equal(f.authority.revalidate(source),false);assert.throws(()=>f.authority.authenticate(ownerEvent));
});
test('old issued digests are preserved when native initial lifecycle and attendance epochs agree',async t=>{
  const f=fixture(t),legacy=createSourceAuthority({...f.scenes.readers,sourceRegistry:f.registry,readScene:(c,id)=>{const {authorityRevision,participantRevisions,...old}=f.scenes.readers.readScene(c,id);return old;}}),source=legacy.authenticate(ownerEvent);await f.run(f.event());f.reopen();assert.equal(f.authority.revalidate(source),true);
});
test('owner attendance duplicate cold claim cannot repeat scene writes or private response',async t=>{
  const f=fixture(t),e=f.event();await f.run(e);const revision=f.scenes.readers.readScene('c','s').revision;f.reopen();assert.equal((await f.run(e)).status,'already_claimed');assert.equal(f.scenes.readers.readScene('c','s').revision,revision);assert.equal(f.replies.length,1);assert.equal(f.defers,1);
});
test('owner attendance rejects unobserved commands, other owned targets and PC proxy modes',async t=>{
  const f=fixture(t);await assert.rejects(f.attendance.handle(f.event()),/Observed/);await assert.rejects(f.run(f.event({owner:'u',query:'pc2'})),/owned character/);await assert.rejects(f.run(f.event({owner:'u',sub:'absent',mode:'proxy'})),/no PC proxy/);assert.equal(f.defers,0);assert.equal(f.scenes.readers.readScene('c','s').revision,'1');
});
test('fresh audience drift holds attendance without changing participants or character resources',async t=>{
  const f=fixture(t),before=f.scenes.readers.readScene('c','s');f.addOutsider();const e=f.event();assert.equal((await f.run(e)).status,'native_review_required');assert.equal(f.receipts.read(e.id).processing,'held');assert.deepEqual(f.scenes.readers.readScene('c','s'),before);assert.equal(f.actions.readPcLife('c','pc2').defenses.hp.current,2);
});
test('canonical character identity reader excludes private data and rejects cross-campaign identities',t=>{
  const f=fixture(t);assert.deepEqual(f.readCharacter('c','pc1'),{id:'pc1',guild_id:'c',owner_user_id:'u',status:'active'});assert.equal(f.readCharacter('other','pc1'),null);f.characters.get('pc1').owner_user_id='other';assert.equal(f.readCharacter('c','pc1').owner_user_id,'other');
});
test('scene snapshots reject caller-supplied lifecycle and attendance epochs',t=>{
  const f=fixture(t);for(const field of ['authorityRevision','participantRevisions'])assert.throws(()=>f.scenePatch({[field]:field==='authorityRevision'?'1':{pc1:'1'}}),/Closed native/);
});
test('repeated check-in preserves the original active attendance marker and pending authority',async t=>{
  const f=fixture(t),source=f.authority.authenticate(ownerEvent);await f.run(f.event({owner:'u',sub:'arrive'}));assert.equal(f.scenes.readers.readScene('c','s').participants[0].presence,'present');assert.equal(f.authority.revalidate(source),true);await f.run(f.event());const bob=f.authority.authenticate({campaignId:'c',messageId:'message-v',userId:'v',actorId:'pc2'});await f.run(f.event({sub:'present'}));assert.equal(f.scenes.readers.readScene('c','s').participants[1].presence,'late');assert.equal(f.authority.revalidate(bob),true);assert.equal(f.authority.revalidate(source),true);
});
