export function hasPcReference(db,guild,text){
  const value=String(text).toLocaleLowerCase();
  return db.listGuildCharacters(guild).some(pc=>[pc.id,pc.name].filter(Boolean)
    .some(name=>value.includes(String(name).toLocaleLowerCase())));
}
