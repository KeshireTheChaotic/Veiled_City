import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {replyWithDiagnosticLines} from '../../src/frameworks/discord/diagnostic-reply.js';
import {replyWithDiagnosticLines as publicReply,chunkDiscordLines} from '../../src/frameworks/discord/public.js';
import {handleDoctorCommand} from '../../src/framework-to-framework/discord--operations/public.js';
function interaction(){const calls=[];return {calls,guild:{id:'guild',roles:{cache:new Map()}},reply:async payload=>calls.push(['reply',payload]),followUp:async payload=>calls.push(['follow',payload])};}

test('single private diagnostic response retains public identity and original payload',async()=>{
  assert.equal(replyWithDiagnosticLines,publicReply);const i=interaction();assert.equal(await replyWithDiagnosticLines(i,['Synthetic diagnostic']),true);assert.deepEqual(i.calls,[['reply',{content:'Synthetic diagnostic',ephemeral:true}]]);
});
test('long reports use original ordered chunks and private sequential followups',async()=>{
  const lines=['Synthetic first line',...Array.from({length:200},(_,n)=>`Diagnostic row ${n} with synthetic content.`)],expected=chunkDiscordLines(lines),i=interaction();await replyWithDiagnosticLines(i,lines);assert.deepEqual(i.calls,expected.map((content,n)=>[n?'follow':'reply',{content,ephemeral:true}]));
});
test('response failure propagates original error and stops later chunks without retry',async()=>{
  const error=new Error('synthetic response failure'),i=interaction();let followups=0;i.reply=async()=>{throw error;};i.followUp=async()=>followups++;await assert.rejects(replyWithDiagnosticLines(i,['x'.repeat(5000)]),actual=>actual===error);assert.equal(followups,0);
});
test('named pair calls unchanged Operations read-only service then original private delivery',async()=>{
  const i=interaction(),reads=[],data={schemaVersion:460,presentWithoutCharacter:[],duplicateCanon:[],orphanCharacters:[],orphanAssignments:[],orphanHandouts:[],brokenProxies:[],absentControl:[],invalidVisibility:[],npcCognition:{profiles:1,memories:0,knowledge:0,goals:0,seed:true},contentSeed:{seed:true,documents:1},pendingDirector:null},db={doctorData:g=>{reads.push(['doctor',g]);return data;},getCampaign:g=>{reads.push(['campaign',g]);return {};},listPlayers:g=>{reads.push(['players',g]);return [];}};
  assert.equal(await handleDoctorCommand(i,db),true);assert.deepEqual(reads,[['doctor','guild'],['campaign','guild'],['players','guild']]);assert.ok(i.calls[0][1].content.includes('Database schema v460'));assert.ok(i.calls[0][1].content.includes('GM role is not configured'));assert.ok(i.calls.every(call=>call[1].ephemeral===true));
});
test('lower diagnostic service failure never sends partial report',async()=>{
  const i=interaction(),error=new Error('synthetic storage read failure');await assert.rejects(handleDoctorCommand(i,{doctorData(){throw error;}}),actual=>actual===error);assert.deepEqual(i.calls,[]);
});
test('existing shared GM guard and backup option read remain before awaited doctor call inside receipt scope',()=>{
  const source=readFileSync(new URL('../../src/commands.js',import.meta.url),'utf8'),start=source.indexOf('if(group==="admin"&&["backup"'),at=source.indexOf('return await handleDoctorCommand(interaction,db);',start),section=source.slice(start,at);
  assert.ok(start>=0&&at>start);assert.match(section,/if\(!isGM\(db,interaction\)\) throw new PermissionError\("GM\/admin permission required\."\)/);assert.match(section,/const backupId=interaction\.options\.getString\("backup_id"\)/);assert.ok(at<source.lastIndexOf('restoreReceiptCapture();'));
});
