/** V9-PVP-B: real native paired dice, sealed owners, higher totals, strikes and non-damaging authorship. */
import assert from "node:assert/strict";
import test from "node:test";
import { nativeFixture, pvpTerms } from "./v9-fixtures.mjs";
import { proposePvp, reviewPvp, respondPvp, choosePvp, rollPvp, progressPvp, continuePvp,
  authorPvpNarrative, sharePvpNarrative, reviewPvpNarrative, pvpComplication } from "../src/narrative-pvp.js";
import { cityContext } from "../src/city-core.js";
import { ContextPlanner } from "../src/context-planner.js";
import { handleCommand } from "../src/commands.js";

function lock(f,overrides={}){
  const p=proposePvp(f.db,f.guild,f.pcs[0].owner_user_id,{accepted_intent:f.accepted().record_key,opponent:f.pcs[1].id,terms:pvpTerms(f.pcs,overrides)});
  for(const pc of f.pcs.slice(0,2)){reviewPvp(f.db,f.guild,pc.owner_user_id,p.record_key);
    respondPvp(f.db,f.guild,pc.owner_user_id,{proposal:p.record_key,expected_revision:p.data.terms_hash,decision:"accept",interaction_id:pc.id});}
  return p;
}
function input(f,p,i,extra={}){
  const view=progressPvp(f.db,f.guild,f.pcs[i].owner_user_id,p.record_key);
  return {proposal:p.record_key,expected_revision:p.data.terms_hash,round:view.round,expected_window_revision:view.window_revision,
    interaction_id:`${i}-${view.round}-${view.window_revision}`,...extra};
}
function choose(f,p,i,trait="Agility"){
  return choosePvp(f.db,f.guild,f.pcs[i].owner_user_id,input(f,p,i,{trait,attempt:`I attempt my own harmless feint ${i}.`}));
}
function roll(f,p,i,faces){let n=0;return rollPvp(f.db,f.guild,f.pcs[i].owner_user_id,input(f,p,i),{rng:()=>faces[n++]});}
function pair(f,p,a,b){choose(f,p,0);choose(f,p,1);roll(f,p,0,a);return roll(f,p,1,b);}
const untouched=f=>f.pcs.slice(0,2).map(p=>{const r=f.db.getCharacter(p.id).data.resources;return {hp:r.hp,armor:r.armor,stress:r.stress};});

for(const [name,a,b,winner] of [
  ["PVP13 higher final total",[9,7],[8,5],0],
  ["PVP14 lower Critical never trumps higher total",[2,2],[9,8],1],
  ["PVP15 two Criticals compare totals",[3,3],[7,7],1]
])test(name,()=>nativeFixture(f=>{
  const p=lock(f),before=untouched(f),r=pair(f,p,a,b);
  assert.equal(r.resolution.winner,f.pcs[winner].id);assert.deepEqual(untouched(f),before);
  const receipt=f.db.getCityRecord(f.guild,"pvp_resolution_receipt",r.resolution.receipt);
  assert.equal(receipt.data.roll_refs.length,2);
  for(const ref of receipt.data.roll_refs)assert.equal(f.db.getSavedRoll(f.guild,ref).roll_type,"narrative_pvp");
}));
test("PVP18 sealed declarations stay out of general GM retrieval and summarization inputs",()=>nativeFixture(f=>{
  const p=lock(f);choose(f,p,0);
  const civic=cityContext(f.db,f.guild,"feint");
  const planner=new ContextPlanner(f.db).plan(f.guild,{actorType:"gm",scope:"gm",query:"feint"});
  assert(!JSON.stringify(civic).includes("feint 0"));assert(!JSON.stringify(planner).includes("feint 0"));
}));
test("PVP25/PVP28 Fear scenery cannot grant damage, secrets, meter or player reaction",()=>nativeFixture(f=>{
  const p=lock(f);choose(f,p,0);choose(f,p,1);roll(f,p,0,[3,10]);
  const r=f.db.listCityRecords(f.guild,{kind:"pvp_round_receipt",includeGM:true,limit:10})[0];
  const op={proposal:p.record_key,round_receipt:r.record_key,kind:"lights_flicker"};
  assert.throws(()=>pvpComplication(f.db,f.guild,"gm",{...op,kind:"permanent_wound"},{gm:true}),/Fear|environment|harm/i);
  assert.throws(()=>pvpComplication(f.db,f.guild,"gm",{...op,secret:"hidden"},{gm:true}),/closed/i);
  const before=untouched(f);assert(pvpComplication(f.db,f.guild,"gm",op,{gm:true}).text.includes("No mechanical effect"));
  assert.deepEqual(untouched(f),before);
}));
test("PVP31 both authors review exact bounded public text; one approval never projects",()=>nativeFixture(f=>{
  const p=lock(f,{audience:"bilateral_author_projection"}),r=pair(f,p,[9,7],[3,2]);
  const n=authorPvpNarrative(f.db,f.guild,f.pcs[0].owner_user_id,{proposal:p.record_key,expected_revision:p.data.terms_hash,
    resolution:r.resolution.receipt,role:"success",subject_character:f.pcs[0].id,text:"I land my harmless tap.",interaction_id:"success"});
  const op={proposal:p.record_key,narrative:n.record_key,expected_revision:p.data.terms_hash};
  assert.throws(()=>reviewPvpNarrative(f.db,f.guild,f.pcs[1].owner_user_id,op),/author|private|invitation/i);
  reviewPvpNarrative(f.db,f.guild,f.pcs[0].owner_user_id,op);
  assert.equal(sharePvpNarrative(f.db,f.guild,f.pcs[0].owner_user_id,{...op,interaction_id:"share-own"}).status,"awaiting_bilateral_disclosure");
  assert.throws(()=>sharePvpNarrative(f.db,f.guild,f.pcs[1].owner_user_id,{...op,interaction_id:"unreviewed"}),/review/i);
  reviewPvpNarrative(f.db,f.guild,f.pcs[1].owner_user_id,op);
  const projected=sharePvpNarrative(f.db,f.guild,f.pcs[1].owner_user_id,{...op,interaction_id:"approve-projection"});
  assert.equal(projected.status,"approved");assert(projected.data.text.includes(n.data.text));
  assert(!projected.data.text.includes("Agility"));
  assert.equal(sharePvpNarrative(f.db,f.guild,f.pcs[1].owner_user_id,{...op,interaction_id:"approve-again"}).record_key,projected.record_key);
}));
test("PVP13 actual Discord private adapter chooses and rolls natively for both owners",()=>nativeFixture(async f=>{
  const p=lock(f),sent=[];
  async function command(i,op,extra={}){
    const pc=f.pcs[i],interaction={id:`discord-${i}-${op}`,guildId:f.guild,guild:{id:f.guild},user:{id:pc.owner_user_id,username:pc.name},
      isChatInputCommand:()=>true,commandName:"vc-roll",options:{getSubcommand:()=>"pvp",
        getString:()=>JSON.stringify({op,...input(f,p,i,extra)})},
      reply:async payload=>{sent.push(payload);return {id:"offline"};},followUp:async payload=>{sent.push(payload);return {id:"offline"};}};
    await handleCommand(interaction,{db:f.db,gm:{}});
  }
  await command(0,"choose",{trait:"Agility",attempt:"I try my own feint."});await command(1,"choose",{trait:"Finesse",attempt:"I try my own sidestep."});
  await command(0,"roll");await command(1,"roll");
  assert.equal(f.db.listCityRecords(f.guild,{kind:"pvp_round_receipt",includeGM:true,limit:10}).length,2);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"pvp_resolution_receipt",includeGM:true,limit:10}).length,1);
  assert(sent.every(x=>x.ephemeral&&x.content.length<=2000));
}));
test("PVP16/PVP21 tied duel has no winner and no implicit reroll",()=>nativeFixture(f=>{
  const p=lock(f),r=pair(f,p,[7,4],[6,5]);assert.equal(r.resolution.outcome,"stalemate");assert.equal(r.resolution.winner,null);
  assert.throws(()=>roll(f,p,0,[12,12]),/terminal|closed|resolved|stalemate/i);
}));
test("PVP16 mutual reroll needs two fresh affirmative choices, never one",()=>nativeFixture(f=>{
  const p=lock(f,{tie_policy:"mutual_reroll"}),r=pair(f,p,[7,4],[6,5]);assert.equal(r.status,"awaiting_continuation");
  continuePvp(f.db,f.guild,f.pcs[0].owner_user_id,input(f,p,0));
  assert.throws(()=>choose(f,p,0),/continuation|both|waiting/i);
  continuePvp(f.db,f.guild,f.pcs[1].owner_user_id,input(f,p,1));
  assert.equal(progressPvp(f.db,f.guild,f.pcs[0].owner_user_id,p.record_key).round,2);
  assert.equal(pair(f,p,[12,8],[3,2]).resolution.winner,f.pcs[0].id);
}));
test("PVP17/PVP18/PVP19/PVP22/PVP24 sealed choices, native restart/replay and no missing-player dice",()=>nativeFixture(f=>{
  const p=lock(f);choose(f,p,0);
  assert.throws(()=>roll(f,p,0,[9,7]),/both|sealed|choice/i);
  assert.throws(()=>choose(f,p,1,"Knowledge"),/trait|allowed/i);
  const other=progressPvp(f.db,f.guild,f.pcs[1].owner_user_id,p.record_key);
  assert(!JSON.stringify(other).includes("feint 0"));choose(f,p,1);
  const own=roll(f,p,0,[9,7]);f.restart();
  const opponent=progressPvp(f.db,f.guild,f.pcs[1].owner_user_id,p.record_key);
  assert(!JSON.stringify(opponent).includes(own.own.roll_id));assert.equal(opponent.status,"locked");
  const repeated=roll(f,p,0,[12,12]);assert.equal(repeated.own.roll_id,own.own.roll_id);
  assert.equal(roll(f,p,1,[4,3]).resolution.winner,f.pcs[0].id);
  assert.throws(()=>progressPvp(f.db,f.guild,f.pcs[2].owner_user_id,p.record_key),/owner|participant/i);
}));
test("PVP20/PVP21/PVP23 three strikes persists 3-2 with a tied exchange and no duplicate scoring",()=>nativeFixture(f=>{
  const p=lock(f,{mode:"three_strikes"});const before=untouched(f);
  const pairs=[[[9,3],[3,2]],[[3,2],[9,3]],[[7,4],[6,5]],[[9,3],[3,2]],[[3,2],[9,3]],[[9,3],[3,2]]];
  let r;
  for(let n=0;n<pairs.length;n++){
    r=pair(f,p,...pairs[n]);
    if(n===2)assert.deepEqual(r.scores,{[f.pcs[0].id]:1,[f.pcs[1].id]:1});
    if(n<pairs.length-1){assert(!r.resolution);f.restart();
      continuePvp(f.db,f.guild,f.pcs[0].owner_user_id,input(f,p,0));continuePvp(f.db,f.guild,f.pcs[1].owner_user_id,input(f,p,1));}
  }
  assert.equal(r.resolution.winner,f.pcs[0].id);assert.deepEqual(r.scores,{[f.pcs[0].id]:3,[f.pcs[1].id]:2});
  assert.equal(f.db.listCityRecords(f.guild,{kind:"pvp_strike_receipt",includeGM:true,limit:100}).length,6);
  assert.deepEqual(untouched(f),before);
}));
for(const policy of ["roller","opponent","flavor_only"])test(`PVP26/PVP27/PVP28 Hope policy ${policy} is cap-safe and once only`,()=>nativeFixture(f=>{
  const p=lock(f,{hope_policy:policy});f.db.updateCharacterData(f.pcs[1].id,d=>{d.resources.hope=6;});
  choose(f,p,0);choose(f,p,1);const once=roll(f,p,0,[10,3]);
  const after=f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources.hope);
  assert.equal(after[0],policy==="roller"?3:2);assert.equal(after[1],6);
  assert.equal(roll(f,p,0,[12,1]).own.roll_id,once.own.roll_id);
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources.hope),after);
}));
test("PVP10/PVP24 withdrawal after one sealed roll never forfeits or fabricates a second roll",()=>nativeFixture(f=>{
  const p=lock(f);choose(f,p,0);choose(f,p,1);roll(f,p,0,[5,9]);
  respondPvp(f.db,f.guild,f.pcs[1].owner_user_id,{proposal:p.record_key,expected_revision:p.data.terms_hash,decision:"withdraw",interaction_id:"stop"});
  const v=progressPvp(f.db,f.guild,f.pcs[0].owner_user_id,p.record_key);
  assert.equal(v.resolution.winner,null);assert.equal(v.resolution.outcome,"withdrawn");
  assert.throws(()=>roll(f,p,1,[12,1]),/terminal|withdrawn|closed/i);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"pvp_round_receipt",includeGM:true,limit:10}).length,1);
}));
test("PVP30/PVP31 only actual author owns success/reaction and private-by-default projection",()=>nativeFixture(f=>{
  const p=lock(f),r=pair(f,p,[9,7],[3,2]);
  const base={proposal:p.record_key,expected_revision:p.data.terms_hash,resolution:r.resolution.receipt,role:"success",
    subject_character:f.pcs[0].id,text:"I land my own harmless tap.",interaction_id:"own-success"};
  assert.throws(()=>authorPvpNarrative(f.db,f.guild,f.pcs[0].owner_user_id,{...base,subject_character:f.pcs[1].id,text:"Choso apologizes."}),/own|subject|reaction/i);
  assert.throws(()=>authorPvpNarrative(f.db,f.guild,f.pcs[1].owner_user_id,base),/own|winner|subject/i);
  assert.throws(()=>authorPvpNarrative(f.db,f.guild,f.pcs[0].owner_user_id,{...base,text:"Choso apologizes for losing."}),/reaction|own|boundary/i);
  const own=authorPvpNarrative(f.db,f.guild,f.pcs[0].owner_user_id,base);
  assert.throws(()=>sharePvpNarrative(f.db,f.guild,f.pcs[0].owner_user_id,{proposal:p.record_key,narrative:own.record_key,
    expected_revision:p.data.terms_hash,interaction_id:"share"}),/private|audience/i);
  const withheld=authorPvpNarrative(f.db,f.guild,f.pcs[1].owner_user_id,{...base,role:"withhold",subject_character:f.pcs[1].id,text:"",interaction_id:"no-reaction"});
  assert.equal(withheld.status,"withheld");assert(!f.db.listCityRecords(f.guild,{kind:"pvp_public_projection",includeGM:true,limit:10}).length);
}));
