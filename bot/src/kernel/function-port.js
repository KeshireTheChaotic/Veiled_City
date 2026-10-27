/** Fixed, fail-closed function port: binds once to original functions, forwards calls unchanged, forbids replacement. No policy. */
export function createFunctionPort(names,{code,label}){
 let source=null;
 const need=name=>{if(!source)throw Object.assign(new Error(`${label} has not been composed.`),{code});return source[name];};
 const port={bind(functions){
  if(names.some(name=>typeof functions?.[name]!=='function'))throw new TypeError(`${label} requires the original functions ${names.join(', ')}.`);
  if(source&&names.some(name=>source[name]!==functions[name]))throw new Error(`${label} replacement forbidden.`);
  source=Object.freeze(Object.fromEntries(names.map(name=>[name,functions[name]])));return port;
 }};
 for(const name of names)port[name]=(...args)=>need(name)(...args);
 return Object.freeze(port);
}
