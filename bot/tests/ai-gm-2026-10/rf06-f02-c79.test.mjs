import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {VeiledDB} from '../../src/frameworks/persistence/database.js';
import {playerFactsFor} from '../../src/frameworks/persistence/player-fact-repository.js';

test('player fact reader preserves guild, owner, character, category and archived visibility before limiting',()=>{
  const db=new VeiledDB(':memory:','sql/schema.sql'),guild='r79',other='r79-other';
  try{
    db.ensureCampaign(guild);db.ensureCampaign(other);
    const fixtures=[
      {key:'public',visibility:'public'}, {key:'party',visibility:'party'},
      {key:'own-player',visibility:'player',subjectUserId:'owner-a'},
      {key:'other-player',visibility:'player',subjectUserId:'owner-b'},
      {key:'own-character',visibility:'character',subjectCharacterId:'pc-a'},
      {key:'other-character',visibility:'character',subjectCharacterId:'pc-b'},
      {key:'gm',visibility:'gm'}, {key:'archived',visibility:'public'},
      {key:'clue',visibility:'party',category:'ClUe'}
    ];
    for(const [index,row] of fixtures.entries()){
      const id=db.addFact(guild,{...row,content:`R79 ${row.key}`,provenance:{fixture:row.key}});
      db.db.prepare('UPDATE facts SET created_at=?,archived=? WHERE id=?')
        .run(new Date(Date.UTC(2026,0,1)+index*60000).toISOString(),row.key==='archived'?1:0,id);
    }
    db.addFact(other,{key:'other-guild',content:'Other campaign',visibility:'public'});
    const changes=db.db.prepare('SELECT total_changes() n').get().n;
    const rows=db.playerFactsFor(guild,'owner-a',{characterId:'pc-a',category:' FACT ',limit:80,includeGM:true});
    assert.deepEqual(rows.map(r=>r.fact_key),['own-character','own-player','party','public']);
    for(const row of rows)assert.deepEqual(row,db.getFact(guild,row.id));
    assert.deepEqual(db.playerFactsFor(guild,'owner-b',{characterId:'pc-b',category:'fact'}).map(r=>r.fact_key),
      ['other-character','other-player','party','public']);
    assert.deepEqual(db.playerFactsFor(guild,'',{category:' clue '}).map(r=>r.fact_key),['clue']);
    assert.deepEqual(db.playerFactsFor(guild,'',{category:'fact'}).map(r=>r.fact_key),['party','public']);
    assert.deepEqual(db.playerFactsFor(other,'').map(r=>r.fact_key),['other-guild']);
    assert.equal(db.db.prepare('SELECT total_changes() n').get().n,changes);
  }finally{db.close();}
});

test('original caller-shaped limits and category filtering remain capped in SQLite',()=>{
  const db=new VeiledDB(':memory:','sql/schema.sql'),guild='r79-caps';
  try{
    db.ensureCampaign(guild);
    for(let i=0;i<220;i++){
      const id=db.addFact(guild,{key:`visible-${i}`,content:`Visible ${i}`,visibility:'party',category:i<215?'fact':'clue'});
      db.db.prepare('UPDATE facts SET created_at=? WHERE id=?').run(new Date(Date.UTC(2026,0,1)+i*60000).toISOString(),id);
    }
    for(let i=0;i<30;i++){
      const id=db.addFact(guild,{key:`hidden-${i}`,content:`Hidden ${i}`,visibility:i<15?'gm':'player',subjectUserId:'another-owner'});
      db.db.prepare('UPDATE facts SET created_at=? WHERE id=?').run(new Date(Date.UTC(2026,0,2)+i*60000).toISOString(),id);
    }
    for(const [limit,count] of [[undefined,80],[60,60],[120,120],[200,200],[999,200],[-9,1],[0,80],[null,80],['60',60],[NaN,80]]){
      const rows=db.playerFactsFor(guild,'owner',{limit});
      assert.equal(rows.length,count,`limit ${String(limit)}`);
      assert.equal(rows[0].fact_key,'visible-219');
      assert.ok(rows.every(r=>r.visibility==='party'));
    }
    const facts=db.playerFactsFor(guild,'owner',{category:' FACT ',limit:200});
    assert.equal(facts.length,200);assert.equal(facts[0].fact_key,'visible-214');assert.equal(facts.at(-1).fact_key,'visible-15');
    assert.equal(db.playerFactsFor(guild,'owner',{category:'missing',limit:200}).length,0);
    assert.throws(()=>db.playerFactsFor(guild,'owner',null),TypeError);
  }finally{db.close();}
});

test('reader uses the existing connection inside rollback and preserves saved row shapes after reopen',()=>{
  const folder=mkdtempSync(join(tmpdir(),'veiled-r79-')),file=join(folder,'facts.sqlite'),guild='r79-reopen';
  let db;
  try{
    db=new VeiledDB(file,'sql/schema.sql');db.ensureCampaign(guild);
    const id=db.addFact(guild,{key:'saved',content:'Saved fact',visibility:'player',subjectUserId:'owner',confidence:42,
      provenance:{source:'fresh-r79',nested:{value:true}}});
    const saved=db.getFact(guild,id),failure=new Error('rollback fixture');
    assert.throws(()=>db.transaction(()=>{
      db.addFact(guild,{key:'uncommitted',content:'Pending private fact',visibility:'character',subjectCharacterId:'pc'});
      assert.ok(db.playerFactsFor(guild,'owner',{characterId:'pc'}).some(r=>r.fact_key==='uncommitted'));
      const before=db.db.prepare('SELECT total_changes() n').get().n;
      assert.ok(playerFactsFor(db.db,guild,'owner',{characterId:'pc'}).some(r=>r.fact_key==='uncommitted'));
      assert.equal(db.db.prepare('SELECT total_changes() n').get().n,before);
      throw failure;
    }),error=>error===failure);
    assert.deepEqual(db.playerFactsFor(guild,'owner'),[saved]);
    db.close();db=null;
    db=new VeiledDB(file,'sql/schema.sql');
    assert.deepEqual(db.playerFactsFor(guild,'owner'),[saved]);
    assert.deepEqual(db.playerFactsFor(guild,'another-owner'),[]);
  }finally{
    db?.close();const target=resolve(folder);
    assert.equal(dirname(target),resolve(tmpdir()));assert.ok(basename(target).startsWith('veiled-r79-'));
    rmSync(target,{recursive:true,force:true});
  }
});

test('repository returns the original driver result and propagates its exact error',()=>{
  const rows=[{id:'driver-row'}],failure=new Error('driver failure'),calls=[];
  const connection={prepare(){return {all(...args){calls.push(args);return rows;}};}};
  assert.equal(playerFactsFor(connection,'guild','owner',{characterId:'pc',category:' ClUe ',limit:'60'}),rows);
  assert.deepEqual(calls,[['guild','owner','pc','clue','clue',60]]);
  connection.prepare=()=>{throw failure;};
  assert.throws(()=>playerFactsFor(connection,'guild','owner'),error=>error===failure);
});
