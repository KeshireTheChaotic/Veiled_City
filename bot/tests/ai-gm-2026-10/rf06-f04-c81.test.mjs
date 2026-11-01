import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {VeiledDB} from '../../src/db.js';
import '../../src/ai-intents.js';
import {initializeRuntimeFrameworks} from '../../src/application/composition/runtime-initializers.js';
import {handleCommand} from '../../src/commands.js';
import {publicationSessionRecapSource} from '../../src/frameworks/publication/public.js';
import {splitDiscordText} from '../../src/frameworks/discord/public.js';

initializeRuntimeFrameworks();
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

function interactionFor(guild,user,id){
  const replies=[],followups=[];
  const interaction={guildId:guild,commandName:'vc',id,user:{id:user,username:user},member:{displayName:user},
    replied:false,deferred:false,isChatInputCommand:()=>true,isButton:()=>false,isStringSelectMenu:()=>false,
    options:{getSubcommandGroup:()=> 'intel',getSubcommand:()=> 'recap',getString:()=>null},
    async reply(payload){replies.push(payload);this.replied=true;},
    async followUp(payload){followups.push(payload);}};
  return {interaction,replies,followups};
}
function fixture(guild){
  const db=new VeiledDB(':memory:','sql/schema.sql');db.ensureCampaign(guild);db.upsertPlayer(guild,'owner','Owner');
  db.setCityCalendar(guild,{flags:{session_briefs:false}});return db;
}

test('ordinary recap retains private empty fallback and never falls back to raw session recap prose',async()=>{
  const guild='r81-empty',db=fixture(guild);
  try{
    const none=interactionFor(guild,'owner','r81-none');
    assert.equal(await handleCommand(none.interaction,{db,gm:null}),true);
    assert.equal(none.replies[0].content,'No completed-session recap yet.');assert.equal(none.replies[0].flags,64);
    db.startSession(guild,'Fresh session','already_together');db.endSession(guild,'RAW GM SESSION SECRET');
    const raw=interactionFor(guild,'owner','r81-raw');
    assert.equal(await handleCommand(raw.interaction,{db,gm:null}),true);
    assert.equal(raw.replies[0].content,'No completed-session recap yet.');assert.equal(raw.replies[0].flags,64);
    assert.equal(raw.followups.length,0);assert.doesNotMatch(raw.replies[0].content,/RAW GM/);
  }finally{db.close();}
});

test('actual recap route preserves private long output and rejection using synthetic archive reader inputs',async()=>{
  const guild='r81-synthetic',db=fixture(guild);
  try{
    const session=db.startSession(guild,'Fresh synthetic archive fixture','already_together');db.endSession(guild,'RAW GM SESSION SECRET');
    const source=db.saveWorldEvent(guild,{key:'synthetic-r81',kind:'fixture',title:'Synthetic archive reader fixture',
      status:'active',truth_status:'asserted',visibility:'gm',source_kind:'fixture',source_id:'r81',session_id:session.id,tick:0,minute:0,details:{}});
    const publications=new Map(),originalGetPublication=db.getPublication.bind(db);
    db.getPublication=(requestedGuild,id)=>{
      if(publications.has(id)){assert.equal(requestedGuild,guild);return publications.get(id);}
      return originalGetPublication(requestedGuild,id);
    };
    // These newly constructed certificate inputs exercise the unchanged reader. They do not prove native archive capture.
    const add=(id,payload,{visibility='party',status='delivered',certificateSession=session.id,tamper=false}={})=>{
      const data={version:1,publication:id,session:certificateSession,payload_hash:hash(payload),refs:[],owners:[],authority:'Synthetic R81 reader fixture'};
      db.saveCityRecord(guild,{kind:'pvp_delivered_archive',key:id,status:'verified',visibility:'gm',source_event:source.event_key,data:{...data,digest:hash(data)}});
      publications.set(id,{id,payload:tamper?payload+' MODIFIED':payload,visibility,status});
    };
    const payload=`Historical synthetic excerpt @everyone\n${'Recorded visible text. '.repeat(180)}`;
    add('valid',payload);add('private','PRIVATE ARCHIVE SECRET',{visibility:'character'});
    add('pending','PENDING ARCHIVE SECRET',{status:'pending'});add('changed','TAMPERED ARCHIVE SECRET',{tamper:true});
    add('other-session','OTHER SESSION SECRET',{certificateSession:'other-session'});
    const delivery=interactionFor(guild,'owner','r81-certified');
    assert.equal(await handleCommand(delivery.interaction,{db,gm:null}),true);
    const expected=splitDiscordText(`Previously delivered, source-verified session excerpts (not new or current observations):\n\n${payload}`,1900);
    assert.equal(delivery.replies.length,1);assert.equal(delivery.replies[0].content,expected[0]);
    assert.deepEqual(delivery.followups.map(row=>row.content),expected.slice(1));assert.ok(delivery.followups.length>0);
    assert.ok([...delivery.replies,...delivery.followups].every(row=>row.flags===64&&row.allowedMentions.parse.length===0&&row.content.length<=1900));
    assert.doesNotMatch([...delivery.replies,...delivery.followups].map(row=>row.content).join('\n'),/RAW GM|PRIVATE ARCHIVE|PENDING ARCHIVE|TAMPERED ARCHIVE|OTHER SESSION/);
    publications.get('valid').payload='ALTERED PAYLOAD SECRET';
    const stale=interactionFor(guild,'owner','r81-stale');
    assert.equal(await handleCommand(stale.interaction,{db,gm:null}),true);
    assert.equal(stale.replies[0].content,'No completed-session recap yet.');
  }finally{db.close();}
});

test('existing public recap source retains reader errors inside the command error response',async()=>{
  const guild='r81-error',db=fixture(guild),failure=new Error('R81 archive reader failed');
  try{
    const session=db.startSession(guild,'Reader failure fixture','already_together');db.endSession(guild);
    const original=db.listCityRecords.bind(db);
    db.listCityRecords=(requestedGuild,options)=>{
      if(options.kind==='pvp_delivered_archive')throw failure;
      return original(requestedGuild,options);
    };
    assert.throws(()=>publicationSessionRecapSource.scopedSessionRecap(db,guild,session),error=>error===failure);
    const delivery=interactionFor(guild,'owner','r81-error');
    assert.equal(await handleCommand(delivery.interaction,{db,gm:null}),true);
    assert.equal(delivery.replies[0].content,'⚠️ R81 archive reader failed');assert.equal(delivery.replies[0].flags,64);
  }finally{db.close();}
});
