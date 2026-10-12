/** V95-03: real command/component adapters, temporary native sources, no network. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture,pvpTerms} from './v9-fixtures.mjs';
import {proposePvp,reviewPvp,respondPvp,progressPvp} from '../src/narrative-pvp.js';
import {configureCityFlags} from '../src/city-core.js';
import {handleCommand} from '../src/commands.js';
import crypto from 'node:crypto';
import {syncBuiltinESMExports} from 'node:module';
import {attackFixture} from './v94-pvp-attack-fixtures.mjs';
import {preparePvpAttack,reviewPvpAttack,authorizePvpAttack,rollPvpAttack} from '../src/pvp-attacks.js';
import {rollPvpDamage,preparePvpDamage,reviewPvpDamage,resolvePvpDamage} from '../src/pvp-damage.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {preparePvpReaction} from '../src/pvp-reactions.js';
import {fallenFixture} from './v94-death-fixtures.mjs';
import {incomingFixture} from './v94-incoming-fixtures.mjs';
import {prepareIncomingAttack,rollIncomingAttack} from '../src/pc-incoming.js';
import {publishPvpNotices} from '../src/native-publications.js';
import {sendPlayerPrivate} from '../src/publishing.js';
import {buildCommands} from '../src/command-definitions.js';

let serial=0;
test('UX16 published PvP-menu schema has Discord-sized option descriptions',()=>{
  const menu=buildCommands().find(c=>c.name==='vc-roll').options.find(o=>o.name==='pvp-menu');assert(menu);
  assert(menu.description.length<=100);for(const o of menu.options)assert(o.description.length<=100);
});
function interaction(f,actor=0,extra={}){
  const replies=[];
  const i={id:`ux-${++serial}`,guildId:f.guild,user:{id:f.pcs[actor].owner_user_id,username:f.pcs[actor].name},replies,
    memberPermissions:{has:()=>false},member:{roles:{cache:new Map()}},
    commandName:'vc-roll',isChatInputCommand:()=>true,isButton:()=>false,isStringSelectMenu:()=>false,isModalSubmit:()=>false,
    options:{getSubcommand:()=> 'pvp-menu',getString:k=>k==='reference'?extra.ref:null},
    deferReply:async p=>{assert.equal(p.ephemeral,true);i.deferred=true;},
    reply:async p=>{replies.push(p);i.replied=true;},editReply:async p=>{replies.push(p);},
    showModal:async p=>{i.modal=p.toJSON();i.replied=true;},...extra};return i;
}
function proposal(f,terms=pvpTerms(f.pcs)){
  const a=f.accepted(0,'I try a harmless feint.',f.pcs[1].id);
  return proposePvp(f.db,f.guild,f.pcs[0].owner_user_id,{accepted_intent:a.record_key,opponent:f.pcs[1].id,terms});
}
function enable(f){configureCityFlags(f.db,f.guild,{pvp_private_ui:true},'test');}
function buttons(i){return (i.replies.at(-1)?.components||[]).flatMap(row=>row.toJSON().components);}
function control(i,label){const b=buttons(i).find(b=>b.label===label);assert(b,`Missing control: ${label}`);return b.custom_id;}
async function open(f,actor,ref){const i=interaction(f,actor,{ref});await handleCommand(i,{db:f.db,gm:{content:{root:'../content'}}});
  assert(i.replies.at(-1)?.components?.length,i.replies.at(-1)?.content||'Missing private menu');return i;}
async function click(f,actor,i,label,extra={}){
  const j=interaction(f,actor,{isChatInputCommand:()=>false,isButton:()=>true,customId:control(i,label),...extra});
  await handleCommand(j,{db:f.db,gm:{content:{root:'../content'}}});return j;
}
async function submit(f,actor,i,values){const j=interaction(f,actor,{customId:i.modal.custom_id,isChatInputCommand:()=>false,
  isModalSubmit:()=>true,fields:{getTextInputValue:k=>values[k]}});await handleCommand(j,{db:f.db,gm:{}});return j;}
async function accept(f,actor,ref){let i=await open(f,actor,ref);assert(!buttons(i).some(b=>b.label==='Accept EXACT terms'));
  i=await click(f,actor,i,'Review full terms');return click(f,actor,i,'Accept EXACT terms');}
async function entropy(faces,run){const original=crypto.randomInt;let count=0;crypto.randomInt=(min,max)=>{
  const n=faces[count++];assert(Number.isInteger(n)&&n>=min&&n<max);return n;};syncBuiltinESMExports();
  try{return await run();}finally{crypto.randomInt=original;syncBuiltinESMExports();assert.equal(count,faces.length);}}
async function nativeDamage(f,{death=false,count=2}={}){
  const x=await attackFixture(f,{count});
  if(death)f.db.updateCharacterData(f.pcs[1].id,d=>{d.resources.hp.current=5;});
  const a=preparePvpAttack(f.db,f.guild,'gm',x.input,{gm:true,interactionId:'ux-native-attack'});
  for(const pc of f.pcs.slice(0,2)){reviewPvpAttack(f.db,f.guild,pc.owner_user_id,a.record_key);
    authorizePvpAttack(f.db,f.guild,pc.owner_user_id,{attack:a.record_key,expected_revision:a.data.offer_hash},{interactionId:`ux-auth-${pc.id}`});}
  let n=0;const roll=rollPvpAttack(f.db,f.guild,f.pcs[0].owner_user_id,{attack:a.record_key,expected_revision:a.data.offer_hash},{rng:()=>[9,4][n++]});
  n=0;const damage=rollPvpDamage(f.db,f.guild,f.pcs[0].owner_user_id,{attack_receipt:roll.record_key},{rng:()=>[2,2][n++]});
  f.db.upsertRulesRuling(f.guild,{key:'ux-damage',createdBy:'gm',ruling:'SRD native thresholds and Armor severity reduction; no unsupported features.'});
  const offer=preparePvpDamage(f.db,f.guild,'gm',{damage_receipts:[damage.record_key],ruling:'ux-damage',
    defenses:{source:'base',resistance:'none',armor_reduction:1,armor_allowed:true}},{gm:true,interactionId:'ux-native-damage'});
  return {...x,a,roll,damage,offer};
}
test('UX01/UX16 private guided consent is flag-gated and Review is separate from Accept',()=>nativeFixture(async f=>{
  const p=proposal(f);f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,pvp_private_ui:true}});
  const i=interaction(f,0,{ref:p.record_key});await handleCommand(i,{db:f.db,gm:{}});
  assert(i.replies.some(r=>r.components?.length),'An actual private interactive menu is required, not JSON-only status.');
  assert(!buttons(i).some(b=>b.label==='Accept EXACT terms'));const reviewed=await click(f,0,i,'Review full terms');
  assert(buttons(reviewed).some(b=>b.label==='Accept EXACT terms'));assert.equal(f.db.getCityRecord(f.guild,'pvp_proposal',p.record_key).data.approvals.length,0);
  await click(f,0,reviewed,'Accept EXACT terms');await accept(f,1,p.record_key);
  assert.equal(f.db.getCityRecord(f.guild,'pvp_proposal',p.record_key).status,'locked');
}));
test('UX03/UX05 decline is neutral; counteroffer invalidates old approval and old UI',()=>nativeFixture(async f=>{
  enable(f);const p=proposal(f);await accept(f,0,p.record_key);const old=await open(f,0,p.record_key);
  let j=await open(f,1,p.record_key);j=await click(f,1,j,'Counteroffer my stakes');
  await submit(f,1,j,{objective:'Revised contest',best:'My own best stake',worst:'My own worst stake'});
  const revised=f.db.getCityRecord(f.guild,'pvp_proposal',p.record_key);assert.notEqual(revised.data.terms_hash,p.data.terms_hash);assert.equal(revised.data.approvals.length,0);
  const stale=await click(f,0,old,'Review full terms');assert.match(stale.replies[0].content,/not applied/);
  j=await open(f,1,p.record_key);j=await click(f,1,j,'Review full terms');await click(f,1,j,'Decline privately');
  const r=f.db.getCityRecord(f.guild,'pvp_proposal',p.record_key);assert.equal(r.status,'declined');assert.equal(r.data.approvals.length,0);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'pvp_round_receipt',includeGM:true}).length,0);
}));
test('UX01 guided new proposal uses exact own accepted source and explicit offered stakes, never auto-consent',()=>nativeFixture(async f=>{
  enable(f);const a=f.accepted(0,'I try a harmless feint.',f.pcs[1].id);
  let i=await open(f,0,a.record_key);i=await click(f,0,i,'Propose narrative stakes');
  await submit(f,0,i,{objective:'Harmless contest',best:'I achieve my objective',worst:'I do not achieve my objective'});
  const p=f.db.listCityRecords(f.guild,{kind:'pvp_proposal',includeGM:true})[0];assert.equal(p.data.accepted_intent,a.record_key);assert.equal(p.data.approvals.length,0);
}));
test('UX12 complete long terms are paginated and attached without exposing an opponent sealed choice',()=>nativeFixture(async f=>{
  enable(f);const t=pvpTerms(f.pcs);for(const s of t.stakes){s.best='B'.repeat(600);s.worst='W'.repeat(600);s.tie='T'.repeat(600);}
  const p=proposal(f,t);let i=await open(f,0,p.record_key);i=await click(f,0,i,'Review full terms');
  assert(i.replies[0].content.length<=2000);assert(i.replies[0].files[0].attachment.toString().includes('W'.repeat(600)));
  assert(buttons(i).some(b=>b.label==='More terms'));assert(i.replies[0].components.length<=5);
}));
test('UX06/UX11/UX15 native Duel choice and dice remain once across parallel slash/button, separate owner clauses and bilateral disclosure',()=>nativeFixture(async f=>{
  enable(f);const p=proposal(f,pvpTerms(f.pcs,{audience:'bilateral_author_projection'}));await accept(f,0,p.record_key);await accept(f,1,p.record_key);
  for(let actor=0;actor<2;actor++){
    let i=await open(f,actor,p.record_key);i=await click(f,actor,i,'Choose Agility attempt');
    await submit(f,actor,i,{attempt:actor===0?'I feint.':'I watch the feint.'});
  }
  let first=await open(f,0,p.record_key);const v=progressPvp(f.db,f.guild,f.pcs[0].owner_user_id,p.record_key);
  const slash=interaction(f,0,{options:{getSubcommand:()=> 'pvp',getString:k=>k==='json'?JSON.stringify({op:'roll',proposal:p.record_key,
    expected_revision:p.data.terms_hash,round:v.round,expected_window_revision:v.window_revision}):null}});
  await entropy([10,3],()=>Promise.all([click(f,0,first,'Roll sealed choice'),handleCommand(slash,{db:f.db,gm:{}})]));
  const ownerView=await open(f,0,p.record_key),otherView=await open(f,1,p.record_key);
  assert.match(ownerView.replies[0].files[0].attachment.toString(),/"hope": 10/);
  assert(!otherView.replies[0].files[0].attachment.toString().includes('"hope": 10'),'opposing sealed dice stay private');
  await click(f,0,first,'Roll sealed choice'); // consumed/stale token, no entropy or duplicate roll
  let second=await open(f,1,p.record_key);await entropy([9,2],()=>click(f,1,second,'Roll sealed choice'));
  assert.equal(f.db.listCityRecords(f.guild,{kind:'pvp_round_receipt',includeGM:true}).length,2);
  assert.equal(progressPvp(f.db,f.guild,f.pcs[0].owner_user_id,p.record_key).resolution.winner,f.pcs[0].id);
  let author=await open(f,0,p.record_key);author=await click(f,0,author,'Author ONLY own success');
  author=await click(f,0,author,'Review exact clause');await click(f,0,author,'Confirm bounded disclosure');
  assert.equal(f.db.listCityRecords(f.guild,{kind:'pvp_public_projection',includeGM:true}).length,0);
  let loser=await open(f,1,p.record_key);assert(!buttons(loser).some(b=>b.label==='Author ONLY own success'));
  await click(f,1,loser,'Withhold my reaction');
  assert.equal(f.db.listCityRecords(f.guild,{kind:'pvp_authored_narrative',includeGM:true}).filter(r=>r.subject_key===f.pcs[1].id)[0].status,'withheld');
  loser=await open(f,1,p.record_key);const select=buttons(loser).find(b=>b.type===3);assert(select);
  const option=select.options.find(o=>o.label.includes('clause'));assert(option);
  const selected=interaction(f,1,{isChatInputCommand:()=>false,isStringSelectMenu:()=>true,customId:select.custom_id,values:[option.value]});
  await handleCommand(selected,{db:f.db,gm:{}});await click(f,1,selected,'Confirm bounded disclosure');
  assert.equal(f.db.listCityRecords(f.guild,{kind:'pvp_public_projection',includeGM:true}).length,1);
  assert.equal(f.db.getCampaign(f.guild).fear,0);assert.equal(f.db.getCharacter(f.pcs[0].id).data.resources.hope,2);
  let draft=await open(f,1,p.record_key);draft=await click(f,1,draft,'Private freeform draft');
  await submit(f,1,draft,{text:'Jaxon apologizes for losing. My private contact is SECRET.'});
  const pending=f.db.listCityRecords(f.guild,{kind:'pvp_narrative_draft',includeGM:true})[0];
  assert.equal(pending.status,'needs_scope_review');assert.equal(pending.visibility,'character');assert.equal(pending.subject_key,f.pcs[1].id);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'pvp_public_projection',includeGM:true}).length,1,'draft never creates a projection');
}));
test('UX08/UX04 target-only Armor native application once, then withdrawal preserves the saved effect',()=>nativeFixture(async f=>{
  enable(f);const x=await nativeDamage(f),before=f.db.getCharacter(f.pcs[1].id).data.resources;
  const unauthorized=interaction(f,0,{ref:x.offer.record_key});await handleCommand(unauthorized,{db:f.db,gm:{}});
  assert(!unauthorized.replies.some(r=>r.components?.length));
  let owner=await open(f,1,x.offer.record_key);owner=await click(f,1,owner,'Review own mechanics');
  await click(f,1,owner,'Spend one Armor Slot');const after=f.db.getCharacter(f.pcs[1].id).data.resources;
  assert.equal(after.armor.current,before.armor.current+1);assert.equal(after.hp.current,before.hp.current);
  f.restart();await click(f,1,owner,'Spend one Armor Slot');assert.deepEqual(f.db.getCharacter(f.pcs[1].id).data.resources,after);
  let consent=await open(f,1,x.contract.record_key);await click(f,1,consent,'Withdraw neutrally');
  assert.deepEqual(f.db.getCharacter(f.pcs[1].id).data.resources,after);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'pc_effect_receipt',includeGM:true}).length,1);
}));
test('UX09 owner-reviewed death choice persists despite private delivery failure; no automatic selection or reroll',()=>nativeFixture(async f=>{
  enable(f);const x=await nativeDamage(f,{death:true});reviewPvpDamage(f.db,f.guild,f.pcs[1].owner_user_id,x.offer.record_key);
  resolvePvpDamage(f.db,f.guild,f.pcs[1].owner_user_id,{damage:x.offer.record_key,expected_revision:x.offer.data.digest,armor:false},{interactionId:'ux-final-hp'});
  const request=f.db.listCityRecords(f.guild,{kind:'pc_death_move_request',includeGM:true})[0];
  assert.equal(request.status,'awaiting_owner');let i=await open(f,1,request.record_key);assert(!buttons(i).some(b=>b.label==='Choose Risk It All'));
  i=await click(f,1,i,'Review own mechanics');
  await entropy([2,9],()=>assert.rejects(()=>click(f,1,i,'Choose Risk It All',{editReply:async()=>{throw Error('Unknown delivery');}}),/uncertain/));
  assert.equal(f.db.getCharacter(f.pcs[1].id).status,'dead');
  const outcome=f.db.listCityRecords(f.guild,{kind:'pc_death_outcome',includeGM:true})[0];assert.equal(outcome.data.result,'dead');
  f.restart();await assert.rejects(()=>click(f,1,i,'Choose Risk It All'),/Active campaign character/);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'pc_death_outcome',includeGM:true}).length,1);
}));
test('UX13/UX14 private response failure, duplicate clicks, tampering, expiry, retraction and changed owner cannot repeat or publish',()=>nativeFixture(async f=>{
  enable(f);const p=proposal(f);let i=await open(f,0,p.record_key);i=await click(f,0,i,'Review full terms');
  await assert.rejects(()=>click(f,0,i,'Accept EXACT terms',{editReply:async()=>{throw Error('DM disabled');}}),/uncertain/);
  assert.equal(f.db.getCityRecord(f.guild,'pvp_proposal',p.record_key).data.approvals.length,1);
  await click(f,0,i,'Accept EXACT terms');assert.equal(f.db.getCityRecord(f.guild,'pvp_proposal',p.record_key).data.approvals.length,1);
  assert(f.db.listCityRecords(f.guild,{kind:'pvp_ui_delivery',includeGM:true}).every(r=>r.visibility==='character'));
  const foreign=await click(f,1,i,'Accept EXACT terms');assert.match(foreign.replies[0].content,/not applied/);
  let fresh=await open(f,1,p.record_key),id=control(fresh,'Review full terms'),key=id.split(':')[1];
  const saved=f.db.getCityRecord(f.guild,'pvp_ui_token',key);f.db.saveCityRecord(f.guild,{...saved,key,data:{...saved.data,expires_at:0}});
  const expired=await click(f,1,fresh,'Review full terms');assert.match(expired.replies[0].content,/not applied/);
  f.db.db.prepare('UPDATE characters SET owner_user_id=? WHERE id=?').run(f.pcs[2].owner_user_id,f.pcs[1].id);
  const changed=await click(f,1,fresh,'Review full terms');assert.match(changed.replies[0].content,/not applied/);
  assert.equal(f.db.getCityRecord(f.guild,'pvp_proposal',p.record_key).data.approvals.length,1);
}));

test('UX13 uncertain interaction delivery is not blindly reposted under the same Discord identity',()=>nativeFixture(async f=>{
  enable(f);const p=proposal(f);let i=await open(f,0,p.record_key);i=await click(f,0,i,'Review full terms');let calls=0;
  const j=interaction(f,0,{isChatInputCommand:()=>false,isButton:()=>true,customId:control(i,'Accept EXACT terms'),
    editReply:async()=>{calls++;throw Error('lost acknowledgment');}});
  await assert.rejects(()=>handleCommand(j,{db:f.db,gm:{}}),/uncertain/);
  j.editReply=async()=>{calls++;};await handleCommand(j,{db:f.db,gm:{}});
  assert.equal(calls,1,'uncertain acknowledgment must not be automatically reposted');
  assert.equal(f.db.getCityRecord(f.guild,'pvp_proposal',p.record_key).data.approvals.length,1);
}));

test('UX01/UX13 actual guided proposal privately notifies both owners through restart-safe native outbox',()=>nativeFixture(async f=>{
  enable(f);const a=f.accepted(),sent=[];const guild={id:f.guild,members:{fetch:async user=>({send:async content=>{
    sent.push({user,content});return {id:`ux-dm-${sent.length}`,channelId:`dm-${user}`};}})}};
  let i=await open(f,0,a.record_key);i=await click(f,0,i,'Propose narrative stakes');
  const j=interaction(f,0,{guild,customId:i.modal.custom_id,isChatInputCommand:()=>false,isModalSubmit:()=>true,
    fields:{getTextInputValue:k=>({objective:'Harmless feint',best:'Own success',worst:'Own failure'})[k]}});
  await handleCommand(j,{db:f.db,gm:{}});
  assert.deepEqual(new Set(sent.map(s=>s.user)),new Set(f.pcs.slice(0,2).map(p=>p.owner_user_id)));
  assert(sent.every(s=>s.content.length<=2000));assert.equal(f.db.listCityRecords(f.guild,{kind:'pvp_consent',includeGM:true}).length,0);
  f.restart();const before=sent.length;await handleCommand(j,{db:f.db,gm:{}});assert.equal(sent.length,before);
}));

test('UX02 guided lethal-risk offer needs independent current signatures and discloses exact risk/edges',()=>nativeFixture(async f=>{
  enable(f);const a=f.accepted(0,'I attempt to strike Choso.',f.pcs[1].id,{operation:'attack'});
  let i=await open(f,0,a.record_key);i=await click(f,0,i,'Propose lethal-risk duel');
  await submit(f,0,i,{objective:'Consented arms test',best:'My own success',worst:'Real injury risk'});
  const p=f.db.listCityRecords(f.guild,{kind:'pvp_encounter_contract',includeGM:true})[0];assert(p);assert.notEqual(p.status,'locked');
  i=await open(f,1,p.record_key);i=await click(f,1,i,'Review full terms');
  const text=i.replies.at(-1).files[0].attachment.toString();assert.match(text,/lethal/);assert.match(text,/YOUR SRD death-move choice/);
  assert(text.includes('Jaxon → Choso')&&text.includes('Choso → Jaxon'));assert.match(text,/Guaranteed-nonlethal.*disabled/);
  await click(f,1,i,'Accept EXACT terms');assert.notEqual(f.db.getCityRecord(f.guild,'pvp_encounter_contract',p.record_key).status,'locked');
  await accept(f,0,p.record_key);assert.equal(f.db.getCityRecord(f.guild,'pvp_encounter_contract',p.record_key).status,'locked');
}));

test('UX02 damage invitation notifies each owner privately without recording Review or consent',()=>nativeFixture(async f=>{
  enable(f);const a=f.accepted(0,'I attempt to strike Choso.',f.pcs[1].id,{operation:'attack'}),sent=[];
  const guild={id:f.guild,members:{fetch:async user=>({send:async content=>{sent.push({user,content});return {id:`damage-dm-${sent.length}`,channelId:`dm-${user}`};}})}};
  let i=await open(f,0,a.record_key);i=await click(f,0,i,'Propose lethal-risk duel');
  const j=interaction(f,0,{guild,customId:i.modal.custom_id,isChatInputCommand:()=>false,isModalSubmit:()=>true,
    fields:{getTextInputValue:k=>({objective:'Voluntary test',best:'Own best',worst:'Own risk'})[k]}});
  await handleCommand(j,{db:f.db,gm:{}});
  assert.deepEqual(new Set(sent.map(s=>s.user)),new Set(f.pcs.slice(0,2).map(p=>p.owner_user_id)));
  assert(sent.every(s=>s.content.includes('/vc-roll pvp-menu')&&s.content.includes('lethal')));
  assert.equal(f.db.listCityRecords(f.guild,{kind:'pvp_damage_review',includeGM:true}).length,0);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'pvp_damage_consent',includeGM:true}).length,0);
}));

test('UX07 four-owner FFA offers only signed prepared target edges and native private fair opportunity',()=>nativeFixture(async f=>{
  enable(f);const x=await attackFixture(f,{count:4,configureTerms:t=>{t.target_permissions=t.target_permissions.filter(e=>!(e.actor===f.pcs[0].id&&e.target===f.pcs[2].id));}});
  const a=preparePvpAttack(f.db,f.guild,'gm',x.input,{gm:true,interactionId:'ux-ffa-native-prepare'});
  let i=await open(f,0,x.contract.record_key);const select=buttons(i).find(c=>c.type===3);assert(select);
  assert.equal(select.options.length,1);assert(select.options[0].label.includes(f.pcs[1].name));
  const selected=interaction(f,0,{customId:select.custom_id,values:[select.options[0].value],isChatInputCommand:()=>false,isStringSelectMenu:()=>true});
  await handleCommand(selected,{db:f.db,gm:{}});let attacker=await click(f,0,selected,'Review own mechanics');
  assert(!attacker.replies.at(-1).files[0].attachment.toString().includes('"evasion": 12'),'defender sheet is not the attacker review');
  await click(f,0,attacker,'Confirm own mechanics');
  let defender=await open(f,1,a.record_key);defender=await click(f,1,defender,'Review own mechanics');await click(f,1,defender,'Confirm own mechanics');
  attacker=await open(f,0,a.record_key);attacker=await click(f,0,attacker,'Review own mechanics');
  await entropy([9,4],()=>click(f,0,attacker,'Roll authorized attack'));
  attacker=await open(f,0,a.record_key);attacker=await click(f,0,attacker,'Review own mechanics');
  await entropy([2,2],()=>click(f,0,attacker,'Roll native damage'));
  assert.equal(f.db.listCityRecords(f.guild,{kind:'pvp_attack_roll_receipt',includeGM:true}).length,1);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'pvp_damage_roll_receipt',includeGM:true}).length,1);
  i=await open(f,3,x.contract.record_key);i=await click(f,3,i,'Review my opportunity');
  assert(!i.replies.at(-1).files[0].attachment.toString().includes('"evasion"'));await click(f,3,i,'Pass my elective opportunity');
  assert.equal(f.db.listCityRecords(f.guild,{kind:'pvp_spotlight_pass',includeGM:true})[0].subject_key,f.pcs[3].id);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'pvp_reaction_offer',includeGM:true}).length,0);
  assert.equal(f.db.getCharacter(f.pcs[3].id).data.resources.hp.current,0);
}));

test('UX09 guided Risk It All recovery allocation and other death choices never choose or reroll for owner',async()=>{
  for(const move of ['risk_it_all','avoid_death','blaze_of_glory'])await nativeFixture(async f=>{
    enable(f);const x=await fallenFixture(f);let i=await open(f,1,x.request.record_key);i=await click(f,1,i,'Review own mechanics');
    const name={risk_it_all:'Risk It All',avoid_death:'Avoid Death',blaze_of_glory:'Blaze of Glory'}[move];
    const faces={risk_it_all:[4,2],avoid_death:[12],blaze_of_glory:[]}[move];
    await entropy(faces,async()=>{i=await click(f,1,i,`Choose ${name}`);});
    if(move==='risk_it_all'){
      i=await open(f,1,x.request.record_key);i=await click(f,1,i,'Review own mechanics');i=await click(f,1,i,'Allocate native recovery');
      await submit(f,1,i,{hp:'3',stress:'1'});const r=f.db.getCharacter(f.pcs[1].id).data.resources;
      assert.equal(r.hp.current,3);assert.equal(r.stress.current,1);assert.equal(r.hope,2);
    }else assert.equal(f.db.getCharacter(f.pcs[1].id).data.death_state.status,move==='avoid_death'?'unconscious':'blaze_pending');
    assert.equal(f.db.listCityRecords(f.guild,{kind:'pc_death_outcome',includeGM:true}).length,1);
    assert.equal(f.db.listCityRecords(f.guild,{kind:'pvp_fear_trigger',includeGM:true}).length,0);
  });
});

test('UX14/UX16 revoked source, forged action, changed scene, disabled flag and failed early acknowledgment are inert; JSON remains available',()=>nativeFixture(async f=>{
  const p=proposal(f);const disabled=interaction(f,0,{ref:p.record_key});await handleCommand(disabled,{db:f.db,gm:{}});
  assert(!disabled.replies.some(r=>r.components?.length));enable(f);
  let i=await open(f,0,p.record_key),id=control(i,'Review full terms');
  const forged=interaction(f,0,{customId:id.replace(':review:',':accept:'),isChatInputCommand:()=>false,isButton:()=>true});
  await handleCommand(forged,{db:f.db,gm:{}});assert.match(forged.replies[0].content,/not applied/);
  const unacked=interaction(f,0,{customId:id,isChatInputCommand:()=>false,isButton:()=>true,deferReply:async()=>{throw Error('Unknown interaction');}});
  await assert.rejects(()=>handleCommand(unacked,{db:f.db,gm:{}}),/Unknown interaction/);
  const saved=f.db.getCityRecord(f.guild,'pvp_ui_token',id.split(':')[1]);assert.equal(saved.status,'active');
  // Existing JSON recovery stays usable independently of the new flag.
  configureCityFlags(f.db,f.guild,{pvp_private_ui:false},'test');const json=interaction(f,0,{options:{getSubcommand:()=> 'pvp',getString:()=>JSON.stringify({op:'inbox'})}});
  await handleCommand(json,{db:f.db,gm:{}});assert(json.replies.length);enable(f);
  indexWorldEvent(f.db,f.guild,{key:p.source_event,status:'retracted'},'gm');
  const revoked=await click(f,0,i,'Review full terms');assert.match(revoked.replies[0].content,/not applied/);
  assert.equal(f.db.getCityRecord(f.guild,'pvp_proposal',p.record_key).data.approvals.length,0);
}));

test('UX10 only an established source-triggered reaction gets owner controls; Critical grants no metacurrency',()=>nativeFixture(async f=>{
  enable(f);const x=await nativeDamage(f),accepted=f.accepted(1,'I try avoiding the debris.','terminal',{type:'roll',operation:'reaction',target:{kind:'location',key:'terminal',phrase:'terminal',grounding:'known'}});
  f.db.upsertRulesRuling(f.guild,{key:'ux-reaction',createdBy:'gm',ruling:'Established debris: Agility Difficulty 13; success mitigates, Critical avoids.'});
  const trigger=indexWorldEvent(f.db,f.guild,{key:'ux-debris',kind:'environment_hazard',title:'Established falling debris',source_id:'gm:gm',
    session_id:f.session.id,scene:x.contract.data.scene,location_key:'terminal',visibility:'gm',
    details:{reaction_rule:{trait:'Agility',difficulty:13,normal_success:'partial',critical_success:'none',ruling:'ux-reaction'}}},'gm');
  const offer=preparePvpReaction(f.db,f.guild,'gm',{attack_receipt:x.roll.record_key,accepted_intent:accepted.record_key,
    trigger:trigger.event_key,ruling:'ux-reaction',trait:'Agility',modifier_keys:[]},{gm:true,interactionId:'ux-native-reaction'});
  let i=await open(f,1,offer.record_key);assert(!buttons(i).some(b=>b.label==='Roll reviewed reaction'));
  i=await click(f,1,i,'Review own mechanics');const before=f.db.getCharacter(f.pcs[1].id).data.resources;
  await entropy([1,1],()=>click(f,1,i,'Roll reviewed reaction'));
  assert.equal(f.db.listCityRecords(f.guild,{kind:'pvp_reaction_roll_receipt',includeGM:true}).length,1);
  assert.deepEqual(f.db.getCharacter(f.pcs[1].id).data.resources,before);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'pvp_fear_trigger',includeGM:true}).length,0);
}));

test('UX08 incoming NPC defense review and Armor use actual owner controls without minting GM attack authority',()=>nativeFixture(async f=>{
  enable(f);const x=incomingFixture(f),r=prepareIncomingAttack(f.db,f.guild,'gm',x.input,{gm:true,interactionId:'ux-incoming',library:x.lib});
  let i=await open(f,1,r.record_key);i=await click(f,1,i,'Review own mechanics');await click(f,1,i,'Confirm reviewed defenses');
  assert.equal(f.db.getCityRecord(f.guild,'pc_incoming_attack',r.record_key).status,'ready');
  // Ordinary incoming attack dice remain the existing authenticated native GM workflow, not a new UI capability.
  let face=0;rollIncomingAttack(f.db,f.guild,'gm',r.record_key,{gm:true,library:x.lib,rng:()=>[15,6][face++]});assert.equal(face,2);
  i=await open(f,1,r.record_key);i=await click(f,1,i,'Review own mechanics');await click(f,1,i,'Spend one Armor Slot');
  const resources=f.db.getCharacter(x.pc.id).data.resources;assert.equal(resources.armor.current,1);
  assert.equal(f.db.getCityRecord(f.guild,'pc_incoming_attack',r.record_key).status,'resolved');
  await click(f,1,i,'Spend one Armor Slot');assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,resources);
}));

test('UX06 Three Strikes tie continues only through both native owner decisions',()=>nativeFixture(async f=>{
  enable(f);const p=proposal(f,pvpTerms(f.pcs,{mode:'three_strikes'}));await accept(f,0,p.record_key);await accept(f,1,p.record_key);
  for(let actor=0;actor<2;actor++){
    let i=await open(f,actor,p.record_key);i=await click(f,actor,i,'Choose Agility attempt');await submit(f,actor,i,{attempt:'I feint.'});
  }
  for(let actor=0;actor<2;actor++){const i=await open(f,actor,p.record_key);await entropy([9,2],()=>click(f,actor,i,'Roll sealed choice'));}
  const v=progressPvp(f.db,f.guild,f.pcs[0].owner_user_id,p.record_key);assert.equal(v.status,'awaiting_continuation');
  assert(Object.values(v.scores).every(n=>n===0));
  const i=await open(f,0,p.record_key);await click(f,0,i,'Continue next exchange');
  assert.equal(progressPvp(f.db,f.guild,f.pcs[0].owner_user_id,p.record_key).round,1,'one owner cannot continue both PCs');
  const other=await open(f,1,p.record_key);await click(f,1,other,'Continue next exchange');
  assert.equal(progressPvp(f.db,f.guild,f.pcs[0].owner_user_id,p.record_key).round,2);
  assert.equal(f.db.getCampaign(f.guild).fear,0);assert.equal(f.db.getCharacter(f.pcs[0].id).data.resources.hope,2);
}));

test('UX12 navigation stays bounded at final choice and terms pages with all private options accessible',()=>nativeFixture(async f=>{
  enable(f);const refs=[];for(let n=0;n<22;n++)refs.push(proposal(f).record_key);
  let i=await open(f,0,null);const first=buttons(i).find(c=>c.type===3);assert.equal(first.options.length,20);
  i=await click(f,0,i,'More choices');const second=buttons(i).find(c=>c.type===3);assert.equal(second.options.length,2);
  const all=[...first.options,...second.options];assert.equal(all.length,22);
  i=await click(f,0,i,'More choices');assert.equal(buttons(i).find(c=>c.type===3).options.length,2,'paging past end stays on final valid options');
  const sel=buttons(i).find(c=>c.type===3),selected=interaction(f,0,{customId:sel.custom_id,values:[sel.options[0].value],
    isChatInputCommand:()=>false,isStringSelectMenu:()=>true});await handleCommand(selected,{db:f.db,gm:{}});
  assert(buttons(selected).some(c=>c.label==='Review full terms'));
}));

test('UX13 native terms DM partial send is held across restart with exact chunk receipts, no public fallback',()=>nativeFixture(async f=>{
  enable(f);const t=pvpTerms(f.pcs);for(const s of t.stakes){s.best='B'.repeat(600);s.worst='W'.repeat(600);s.tie='T'.repeat(600);}
  const p=proposal(f,t);let sends=0,publicSends=0;const guild={id:f.guild,members:{fetch:async user=>({send:async()=>{
    if(user===f.pcs[0].owner_user_id&&++sends===2)throw Error('DM disabled mid-send');return {id:`dm-${user}-${sends}`,channelId:`dm-${user}`};}})}};
  const deliver=()=>publishPvpNotices(f.db,f.guild,p.record_key,(userId,content,sessionId,characterId,meta)=>
    sendPlayerPrivate({db:f.db,guild,userId,content,sessionId,characterId,...meta}),async()=>{publicSends++;assert.fail('no public fallback');});
  await assert.rejects(deliver,/reviewed delivery recovery/);assert.equal(sends,2);assert.equal(publicSends,0);
  const notice=f.db.listCityRecords(f.guild,{kind:'pvp_status_publication',includeGM:true}).find(r=>r.subject_key===f.pcs[0].id);
  const parts=f.db.listTurnPublications(f.guild,notice.data.turn_id);assert.equal(parts[0].status,'delivered');assert.equal(parts[1].status,'uncertain');
  f.restart();await assert.rejects(deliver,/reviewed delivery recovery/);assert.equal(sends,2);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'pvp_consent',includeGM:true}).length,0);
}));

test('UX14 private final send accepts real prototype getters but rechecks owner after native work',()=>nativeFixture(async f=>{
  enable(f);const p=proposal(f);const i=await open(f,0,p.record_key);
  const j=interaction(f,0,{customId:control(i,'Review full terms'),isChatInputCommand:()=>false,isButton:()=>true});
  delete j.guildId;delete j.user;Object.setPrototypeOf(j,{get guildId(){return f.guild;},get user(){return {id:f.pcs[0].owner_user_id};}});
  await handleCommand(j,{db:f.db,gm:{}});assert(buttons(j).some(b=>b.label==='Accept EXACT terms'));
}));

test('UX14 expiry and scene change are checked before native choice; failed modal has no consent or effects',()=>nativeFixture(async f=>{
  enable(f);const p=proposal(f),i=await open(f,0,p.record_key),clock=Date.now;
  Date.now=()=>clock()+16*60*1000;
  try{const expired=await click(f,0,i,'Review full terms');assert.match(expired.replies[0].content,/not applied/);}finally{Date.now=clock;}
  const live=await open(f,0,p.record_key);
  await assert.rejects(()=>click(f,0,live,'Counteroffer my stakes',{showModal:async()=>{throw Error('lost modal');}}),/uncertain/);
  assert.equal(f.db.getCityRecord(f.guild,'pvp_proposal',p.record_key).data.approvals.length,0);
  const next=await open(f,0,p.record_key);f.db.resetDirectorRound(f.session.id,{advanceScene:true});
  const stale=await click(f,0,next,'Review full terms');assert.match(stale.replies[0].content,/not applied/);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'pvp_round_receipt',includeGM:true}).length,0);
}));

test('UX01/UX12 inbox offers own accepted PC attempts without copy/paste and never silently cuts off at 100 records',()=>nativeFixture(async f=>{
  enable(f);const first=f.accepted();for(let n=0;n<100;n++)f.accepted(0,`I try a feint ${n}.`,f.pcs[1].id);
  f.accepted(1,'I privately try my own feint.',f.pcs[0].id);
  let i=await open(f,0,null),found=0;
  for(let page=0;page<6;page++){
    const select=buttons(i).find(c=>c.type===3);assert(select,'own sourced PC attempts must be available from the private inbox');
    found+=select.options.length;
    if(page<5)i=await click(f,0,i,'More choices');
    else{
      assert.equal(select.options.length,1);const selected=interaction(f,0,{customId:select.custom_id,values:[select.options[0].value],
        isChatInputCommand:()=>false,isStringSelectMenu:()=>true});await handleCommand(selected,{db:f.db,gm:{}});
      assert(selected.replies.at(-1).content.includes(first.record_key));assert(buttons(selected).some(c=>c.label==='Propose narrative stakes'));
    }
  }
  assert.equal(found,101,'all and only current own accepted PC attempts are offered');
  assert.equal(f.db.listCityRecords(f.guild,{kind:'pvp_consent',includeGM:true}).length,0);
}));

test('UX16 legacy damage JSON revise/respond reports the actual saved native reference and exact terms',()=>nativeFixture(async f=>{
  enable(f);const a=f.accepted(0,'I attempt to strike Choso.',f.pcs[1].id,{operation:'attack'});
  let i=await open(f,0,a.record_key);i=await click(f,0,i,'Propose lethal-risk duel');
  await submit(f,0,i,{objective:'Voluntary test',best:'Own best',worst:'Own risk'});
  const p=f.db.listCityRecords(f.guild,{kind:'pvp_encounter_contract',includeGM:true})[0],t=structuredClone(p.data.snapshot.terms);t.objective='Revised voluntary test';
  const call=async(actor,op,data)=>{const j=interaction(f,actor,{options:{getSubcommand:()=> 'pvp',getString:()=>JSON.stringify({op,...data})}});
    await handleCommand(j,{db:f.db,gm:{}});assert(j.replies.some(r=>r.content.includes('Revision')),'native fallback must report saved terms, not a post-commit error');return j;};
  await call(0,'damage-revise',{contract:p.record_key,expected_revision:p.data.terms_hash,terms:t});
  const next=f.db.getCityRecord(f.guild,'pvp_encounter_contract',p.record_key);
  assert.notEqual(next.data.terms_hash,p.data.terms_hash);
  await call(0,'damage-respond',{contract:p.record_key,expected_revision:next.data.terms_hash,decision:'accept'});
  assert.equal(f.db.listCityRecords(f.guild,{kind:'pvp_damage_consent',includeGM:true}).length,1);
}));

test('UX14 mechanical references from a prior scene are not offered as current private choices',()=>nativeFixture(async f=>{
  enable(f);const x=await nativeDamage(f);f.db.resetDirectorRound(f.session.id,{advanceScene:true});
  const i=interaction(f,1,{ref:x.offer.record_key});await handleCommand(i,{db:f.db,gm:{}});
  assert(!i.replies.some(r=>r.components?.length),'prior-scene mechanics must not open an apparently current menu');
  const inbox=await open(f,1,null);assert(!buttons(inbox).some(c=>c.type===3),'stale native requests should not crowd current private choices');
  assert.equal(f.db.listCityRecords(f.guild,{kind:'pc_effect_receipt',includeGM:true}).length,0);
}));

test('UX02/UX07 team-contract Review displays all signed teams as well as legal target edges',()=>nativeFixture(async f=>{
  enable(f);const x=await attackFixture(f,{count:4,configureTerms:t=>{
    t.interaction_scope='teams';t.participants.forEach((p,n)=>{p.team=n%2?'Blue':'Red';});
    t.target_permissions=t.target_permissions.filter(e=>t.participants.find(p=>p.character===e.actor).team!==t.participants.find(p=>p.character===e.target).team);
  }});
  let i=await open(f,0,x.contract.record_key);i=await click(f,0,i,'Review full terms');
  const text=i.replies.at(-1).files[0].attachment.toString();assert.match(text,/Jaxon: team Red/);assert.match(text,/Choso: team Blue/);
  assert.match(text,/Billy: team Red/);assert.match(text,/Tyrell: team Blue/);assert(text.includes('Jaxon → Choso'));assert(!text.includes('Jaxon → Billy'));
  assert.equal(f.db.listCityRecords(f.guild,{kind:'pvp_attack_roll_receipt',includeGM:true}).length,0);
}));
