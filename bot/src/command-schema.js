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
    if(!/^[\w-]{1,32}$/.test(node.name??"")) errors.push(`${pathName(path)} has invalid Discord command name '${node.name}'.`);
    if(typeof node.description==="string"&&(node.description.length<1||node.description.length>100)){
      errors.push(`${pathName(path)} description length is ${node.description.length}; expected 1-100.`);
    }
    validateOptions(node.options??[],path);
  }

  for(const command of commands) validateNode(command,[command.name]);
  return errors;
}

export function assertValidCommandSchema(commands){
  const errors=validateCommandSchema(commands);
  if(errors.length){
    throw new Error(`Discord command schema validation failed:\n${errors.map(e=>` - ${e}`).join("\n")}`);
  }
}
