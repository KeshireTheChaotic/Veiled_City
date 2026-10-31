/** Original ready-event registration only; dependencies retain all recovery, storage and opening authority. */
export function registerClientReadyHandler({client,db,gm,log,config,content,resumeAutonomousPvpFear,runSessionOpening,consoleOutput=console}){
client.once("clientReady",()=>{
  db.markAllInterruptedPublicationsUncertain();
  for(const guild of client.guilds.cache.values()){
    try{resumeAutonomousPvpFear(db,guild.id,{limit:12});}
    catch(error){log.error("Autonomous immediate Fear recovery requires review",error);}
    // Only a never-attempted native opening can execute automatically. Interrupted/uncertain work is held.
    void runSessionOpening({db,guild,gm}).catch(()=>log.error('Native session opening requires source review.'));
  }
  consoleOutput.log(`Veilkeeper v3.5.5 logged in as ${client.user.tag}`);
  consoleOutput.log(`Voice narration: ${config.voiceEnabled?`enabled (${config.voiceName}/${config.voiceModel})`:"disabled"}.`);
  consoleOutput.log(`Indexed ${content.chunks.length} Veiled City content chunks.`);
});
}
