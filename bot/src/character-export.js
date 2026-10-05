import { Buffer } from "node:buffer";

function safeText(v){
  return v==null?"":String(v);
}
export function safeStem(name){
  const s=safeText(name).normalize("NFKD").replace(/[^A-Za-z0-9]+/g,"_").replace(/^_+|_+$/g,"");
  return s||"Character";
}
function xmlEscape(s){
  return safeText(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,"")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&apos;");
}
function mdValue(v){
  if(Array.isArray(v)) return v.length?v.map(x=>typeof x==="string"?x:JSON.stringify(x)).join("; "):"—";
  if(v&&typeof v==="object") return JSON.stringify(v);
  return v==null||v===""?"—":String(v);
}
function normalizeExperiences(items=[]){
  return items.map(e=>typeof e==="string"?e:`${e.name||"Experience"}${e.modifier!=null?` ${Number(e.modifier)>=0?"+":""}${e.modifier}`:""}`);
}
function normalizeCards(items=[]){
  return items.map(c=>typeof c==="string"?c:[c.name,c.domain&&`(${c.domain}${c.level?` ${c.level}`:""})`].filter(Boolean).join(" "));
}
function factView(row){return {category:row.category,key:row.fact_key,content:row.content,visibility:row.visibility,session_id:row.session_id,source:row.source,created_at:row.created_at};}
function clockView(row){return {key:row.clock_key,label:row.label,value:row.value,max_value:row.max_value,visibility:row.visibility,updated_at:row.updated_at};}
function threadView(row){return {id:row.id,label:row.label,status:row.status,visibility:row.visibility,notes:row.notes,updated_at:row.updated_at};}
function referenceView(row){return {kind:row.kind,key:row.entity_key,name:row.display_name,summary:row.summary,visibility:row.visibility,updated_at:row.updated_at};}
function canonView(row){return {key:row.canon_key,value:row.value,visibility:row.visibility,status:row.status,session_id:row.session_id,source_type:row.source_type,source_id:row.source_id,provenance:row.provenance,created_at:row.created_at};}
function relationshipView(row){return {id:row.id,from_type:row.from_type,from_key:row.from_key,from_label:row.from_label,to_type:row.to_type,to_key:row.to_key,to_label:row.to_label,relationship_type:row.relationship_type,score:row.score,visibility:row.visibility,note:row.note,source:row.source,updated_at:row.updated_at};}

export function buildPlayerExport(db,guildId,character){
  const d=structuredClone(character.data||{});
  const known=db.factsFor(guildId,character.owner_user_id||"",{characterId:character.id,includeGM:false,limit:200}).map(factView);
  return {
    ...d,
    name:character.name,
    export_meta:{
      schema:"veiled-city-character-export-v3.3.1",
      visibility:"player_safe",
      character_id:character.id,
      status:character.status,
      is_guest:Boolean(character.is_guest),
      exported_at:new Date().toISOString()
    },
    campaign_knowledge:known,
    relationships:db.listRelationships(guildId,{includeGM:false,characterId:character.id,userId:character.owner_user_id||""}).filter(r=>r.from_key===character.id||r.to_key===character.id||r.source_character_id===character.id).map(relationshipView)
  };
}

export function buildGmHooksExport(character,db=null,guildId=null){
  const d=character.data||{};
  return {
    export_meta:{schema:"veiled-city-gm-hooks-v3.3.1",visibility:"gm_private",character_id:character.id,name:character.name,exported_at:new Date().toISOString()},
    character:{name:character.name,level:d.level??1,class:d.class||"",subclass:d.subclass||"",ancestry:d.ancestry||"",community:d.community||"",domains:d.domains||[]},
    background:d.background||"",
    home:d.home||"",
    person:d.person||"",
    obligation:d.obligation||"",
    opening_status:d.opening_status||"",
    goals:d.goals||[],
    unresolved_incident:d.unresolved_incident||"",
    gm_hooks:d.gm_hooks||[],
    hook_permissions:d.hook_permissions||[],
    faction_connections:d.faction_connections||[],
    entry_hooks:d.entry_hooks||[],
    exit_hooks:d.exit_hooks||[],
    notes:d.notes||"",
    imported_gm_hooks:(db&&guildId)?db.listCharacterGmHooks(guildId,character.id,{includeResolved:true}).map(h=>({key:h.hook_key,title:h.title,type:h.hook_type,premise:h.premise,permission:h.permission,suggested_entry:h.suggested_entry,status:h.status,payload:h.payload,source:h.source,updated_at:h.updated_at})):[]
  };
}

export function buildGmPrivateExport(db,guildId,character){
  const owner=character.owner_user_id||"";
  const facts=db.characterPrivateFacts(guildId,character.id,owner).map(factView);
  const clocks=db.characterPrivateClocks(guildId,character.id,owner).map(clockView);
  const threads=db.characterPrivateThreads(guildId,character.id,owner).map(threadView);
  const references=db.characterPrivateReferences(guildId,character.id,owner).map(referenceView);
  return {
    export_meta:{schema:"veiled-city-gm-private-v3.3.1",visibility:"gm_private",character_id:character.id,name:character.name,exported_at:new Date().toISOString()},
    character:{name:character.name,status:character.status,owner_user_id:character.owner_user_id||null},
    private_facts:facts,
    private_clocks:clocks,
    private_threads:threads,
    private_references:references,
    relationships:db.listRelationships(guildId,{includeGM:true,characterId:character.id,userId:owner}).filter(r=>r.from_key===character.id||r.to_key===character.id||r.source_character_id===character.id).map(relationshipView)
  };
}

function characterCanonMatch(row,character){
  const name=safeText(character.name).toLowerCase();
  const slug=safeStem(character.name).toLowerCase();
  const compact=slug.replaceAll("_","");
  const key=safeText(row.canon_key).toLowerCase().replace(/[^a-z0-9_.-]+/g,"_");
  const keyCompact=key.replace(/[^a-z0-9]/g,"");
  const value=safeText(row.value).toLowerCase();
  return row.source_id===character.id || key.includes(slug) || (compact.length>=5&&keyCompact.includes(compact)) || (name.length>=4&&value.includes(name));
}
export function buildGmCanonExport(db,guildId,character){
  const canon=db.listCanon(guildId,{includeGM:true,limit:1000}).filter(r=>characterCanonMatch(r,character)).map(canonView);
  const keys=new Set(canon.map(r=>r.key));
  const conflicts=db.listCanonConflicts(guildId).filter(r=>keys.has(r.canon_key)||characterCanonMatch(r,character)).map(r=>({
    id:r.id,key:r.canon_key,existing_value:r.existing_value,proposed_value:r.proposed_value,proposed_visibility:r.proposed_visibility,status:r.status,created_at:r.created_at
  }));
  return {
    export_meta:{schema:"veiled-city-gm-canon-v3.3.1",visibility:"gm_private",character_id:character.id,name:character.name,exported_at:new Date().toISOString()},
    canon,
    pending_conflicts:conflicts
  };
}

function section(title,items){
  if(!items||!items.length) return `## ${title}\n\nNone.\n`;
  return `## ${title}\n\n${items.map(x=>`- ${x}`).join("\n")}\n`;
}
function objectBullets(obj={}){
  return Object.entries(obj).map(([k,v])=>`${k.replaceAll("_"," ")}: ${mdValue(v)}`);
}

export function playerMarkdown(payload){
  const r=payload.resources||{}, t=payload.traits||{}, th=payload.thresholds||{};
  const lines=[
    `# ${payload.name}`,
    `**Veiled City Character Export — PLAYER SAFE**`,
    ``,
    `Level **${payload.level??1}** ${payload.class||""}${payload.subclass?` / ${payload.subclass}`:""}  `,
    `${payload.ancestry||""}${payload.community?` • ${payload.community}`:""}  `,
    `Domains: ${(payload.domains||[]).join(" / ")||"—"}`,
    ``,
    `## Traits`,
    ...Object.entries(t).map(([k,v])=>`- **${k}:** ${v}`),
    ``,
    `## Current Resources`,
    `- **Evasion:** ${payload.evasion??"—"}`,
    `- **Proficiency:** ${payload.proficiency??"—"}`,
    `- **HP:** ${r.hp?.current??"—"}/${r.hp?.max??"—"}`,
    `- **Stress:** ${r.stress?.current??"—"}/${r.stress?.max??"—"}`,
    `- **Hope:** ${r.hope??"—"}`,
    `- **Armor:** ${r.armor?.current??"—"}/${r.armor?.max??"—"}`,
    `- **Major / Severe:** ${th.major??"—"} / ${th.severe??"—"}`,
    ``,
    section("Experiences",normalizeExperiences(payload.experiences||[])),
    section("Domain Cards",normalizeCards(payload.domain_cards||[])),
    section("Inventory",(payload.inventory||[]).map(x=>typeof x==="string"?x:JSON.stringify(x))),
    `## Background & Hooks`,
    ...objectBullets({background:payload.background,home:payload.home,person:payload.person,obligation:payload.obligation,opening_status:payload.opening_status,unresolved_incident:payload.unresolved_incident}),
    ``,
    section("Goals",payload.goals||[]),
    section("Faction Connections",payload.faction_connections||[]),
    section("Relationships",(payload.relationships||[]).map(r=>`${r.from_label||r.from_key} — ${r.relationship_type} (${r.score>=0?"+":""}${r.score}) → ${r.to_label||r.to_key}${r.note?`: ${r.note}`:""}`)),
    section("Known Campaign Information",(payload.campaign_knowledge||[]).map(f=>`[${f.visibility}] ${f.content}`)),
    `## Export Metadata`,
    `- Status: ${payload.export_meta?.status||"—"}`,
    `- Exported: ${payload.export_meta?.exported_at||"—"}`,
    `- Character ID: ${payload.export_meta?.character_id||"—"}`
  ];
  return lines.join("\n");
}

export function gmHooksMarkdown(payload){
  const c=payload.character||{};
  return [
    `# GM HOOKS — ${payload.export_meta?.name||"Character"}`,
    `**GM PRIVATE**`,"",
    `${c.class||""}${c.subclass?` / ${c.subclass}`:""} • Level ${c.level??1} • ${(c.domains||[]).join(" / ")}`,"",
    `## Character Anchors`,...objectBullets({background:payload.background,home:payload.home,person:payload.person,obligation:payload.obligation,opening_status:payload.opening_status,unresolved_incident:payload.unresolved_incident}),"",
    section("Goals",payload.goals||[]),
    section("GM Hooks",payload.gm_hooks||[]),
    section("Hook Permissions",(payload.hook_permissions||[]).map(h=>`${h.classification||"unspecified"}: ${h.text||JSON.stringify(h)}`)),
    section("Faction Connections",payload.faction_connections||[]),
    section("Entry Hooks",payload.entry_hooks||[]),
    section("Exit Hooks",payload.exit_hooks||[]),
    `## Notes\n\n${payload.notes||"—"}\n`
  ].join("\n");
}
export function gmPrivateMarkdown(payload){
  return [
    `# GM PRIVATE — ${payload.export_meta?.name||"Character"}`,
    `**GM PRIVATE — do not share with the player unless revealed in play.**`,"",
    section("Private Facts",(payload.private_facts||[]).map(x=>`[${x.visibility}] ${x.key}: ${x.content}`)),
    section("Private Clocks",(payload.private_clocks||[]).map(x=>`${x.label}: ${x.value}/${x.max_value} [${x.visibility}]`)),
    section("Private Threads",(payload.private_threads||[]).map(x=>`${x.label} — ${x.status}: ${x.notes||""}`)),
    section("Private References",(payload.private_references||[]).map(x=>`${x.kind}: ${x.name} — ${x.summary}`)),
    section("Relationship Graph",(payload.relationships||[]).map(r=>`${r.from_label||r.from_key} — ${r.relationship_type} (${r.score>=0?"+":""}${r.score}) → ${r.to_label||r.to_key}${r.note?`: ${r.note}`:""} [${r.visibility}]`))
  ].join("\n");
}
export function gmCanonMarkdown(payload){
  return [
    `# GM CANON — ${payload.export_meta?.name||"Character"}`,
    `**GM PRIVATE — authoritative canon associated with this character.**`,"",
    section("Current Canon",(payload.canon||[]).map(x=>`\`${x.key}\` = ${x.value} [${x.visibility}]`)),
    section("Pending Canon Conflicts",(payload.pending_conflicts||[]).map(x=>`\`${x.id.slice(0,8)}\` ${x.key}: existing=${x.existing_value}; proposed=${x.proposed_value}`))
  ].join("\n");
}

function crc32(buf){
  let c=0xffffffff;
  for(const b of buf){
    c^=b;
    for(let k=0;k<8;k++) c=(c>>>1)^((c&1)?0xedb88320:0);
  }
  return (c^0xffffffff)>>>0;
}
function dosStamp(date=new Date()){
  const y=Math.max(1980,date.getFullYear());
  const time=(date.getHours()<<11)|(date.getMinutes()<<5)|(Math.floor(date.getSeconds()/2));
  const day=((y-1980)<<9)|((date.getMonth()+1)<<5)|date.getDate();
  return {time,day};
}
function u16(v){const b=Buffer.alloc(2);b.writeUInt16LE(v&0xffff);return b;}
function u32(v){const b=Buffer.alloc(4);b.writeUInt32LE(v>>>0);return b;}
export function zipStore(entries){
  const locals=[],centrals=[]; let offset=0; const stamp=dosStamp();
  for(const [name,value] of entries){
    const n=Buffer.from(name,"utf8"), data=Buffer.isBuffer(value)?value:Buffer.from(value,"utf8"), crc=crc32(data);
    const local=Buffer.concat([u32(0x04034b50),u16(20),u16(0x0800),u16(0),u16(stamp.time),u16(stamp.day),u32(crc),u32(data.length),u32(data.length),u16(n.length),u16(0),n,data]);
    locals.push(local);
    const central=Buffer.concat([u32(0x02014b50),u16(20),u16(20),u16(0x0800),u16(0),u16(stamp.time),u16(stamp.day),u32(crc),u32(data.length),u32(data.length),u16(n.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),n]);
    centrals.push(central); offset+=local.length;
  }
  const centralOffset=offset, centralBuf=Buffer.concat(centrals);
  const end=Buffer.concat([u32(0x06054b50),u16(0),u16(0),u16(entries.length),u16(entries.length),u32(centralBuf.length),u32(centralOffset),u16(0)]);
  return Buffer.concat([...locals,centralBuf,end]);
}
function docxParagraph(text,{heading=0,bullet=false,bold=false}={}){
  const clean=xmlEscape(text);
  const size=heading===1?34:heading===2?28:heading===3?24:20;
  const prefix=bullet?"• ":"";
  const props=(bold||heading)?`<w:rPr>${bold||heading?"<w:b/>":""}<w:sz w:val=\"${size}\"/><w:szCs w:val=\"${size}\"/></w:rPr>`:`<w:rPr><w:sz w:val=\"20\"/><w:szCs w:val=\"20\"/></w:rPr>`;
  return `<w:p><w:pPr><w:spacing w:after=\"${heading?120:60}\"/></w:pPr><w:r>${props}<w:t xml:space=\"preserve\">${xmlEscape(prefix)}${clean}</w:t></w:r></w:p>`;
}
function markdownToDocumentXml(markdown){
  const paras=[]; let inFence=false;
  for(const raw of safeText(markdown).split(/\r?\n/)){
    if(raw.trim().startsWith("```")){inFence=!inFence;continue;}
    if(!raw.trim()){paras.push("<w:p/>");continue;}
    if(raw.startsWith("### ")) paras.push(docxParagraph(raw.slice(4).replaceAll("**",""),{heading:3,bold:true}));
    else if(raw.startsWith("## ")) paras.push(docxParagraph(raw.slice(3).replaceAll("**",""),{heading:2,bold:true}));
    else if(raw.startsWith("# ")) paras.push(docxParagraph(raw.slice(2).replaceAll("**",""),{heading:1,bold:true}));
    else if(raw.startsWith("- ")) paras.push(docxParagraph(raw.slice(2).replaceAll("**","").replaceAll("`",""),{bullet:true}));
    else paras.push(docxParagraph(raw.replaceAll("**","").replaceAll("`",""),{bold:inFence}));
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paras.join("")}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="360" w:footer="360" w:gutter="0"/></w:sectPr></w:body></w:document>`;
}
export function markdownToDocx(markdown,title="Veiled City Character Export"){
  const files=[
    ["[Content_Types].xml",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`],
    ["_rels/.rels",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`],
    ["word/document.xml",markdownToDocumentXml(markdown)],
    ["word/_rels/document.xml.rels",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`],
    ["docProps/core.xml",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xmlEscape(title)}</dc:title><dc:creator>Veilkeeper</dc:creator><cp:lastModifiedBy>Veilkeeper</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created></cp:coreProperties>`],
    ["docProps/app.xml",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Veilkeeper</Application></Properties>`]
  ];
  return zipStore(files);
}

function formatsFor(format){return format==="all"?["json","markdown","docx"]:[format];}
function filesForPayload(stem,payload,markdown,format){
  const files=[];
  for(const f of formatsFor(format)){
    if(f==="json") files.push({name:`${stem}.json`,buffer:Buffer.from(JSON.stringify(payload,null,2)+"\n","utf8")});
    if(f==="markdown") files.push({name:`${stem}.md`,buffer:Buffer.from(markdown,"utf8")});
    if(f==="docx") files.push({name:`${stem}.docx`,buffer:markdownToDocx(markdown,stem.replaceAll("_"," "))});
  }
  return files;
}
export function createPlayerExportFiles({db,guildId,character,format="docx"}){
  const payload=buildPlayerExport(db,guildId,character), md=playerMarkdown(payload), stem=`CHARACTER_${safeStem(character.name)}`;
  return filesForPayload(stem,payload,md,format);
}
export function createGmExportFiles({db,guildId,character,format="all"}){
  const stem=safeStem(character.name);
  const hooks=buildGmHooksExport(character,db,guildId), priv=buildGmPrivateExport(db,guildId,character), canon=buildGmCanonExport(db,guildId,character);
  return [
    ...filesForPayload(`GM_HOOKS_${stem}`,hooks,gmHooksMarkdown(hooks),format),
    ...filesForPayload(`GM_PRIVATE_${stem}`,priv,gmPrivateMarkdown(priv),format),
    ...filesForPayload(`GM_CANON_${stem}`,canon,gmCanonMarkdown(canon),format)
  ];
}
