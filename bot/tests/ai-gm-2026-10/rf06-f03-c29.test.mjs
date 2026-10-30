import test from 'node:test';
import assert from 'node:assert/strict';
import {postStateError} from '../../src/frameworks/publication/public.js';
import {postStateError as historical} from '../../src/publishing.js';
import {operationalMetrics} from '../../src/frameworks/operations/public.js';
import {initializePublicationDiscord} from '../../src/application/composition/publication-discord.js';
initializePublicationDiscord();
const VIEW=1024n,SEND=2048n,permissions=(...bits)=>({has:flag=>bits.includes(flag)});
function fixture(){const everyone={id:'everyone'},bot={id:'bot'},calls=[],audit=[],campaign={state_errors_channel_id:'errors'},grants=new Map([['bot',permissions(VIEW,SEND)]]),channel={isTextBased:()=>true,permissionsFor:subject=>grants.get(subject.id)||permissions(),permissionOverwrites:{cache:new Map()},send:async body=>calls.push(['send',body])},guild={id:'rf29-guild',roles:{everyone,cache:new Map([['everyone',everyone]])},members:{me:bot,cache:new Map([['bot',bot]])},channels:{fetch:async id=>{calls.push(['fetch',id]);return channel;}}},db={audit(...args){audit.push(args);calls.push(['audit']);},getCampaign(id){assert.equal(this,db);assert.equal(id,guild.id);calls.push(['campaign']);return campaign;}};return {db,guild,channel,calls,audit,campaign,grants,error:Object.assign(new Error('Synthetic private error'),{code:'NARRATIVE_INTEGRITY'})};}
test('historical/public identity, original metric singleton and audit/message reference correlation survive extraction',async()=>{
  assert.equal(historical,postStateError);const f=fixture(),before=operationalMetrics.snapshot(f.guild.id).stages.runtime_failure?.count||0,ref=await postStateError({...f,sessionId:'session',context:'synthetic command',attempt:{turn_id:'turn',committed:'yes'}});assert.match(ref,/^[a-f0-9]{8}$/);assert.deepEqual(f.calls.map(c=>c[0]),['audit','campaign','fetch','send']);const record=f.audit[0];assert.deepEqual(record.slice(0,5),[f.guild.id,'session','system','veilkeeper','state_error']);assert.equal(record[5].ref,ref);assert.equal(record[5].trace.recovery,'resync_committed_output');assert.equal(record[5].context,'synthetic command');assert.ok(f.calls.at(-1)[1].includes(ref));assert.equal(operationalMetrics.snapshot(f.guild.id).stages.runtime_failure.count,before+1);assert.ok(operationalMetrics.incidents(f.guild.id).some(i=>i.category==='runtime'&&i.code==='NARRATIVE_INTEGRITY'));
});
test('original audit keeps only selected bounded diagnostic fields and copied interaction lifetime',async()=>{
  const f=fixture();f.error.diagnostic={category:'source_span',actor:'x'.repeat(1100),source_ref:'source-1',unselected:'not retained'};f.error.interaction_diagnostic={phase:'response',nested:{value:1}};await postStateError(f);const saved=f.audit[0][5];assert.equal(saved.diagnostic.actor.length,1000);assert.equal(saved.diagnostic.unselected,undefined);assert.equal(saved.trace.source_event,'source-1');assert.deepEqual(saved.interaction,f.error.interaction_diagnostic);assert.notEqual(saved.interaction,f.error.interaction_diagnostic);assert.notEqual(saved.interaction.nested,f.error.interaction_diagnostic.nested);
});
test('stack/context bounds and triple-backtick replacement retain original exact message encoding',async()=>{
  const f=fixture();f.error.stack='```secret```'+'x'.repeat(1700);const context='c'.repeat(300),ref=await postStateError({...f,context});assert.equal(f.calls.at(-1)[1],`**⚠️ Veilkeeper state/runtime error · ${ref}**\nContext: ${context.slice(0,250)}\n`+'```\n'+f.error.stack.replace(/```/g,"''' ").slice(0,1450)+'\n```');
});
test('best-effort audit failure never prevents the original channel report',async()=>{
  const f=fixture();f.db.audit=()=>{throw new Error('audit unavailable');};const ref=await postStateError(f);assert.match(ref,/^[a-f0-9]{8}$/);assert.equal(f.calls.filter(c=>c[0]==='send').length,1);
});
test('missing/failed lookup and unsafe channel keep reference and never publish private diagnostics elsewhere',async t=>{
  const logged=[],original=console.error;console.error=(...args)=>logged.push(args);t.after(()=>console.error=original);let f=fixture();f.campaign.state_errors_channel_id=null;const a=await postStateError(f);assert.match(a,/^[a-f0-9]{8}$/);assert.ok(!f.calls.some(c=>c[0]==='send'));f=fixture();f.guild.channels.fetch=async()=>{throw Error('lookup failed');};assert.match(await postStateError(f),/^[a-f0-9]{8}$/);f=fixture();f.grants.set('everyone',permissions(VIEW));const b=await postStateError(f);assert.ok(!f.calls.some(c=>c[0]==='send'));assert.ok(logged[0][0].includes(b));assert.equal(logged.length,1);
});
test('uncertain send failure is logged once and swallowed with original correlation reference; no retry',async t=>{
  const f=fixture(),error=new Error('uncertain send'),logged=[],original=console.error;console.error=(...args)=>logged.push(args);t.after(()=>console.error=original);let calls=0;f.channel.send=async()=>{calls++;throw error;};const ref=await postStateError(f);assert.equal(calls,1);assert.deepEqual(logged,[[`Could not publish state error ${ref}`,error]]);
});
test('original campaign reader failure propagates after audit with no lookup or retry',async()=>{
  const f=fixture(),error=new Error('campaign unavailable');f.db.getCampaign=()=>{throw error;};await assert.rejects(postStateError(f),e=>e===error);assert.equal(f.audit.length,1);assert.ok(!f.calls.some(c=>['fetch','send'].includes(c[0])));
});
