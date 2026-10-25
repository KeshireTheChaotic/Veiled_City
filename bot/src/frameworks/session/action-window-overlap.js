/** Pure Session coordination classification; never resolves or authorizes an action. */
export function classifyResourceOverlap(a,b){
  const footprint=new Set([...a.reads,...a.writes]);
  if([a.operation,b.operation].includes("testimony")&&[...b.reads,...b.writes].some(key=>footprint.has(key)))return "contradictory_testimony";
  const sharedWrite=a.writes.filter(key=>b.writes.includes(key));
  if(sharedWrite.length)return a.operation==="opposed"||b.operation==="opposed"?"opposed_action":"same_scarce_resource";
  if(a.writes.some(key=>b.reads.includes(key))||b.writes.some(key=>a.reads.includes(key)))return "sequential_dependency";
  if(["help","tag_team","group_action"].includes(a.operation)||["help","tag_team","group_action"].includes(b.operation))return "cooperative";
  return "independent";
}
