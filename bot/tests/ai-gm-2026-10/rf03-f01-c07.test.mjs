import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {createRollCollaborationRules,createRollOptionRules} from '../../src/frameworks/daggerheart/public.js';

const revision=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
function setup(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'rf03-participation-')),file=path.join(root,'requests.sqlite');let conn;
  function open(){conn=new DatabaseSync(file);conn.exec('CREATE TABLE IF NOT EXISTS objects(category TEXT,id TEXT,json TEXT,PRIMARY KEY(category,id));');}
  open();t.after(()=>{conn.close();fs.rmSync(root,{recursive:true,force:true});});
  const put=(category,id,v)=>{conn.prepare('INSERT OR REPLACE INTO objects VALUES(?,?,?)').run(category,id,JSON.stringify(v));return v;};
  const read=(category,id)=>{const v=conn.prepare('SELECT json FROM objects WHERE category=? AND id=?').get(category,id);return v?JSON.parse(v.json):null;};
  const all=category=>conn.prepare('SELECT json FROM objects WHERE category=?').all(category).map(r=>JSON.parse(r.json));
  const calls=[],state={blocked:false,reserveFailure:false,scene:'scene:station',accessible:true};
  for(const [id,user] of [['a','u-a'],['b','u-b']])put('pc',id,{id,guild_id:'g',owner_user_id:user,name:id,status:'active',
    data:{traits:{Instinct:2},resources:{hope:5,stress:{current:2,max:6}},experiences:[{name:'Watchkeeper',modifier:2,applies_to:{traits:['Instinct']}}],inventory:[]}});
  put('meta','fear',0);
  const base={trait:'Instinct',trait_bonus:2,modifiers:[],subtotal:2,advantage:0,disadvantage:0,difficulty:12,attack:null,unresolved:[]};
  const saveRequest=(id,character='a',kind='action')=>put('roll_request',id,{kind:'roll_request',record_key:id,status:'pending',visibility:'character',subject_key:character,source_event:`source:${character}`,
    data:{session_id:'session',scene:'scene:station',owner_user_id:`u-${character}`,character_id:character,character_name:character,kind,
      input:{trait:'Instinct',kind},breakdown:structuredClone(base),revision:1,history:[],attempt:'I check the platform.'}});
  saveRequest('q');
  for(const id of ['a','b'])put('event',`source:${id}`,{event_key:`source:${id}`,status:'active',kind:'player_declaration',details:{author:`u-${id}`,private_scene:false}});
  const db={getCharacter:id=>read('pc',id),updateCharacterData:(id,fn)=>{const pc=read('pc',id);fn(pc.data);return put('pc',id,pc);},
    getCityRecord:(_g,kind,id)=>read(kind,id),saveCityRecord:(_g,v)=>{const row={...v,record_key:v.key};delete row.key;return put(v.kind,v.key,row);},
    listCityRecords:(_g,{kind,offset=0,limit=100})=>all(kind).slice(offset,offset+limit),
    getWorldEvent:(_g,id)=>read('event',id),listWorldEvents:()=>all('event'),ownerAuthoredSource:(_g,id,user)=>read('event',id)?.details.author===user,
    getCityCalendar:()=>({flags:{roll_collaboration:true,roll_requests:true}}),getActiveSession:()=>({id:'session'}),getRulesRuling:()=>({id:'review'}),
    getCurrentEncounter:()=>null,recordSpotlight:()=>{throw new Error('unexpected spotlight');},
    addRoll:(_g,session,user,character,type,payload)=>{const id=`saved:${all('roll').length+1}`;put('roll',id,{id,session_id:session,user_id:user,character_id:character,roll_type:type,payload});return id;},
    getSavedRoll:(_g,id)=>read('roll',id),savedRollsForResult:(_g,id)=>all('roll').filter(r=>r.payload.id===id),
    changeFear:(_g,amount)=>put('meta','fear',read('meta','fear')+amount),playerInitiatedTagTeam:()=>false,
    transaction:fn=>{conn.exec('BEGIN IMMEDIATE');try{const result=fn();assert.equal(typeof result?.then,'undefined');conn.exec('COMMIT');return result;}
      catch(error){conn.exec('ROLLBACK');throw error;}}
  };
  const sources={personalCharacter:(_db,g,user,id)=>{const pc=id?db.getCharacter(id):all('pc').find(p=>p.owner_user_id===user);
      if(g!=='g'||!pc||pc.owner_user_id!==user)throw new Error('owner changed');return pc;},
    currentScene:()=>({key:state.scene}),sceneAccess:()=>state.accessible,
    requireCitySource:(_db,_g,id)=>{const event=read('event',id);if(event?.status!=='active')throw new Error('source revoked');return event;},
    cityAudit:(_db,_g,op,id)=>put('audit',`${op}:${id}`,{op,id}),cityKey:v=>v,cityObject:v=>v,
    indexWorldEvent:(_db,_g,v)=>put('event',v.key,{...v,event_key:v.key,status:'active'}),
    validateRollSharePreview:()=>{throw new Error('unused preview');},sourceConfirmedRollAttempt:()=> 'I check the platform.'};
  const outcomes={recordObservedAttack:()=>{},finalizeTypedRollAction:()=>{throw new Error('unbound typed source');},resumePendingGmActions:()=>calls.push('resume'),
    reserveRollAmendment:(_db,_g,row)=>{put('notice',row.record_key,{revision:row.data.revision});if(state.reserveFailure)throw new Error('reserve failed');},
    reserveRollPartyDisclosure:()=>{}};
  const unexpected=()=>{throw new Error('unexpected dependent native path');};
  const mechanics={rollRevision:revision,rollBreakdown:()=>structuredClone(base),rollTraitBreakdown:()=>structuredClone(base),assertNonPvpCombatant:unexpected,
    validatePvpAttackRoll:unexpected,validatePvpDamageRoll:unexpected,validatePcDeathOutcome:unexpected,blazeActionAuthorization:()=>false,
    blazeCriticalResult:()=>null,completeBlazeAction:unexpected,validateBlazeSavedRoll:unexpected,assertPcCanAct:()=>{},hopeCap:()=>6,
    consentAction:unexpected,historicalActionSource:unexpected,assertGmRulingRequest:unexpected,assertGmInvitationRequest:unexpected,
    nativeAdversaryDamageDefense:unexpected,reconcileNativeFormationBreakdown:(_db,_g,_row,b)=>b,
    validateNativeExperienceEligibility:(_db,_g,_row,_pc,ref)=>{if(ref==='experience-proof')return {binding:{experience:{name:'Watchkeeper'}}};throw Object.assign(new Error('not native'),{code:'NATIVE_EXPERIENCE_ELIGIBILITY'});},
    inspectNativeUnarmedAttack:unexpected,assertPreRollFearRollAllowed:()=>{calls.push('pre-roll');if(state.blocked)throw new Error('Fear announcement pending');},
    inspectNativeRollParticipation:unexpected,typedRollProof:unexpected};
  const rules=createRollCollaborationRules({sources,outcomes,mechanics});
  const optionRules=createRollOptionRules({requests:{ownedRollRequest:(_db,_g,user,key)=>{const row=read('roll_request',key),pc=all('pc').find(p=>p.owner_user_id===user);
    if(!pc||!row)throw new Error('no owned request');return row;}},mechanics:{recordNativeExperienceEligibility:()=>calls.push('eligibility'),inspectNativeExperienceEligibility:()=>null,inspectNativeUnarmedAttack:unexpected}});
  function input(op,extra={},request='q'){return {op,request,key:`operation:${op}`,expected_revision:revision(read('roll_request',request)),...extra};}
  function participation(id,character,kind,request='q'){
    return put('event',id,{event_key:id,status:'active',kind:'roll_adjudication',source_kind:'gm',session_id:'session',scene:'scene:station',visibility:'character',subject_key:character,
      details:{human_reviewed:true,roll_participation:{request,character_id:character,kind,description:'I assist from the platform.'}}});
  }
  return {db,rules,optionRules,read,put,all,input,participation,saveRequest,state,calls,base,reopen:()=>{conn.close();open();}};
}

test('actual rolling owner controls native dice and committed operation replays after reopen',t=>{
  const f=setup(t);let draws=0;const dice=[9,3],operation=f.input('roll');
  const result=f.rules.contributeRoll(f.db,'g','u-a',operation,{rng:()=>{draws++;return dice.shift();}});
  assert.equal(result.status,'resolved');assert.equal(result.data.result.duality,'Hope');assert.equal(result.data.result.total,14);
  assert.equal(f.db.getCharacter('a').data.resources.hope,6);assert.equal(f.all('roll').length,1);assert.equal(draws,2);
  assert.equal(f.all('roll_operation')[0].data.resource_deltas[0].hope.delta,1);f.reopen();
  assert.deepEqual(f.rules.contributeRoll(f.db,'g','u-a',operation,{rng:()=>{throw new Error('reroll forbidden');}}),result);
  assert.equal(f.all('roll').length,1);assert.equal(f.all('roll_operation').length,1);
});

test('pre-roll Fear hold precedes dice and all state changes',t=>{
  const f=setup(t);f.state.blocked=true;let draws=0;
  assert.throws(()=>f.rules.contributeRoll(f.db,'g','u-a',f.input('roll'),{rng:()=>{draws++;return 5;}}),/Fear announcement/);
  assert.equal(draws,0);assert.equal(f.read('roll_request','q').status,'pending');assert.equal(f.all('roll').length,0);assert.equal(f.db.getCharacter('a').data.resources.hope,5);
});

test('failed reservation rolls back native dice, resources, amendments and operation receipts',t=>{
  const f=setup(t);f.state.reserveFailure=true;const faces=[7,7];
  assert.throws(()=>f.rules.contributeRoll(f.db,'g','u-a',f.input('roll'),{rng:()=>faces.shift()}),/reserve failed/);
  assert.equal(f.all('roll').length,0);assert.equal(f.all('roll_operation').length,0);assert.equal(f.all('notice').length,0);
  assert.equal(f.read('roll_request','q').status,'pending');assert.deepEqual(f.db.getCharacter('a').data.resources,{hope:5,stress:{current:2,max:6}});
});

test('a different owner or changed revision/source/scene cannot roll another PC',t=>{
  const f=setup(t);const options={rng:()=>{throw new Error('unauthorized RNG');}};
  assert.throws(()=>f.rules.contributeRoll(f.db,'g','u-b',f.input('roll'),options),/actual rolling participant/);
  assert.throws(()=>f.rules.contributeRoll(f.db,'g','u-a',f.input('roll',{expected_revision:'stale'}),options),/Request changed/);
  f.state.scene='scene:other';assert.throws(()=>f.rules.contributeRoll(f.db,'g','u-a',f.input('roll'),options),/another session or scene/);f.state.scene='scene:station';
  f.put('event','source:a',{...f.read('event','source:a'),status:'retracted'});
  assert.throws(()=>f.rules.contributeRoll(f.db,'g','u-a',f.input('roll'),options),/source revoked/);assert.equal(f.all('roll').length,0);
});

test('Experience needs explicit Hope authorization, charges once, and persists exact optional choice',t=>{
  const f=setup(t),details={proof:'experience-proof',experience:'Watchkeeper'};
  assert.throws(()=>f.rules.contributeRoll(f.db,'g','u-a',f.input('experience',details)),/explicit 1 Hope/);
  const operation=f.input('experience',{...details,pay_hope:true}),result=f.rules.contributeRoll(f.db,'g','u-a',operation);
  assert.equal(f.db.getCharacter('a').data.resources.hope,4);assert.equal(result.data.experiences[0].bonus,2);
  f.rules.contributeRoll(f.db,'g','u-a',operation);assert.equal(f.db.getCharacter('a').data.resources.hope,4);
  assert.equal(f.all('roll').length,0);assert.equal(f.all('roll_operation')[0].data.authorization.pay_hope,true);
});

test('Help uses a distinct owner and exact feasibility, charges one Hope and retains one real d6',t=>{
  const f=setup(t);f.participation('help-proof','b','help');let rolls=0;
  const operation=f.input('help',{proof:'help-proof',description:'I assist from the platform.',pay_hope:true});
  const result=f.rules.contributeRoll(f.db,'g','u-b',operation,{rng:sides=>{assert.equal(sides,6);rolls++;return 4;}});
  assert.equal(result.data.helpers[0].die,4);assert.equal(f.db.getCharacter('b').data.resources.hope,4);
  f.rules.contributeRoll(f.db,'g','u-b',operation,{rng:()=>{throw new Error('duplicate helper die');}});assert.equal(rolls,1);
  assert.equal(f.db.getCharacter('a').data.resources.hope,5);
});

test('Tag Team waits for the other owner before charging the initiator and replay never charges twice',t=>{
  const f=setup(t);f.saveRequest('partner','b');f.participation('tag-proof','a','tag');f.participation('participate-proof','b','participate');
  const proposed=f.rules.contributeRoll(f.db,'g','u-a',f.input('tag',{partner_request:'partner',proof:'tag-proof',description:'I assist from the platform.',pay_hope:true}));
  assert.equal(proposed.status,'awaiting_partner');assert.equal(f.db.getCharacter('a').data.resources.hope,5);
  const operation=f.input('participate',{proof:'participate-proof',description:'I assist from the platform.'});
  const joined=f.rules.contributeRoll(f.db,'g','u-b',operation);assert.equal(joined.status,'pending');assert.equal(joined.data.tag.participants.length,2);
  assert.equal(f.db.getCharacter('a').data.resources.hope,2);assert.equal(f.db.getCharacter('b').data.resources.hope,5);
  f.rules.contributeRoll(f.db,'g','u-b',operation);assert.equal(f.db.getCharacter('a').data.resources.hope,2);
  assert.equal(f.read('roll_request','partner').status,'superseded');assert.equal(f.all('tag_usage').length,1);
});

test('native Critical and Fear retain existing metacurrency while reactions grant none',t=>{
  const f=setup(t);f.rules.applyRollOutcome(f.db,'g','session',['a'],{id:'critical',duality:'Critical'});
  assert.deepEqual(f.db.getCharacter('a').data.resources,{hope:6,stress:{current:1,max:6}});
  f.rules.applyRollOutcome(f.db,'g','session',['a','b'],{id:'fear',duality:'Fear'});assert.equal(f.read('meta','fear'),2);
  f.rules.applyRollOutcome(f.db,'g','session',['b'],{id:'reaction',duality:'Critical'},{reaction:true});
  assert.deepEqual(f.db.getCharacter('b').data.resources,{hope:5,stress:{current:2,max:6}});
});

test('a saved protected reaction cannot be relabeled to grant resources to another character',t=>{
  const f=setup(t),result={id:'reaction-result',duality:'Critical',total:18};
  f.put('roll','saved:reaction',{id:'saved:reaction',session_id:'session',character_id:'a',roll_type:'reaction',payload:result});
  f.rules.applyRollOutcome(f.db,'g','session',['a'],result);assert.equal(f.db.getCharacter('a').data.resources.hope,5);
  assert.throws(()=>f.rules.applyRollOutcome(f.db,'g','session',['b'],result),/another character/);
  assert.throws(()=>f.rules.applyRollOutcome(f.db,'g','session',['a'],{...result,total:99}),/Unverified relabeling/);
});

test('private option discovery exposes candidates only and denies another participant the full registry',t=>{
  const f=setup(t),before=structuredClone(f.db.getCharacter('a').data.resources);
  const options=f.optionRules.discoverRollOptions(f.db,'g','u-a','q').options;
  assert.equal(options.find(o=>o.type==='trait').state,'applied');assert.equal(options.find(o=>o.type==='experience').cost.amount,1);
  assert.deepEqual(f.db.getCharacter('a').data.resources,before);assert.equal(f.all('roll').length,0);
  assert.throws(()=>f.optionRules.discoverRollOptions(f.db,'g','u-b','q'),/Only the acting owner/);
  const registry=f.optionRules.arbitrateRollOptions(f.db,'g','u-a',{request:'q',proposed_keys:['invented:bonus']});
  assert.equal(registry.rejected[0].key,'invented:bonus');assert.equal(f.read('roll_option_registry','q').visibility,'character');
  assert.deepEqual(f.db.getCharacter('a').data.resources,before);
});

test('actual collaboration and option providers cold-import with lazy native service wiring',async()=>{
  const [collaboration,options]=await Promise.all([import('../../src/roll-collaboration.js'),import('../../src/roll-options.js')]);
  assert.equal(typeof collaboration.contributeRoll,'function');assert.equal(typeof options.discoverRollOptions,'function');
  assert.equal(collaboration.mayKnowRoll({getWorldEvent:()=>null},'g',{subject_key:'a',data:{}},'a'),true);
});
