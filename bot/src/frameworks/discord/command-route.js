/** Decode the existing Discord root aliases after the caller's command/guild guards. */
export function resolveCommandRoute(commandName,options){
  let group;
  let sub;
  if(commandName==='vc'){
    // Compatibility with stale grouped registration until Discord replaces it.
    group=options.getSubcommandGroup();
    sub=options.getSubcommand();
  }else{
    const root=commandName.slice(3);
    group=root==='level'?'character':root==='combat'?'encounter':root;
    sub=options.getSubcommand();
  }
  return {group,sub};
}
