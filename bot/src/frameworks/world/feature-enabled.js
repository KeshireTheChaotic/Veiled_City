export function requireWorldFeature(db,guildId,key){if(db.getCityCalendar(guildId).flags[key]!==true) throw new Error(`The ${key} feature is opt-in and not enabled.`);}
