import {DatabaseSync} from 'node:sqlite';
/** Read-only view of the existing campaign/character tables for the native adapters.
 * It opens the file read-only (never creating or migrating it) and exposes only the three
 * reads the native root needs, with the same row shapes as the legacy repository.
 */
export function openLegacyReadOnlyRepository(filename){
  if(typeof filename!=='string'||!filename||filename===':memory:')throw new TypeError('Existing legacy database file required');
  const db=new DatabaseSync(filename,{readOnly:true});
  const character=db.prepare('SELECT * FROM characters WHERE id=?'),campaign=db.prepare('SELECT * FROM campaigns WHERE guild_id=?');
  const parse=row=>row?{...row,data:JSON.parse(row.character_json)}:null;
  return Object.freeze({
    getCharacter:id=>parse(character.get(id)),
    getCampaign:guildId=>campaign.get(guildId)??null,
    listCharacters(guildId,ownerUserId,{includeClosed=true}={}){
      const sql=`SELECT * FROM characters WHERE guild_id=? AND owner_user_id=?${includeClosed?'':" AND status IN ('active','reserve','guest')"} ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'reserve' THEN 1 WHEN 'guest' THEN 2 ELSE 3 END,name`;
      return db.prepare(sql).all(guildId,ownerUserId).map(parse);
    },
    close:()=>db.close()
  });
}
