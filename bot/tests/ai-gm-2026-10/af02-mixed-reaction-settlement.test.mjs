import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {splitMixedReactionCohort,rollNativeNpcReaction,settleMixedReactionCohort} from '../../src/frameworks/daggerheart/mixed-reaction-rules.js';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');

function fixture(){
  const sql=new DatabaseSync(':memory:');
  sql.exec('CREATE TABLE effects(key TEXT PRIMARY KEY, body TEXT); CREATE TABLE progress(body TEXT);');
  const template={experiences:[]},targets=[{kind:'character',key:'pc',owner:'owner',presence_hash:'pc-presence'},
    {kind:'npc',key:'npc',presence_hash:'npc-presence',control_hash:'native-control',template_hash:hash(template)}];
  let rolls=0,owner=null,failWrite=false;
  const receipt=rollNativeNpcReaction({target:targets[1],combatant:{status:'active',hp_current:2},template,difficulty:14,rng:()=>{rolls++;return 2;}});
  const execution={version:1,key:'execution',cohort_hash:splitMixedReactionCohort(targets).cohort_hash,reactions:[
    {kind:'character',target:'character:pc',invitation:'pc-invitation',invitation_hash:'invitation-hash'},
    {kind:'npc',target:'npc:npc',receipt}]};
  const args={targets,execution,transaction:fn=>{sql.exec('BEGIN');try{const r=fn();sql.exec('COMMIT');return r;}catch(e){sql.exec('ROLLBACK');throw e;}},
    inspectPcReaction:(target,reaction)=>{assert.equal(target.owner,'owner');assert.equal(reaction.invitation,'pc-invitation');return owner;},
    readEffect:key=>{const r=sql.prepare('SELECT body FROM effects WHERE key=?').get(key);return r?JSON.parse(r.body):null;},
    applyEffect:(key,target,proof,binding)=>{const value={key,binding};sql.prepare('INSERT INTO effects VALUES(?,?)').run(key,JSON.stringify(value));return value;},
    inspectEffect:(effect,binding)=>effect,
    writeProgress:value=>{if(failWrite)throw Error('injected progress failure');sql.prepare('INSERT INTO progress VALUES(?)').run(JSON.stringify(value));return value;}};
  return {sql,args,setOwner:v=>owner=v,fail:()=>failWrite=true,rolls:()=>rolls,count:()=>sql.prepare('SELECT COUNT(*) n FROM effects').get().n,close:()=>sql.close()};
}

test('mixed settlement keeps the PC pending, commits NPC outcome once and later accepts only inspected owner outcome',()=>{
  const f=fixture();try{
    const first=settleMixedReactionCohort(f.args);
    assert.equal(first.status,'awaiting_owners');assert.equal(first.targets[0].status,'pending');assert.equal(f.count(),1);
    assert.equal(first.targets[1].status,'resolved');
    f.setOwner({outcome:'success',receipt_hash:'verified-owner-dice'});
    const done=settleMixedReactionCohort(f.args);assert.equal(done.status,'resolved');assert.equal(f.count(),2);
    assert.deepEqual(settleMixedReactionCohort(f.args),done);assert.equal(f.count(),2);assert.equal(f.rolls(),1);
  }finally{f.close();}
});

test('mixed settlement rolls back all ready effects when progress persistence fails',()=>{
  const f=fixture();try{f.setOwner({outcome:'failure',receipt_hash:'verified-owner-failure'});f.fail();
    assert.throws(()=>settleMixedReactionCohort(f.args),/injected progress failure/);assert.equal(f.count(),0);
  }finally{f.close();}
});

test('withdrawal creates no PC effect and changed cohort, proof or saved effect cannot be replayed',()=>{
  const f=fixture();try{
    f.setOwner({outcome:'withdrawn',receipt_hash:'verified-owner-withdrawal'});
    const result=settleMixedReactionCohort(f.args);assert.equal(result.status,'resolved');assert.equal(result.targets[0].status,'withdrawn');assert.equal(f.count(),1);
    assert.throws(()=>settleMixedReactionCohort({...f.args,targets:[{...f.args.targets[0],owner:'other'},f.args.targets[1]]}));
    f.setOwner({outcome:'invented-success',receipt_hash:'unverified'});assert.throws(()=>settleMixedReactionCohort(f.args));
    f.setOwner(null);f.sql.exec("UPDATE effects SET body=json_set(body,'$.binding.proof','changed')");
    assert.throws(()=>settleMixedReactionCohort(f.args));
  }finally{f.close();}
});
