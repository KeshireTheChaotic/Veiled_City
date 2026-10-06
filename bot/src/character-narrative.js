import { zipStore, safeStem } from "./character-export.js";

const MAX_MARKDOWN_BYTES=128*1024;

export function normalizeNarrativeMarkdown(text){
  const out=String(text??"").replace(/^\uFEFF/,"").replace(/\r\n?/g,"\n").trimEnd()+"\n";
  if(!out.trim()) throw new Error("Narrative Markdown cannot be empty.");
  if(Buffer.byteLength(out,"utf8")>MAX_MARKDOWN_BYTES) throw new Error("Narrative Markdown is too large; maximum is 128 KiB.");
  return out;
}

export function narrativeRelativePath(characterName,scope){
  const stem=safeStem(characterName);
  if(scope==="player") return `PLAYER/PLAYERS/${stem}.md`;
  if(scope==="gm_private") return `GM_PRIVATE/PLAYERS/GM_PRIVATE_${stem}.md`;
  throw new Error("Narrative scope must be player or gm_private.");
}

function scaffold(character,scope){
  if(scope==="gm_private") return [
    `# GM PRIVATE — ${character.name}`,
    ``,
    `> GM-only freeform narrative for details that do not fit the structured JSON/GM-hook schema.`,
    `> Do not duplicate authoritative canon here when a canon-ledger entry is more appropriate.`,
    ``,
    `## Hidden Background`,
    ``,
    ``,
    `## Private Motivations / Complications`,
    ``,
    ``,
    `## Narrative Notes`,
    ``
  ].join("\n");
  return [
    `# ${character.name}`,
    ``,
    `> Player-safe freeform character narrative for details not represented by the structured JSON sheet.`,
    ``,
    `## Background`,
    ``,
    ``,
    `## Personality / Voice`,
    ``,
    ``,
    `## Appearance / Habits`,
    ``,
    ``,
    `## Additional Narrative Notes`,
    ``
  ].join("\n");
}

export function getNarrativeMarkdown(db,guildId,character,scope,{scaffoldIfMissing=true}={}){
  const row=db.getCharacterNarrative(guildId,character.id,scope);
  if(row?.markdown) return row.markdown;
  return scaffoldIfMissing?scaffold(character,scope):"";
}

export function createNarrativeExportPackage({db,guildId,character,scope="player"}){
  const scopes=scope==="all"?["player","gm_private"]:[scope];
  const entries=scopes.map(s=>[narrativeRelativePath(character.name,s),getNarrativeMarkdown(db,guildId,character,s)]);
  const zip=zipStore(entries);
  return {
    name:`VEILED_CITY_NARRATIVE_${safeStem(character.name)}_${scope.toUpperCase()}.zip`,
    buffer:zip,
    files:entries.map(([name])=>name)
  };
}

export function narrativeContext(db,guildId,characterIds,{includeGM=true,maxChars=12000}={}){
  const ids=(characterIds||[]).filter(Boolean);
  if(!ids.length) return [];
  return db.listCharacterNarratives(guildId,{characterIds:ids,includeGM}).map(r=>{
    const c=db.getCharacter(r.character_id);
    const full=String(r.markdown||"");
    return {
      character_id:r.character_id,
      character_name:c?.name||"",
      scope:r.scope,
      markdown:full.length>maxChars?`${full.slice(0,maxChars)}
...[narrative truncated]`:full,
      source_filename:r.source_filename||"",
      updated_at:r.updated_at
    };
  });
}
