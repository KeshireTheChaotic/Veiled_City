import test from 'node:test';import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {validatePublicationAcknowledgement,deliverTurnOutbox} from '../../src/publication-outbox.js';
test('acknowledgement must match the queued channel; mismatches remain uncertain',()=>{
 const row={channel_id:'private-channel'};
 assert.equal(validatePublicationAcknowledgement(row,{messageId:'m',channelId:'private-channel'}).messageId,'m');
 for(const receipt of [null,{messageId:'m',channelId:'public'},{messageId:'',channelId:'private-channel'}])
  assert.throws(()=>validatePublicationAcknowledgement(row,receipt),{deliveryCertainty:'uncertain'});
});
test('persisted delivered and uncertain rows never resend or let a later chunk overtake',async()=>{
 const sql=new DatabaseSync(':memory:');sql.exec('CREATE TABLE publications (ordinal INTEGER, status TEXT)');
 for(const [n,s] of [[0,'delivered'],[1,'uncertain'],[2,'pending']])sql.prepare('INSERT INTO publications VALUES (?,?)').run(n,s);
 let sends=0;
 const db={markInterruptedPublicationsUncertain:()=>{},listTurnPublications:()=>sql.prepare('SELECT * FROM publications ORDER BY ordinal').all()};
 try{await deliverTurnOutbox(db,'g','t',async()=>{sends++;});await deliverTurnOutbox(db,'g','t',async()=>{sends++;});assert.equal(sends,0);}
 finally{sql.close();}
});
