/** Original diagnostic channel fetch; preserve exact Promise and error for the read-only report. */
export function fetchDiagnosticChannel(guild,id){return guild.channels.fetch(id);}
