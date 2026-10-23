/** Discord application-command schema validation and size-limit checks. */
const MAX_COMMAND_CHARS=8000;

function longestLocalizedLength(base,localizations){
  let max=typeof base==="string"?base.length:base==null?0:String(base).length;
  if(localizations&&typeof localizations==="object"){
    for(const value of Object.values(localizations)){
      const n=typeof value==="string"?value.length:value==null?0:String(value).length;
      if(n>max) max=n;
    }
  }
  return max;
}

// Discord's 8,000-character limit counts the combined name, description, and
// value properties of one command, its options/subcommands/groups, and choices.
// When localizations exist, only the longest variant of each field counts.
export function commandCharacterCount(command){
  let total=0;
  function walk(node){
    if(!node||typeof node!=="object") return;
    if("name" in node) total+=longestLocalizedLength(node.name,node.name_localizations);
    if("description" in node) total+=longestLocalizedLength(node.description,node.description_localizations);
    if("value" in node&&node.value!=null) total+=String(node.value).length;
    for(const child of node.options??[]) walk(child);
    for(const choice of node.choices??[]) walk(choice);
  }
  walk(command);
  return total;
}

export function validateCommandSchema(commands){
  const errors=[];
  const pathName=(parts)=>parts.join(" ");

  function validateOptions(options=[],path=[]){
    if(options.length>25) errors.push(`${pathName(path)} has ${options.length} options; Discord allows at most 25.`);

    const leafOptions=options.filter(o=>![1,2].includes(o.type));
    let optionalSeen=false;
    for(const opt of leafOptions){
      const required=opt.required===true;
      if(!required) optionalSeen=true;
      else if(optionalSeen) errors.push(`${pathName(path)}: required option '${opt.name}' appears after an optional option.`);
    }

    for(const opt of options){
      if([1,2].includes(opt.type)) validateNode(opt,[...path,opt.name]);
    }
  }

  function validateNode(node,path=[node.name]){
    if(!/^[-_'\p{L}\p{N}\p{sc=Deva}\p{sc=Thai}]{1,32}$/u.test(node.name??"")) errors.push(`${pathName(path)} has invalid Discord command name '${node.name}'.`);
    if(typeof node.description==="string"&&(node.description.length<1||node.description.length>100)){
      errors.push(`${pathName(path)} description length is ${node.description.length}; expected 1-100.`);
    }
    validateOptions(node.options??[],path);
  }

  const seen=new Set();
  for(const command of commands){
    if(seen.has(command.name)) errors.push(`Duplicate root command name '${command.name}'.`);
    seen.add(command.name);
    validateNode(command,[command.name]);
    const chars=commandCharacterCount(command);
    if(chars>MAX_COMMAND_CHARS) errors.push(`${command.name} uses ${chars} Discord command characters; maximum is ${MAX_COMMAND_CHARS}. Split or shorten this command.`);
  }
  return errors;
}

export function assertValidCommandSchema(commands){
  const errors=validateCommandSchema(commands);
  if(errors.length){
    throw new Error(`Discord command schema validation failed:\n${errors.map(e=>` - ${e}`).join("\n")}`);
  }
}
