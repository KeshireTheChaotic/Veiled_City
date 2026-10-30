import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {runCampaignDiagnostics,formatDiagnostics,operationsDiscordDiagnostics} from '../../src/frameworks/operations/public.js';
import {initializeOperationsDiscord} from '../../src/application/composition/operations-discord.js';
import {fetchDiagnosticChannel,assertGmOnlyChannel,assertPlayerPrivateChannel} from '../../src/frameworks/discord/public.js';
const VIEW=1024n,SEND=2048n,permissions=(...bits)=>({has:flag=>bits.includes(flag)});
function fixture({unsafeGm=false,missingPrivate=false}={}){
  const everyone={id:'everyone'},gm={id:'gm',name:'GM'},owner={id:'owner'},bot={id:'bot'},calls=[];
  const campaign=Object.freeze({gm_role_id:'gm',gm_log_channel_id:'log',state_errors_channel_id:'errors',play_channel_id:'play'});
  const guild={id:'guild',roles:{everyone,cache:new Map([['everyone',everyone],['gm',gm]])},members:{me:bot,cache:new Map([['owner',owner],['bot',bot]])},channels:{fetch:async id=>{calls.push(['fetch',id]);if(id==='private'&&missingPrivate)throw Error('synthetic missing owner channel');return {id,isTextBased:()=>true,permissionsFor:subject=>subject.id==='bot'?permissions(VIEW,SEND):subject.id==='gm'||id==='private'&&subject.id==='owner'||unsafeGm&&id==='log'&&subject.id==='everyone'?permissions(VIEW):permissions(),permissionOverwrites:{cache:new Map()},toString:()=>`<${id}>`};}}};
  const data=Object.freeze({schemaVersion:460,presentWithoutCharacter:[],duplicateCanon:[],orphanCharacters:[],orphanAssignments:[],orphanHandouts:[],brokenProxies:[],absentControl:[],invalidVisibility:[],npcCognition:{profiles:1,memories:0,knowledge:0,goals:0,seed:true},contentSeed:{seed:true,documents:1},pendingDirector:null});
  const db={doctorData:g=>{calls.push(['doctor',g]);return data;},getCampaign:g=>{calls.push(['campaign',g]);return campaign;},listPlayers:g=>{calls.push(['players',g]);return [{discord_user_id:'owner',display_name:'Mara',private_channel_id:'private'}];}};
  return {guild,db,calls,campaign,data};
}

test('Operations diagnostic consumer fails uncomposed then binds only the exact original Discord functions',()=>{
  assert.throws(()=>operationsDiscordDiagnostics.assertGmOnlyChannel({}),error=>error.code==='OPERATIONS_DISCORD_DIAGNOSTICS_COMPOSITION');
  initializeOperationsDiscord();assert.doesNotThrow(()=>operationsDiscordDiagnostics.bind({fetchDiagnosticChannel,assertGmOnlyChannel,assertPlayerPrivateChannel}));
  assert.throws(()=>operationsDiscordDiagnostics.bind({fetchDiagnosticChannel:()=>null,assertGmOnlyChannel,assertPlayerPrivateChannel}),/replacement forbidden/);
});
test('diagnostic channel fetch forwards same Promise and synchronous error without normalization',()=>{
  const value=Promise.resolve({id:'channel'});assert.equal(fetchDiagnosticChannel({channels:{fetch:()=>value}},'channel'),value);
  const error=new Error('synthetic fetch failure');assert.throws(()=>operationsDiscordDiagnostics.fetchDiagnosticChannel({channels:{fetch:()=>{throw error;}}},'channel'),actual=>actual===error);
});
test('read-only report checks configured GM/private channels using original validators and same record identities',async()=>{
  const f=fixture(),report=await runCampaignDiagnostics(f);
  assert.equal(report.data,f.data);assert.equal(report.campaign,f.campaign);
  assert.ok(report.passed.includes('GM log privacy verified'));assert.ok(report.passed.includes('State errors privacy verified'));assert.ok(report.passed.includes('Play channel reachable'));
  assert.ok(!report.issues.some(issue=>issue.startsWith('GM log:')||issue.startsWith('Private channel for')));
  assert.deepEqual(f.calls.filter(call=>call[0]!=='fetch'),[['doctor','guild'],['campaign','guild'],['players','guild']]);
  assert.deepEqual(f.calls.filter(call=>call[0]==='fetch').map(call=>call[1]),['log','errors','play','private']);
});
test('unsafe GM visibility and failed private fetch remain exact report issues without mutation or sends',async()=>{
  const f=fixture({unsafeGm:true,missingPrivate:true}),report=await runCampaignDiagnostics(f);
  assert.ok(report.issues.includes('GM log: <log> is visible to @everyone. Deny View Channel to @everyone before configuring it as a GM-only channel.'));
  assert.ok(report.issues.includes('Private channel for Mara: synthetic missing owner channel'));
  assert.ok(!report.passed.includes('GM log privacy verified'));
});
test('original report text and stable startup use final APIs after zero-caller facade retirement',()=>{
  assert.deepEqual(formatDiagnostics({issues:['Synthetic issue'],passed:['Synthetic pass']}),['**Veilkeeper Doctor — ⚠️ 1 issue(s) found**','**Issues**','• Synthetic issue','**Checks passed**','• Synthetic pass']);
  const index=readFileSync(new URL('../../src/index.js',import.meta.url),'utf8'),at=index.indexOf('initializeOperationsDiscord();');
  assert.ok(at>=0&&at<index.indexOf('const db=new VeiledDB('));
  assert.ok(!existsSync(new URL('../../src/discord/privacy.js',import.meta.url)));assert.ok(!existsSync(new URL('../../src/operations/diagnostics.js',import.meta.url)));
  const commands=readFileSync(new URL('../../src/commands.js',import.meta.url),'utf8');assert.match(commands,/runCampaignDiagnostics, formatDiagnostics \} from '\.\/frameworks\/operations\/public\.js'/);
});
