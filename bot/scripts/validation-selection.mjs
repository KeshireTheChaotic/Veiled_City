/** Conservative CI impact selection. Never deletes registrations or qualifies a partial run as a release. */
const always=['quality-check','format-check','check-source','validate-command-schema','critical-validation-profile-test',
  'v95-validation-reporter-test','validation-selection-test'];
export function selectValidationSuites(inventory,paths,{clean=true}={}){
  if(!clean)return {suites:[...inventory],mode:'full',reason:'uncommitted_inputs'};
  if(!Array.isArray(paths)||paths.some(p=>typeof p!=='string'||p.startsWith('/')||p.includes('..')))
    return {suites:[...inventory],mode:'full',reason:'unavailable_or_invalid_diff'};
  const selected=new Set(always);
  for(const raw of paths){
    const file=raw.replaceAll('\\','/');
    if(!file.includes('/')&&file.endsWith('.md')||['MANIFEST.txt','manifest.json'].includes(file)||file.startsWith('docs/')
      &&!file.match(/\.(?:js|mjs|cjs|json|sql|csv)$/))continue;
    const match=/^bot\/scripts\/([a-z0-9-]+-test)\.mjs$/.exec(file);
    if(match&&inventory.includes(match[1])){selected.add(match[1]);continue;}
    // Unknown, deleted or unregistered tests, shared fixtures, source, content,
    // dependencies, workflows and validator changes require the complete gate.
    return {suites:[...inventory],mode:'full',reason:`shared_or_unknown_input:${file}`};
  }
  const suites=inventory.filter(id=>selected.has(id));
  return {suites,mode:suites.length===inventory.length?'full':'focused',reason:'documentation_or_registered_tests_only'};
}
