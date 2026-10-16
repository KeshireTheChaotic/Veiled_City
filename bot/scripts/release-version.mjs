/** Shared per-phase release policy: .9 rolls to the next major .0; no .10 minor releases. */
export function nextMinorVersion(current){
  // Private fresh-database rewrite series; intentionally not npm publish SemVer.
  if(/^0\.0\.0\.[1-9]\d*$/.test(current)) return `0.0.0.${Number(current.split(".")[3])+1}`;
  if(!/^\d+\.\d+\.\d+$/.test(current)) throw new Error("Invalid current semantic version.");
  const [major,minor]=current.split(".").map(Number);
  return minor>=9?`${major+1}.0.0`:`${major}.${minor+1}.0`;
}
export function nextMajorVersion(current){
  if(!/^\d+\.\d+\.\d+$/.test(current)) throw new Error("Invalid current semantic version.");
  return `${Number(current.split(".")[0])+1}.0.0`;
}
export function phaseVersion(current,requested=nextMinorVersion(current),{major=false}={}){
  if(/^0\.0\.0\.[1-9]\d*$/.test(current) && !major){
    if(requested!==current && requested!==nextMinorVersion(current)) throw new Error("Rewrite release must be current or next revision.");
    return requested;
  }
  const next=major?nextMajorVersion(current):nextMinorVersion(current);
  if(!/^\d+\.[0-9]\.0$/.test(requested)||requested!==current&&requested!==next)
    throw new Error("Release must be the next minor (rolling .9 to major .0), or an idempotent metadata rebuild.");
  return requested;
}
