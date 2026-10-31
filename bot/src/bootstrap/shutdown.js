/** Original signal callbacks only; no added cleanup policy, awaiting or error handling. */
export function registerShutdownHandlers({voice,db,client,processLifecycle=process}){
  processLifecycle.on("SIGINT",()=>{voice.destroy();db.close();client.destroy();processLifecycle.exit(0);});
  processLifecycle.on("SIGTERM",()=>{voice.destroy();db.close();client.destroy();processLifecycle.exit(0);});
}
