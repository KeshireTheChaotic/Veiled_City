import assert from 'node:assert/strict';
import test from 'node:test';
import {canonProposalsText} from '../../src/frameworks/discord/public.js';
import {VeiledDB} from '../../src/frameworks/persistence/database.js';
import '../../src/ai-intents.js';
import {initializeRuntimeFrameworks} from '../../src/application/composition/runtime-initializers.js';
import {handleCommand} from '../../src/commands.js';

initializeRuntimeFrameworks();

test('canon proposal presentation preserves private/import source labels and optional context',()=>{
  const rows=[
    {id:'12345678-owner',character_name:'Owner Character',status:'awaiting_owner',source:'player_private_scene',proposed_by_user_id:'123',canon_key:'meeting',proposed_value:'A meeting happened.',current_value:null,reason:'Owner review'},
    {id:'abcdefgh-import',character_name:'Imported Character',status:'actionable',source:'character_hook',proposed_by_user_id:null,canon_key:'home',proposed_value:'North district',current_value:'South district',reason:''}
  ];
  assert.equal(canonProposalsText(rows,'actionable'),[
    '**Canon Proposals — actionable**',
    '• `12345678` **Owner Character** • AWAITING_OWNER • player/private by <@123>',
    '  `meeting` → A meeting happened.\n  why: Owner review',
    '• `abcdefgh` **Imported Character** • ACTIONABLE • import/character_hook',
    '  `home` → North district\n  current: South district'
  ].join('\n'));
  assert.equal(canonProposalsText([],'rejected'),'No rejected canon proposals found.');
});

test('canon proposal output retains the original 1,950-character clipping limit',()=>{
  const rows=[{id:'proposal',character_name:'Character',status:'actionable',source:'fixture',canon_key:'key',proposed_value:'x'.repeat(2200)}];
  const text=canonProposalsText(rows,'actionable');
  const full='**Canon Proposals — actionable**\n• `proposal` **Character** • ACTIONABLE • import/fixture\n  `key` → '+'x'.repeat(2200);
  assert.equal(text,full.slice(0,1950));
});

test('GM canon proposal command retains authorization, query arguments and private reply',async()=>{
  const db=new VeiledDB(':memory:','sql/schema.sql'),guild='r87-command';db.ensureCampaign(guild);
  const player=db.upsertPlayer(guild,'gm-user','GM User'),character=db.createCharacter(guild,'gm-user','Review Character');
  db.db.prepare(`INSERT INTO canon_proposals(id,guild_id,character_id,canon_key,proposed_value,reason,status,source,proposed_by_user_id)
    VALUES(?,?,?,?,?,?,?,?,?)`).run('proposal-r87',guild,character.id,'safe-haven','North Arcade','Previously recorded detail','pending','player_private_scene','player-1');
  const calls=[],responses=[];const original=db.listCanonProposals.bind(db);
  db.listCanonProposals=(...args)=>{calls.push(args);return original(...args);};
  const interaction={id:'interaction-r87',guildId:guild,commandName:'vc',user:{id:'gm-user',username:'GM User'},member:{displayName:'GM User'},memberPermissions:{has:()=>true},guild:{id:guild},
    isChatInputCommand:()=>true,isButton:()=>false,isStringSelectMenu:()=>false,replied:false,deferred:false,
    options:{getSubcommandGroup:()=> 'canon',getSubcommand:()=> 'proposals',getString(name){assert.ok(['character','status'].includes(name));return null;}},
    async reply(payload){responses.push(payload);this.replied=true;}};
  try{
    assert.equal(await handleCommand(interaction,{db,gm:null}),true);
    assert.deepEqual(calls,[[guild,{status:'actionable',characterId:null,limit:30}]],JSON.stringify({calls,responses}));
    assert.deepEqual(responses,[{content:'**Canon Proposals — actionable**\n• `proposal` **Review Character** • PENDING • player/private by <@player-1>\n  `safe-haven` → North Arcade\n  why: Previously recorded detail',flags:64}]);
  }finally{db.close();}
});

test('non-GM cannot reach canon proposal filters or Persistence reads',async()=>{
  const db=new VeiledDB(':memory:','sql/schema.sql'),guild='r87-denied';db.ensureCampaign(guild);db.upsertPlayer(guild,'reader','Reader');
  db.listCanonProposals=()=>assert.fail('GM check must precede proposal read');
  const interaction={id:'interaction-r87-denied',guildId:guild,commandName:'vc',user:{id:'reader',username:'Reader'},member:{displayName:'Reader'},memberPermissions:{has:()=>false},guild:{id:guild},
    isChatInputCommand:()=>true,isButton:()=>false,isStringSelectMenu:()=>false,replied:false,deferred:false,
    options:{getSubcommandGroup:()=> 'canon',getSubcommand:()=> 'proposals',getString(){assert.fail('GM check must precede proposal filters');}},
    async reply(payload){this.payload=payload;this.replied=true;}};
  try{
    assert.equal(await handleCommand(interaction,{db,gm:null}),true);
    assert.equal(interaction.payload.content,'⚠️ GM/admin permission required.');assert.equal(interaction.payload.flags,64);
  }finally{db.close();}
});
