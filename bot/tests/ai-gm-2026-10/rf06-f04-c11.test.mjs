import test from 'node:test';
import assert from 'node:assert/strict';
import {commandKey,isMutatingCommand} from '../../src/frameworks/discord/command-mutations.js';
import {commandKey as rootKey,isMutatingCommand as rootMutating,replayReceiptIfPresent,installReceiptCapture} from '../../src/idempotency.js';
import {commandKey as publicKey,isMutatingCommand as publicMutating} from '../../src/frameworks/discord/public.js';
function fixture(){
  const receipts=new Map(),mutations=[],events=[];
  const db={getOperationReceipt:(guild,id)=>receipts.get(`${guild}:${id}`),getActiveSession:()=>null,
    recordOperationReceipt(guild,row){events.push('receipt');receipts.set(`${guild}:${row.interactionId}`,{status:'completed',command_key:row.commandKey,response_text:row.responseText});},
    recordMutation(guild,row){events.push('mutation');mutations.push(row);},
    transaction(fn){events.push('begin');const before=new Map(receipts),size=mutations.length;try{const result=fn();events.push('commit');return result;}catch(error){receipts.clear();for(const entry of before)receipts.set(...entry);mutations.length=size;events.push('rollback');throw error;}}};
  return {db,receipts,mutations,events};
}
function interaction(reply){return {id:'interaction',guildId:'guild',user:{id:'owner'},commandName:'vc-character',reply,editReply:reply};}

test('classification keeps root/public identity, exact keys and existing read-only/unknown policy',()=>{
  assert.equal(rootKey,commandKey);assert.equal(publicKey,commandKey);assert.equal(rootMutating,isMutatingCommand);assert.equal(publicMutating,isMutatingCommand);
  assert.equal(commandKey(null,undefined),':');assert.equal(commandKey('character','create'),'character:create');
  for(const [group,sub] of [['character','sheet'],['roll','pending'],['admin','doctor'],['voice','status'],['story','scene-view']])assert.equal(isMutatingCommand(group,sub),false);
  assert.equal(isMutatingCommand('character','create'),true);assert.equal(isMutatingCommand('unknown','future'),true);
});
test('completed duplicate replays stored result privately without capture or writes',async()=>{
  const f=fixture();f.receipts.set('guild:interaction',{status:'completed',response_text:'Saved result',command_key:'character:create'});const sent=[];
  assert.equal(await replayReceiptIfPresent({db:f.db,interaction:interaction(payload=>sent.push(payload)),group:'character',sub:'create'}),true);
  assert.deepEqual(sent,[{content:'↩️ **Already applied** — Saved result',ephemeral:true}]);assert.deepEqual(f.events,[]);
});
test('deferred duplicate uses editReply and incomplete/missing/read-only receipts do not replay',async()=>{
  const f=fixture(),sent=[],i=interaction(()=>{throw Error('must edit deferred reply');});i.deferred=true;i.editReply=payload=>sent.push(payload);
  f.receipts.set('guild:interaction',{status:'completed',command_key:'character:create'});assert.equal(await replayReceiptIfPresent({db:f.db,interaction:i,group:'character',sub:'create'}),true);assert.match(sent[0].content,/Operation `character:create` was already applied/);
  f.receipts.set('guild:interaction',{status:'pending'});assert.equal(await replayReceiptIfPresent({db:f.db,interaction:i,group:'character',sub:'create'}),false);
  assert.equal(await replayReceiptIfPresent({db:null,interaction:i,group:'character',sub:'sheet'}),false);
});
test('capture commits receipt/mutation before failed response and fresh redelivery reuses it',async()=>{
  const f=fixture(),error=new Error('synthetic response failure'),i=interaction(()=>{f.events.push('send');throw error;});
  installReceiptCapture({db:f.db,interaction:i,group:'character',sub:'create'});
  await assert.rejects(i.reply({content:'Created owned character.'}),actual=>actual===error);
  assert.deepEqual(f.events,['begin','receipt','mutation','commit','send']);assert.equal(f.mutations.length,1);
  const sent=[];assert.equal(await replayReceiptIfPresent({db:f.db,interaction:interaction(p=>sent.push(p)),group:'character',sub:'create'}),true);assert.equal(sent.length,1);assert.equal(f.mutations.length,1);
});
test('capture records once across reply/edit and restoration returns original transport behavior',async()=>{
  const f=fixture(),sent=[],i=interaction(p=>sent.push(p));const restore=installReceiptCapture({db:f.db,interaction:i,group:'character',sub:'create'});
  await i.reply({content:'First'});await i.editReply({content:'Second'});assert.equal(f.mutations.length,1);restore();await i.reply({content:'Third'});assert.equal(f.mutations.length,1);assert.equal(sent.length,3);
});
test('warning/read-only responses do not create completed mutation receipts',async()=>{
  const f=fixture(),i=interaction(()=>{});installReceiptCapture({db:f.db,interaction:i,group:'character',sub:'create'});await i.reply({content:' ⚠️ rejected'});assert.equal(f.receipts.size,0);
  const read=interaction(()=>{});installReceiptCapture({db:null,interaction:read,group:'character',sub:'sheet'});await read.reply('read-only');assert.deepEqual(f.events,[]);
});
test('transaction callback failure prevents transport and leaves synthetic store unchanged',async()=>{
  const f=fixture(),error=new Error('synthetic audit failure');f.db.recordMutation=()=>{throw error;};let sends=0;const i=interaction(()=>sends++);installReceiptCapture({db:f.db,interaction:i,group:'character',sub:'create'});
  await assert.rejects(i.reply({content:'Should not send'}),actual=>actual===error);assert.equal(sends,0);assert.equal(f.receipts.size,0);assert.deepEqual(f.events,['begin','receipt','rollback']);
});
