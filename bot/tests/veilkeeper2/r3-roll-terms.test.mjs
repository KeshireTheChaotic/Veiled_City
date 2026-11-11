import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRollTermsReader} from '../../src/v2/rules/roll-terms.js';
import {createOrdinaryRollPreparation} from '../../src/v2/rules/ordinary-roll-preparation.js';
import {createOwnerRollEvidence} from '../../src/v2/rules/owner-roll-evidence.js';
import {openRollStore} from '../../src/v2/rules/roll-store.js';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function fixture(t,{trait=2,modifiers=[],mandatory=[]}={}){
 const rolls=openRollStore();t.after(()=>rolls.close());let valid=true;
 const source={id:'source',revision:'1',campaign:'c',scene:'s',principal:'u',actors:['pc'],recipients:['u']},actor={actorId:'pc',ownerUserId:'u',controlRevision:'1',status:'active',data:{traits:{Agility:trait},gm_private:'modifier-private-canary'}},a={id:'adjudication',revision:'1',status:'accepted',sourceRef:'source',sourceRevision:'1',actorId:'pc',campaignId:'c',sceneId:'s',difficulty:14,stakes:'The guard hears the attempt.',trait:'Agility',modifierRefs:modifiers.map(m=>m.id)},authority={revalidate:()=>valid},rows=new Map(modifiers.map(m=>[m.id,{...m,evidenceHash:hash(m)}]));
 const termReader=createRollTermsReader({readActorSnapshot:()=>structuredClone(actor),readMandatoryRefs:()=>[...mandatory],inspectModifier:(_s,_a,ref)=>structuredClone(rows.get(ref))}),preparation=createOrdinaryRollPreparation({sourceAuthority:authority,readAdjudication:()=>structuredClone(a),readActor:()=>({id:'pc',kind:'pc',campaignId:'c',sceneId:'s',status:'active',ownerUserId:'u',controllerUserId:'u',controlRole:'owner',controlRevision:actor.controlRevision}),rollStore:rolls,termReader});
 const inspector=createOwnerRollEvidence({sourceAuthority:authority,readActor:()=>({id:'pc',kind:'pc',campaignId:'c',sceneId:'s',status:'active',ownerUserId:'u',controllerUserId:'u',controlRole:'owner',controlRevision:actor.controlRevision}),readRequest:rolls.readRequest,readRoll:rolls.readRoll,readDelivery:rolls.readDelivery,termReader,readAdjudication:()=>structuredClone(a)});
 const prepare=()=>preparation.commitRequest(source,'pc',{adjudication_ref:a.id});
 function roll({hope=8,fear=4,advDice=[],rollId='dice'}={}){const q=prepare();rolls.acknowledgeDelivery('c',q.id,{messageId:'notice',recipientIds:['u'],termHash:q.termProof.hash,odds:{modifier:q.modifier,experience:q.experience,advantage:q.advantage,disadvantage:q.disadvantage}},{check:()=>{}});rolls.recordOwnerRoll('c',q.id,{id:rollId,ownerUserId:'u',hope,fear,advDice},{check:()=>{}});return {q,result:inspector.inspect(source,{requestRef:q.id,rollRef:rollId})};}
 return {source,actor,a,rows,mandatory,rolls,termReader,inspector,prepare,roll,revoke(){valid=false;}};
}
const modifier=(id,kind,amount)=>({id,kind,amount,revision:'1',stackKey:id});
test('native sheet trait and source-qualified bonuses drive exact persisted ordinary roll math',t=>{
 const f=fixture(t,{modifiers:[modifier('ruling','flat',1),modifier('experience','experience',2)]}),{q,result}=f.roll();assert.equal(q.modifier,3);assert.equal(q.experience,2);assert.equal(result.total,17);assert.equal(result.success,true);assert.equal(result.effectsCommitted,false);assert.equal(result.duality,'Hope');assert.equal(result.id,'dice');assert.equal(JSON.stringify(q).includes('modifier-private-canary'),false);assert.equal(q.termProof.trait.value,2);
});
test('net advantage and disadvantage use exactly the recorded native d6 with standard cancellation',t=>{
 for(const [mods,die,total] of [[[modifier('adv','advantage',1)],[5],19],[[modifier('dis','disadvantage',1)],[5],9],[[modifier('adv','advantage',1),modifier('dis','disadvantage',1)],[],14]]){const f=fixture(t,{modifiers:mods}),{result}=f.roll({advDice:die});assert.equal(result.total,total);assert.deepEqual(result.adv_dice,die);}
});
test('Critical remains a success regardless of Difficulty and negative sheet traits are preserved',t=>{
 const f=fixture(t,{trait:-2});f.a.difficulty=100;const {result}=f.roll({hope:3,fear:3});assert.equal(result.duality,'Critical');assert.equal(result.total,4);assert.equal(result.success,true);assert.equal(result.effectsCommitted,false);
});
test('missing, noninteger or ambiguous traits and scalar adjudication patches cannot prepare a roll',t=>{
 for(const change of [f=>delete f.actor.data.traits.Agility,f=>f.actor.data.traits.Agility=2.5,f=>f.actor.data.traits.agility=2,f=>f.a.modifier=99,f=>f.a.trait='Unknown',f=>f.a.helperRefs=['unimplemented-helper']]){const f=fixture(t);change(f);assert.throws(f.prepare);}
});
test('mandatory condition references cannot be omitted and invalid modifier evidence cannot set odds',t=>{
 const f=fixture(t,{mandatory:['condition']});assert.throws(f.prepare,/modifier references/);
 for(const change of [r=>r.amount=0,r=>r.kind='patch',r=>r.evidenceHash='fake',r=>r.revision='',r=>r.extra=true]){const g=fixture(t,{modifiers:[modifier('condition','disadvantage',1)],mandatory:['condition']});change(g.rows.get('condition'));assert.throws(g.prepare,/source-qualified/);}
});
test('distinct owner-validated Experiences stack while source aliases cannot apply the same effect twice',t=>{
 const f=fixture(t,{modifiers:[modifier('one','experience',2),modifier('two','experience',3)]});assert.equal(f.roll().result.total,19);const alias=fixture(t,{modifiers:[modifier('one','experience',2),{...modifier('two','experience',2),stackKey:'one'}]});assert.throws(alias.prepare,/Duplicate canonical/);const g=fixture(t);const values=g.termReader.inspect(g.source,g.a);assert.equal(values.experience,0);assert.equal(g.rolls.readResultForRequest('c','none'),null);
});
test('missing or additional contextual dice are rejected before storing owner roll evidence',t=>{
 const f=fixture(t,{modifiers:[modifier('adv','advantage',1)]}),q=f.prepare();f.rolls.acknowledgeDelivery('c',q.id,{messageId:'notice',recipientIds:['u'],termHash:q.termProof.hash,odds:{modifier:q.modifier,experience:q.experience,advantage:q.advantage,disadvantage:q.disadvantage}},{check:()=>{}});
 for(const dice of [[],[0],[7],[2,3]])assert.throws(()=>f.rolls.recordOwnerRoll('c',q.id,{id:'dice',ownerUserId:'u',hope:8,fear:4,advDice:dice},{check:()=>{}}),/contextual d6/);assert.equal(f.rolls.readResultForRequest('c',q.id),null);
});
test('changed traits, modifier evidence or source cannot reinterpret prepared dice as current evidence',t=>{
 for(const change of [f=>f.actor.data.traits.Agility=3,f=>f.rows.get('adv').evidenceHash='0'.repeat(64),f=>f.a.sourceRef='other',f=>f.a.difficulty=20,f=>f.a.revision='2',f=>f.revoke()]){const f=fixture(t,{modifiers:[modifier('adv','advantage',1)]}),{q}=f.roll({advDice:[2]});change(f);assert.throws(()=>f.inspector.inspect(f.source,{requestRef:q.id,rollRef:'dice'}));assert.equal(f.rolls.readResultForRequest('c',q.id).hope,8);}
});
test('nonzero scalar terms without immutable native proof cannot enter the roll store',t=>{
 const f=fixture(t),q=f.prepare(),{termProof,...plain}=q;assert.throws(()=>f.rolls.createRequest({...plain,id:'forged',modifier:99},{check:()=>{}}),/Ordinary native roll terms/);assert.throws(()=>f.rolls.createRequest({...q,id:'forged',termProof:{...q.termProof,hash:'0'.repeat(64)}},{check:()=>{}}),/Immutable/);
});


test('qualified roll notices must acknowledge exact bonuses and condition odds before any owner dice',t=>{
 const f=fixture(t,{modifiers:[modifier('condition','disadvantage',1)],mandatory:['condition']}),q=f.prepare();
 for(const input of [{messageId:'notice',recipientIds:['u']},{messageId:'notice',recipientIds:['u'],termHash:q.termProof.hash,odds:{modifier:2,experience:0,advantage:0,disadvantage:0}}])assert.throws(()=>f.rolls.acknowledgeDelivery('c',q.id,input,{check:()=>{}}),/delivered native roll odds/);
 assert.equal(f.rolls.readDelivery('c',q.noticeRef),null);assert.throws(()=>f.rolls.recordOwnerRoll('c',q.id,{id:'dice',ownerUserId:'u',hope:8,fear:4,advDice:[2]},{check:()=>{}}),/Delivered request/);
});


test('all Duality faces preserve fixed native arithmetic, criticals and contextual cancellation across 2016 vectors',t=>{
 let vectors=0;
 for(const mode of ['plain','advantage','disadvantage','cancelled']){
  const mods=[modifier('flat','flat',-1),modifier('experience','experience',2),...(['advantage','cancelled'].includes(mode)?[modifier('adv','advantage',1)]:[]),...(['disadvantage','cancelled'].includes(mode)?[modifier('dis','disadvantage',1)]:[])],f=fixture(t,{modifiers:mods});
  for(let hope=1;hope<=12;hope++)for(let fear=1;fear<=12;fear++)for(const die of ['plain','cancelled'].includes(mode)?[null]:[1,2,3,4,5,6]){
   f.a.id='vector-'+(++vectors);const {result}=f.roll({hope,fear,advDice:die===null?[]:[die],rollId:'dice-'+vectors}),total=hope+fear+3+(mode==='advantage'?die:mode==='disadvantage'?-die:0);
   assert.equal(result.total,total);assert.equal(result.duality,hope===fear?'Critical':hope>fear?'Hope':'Fear');assert.equal(result.success,hope===fear||total>=14);assert.equal(result.effectsCommitted,false);
  }
 }
 assert.equal(vectors,2016);
});
