/** Compact v9 production-adapter table; disposable SQLite and fake providers only. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {setup,run,unit} from './narrative-fixtures.mjs';
import {buildNarrativeContext} from '../src/narrative-authority-context.js';
import {mintNarrativeAudience,revalidateNarrativeAudience} from '../src/audience-native-v9.js';
const cases=[
 ['F1','01','native placed owner gets public direct-address grant',f=>{const x=setup(f);const ctx=buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef);
   const g=mintNarrativeAudience(ctx);assert.equal(g.proof.audience,'player');assert.equal(g.proof.recipient_user_id,x.pc.owner_user_id);
   assert.equal(g.proof.viewpoint,'character');assert.throws(()=>g.authority.inspect({...g.proof}),/unissued/);}],
 ['F1','02','private owner cannot mint channel or other-recipient grant',f=>{const x=setup(f,{privateScene:true});const ctx=buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef);
   const g=mintNarrativeAudience(ctx);assert.equal(g.proof.audience,'player_private');assert.throws(()=>mintNarrativeAudience(ctx,{audience:'channel'}));
   assert.throws(()=>revalidateNarrativeAudience(f.db,f.guild,g.proof,{...x.scope,actorUserId:f.pcs[1].owner_user_id,actorCharacterId:f.pcs[1].id}));}],
 ['F1','03','unplaced named camera cannot mint PC witnessing',f=>{const x=setup(f,{placed:false,text:'Describe terminal'});
   const ctx=buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef),g=mintNarrativeAudience(ctx);assert.equal(g.proof.audience,'channel');
   assert.equal(g.proof.viewpoint,'camera');assert.throws(()=>mintNarrativeAudience(ctx,{audience:'player'}));assert.equal(f.db.getCharacter(x.pc.id).data.location,undefined);}],
 ['F1','04','source hash revocation and owner changes invalidate grant',async()=>{for(const change of ['hash','revoked','owner'])await nativeFixture(f=>{const x=setup(f),ctx=buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef),g=mintNarrativeAudience(ctx);
   if(change==='hash')f.db.db.prepare("UPDATE world_events SET details_json='{}' WHERE guild_id=? AND event_key=?").run(f.guild,x.sourceRef);
   if(change==='revoked')f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,x.sourceRef);
   if(change==='owner')f.db.db.prepare('UPDATE characters SET owner_user_id=? WHERE id=?').run(f.pcs[1].owner_user_id,x.pc.id);
   assert.throws(()=>revalidateNarrativeAudience(f.db,f.guild,g.proof,x.scope));});}],
 ['F1','05','writer receives native audience constraints not private party context',async f=>{const x=setup(f);const o=await run(f,x,{narrative_units:[unit('scene','scene','Dryer windows glow beside a folding counter.')],fiction_delta:[]});
   const packet=JSON.parse(o.ai.requests.at(-1).input);assert.equal(packet.audience_v9.audience,'player');assert.equal(packet.audience_v9.recipient_character_id,x.pc.id);
   assert.equal(packet.audience_v9.viewpoint,'character');assert(o.rows.some(r=>r.payload.includes('Dryer windows')));}],
];
for(const [phase,id,name,body] of cases)test(`${phase} AF${id} ${name}`,()=>nativeFixture(body));
