/** Deterministic content bootstrap. Folder privacy is a floor; imported material never grants global NPC knowledge or canon. */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { normalizeNpcKey, seedNpcCognition } from "./npc-cognition.js";
import { configureSimulationEntity } from "./simulation.js";
import { backfillSeedData } from "./seed-drafts.js";

const TEXT_EXTENSIONS=new Set([".md",".txt",".json",".csv",".yaml",".yml",".html",".xml"]);
const PRIVATE_LABELS=new Set(["gm","gm_private","private","player","character"]);
const plain=value=>value&&typeof value==="object"&&!Array.isArray(value);
const stem=value=>normalizeNpcKey(String(value).replace(/^GM_PRIVATE_/i,"").replace(/\.[^.]+$/,""));

function discover(root){
  const files=[];
  function walk(dir){
    for(const entry of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
      const full=path.join(dir,entry.name);
      if(entry.isSymbolicLink()) throw new Error("Seed folders cannot contain symbolic links or junctions.");
      if(entry.isDirectory()) walk(full);
      else if(entry.isFile()){
        const sourcePath=path.relative(root,full).split(path.sep).join("/");
        const bytes=fs.readFileSync(full), extension=path.extname(entry.name).toLowerCase();
        const encoding=TEXT_EXTENSIONS.has(extension)?"utf8":"base64";
        const body=encoding==="utf8"?new TextDecoder("utf-8",{fatal:true}).decode(bytes):bytes.toString("base64");
        let json;
        if(extension===".json"){
          try{json=JSON.parse(body.replace(/^\uFEFF/,""));}
          catch{throw new Error(`Invalid JSON in seed source ${sourcePath}; no data was imported.`);}
        }
        files.push({sourcePath,extension,encoding,body,json,sha256:createHash("sha256").update(bytes).digest("hex")});
      }
    }
  }
  for(const folder of ["GM","GM_PRIVATE","PLAYER"]){
    const dir=path.join(root,folder);
    if(!fs.existsSync(dir)) continue;
    if(fs.lstatSync(dir).isSymbolicLink()) throw new Error("Seed roots cannot be symbolic links or junctions.");
    if(!fs.statSync(dir).isDirectory()) throw new Error(`Seed root ${folder} must be a directory.`);
    walk(dir);
  }
  if(!files.length) throw new Error("No files found in GM, GM_PRIVATE, or PLAYER folders.");
  return files;
}

function privacy(file,characters){
  const parts=file.sourcePath.split("/");
  const isGM=parts[0]!=="PLAYER"||parts.some(part=>/^(?:GM|GM_PRIVATE)$/i.test(part));
  const characterFile=parts[1]?.toUpperCase()==="PLAYERS"&&!/^readme\./i.test(parts.at(-1));
  let characterId=null;
  if(characterFile){
    const wanted=plain(file.json)&&file.json.name?normalizeNpcKey(file.json.name):stem(parts.at(-1));
    const matches=characters.filter(c=>normalizeNpcKey(c.name)===wanted);
    if(matches.length===1) characterId=matches[0].id;
  }
  const labels=[];
  function inspect(value){
    if(Array.isArray(value)) value.forEach(inspect);
    else if(plain(value)){
      if(typeof value.visibility==="string") labels.push(value.visibility.toLowerCase());
      if(value.is_secret===true) labels.push("gm");
      Object.values(value).forEach(inspect);
    }
  }
  inspect(file.json);
  // Explicit private metadata can only tighten a folder's visibility, never relax it.
  const privateMetadata=labels.some(label=>PRIVATE_LABELS.has(label)||!["public","party"].includes(label))
    || /^(?:visibility|scope)\s*:\s*(?:gm|gm_private|private|player|character)\s*$/im.test(file.body);
  const visibility=isGM||privateMetadata?"gm":characterFile?(characterId?"character":"gm"):"party";
  return {visibility,characterId,unmatched:characterFile&&!characterId};
}

function catalogKind(file){
  const rel=file.sourcePath.toLowerCase();
  for(const [suffix,kind] of [["/npcs/npcs.json","npc"],["/factions/factions.json","faction"],
    ["/locations/locations.json","location"],["/adversaries/adversaries.json","adversary"],
    ["/environments/environments.json","environment"],["/mysteries/mystery_index.json","mystery"]]){
    if(rel.endsWith(suffix)) return kind;
  }
  return rel.endsWith("/gm_state.json")?"state":"json";
}

function catalogEntries(json){
  if(Array.isArray(json)) return json.map((data,index)=>[String(index),data]);
  if(plain(json)) return Object.entries(json);
  return [["value",json]];
}

function seedRuntimeEntity(db,guildId,kind,data,counts){
  if(!plain(data)||!data.name) return;
  const key=normalizeNpcKey(data.name);
  if(!key) return;
  if(["npc","location"].includes(kind)&&!db.getReference(guildId,kind,key)){
    // Even a dossier's "public" field does not mean the party has discovered this entity.
    db.upsertReference(guildId,{kind,key,name:data.name,summary:String(data.public||""),visibility:"gm"});
    counts.references++;
  }
  if(["faction","location"].includes(kind)&&!db.getSimulationEntity(guildId,kind,key)){
    configureSimulationEntity(db,guildId,kind,key,{display_name:data.name,dossier:data,
      ...(kind==="faction"?{activity_tier:"supporting",policy:{methods:data.methods||[]}}:{})});
    counts.entities++;
    if(kind==="faction"&&data.goal){
      db.putSimulationRecord(guildId,{kind:"goal",entityKey:`faction:${key}`,
        data:{goal_key:"seed.primary",objective:data.goal,priority:80,dependencies:[],source:"gm_dossier"}});
    }
  }
}

/** Add-only seed: changed sources are reported, not silently allowed to rewrite live campaign state. */
export function seedData({db,content,guildId,actorId="system"}){
  const files=discover(path.resolve(content.root));
  const characters=db.campaignCharacters(guildId);
  const counts={files:0,party:0,character:0,gm:0,binary:0,catalog:0,references:0,entities:0,narratives:0,
    skipped:0,changed:0,unmatched:0,narrativeConflicts:0};
  const dossiers=[];
  return db.transaction(()=>{
    db.snapshotCampaign(guildId,{label:"Pre-content seed",reason:"Safety snapshot before privacy-aware seed-data",createdBy:actorId});
    for(const file of files){
      const existing=db.getSeedDocument(guildId,file.sourcePath);
      if(existing){counts.skipped++; if(existing.sha256!==file.sha256) counts.changed++; continue;}
      const boundary=privacy(file,characters);
      db.insertSeedDocument(guildId,{...file,...boundary,actorId});
      counts.files++; counts[boundary.visibility]++;
      if(file.encoding==="base64") counts.binary++;
      if(boundary.unmatched) counts.unmatched++;
      if(file.json!==undefined){
        const kind=catalogKind(file);
        // Known structured lists use whole entries, not their individual object fields.
        const entries=["state","json"].includes(kind)?catalogEntries(file.json)
          :plain(file.json)&&typeof file.json.name==="string"?[[normalizeNpcKey(file.json.name),file.json]]:catalogEntries(file.json);
        for(const [key,data] of entries){
          db.insertSeedCatalog(guildId,{sourcePath:file.sourcePath,key,kind,data,...boundary});
          counts.catalog++;
        }
      }
      if(boundary.characterId&&file.extension===".md"&&file.body.trim()){
        const scope=boundary.visibility==="character"?"player":"gm_private";
        if(db.getCharacterNarrative(guildId,boundary.characterId,scope)) counts.narrativeConflicts++;
        else if(Buffer.byteLength(file.body,"utf8")<=131072){
          db.upsertCharacterNarrative(guildId,boundary.characterId,scope,file.body,{sourceFilename:file.sourcePath,importedBy:actorId});
          counts.narratives++;
        }else counts.narrativeConflicts++;
      }
    }
    // Backfill from the accepted archive, not changed disk files. Older seed receipts do not block new adapters.
    for(const row of db.listSeedCatalog(guildId,{includeGM:true})){
      if(row.visibility!=="gm"||row.source_path.split("/")[0]==="PLAYER") continue;
      seedRuntimeEntity(db,guildId,row.kind,row.data,counts);
      if(row.kind==="npc"){
        const data=row.data;
        if(!plain(data)||typeof data.name!=="string"||(data.knows!==undefined&&!Array.isArray(data.knows))
          ||(data.does_not!==undefined&&!Array.isArray(data.does_not))) throw new Error("Invalid NPC dossier in seed data.");
        if(!db.getNpcProfile(guildId,normalizeNpcKey(data.name))) dossiers.push(data);
      }
    }
    if(dossiers.length||!db.getSeedRun(guildId,"npc_cognition_v1")){
      counts.cognition=seedNpcCognition({db,guildId,actorId,incremental:true,
        content:{read:()=>JSON.stringify(dossiers)}});
    }
    counts.bulk=backfillSeedData(db,guildId,actorId);
    if(!db.getSeedRun(guildId,"seed_data_v1")) db.recordSeedRun(guildId,"seed_data_v1",{actorId,summary:counts});
    db.recordMutation(guildId,{actorType:"human_gm",actorId,sourceLayer:"seed",mutationType:"content_seed",
      entityKey:"seed_data_v1",visibility:"gm",confidence:100,rationale:"Add-only folder import with explicit privacy boundaries.",after:counts});
    return counts;
  });
}
