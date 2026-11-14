// Pure legacy-format port. Authentication, safe projection and delivery are native caller responsibilities.
import {safeText} from './character-packages.js';
import {zipStore} from '../kernel/zip-store.js';
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
    section("Imported GM Hooks",(payload.imported_gm_hooks||[]).map(h=>`${h.title||h.key} [${h.status||"active"}; ${h.type||"other"}]: ${h.premise||""}; permission=${h.permission||"open_question"}${h.suggested_entry?`; entry=${h.suggested_entry}`:""}${h.payload?`; source payload=${JSON.stringify(h.payload)}`:""}`)),
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
    section("Imported Canon Proposals",(payload.canon_proposals||[]).map(x=>`\`${x.id.slice(0,8)}\` ${x.status.toUpperCase()} ${x.key}: proposed=${x.proposed_value}${x.resolution_value?`; resolution=${x.resolution_value}`:""}`)),
    section("Pending Canon Conflicts",(payload.pending_conflicts||[]).map(x=>`\`${x.id.slice(0,8)}\` ${x.key}: existing=${x.existing_value}; proposed=${x.proposed_value}`))
  ].join("\n");
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

/** Build only already-scoped payloads. This is not an export entitlement. */
export function characterExportFiles(stem,payload,scope,format){
  if(!['json','markdown','docx','all'].includes(format)||!['player','hooks','private','canon'].includes(scope))throw new Error('Supported native character export format required');
  const markdown=()=>({player:playerMarkdown,hooks:gmHooksMarkdown,private:gmPrivateMarkdown,canon:gmCanonMarkdown}[scope])(payload);
  return (format==='all'?['json','markdown','docx']:[format]).map(f=>{
    const name=`${stem}.${f==='markdown'?'md':f}`;
    const bytes=f==='json'?Buffer.from(JSON.stringify(payload,null,2)+'\n','utf8'):f==='markdown'?Buffer.from(markdown(),'utf8'):markdownToDocx(markdown(),stem.replaceAll('_',' '));
    return Object.freeze({name,base64:bytes.toString('base64'),bytes:bytes.length});
  });
}
