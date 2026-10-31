import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {npcControlLabel,formatNpcProxyPacket} from '../../src/frameworks/discord/public.js';
const proxy=()=>({id:'synthetic',npc_name:'Archivist',control_level:'portrayal',gm_notes:'GM SECRET',player_packet:{public_identity:'Known clerk',portrayal:'Patient',current_objective:'Protect archive',known_information:['Owner-authorized clue'],relationships:['Respects witness'],capabilities:['Read archives'],limitations:['No special powers'],scene_cues:['Quiet hallway']}});
test('original control labels and unknown/falsy fallback values retained',()=>{
  for(const [key,label]of [['portrayal','Portrayal only'],['tactical','Tactical'],['full_npc','Full NPC'],['custom','custom'],['',''],[null,null],[undefined,undefined]])assert.equal(npcControlLabel(key),label);
});
test('offered packet retains original sections and voluntary claim/decline prompts without mutation',()=>{
  const p=proxy(),before=structuredClone(p),text=formatNpcProxyPacket(p,{offered:true});
  for(const fragment of ['# VEILED CITY — NPC PROXY PACKAGE','**NPC:** Archivist','**Control:** Portrayal only','**Status:** Offered — not active until claimed','**Who You Are**\nKnown clerk','**Portrayal**\nPatient','**Current Objective**\nProtect archive','**What This NPC Knows**\n- Owner-authorized clue','**Relevant Relationships**\n- Respects witness','**Capabilities You May Use**\n- Read archives','**Limits / Vulnerabilities**\n- No special powers','**Scene Cues**\n- Quiet hallway','/vc-npc claim npc:Archivist','/vc-npc decline npc:Archivist'])assert.ok(text.includes(fragment),fragment);
  assert.ok(!text.includes('GM SECRET'));assert.deepEqual(p,before);
});
test('active packet preserves all original control boundaries and role-specific authority text',()=>{
  const p=proxy();for(const [level,phrase]of [['portrayal','Veilkeeper retains tactics/mechanics'],['tactical','Veilkeeper adjudicates mechanics, dice, consequences'],['full_npc',"You still control only this NPC—not the GM"]]){const text=formatNpcProxyPacket({...p,control_level:level});assert.ok(text.includes('**Status:** Active'));assert.ok(text.includes(phrase));assert.ok(text.includes("Do not dictate a PC's thoughts, dialogue, choices, damage, death, or outcome"));assert.ok(text.includes('Keep NPC-private information private'));assert.ok(text.includes('prefix with `Archivist:` or `[Archivist]`'));assert.ok(!text.includes('/vc-npc claim'));}
});
test('optional missing packet sections and original array-only formatting retained',()=>{
  const text=formatNpcProxyPacket({npc_name:'Clerk',control_level:'custom',player_packet:{known_information:'not an array',relationships:[],capabilities:null}});
  for(const section of ['**Who You Are**','**What This NPC Knows**','**Relevant Relationships**','**Capabilities You May Use**'])assert.ok(!text.includes(section));
  assert.ok(text.includes('**Control:** custom'));assert.ok(formatNpcProxyPacket({npc_name:'Clerk'}).includes('**NPC:** Clerk'));
});
test('original truncation and invalid options/proxy/getter errors retained',()=>{
  const p=proxy();p.player_packet.public_identity='x'.repeat(13000);assert.equal(formatNpcProxyPacket(p).length,12000);assert.equal(formatNpcProxyPacket(p).at(-1),'x');
  assert.throws(()=>formatNpcProxyPacket(null),TypeError);assert.throws(()=>formatNpcProxyPacket(proxy(),null),TypeError);
  const error=new Error('packet getter');assert.throws(()=>formatNpcProxyPacket({get player_packet(){throw error;}}),e=>e===error);
});
test('root retains original packet revision checks, private delivery and proxy lifecycle callers',()=>{
  const s=readFileSync(new URL('../../src/commands.js',import.meta.url),'utf8');assert.ok(s.includes("import {npcControlLabel,formatNpcProxyPacket} from './frameworks/discord/public.js'"));assert.ok(!s.includes('function formatNpcProxyPacket('));assert.ok(!s.includes('function npcControlLabel('));
  assert.ok(s.includes('formatNpcProxyPacket(current,{offered})!==content'));assert.ok(s.includes('revision=JSON.stringify(actual)'));assert.ok(s.includes('async function deliverNpcProxyPacket('));assert.ok(s.includes('await deliverNpcProxyPacket({db,guild:interaction.guild,proxy,offered:proxy.status==="offered"})'));
});
