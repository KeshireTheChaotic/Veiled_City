import assert from 'node:assert/strict';
import test from 'node:test';
import {VeiledDB} from '../../src/db.js';
import '../../src/ai-intents.js';
import {initializeRuntimeFrameworks} from '../../src/application/composition/runtime-initializers.js';
import {handleCommand} from '../../src/commands.js';
import {chunkDiscordLines,playerFactLine} from '../../src/frameworks/discord/public.js';

initializeRuntimeFrameworks();

test('facts and clues commands preserve owner scope through the Discord-Persistence read contract',async()=>{
  const db=new VeiledDB(':memory:','sql/schema.sql'),guild='rf06-r77',ownerA='owner-a',ownerB='owner-b';
  try{
    db.ensureCampaign(guild);db.upsertPlayer(guild,ownerA,'Owner A');db.upsertPlayer(guild,ownerB,'Owner B');
    const session=db.startSession(guild,'R77 private fact reads','already_together');
    const pcA=db.createCharacter(guild,ownerA,'Owner A',{traits:{Presence:1}});
    const pcB=db.createCharacter(guild,ownerB,'Owner B',{traits:{Presence:1}});
    db.assignCharacter(session.id,ownerA,pcA.id);db.setPresence(session.id,ownerA,'present');
    db.assignCharacter(session.id,ownerB,pcB.id);db.setPresence(session.id,ownerB,'present');

    db.addFact(guild,{key:'party-a',content:`Party fact A ${'a'.repeat(1300)}`,visibility:'party'});
    db.addFact(guild,{key:'party-b',content:`Party fact B ${'b'.repeat(1300)}`,visibility:'party'});
    db.addFact(guild,{key:'owner-a-fact',content:'Owner A private fact',visibility:'character',subjectCharacterId:pcA.id});
    db.addFact(guild,{key:'owner-b-fact',content:'Owner B private fact',visibility:'character',subjectCharacterId:pcB.id});
    db.addFact(guild,{key:'gm-fact',content:'GM ONLY R77 private fact',visibility:'gm'});
    db.addFact(guild,{category:'clue',key:'owner-a-clue',content:'Owner A clue',visibility:'character',subjectCharacterId:pcA.id});
    db.addFact(guild,{category:'clue',key:'owner-b-clue',content:'Owner B clue',visibility:'character',subjectCharacterId:pcB.id});
    db.addFact(guild,{category:'clue',key:'gm-clue',content:'GM ONLY R77 private clue',visibility:'gm'});
    for(const [key,second] of [['party-a',8],['party-b',7],['owner-a-fact',6],['owner-b-fact',5],['gm-fact',4],
      ['owner-a-clue',3],['owner-b-clue',2],['gm-clue',1]])
      db.db.prepare('UPDATE facts SET created_at=? WHERE guild_id=? AND fact_key=?')
        .run(`2026-01-01 00:00:0${second}`,guild,key);
    assert.equal(db.controlledAssignment(session.id,ownerA)?.character_id,pcA.id);
    assert.equal(db.controlledAssignment(session.id,ownerB)?.character_id,pcB.id);
    assert.equal(db.getActiveSession(guild)?.id,session.id);
    const playerFactCalls=[],originalPlayerFactsFor=db.playerFactsFor.bind(db);
    db.playerFactsFor=(...args)=>{playerFactCalls.push(args);return originalPlayerFactsFor(...args);};

    const invoke=async(user,sub,id)=>{
      const replies=[],followups=[];
      const interaction={guildId:guild,commandName:'vc',id,user:{id,username:user},member:{displayName:user},replied:false,deferred:false,
        isChatInputCommand:()=>true,isButton:()=>false,isStringSelectMenu:()=>false,
        options:{getSubcommandGroup:()=> 'intel',getSubcommand:()=>sub,getString:()=>null},
        async reply(payload){replies.push(payload);this.replied=true;},
        async followUp(payload){followups.push(payload);this.replied=true;}};
      assert.equal(await handleCommand(interaction,{db,gm:null}),true);
      return {replies,followups};
    };
    const expected=(user,character,category)=>chunkDiscordLines([
      category==='clue'?'**Clues Available to You**':'**Facts Available to You**',
      ...db.playerFactsFor(guild,user,{characterId:character,category,limit:80}).map(playerFactLine)
    ]);
    const assertDelivery=(delivery,want)=>{
      assert.equal(delivery.replies.length,1);
      assert.equal(delivery.replies[0].flags,64);
      assert.equal(delivery.replies[0].content,want[0]);
      assert.deepEqual(delivery.followups.map(row=>row.content),want.slice(1));
      assert.ok([...delivery.replies,...delivery.followups].every(row=>row.content.length<=1900));
      assert.ok(want.length>1,'long party fact fixture must exercise chunk follow-ups');
    };

    const aFacts=await invoke('Owner A','facts',ownerA);
    assert.deepEqual(playerFactCalls[0],[guild,ownerA,{characterId:pcA.id,category:'fact',limit:80}]);
    assertDelivery(aFacts,expected(ownerA,pcA.id,'fact'));
    const aFactText=[aFacts.replies[0].content,...aFacts.followups.map(row=>row.content)].join('');
    assert.match(aFactText,/Owner A private fact/);
    assert.doesNotMatch(aFactText,/Owner B private fact|GM ONLY R77/);

    const bFacts=await invoke('Owner B','facts',ownerB);
    assertDelivery(bFacts,expected(ownerB,pcB.id,'fact'));
    const bFactText=[bFacts.replies[0].content,...bFacts.followups.map(row=>row.content)].join('');
    assert.match(bFactText,/Owner B private fact/);
    assert.doesNotMatch(bFactText,/Owner A private fact|GM ONLY R77/);

    const aClues=await invoke('Owner A','clues',ownerA);
    assert.equal(aClues.replies.length,1);
    const clueText=[aClues.replies[0].content,...aClues.followups.map(row=>row.content)].join('');
    assert.match(clueText,/Owner A clue/);
    assert.doesNotMatch(clueText,/Owner B clue|GM ONLY R77|Party fact/);
  }finally{db.close();}
});

test('facts and clues delivery failures retain the original command error response',async()=>{
  const db=new VeiledDB(':memory:','sql/schema.sql'),guild='rf06-r77-errors',user='owner-a';
  try{
    db.ensureCampaign(guild);db.upsertPlayer(guild,user,'Owner A');
    for(const sub of ['facts','clues']){
      const attempts=[],interaction={guildId:guild,commandName:'vc',id:`r77-error-${sub}`,
        user:{id:user,username:'Owner A'},member:{displayName:'Owner A'},replied:false,deferred:false,
        isChatInputCommand:()=>true,isButton:()=>false,isStringSelectMenu:()=>false,
        options:{getSubcommandGroup:()=> 'intel',getSubcommand:()=>sub,getString:()=>null},
        async reply(payload){attempts.push(payload);if(attempts.length===1)throw new Error('R77 delivery failure');this.replied=true;},
        async followUp(){assert.fail('empty display must not send follow-ups');}};
      assert.equal(await handleCommand(interaction,{db,gm:null}),true);
      assert.equal(attempts.length,2);
      assert.equal(attempts[1].content,'⚠️ R77 delivery failure');
      assert.equal(attempts[1].flags,64);
    }
  }finally{db.close();}
});
