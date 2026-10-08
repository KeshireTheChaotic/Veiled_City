/** Shared per-phase release policy: .9 rolls to the next major .0; no .10 minor releases. */
export function nextMinorVersion(current){
  if(!/^\d+\.\d+\.\d+$/.test(current)) throw new Error("Invalid current semantic version.");
  const [major,minor]=current.split(".").map(Number);
  return minor>=9?`${major+1}.0.0`:`${major}.${minor+1}.0`;
}
export function phaseVersion(current,requested=nextMinorVersion(current)){
  if(!/^\d+\.[0-9]\.0$/.test(requested)||requested!==current&&requested!==nextMinorVersion(current))
    throw new Error("Release must be the next minor (rolling .9 to major .0), or an idempotent metadata rebuild.");
  return requested;
}
