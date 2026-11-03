const SUBCOMMANDS={
  'session-reopen':['session-reopen',{session:'session'}],'register-character':['pc-register',{actor:'character'}],'rebind-character':['pc-rebind',{actor:'character'}],
  'bootstrap-preview':['pc-bootstrap-preview',{actor:'character'}],'bootstrap-review':['pc-bootstrap-review',{actor:'character',snapshotHash:'snapshot'}],
  'drafts':['draft-list',{}],'publish-draft':['draft-publish',{source:'source',fingerprint:'fingerprint'}]
};
/** The typed `/vc-gm` subcommands a human GM may declare, as the closed native operation input
 * (`{op, ...fields}`) that the authority and the command service both verify. `/vc-roll` is
 * dice only and never carries a GM operation. Returns null for anything else.
 */
export function gmCommandInput(e){
  try{
    if(e?.isChatInputCommand?.()!==true||!(e.commandName==='vc-gm'||e.commandName==='vc'&&e.options.getSubcommandGroup(false)==='gm'))return null;
    const spec=SUBCOMMANDS[e.options.getSubcommand()];if(!spec)return null;
    const input={op:spec[0]};
    for(const [field,option] of Object.entries(spec[1])){const value=e.options.getString(option,true);if(typeof value!=='string'||!value||value.length>256)return null;input[field]=value;}
    return input;
  }catch{return null;}
}
