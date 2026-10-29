/** Original read-only minor identity/catalog collision validation. */
import {cityObject,cityKey} from './city-calendar.js';
import {normalizeEntityKey as normalizeNpcKey} from '../../kernel/entity-key.js';
import {minorNpcSchema} from './minor-npc-schema.js';
function reservedNames(db,content,guildId){
  const names=db.listNpcProfiles(guildId,{limit:500}).map(row=>row.display_name);
  for(const rel of ["GM_PRIVATE/NPCS/npcs.json","GM/NPCS/npcs.json"]){
    const raw=content.read(rel);if(!raw.trim()) continue;
    const parsed=JSON.parse(raw);if(!Array.isArray(parsed)) throw new Error("Packaged NPC roster must be an array.");
    names.push(...parsed.map(row=>row.name).filter(Boolean));
  }
  return [...new Set(names)];
}
export function validateMinorIdentity(db,content,guildId,key,data){
  cityObject(data);
  if(Object.keys(data).some(field=>!minorNpcSchema.required.includes(field))) throw new Error("Minor NPC draft contains unsupported fields or unearned knowledge.");
  for(const field of minorNpcSchema.required) cityKey(data[field]);
  const canonical=reservedNames(db,content,guildId).map(normalizeNpcKey),name=normalizeNpcKey(data.name);
  if(!name||canonical.includes(name)||db.cityNpcNameInUse(guildId,data.name)||db.getNpcProfile(guildId,key)||db.getReference(guildId,"npc",name))
    throw new Error("Named NPC identity already exists; generation cannot replace canon.");
}
export {reservedNames as reservedMinorNpcNames};
