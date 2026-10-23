/** Instance-local, lazy composition. Factories see only explicitly declared dependencies, never a service locator. */
export function composeServices(definitions,{values={}}={}){
  if(!Array.isArray(definitions)||!values||typeof values!=='object')throw new TypeError('Explicit service definitions and values required.');
  const ready=new Map(Object.entries(values)),specs=new Map(),failures=new Map(),building=new Set();
  for(const definition of definitions){
    const {name,dependencies=[],create}=definition||{};
    if(typeof name!=='string'||!name||!Array.isArray(dependencies)||dependencies.some(d=>typeof d!=='string'||!d)||typeof create!=='function')
      throw new TypeError('A named factory and explicit dependency names are required.');
    if(ready.has(name)||specs.has(name)||new Set(dependencies).size!==dependencies.length)throw new Error(`Duplicate service binding or dependency: ${name}`);
    specs.set(name,{dependencies:[...dependencies],create});
  }
  const visiting=new Set(),visited=new Set();
  function validate(name,route=[]){
    if(ready.has(name)||visited.has(name))return;
    if(!specs.has(name))throw new Error(`Missing service binding: ${name}`);
    if(visiting.has(name))throw new Error(`Cyclic service dependencies: ${[...route,name].join(' -> ')}`);
    visiting.add(name);for(const dependency of specs.get(name).dependencies)validate(dependency,[...route,name]);
    visiting.delete(name);visited.add(name);
  }
  for(const name of specs.keys())validate(name);
  function get(name){
    if(ready.has(name))return ready.get(name);
    if(failures.has(name))throw failures.get(name);
    const spec=specs.get(name);if(!spec)throw new Error(`Missing service binding: ${name}`);
    if(building.has(name))throw new Error(`Reentrant service construction: ${name}`);
    building.add(name);
    try{
      const dependencies=Object.create(null);for(const key of spec.dependencies)dependencies[key]=get(key);
      const instance=spec.create(Object.freeze(dependencies));
      if(instance&&typeof instance.then==='function')throw new TypeError(`Service factory must construct synchronously: ${name}`);
      ready.set(name,instance);return instance;
    }catch(error){failures.set(name,error);throw error;}
    finally{building.delete(name);}
  }
  return Object.freeze({get});
}
