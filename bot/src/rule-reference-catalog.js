/** Versioned, bounded rule references that native adjudication may actually ground. */
const SRD_VERSION="2.0 (2026-08-25)";
const srd=new Map([
  ["srd:action-rolls",{title:"Action rolls and Duality Dice",rollKinds:["action","attack"],version:SRD_VERSION}],
  ["srd:reaction-rolls",{title:"Reaction rolls",rollKinds:["reaction"],version:SRD_VERSION}],
  ["srd:attack-rolls",{title:"Attack rolls",rollKinds:["attack"],version:SRD_VERSION}],
  ["srd:experiences",{title:"Experiences",rollKinds:["action","reaction","attack"],version:SRD_VERSION}],
  ["srd:help-an-ally",{title:"Help an Ally",rollKinds:["action","reaction","attack"],version:SRD_VERSION}],
  ["srd:tag-team-rolls",{title:"Tag Team Rolls",rollKinds:["action","reaction","attack"],version:SRD_VERSION}]
]);

const bounded=values=>Array.isArray(values)&&values.length>0&&values.length<=8
  &&values.every(ref=>typeof ref==="string"&&ref.length<=200);

/** Prefixes classify a reference; this lookup establishes existence, campaign scope and applicability. */
export function resolveRuleReferences(db,guild,kind,refs,{rollKind=""}={}){
  if(!bounded(refs))return null;
  const expected={RAW:"srd:",campaign_override:"override:",house_rule:"house:",homebrew:"homebrew:"}[kind];
  if(!expected||refs.some(ref=>!ref.startsWith(expected)))return null;
  const sources=[];
  for(const ref of refs){
    if(kind==="RAW"){
      const entry=srd.get(ref);
      if(!entry||rollKind&&!entry.rollKinds.includes(rollKind))return null;
      sources.push({ref,authority:"RAW",version:entry.version,title:entry.title,
        scope:"global",catalog:"Daggerheart SRD reference catalog"});
      continue;
    }
    const key=ref.slice(expected.length);
    if(!key||key.includes("@scene:"))return null;
    const ruling=db.getRulesRuling(guild,key);
    if(!ruling)return null;
    sources.push({ref,authority:kind,version:String(ruling.updated_at||ruling.created_at||"saved"),
      title:ruling.question,scope:`campaign:${guild}`,ruling_key:ruling.ruling_key});
  }
  return sources;
}

export function knownSrdReference(ref){return srd.has(ref);}
