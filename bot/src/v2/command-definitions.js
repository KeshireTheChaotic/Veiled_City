import {buildCommands as buildLegacyCommands} from '../frameworks/discord/command-definitions.js';
import {assertValidCommandSchema} from '../frameworks/discord/command-schema.js';

// Migration-only schema reuse. No legacy handler or GM pipeline is imported.
const string=(name,description,required=true,digest=false)=>({type:3,name,description,required,...(digest?{max_length:64,min_length:64}:{})});
const sub=(name,description,...options)=>({type:1,name,description,options});
export function buildNativeCommands(){
  const commands=JSON.parse(JSON.stringify(buildLegacyCommands()));
  const command=name=>{const row=commands.find(c=>c.name===name);if(!row)throw new Error(`Missing baseline command ${name}`);return row;};
  for(const name of ['absent','leave']){
    const row=command('vc-session').options.find(s=>s.name===name);
    if(!row||row.options.some(o=>o.name==='character'))throw new Error('Unexpected baseline attendance schema');
    row.options.push(string('character','Owned character name; defaults to your only active character',false));
  }
  const player=command('vc-player'),privateIndex=player.options.findIndex(s=>s.name==='private-channel');
  if(privateIndex<0)throw new Error('Missing baseline owner private-channel command');
  player.options.splice(privateIndex+1,0,
    sub('death-review',"Privately review your character's death choice for a pending incoming attack",string('request','Death request id from the prompt (incoming-death:...)')),
    sub('death-refresh','Replace your expired death-choice controls; saved choices are kept',string('request','Death request id from the prompt (incoming-death:...)'),string('prompt','Prompt id of the expired controls')),
    sub('death-reconcile','Check the saved outcome of a death-choice click that showed no confirmation',string('interaction','Interaction id of that click')),
    sub('cost-reconcile','Check a saved cost decision after an uncertain confirmation',string('interaction','Saved interaction id; defaults to your only unresolved cost in this channel',false)));
  command('vc-gm').options.push(
    sub('session-reopen','Reopen a session that was ended with /vc-session end',string('session','Session id')),
    sub('register-character','Register an existing character to its owner in the active scene',string('character','Character id')),
    sub('rebind-character','Point a registered character at its current owner, in place',string('character','Character id')),
    sub('bootstrap-preview',"Privately preview a character's saved sheet before approving its native state",string('character','Character id')),
    sub('bootstrap-review',"Approve the exact previewed sheet and create the character's native state",string('character','Character id'),string('snapshot','Snapshot hash shown by bootstrap-preview',true,true)),
    sub('drafts','Privately list withheld GM drafts awaiting your review'),
    sub('publish-draft','Send one reviewed draft once to its original audience',string('source','Draft source id from drafts'),string('fingerprint','Draft fingerprint from drafts',true,true)));
  assertValidCommandSchema(commands);return commands;
}
