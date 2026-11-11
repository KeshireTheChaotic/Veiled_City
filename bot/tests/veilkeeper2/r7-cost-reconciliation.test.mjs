import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {DatabaseSync} from 'node:sqlite';
import {join} from 'node:path';
import {createDiscordCostCommands} from '../../src/v2/discord-cost-commands.js';
import {openInteractionReceipts} from '../../src/v2/interaction-receipts.js';
import {PermissionsBitField} from 'discord.js';
import {nativeCostFixture as fixture} from './helpers/native-cost-root-fixture.mjs';
function command(f,id,ref=null,principal='u'){
 const {client,guildId,channelId,deferReply,editReply}=f.event(id);
 return {id,client,guildId,channelId,user:{id:principal,bot:false},commandName:'vc-player',isButton:()=>false,isChatInputCommand:()=>true,options:{getSubcommand:()=> 'cost-reconcile',getString:()=>ref},deferReply,editReply,reply:async body=>{f.replies.push({id,...body});}};
}
function transport(f,ref,mutate=null){const db=new DatabaseSync(join(f.directory,'interactions.sqlite'));try{const row=JSON.parse(db.prepare('SELECT data FROM vk3_native_interactions WHERE id=?').get(ref).data);if(mutate){mutate(row);db.prepare('UPDATE vk3_native_interactions SET data=? WHERE id=?').run(JSON.stringify(row),ref);}return row;}finally{db.close();}}
async function uncertain(f,id='cost-click',decision='accept'){await f.root.costs.present(f.source,'cost');const event=f.event(id,decision,{editReply:async()=>{throw new Error('Confirmation response lost');}});event.client.emit('interactionCreate',event);await f.root.drain();return id;}

test('owner can check a unique uncertain cost after cold reopen without re-sending or spending',async t=>{
 const f=await fixture(t),ref=await uncertain(f);f.restart();const event=command(f,'check');event.client.emit('interactionCreate',event);await f.root.drain();const row=transport(f,ref);assert.equal(row.reconciliation.kind,'native_cost_interaction_receipt');assert.equal(row.processing,'committed');assert.equal(row.reply,'uncertain');assert.equal(f.root.actionStore.readHope('c','pc').hope,1);assert.equal(f.root.actionStore.readHope('c','pc').revision,2);assert.equal(f.sent.length,1);assert.match(f.replies.at(-1).content,/No expense or earlier reply was replayed/);assert.equal(f.root.sceneStore.readers.readMessage('c','check'),null);
 const replies=f.replies.length;event.client.emit('interactionCreate',event);await f.root.drain();assert.equal(f.replies.length,replies);assert.equal(f.root.actionStore.readHope('c','pc').hope,1);
});
test('canonical expense repairs injected missing transport bookkeeping with the original reply withheld',async t=>{
 const f=await fixture(t);await f.root.costs.present(f.source,'cost');const e=f.event('gap');e.client.emit('interactionCreate',e);await f.root.drain();transport(f,'gap',r=>{r.processing='held';r.receipt=null;r.reply='not_started';r.hold='receipt';});f.restart();const before=f.replies.length,event=command(f,'check-gap','gap');event.client.emit('interactionCreate',event);await f.root.drain();const row=transport(f,'gap');assert.equal(row.processing,'committed');assert.equal(row.reply,'withheld');assert.ok(row.receipt);assert.equal(f.replies.length,before+2);assert.equal(f.sent.length,1);assert.equal(f.root.actionStore.readHope('c','pc').hope,1);
});
test('a rejected decision reconciles as a cancelled action and never incurs its cost',async t=>{
 const f=await fixture(t),ref=await uncertain(f,'declined','reject');f.restart();const event=command(f,'check-decline',ref);event.client.emit('interactionCreate',event);await f.root.drain();assert.equal(transport(f,ref).reconciliation.kind,'native_cost_interaction_receipt');assert.equal(f.root.actionStore.read('c','cost').status,'cancelled');assert.equal(f.root.actionStore.readHope('c','pc').hope,3);assert.equal(f.root.actionStore.readOutcome('c','cost'),null);
});
test('an accepted choice without a committed expense is held without retrying even when resources become available',async t=>{
 const f=await fixture(t,{hope:1});await f.root.costs.present(f.source,'cost');const e=f.event('accepted-pending');e.client.emit('interactionCreate',e);await f.root.drain();assert.equal(f.root.actionStore.read('c','cost').status,'ready_to_commit');assert.equal(f.root.actionStore.readHope('c','pc').hope,1);
 // Model a later legitimate resource change; this test does not qualify a Hope-gain workflow.
 const db=new DatabaseSync(join(f.directory,'actions.sqlite'));try{const state=JSON.parse(db.prepare("SELECT data FROM vk3_action_hope WHERE campaign='c' AND actor='pc'").get().data);state.hope=3;state.revision++;db.prepare("UPDATE vk3_action_hope SET data=? WHERE campaign='c' AND actor='pc'").run(JSON.stringify(state));}finally{db.close();}f.restart();
 const event=command(f,'check-pending','accepted-pending');event.client.emit('interactionCreate',event);await f.root.drain();assert.equal(f.root.actionStore.readHope('c','pc').hope,3);assert.equal(f.root.actionStore.readOutcome('c','cost'),null);assert.equal(f.root.actionStore.read('c','cost').status,'ready_to_commit');assert.equal(transport(f,'accepted-pending').processing,'held');assert.equal(transport(f,'accepted-pending').reconciliation,undefined);assert.match(f.replies.at(-1).content,/No expense was retried/);
});
test('wrong owner cannot reconcile another owner expense or receive private cost details',async t=>{
 const f=await fixture(t),ref=await uncertain(f),before=JSON.stringify(transport(f,ref)),event=command(f,'intruder',ref,'v');event.client.emit('interactionCreate',event);await f.root.drain();assert.equal(JSON.stringify(transport(f,ref)),before);assert.equal(f.root.actionStore.readHope('c','pc').hope,1);assert.doesNotMatch(f.replies.at(-1).content,/2 Hope|cost-hook-canary/);
});
test('expired controls and later text edits cannot erase an already committed cost, or grant a new action',async t=>{
 const f=await fixture(t),ref=await uncertain(f),old=f.root.sceneStore.readers.readMessage('c','attempt');f.root.sceneStore.commitSnapshot({campaignId:'c',principal:'u',sourceRef:'later-edit',records:[{kind:'message',expectedRevision:Number(old.revision),data:{id:'attempt',campaignId:'c',channelId:'private',userId:'u',deleted:false,text:'I later edited my utterance.'}}]},{check:()=>{}});
 const db=new DatabaseSync(join(f.directory,'cost-prompts.sqlite'));try{const r=db.prepare('SELECT id,data FROM vk3_cost_prompts').get(),p=JSON.parse(r.data);p.expiresAt=1;db.prepare('UPDATE vk3_cost_prompts SET data=? WHERE id=?').run(JSON.stringify(p),r.id);}finally{db.close();}f.restart();const event=command(f,'historical-check',ref);event.client.emit('interactionCreate',event);await f.root.drain();assert.equal(transport(f,ref).reconciliation.kind,'native_cost_interaction_receipt');assert.equal(f.root.actionStore.readHope('c','pc').hope,1);assert.throws(()=>f.root.costs.request(f.source,'cost'),/Current owner native cost/);assert.equal(f.sent.length,1);
});


test('unobserved command objects cannot query owner state or repair a receipt',async t=>{
 const f=await fixture(t),ref=await uncertain(f),event=command(f,'unobserved',ref),isolated=Object.assign(new EventEmitter(),{guilds:{fetch:async()=>f.guild}}),receipts=openInteractionReceipts(join(f.directory,'interactions.sqlite'));let reads=0;
 event.client=isolated;const handler=createDiscordCostCommands({client:isolated,workflow:f.root.costs,sceneStore:f.root.sceneStore,readActorSnapshot:()=>{reads++;throw new Error('must not read');},readRoute:()=>{reads++;throw new Error('must not read');},interactionReceipts:receipts});try{await assert.rejects(handler.handle(event),/Observed native owner/);assert.equal(reads,0);assert.equal(receipts.read(event.id),null);assert.equal(transport(f,ref).reconciliation,undefined);}finally{handler.close();receipts.close();}
});
test('source identity corruption and fresh audience drift hold reconciliation without altering the expense',async t=>{
 for(const mode of ['source','audience']){const f=await fixture(t),ref=await uncertain(f),before=JSON.stringify(transport(f,ref));if(mode==='source'){const consent=f.root.actionStore.readConsentsForAction('c','cost')[0],db=new DatabaseSync(join(f.directory,'sources.sqlite'));try{const row=JSON.parse(db.prepare('SELECT data FROM vk2_source_registry WHERE id=?').get(consent.choiceSourceRef).data);row.control.role='proxy';db.prepare('UPDATE vk2_source_registry SET data=? WHERE id=?').run(JSON.stringify(row),consent.choiceSourceRef);}finally{db.close();}f.restart();}else{f.members.set('v',{id:'v',permissions:new PermissionsBitField([]),roles:{cache:new Map()}});f.guild.memberCount=3;}
  const event=command(f,'blocked-'+mode,ref);event.client.emit('interactionCreate',event);await f.root.drain();assert.equal(JSON.stringify(transport(f,ref)),before);assert.equal(f.root.actionStore.readHope('c','pc').hope,1);assert.match(f.replies.at(-1).content,/No expense was retried/);
 }
});
test('multiple unresolved owned costs require explicit selection and never infer a different expense',async t=>{
 const f=await fixture(t),one=await uncertain(f,'one'),id={id:'second',campaignId:'c',sceneId:'s',actorId:'pc',ownerUserId:'u',sourceRef:f.source.id,sourceRevision:f.source.revision,kind:'hope_cost'},check=()=>{};f.root.actionStore.create(id,{check});f.root.actionStore.registerHopeTerms({...id,revision:'1',controlRevision:'1',cost:{resource:'hope',slot:'base',amount:1}},{check});await f.root.costs.present(f.source,id.id);
 const message=f.sent[1],event=f.event('two','accept',{message,customId:message.components[0].components[0].custom_id,editReply:async()=>{throw new Error('confirmation lost');}});event.client.emit('interactionCreate',event);await f.root.drain();assert.equal(f.root.actionStore.readHope('c','pc').hope,0);assert.throws(()=>f.root.costs.latestUncertain({campaignId:'c',principal:'u',channelId:'private'}),/specific saved cost/);
 const query=command(f,'specific','two');query.client.emit('interactionCreate',query);await f.root.drain();assert.equal(transport(f,'two').reconciliation.kind,'native_cost_interaction_receipt');assert.equal(transport(f,one).reconciliation,undefined);assert.equal(f.root.actionStore.readHope('c','pc').hope,0);assert.equal(f.sent.length,2);
});


test('historical recipient can reconcile after a scene closes and PC control ends without gaining new control',async t=>{
 const f=await fixture(t),ref=await uncertain(f),scene=f.root.sceneStore.readers.readScene('c','s'),actor=f.root.sceneStore.readers.readActor('c','pc');
 f.root.sceneStore.commitSnapshot({campaignId:'c',principal:'fixture-gm',sourceRef:'close-world-scope',records:[{kind:'scene',expectedRevision:Number(scene.revision),data:{id:'s',campaignId:'c',sessionId:'session',status:'closed',participants:scene.participants}},{kind:'actor',expectedRevision:Number(actor.revision),data:{id:'pc',campaignId:'c',sceneId:'s',kind:'pc',status:'closed',ownerUserId:'v',controllerUserId:'v',controlRole:'owner'}}]},{check:()=>{}});f.restart();
 const event=command(f,'historical-recipient',ref);event.client.emit('interactionCreate',event);await f.root.drain();assert.equal(transport(f,ref).reconciliation.kind,'native_cost_interaction_receipt');assert.equal(f.root.actionStore.readHope('c','pc').hope,1);assert.equal(f.root.sceneStore.readers.readActor('c','pc').ownerUserId,'v');assert.throws(()=>f.root.costs.request(f.source,'cost'),/Verified owner private channel/);assert.equal(f.root.sceneStore.readers.readMessage('c','historical-recipient'),null);
});
test('contradictory stored transport receipts are held rather than overwritten or replayed',async t=>{
 const f=await fixture(t),ref=await uncertain(f);transport(f,ref,row=>{row.receipt.hash='0'.repeat(64);});const before=JSON.stringify(transport(f,ref)),event=command(f,'contradiction',ref);event.client.emit('interactionCreate',event);await f.root.drain();assert.equal(JSON.stringify(transport(f,ref)),before);assert.equal(f.root.actionStore.readHope('c','pc').hope,1);assert.match(f.replies.at(-1).content,/No expense was retried/);
});
