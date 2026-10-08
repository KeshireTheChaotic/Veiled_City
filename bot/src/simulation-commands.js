/** GM-only simulation configuration, review, inspection, and explicit fictional time advancement. */
import { AttachmentBuilder } from "discord.js";
import { PermissionError, NotFoundError } from "./errors.js";
import { applySimulationUpdates, configureSimulationEntity, simulationOverview, submitNpcAction,
  resolveNpcAction, shareInformation, processSimulationEvents } from "./simulation.js";
import { publishSimulationHooks } from "./publishing.js";
import { normalizeNpcKey } from "./npc-cognition.js";
import { proposeGoalTransition, reviewGoalTransition, runMotivationCycle } from "./simulation-motivation.js";
import { subscribeConsequence, coordinateConsequences, reviewConsequence } from "./city-consequences.js";
import { transferSupply } from "./supply-dependencies.js";

function objectInput(interaction,name="json"){
  const value=JSON.parse(interaction.options.getString(name,true));
  if(!value||typeof value!=="object"||Array.isArray(value)) throw new Error("Provide a JSON object.");
  return value;
}

export async function handleSimulationCommand(interaction,{db,isGm,sub}){
  if(!isGm) throw new PermissionError("GM/admin permission required.");
  const guildId=interaction.guildId;
  let result,summary="Simulation state",publish=false;
  if(sub==="status") result=simulationOverview(db,guildId);
  else if(sub==="goal"){
    const input=objectInput(interaction);
    result=input.decision?reviewGoalTransition(db,guildId,input,interaction.user.id):proposeGoalTransition(db,guildId,input,interaction.user.id);
  }else if(sub==="consequence"){
    const input=objectInput(interaction);
    result=["subscribe","unsubscribe"].includes(input.op)?subscribeConsequence(db,guildId,input,interaction.user.id)
      :input.op==="run"?db.transaction(()=>({goals:runMotivationCycle(db,guildId,1),consequences:coordinateConsequences(db,guildId,1)}))
      :reviewConsequence(db,guildId,input,interaction.user.id);
  }
  else if(sub==="records") result=db.listSimulationRecords(guildId,{
    kind:interaction.options.getString("kind")||"",status:interaction.options.getString("status")||"",limit:100});
  else if(sub==="entity"){
    const type=interaction.options.getString("type",true);
    const suppliedKey=interaction.options.getString("key",true);
    const key=type==="location"?suppliedKey:normalizeNpcKey(suppliedKey);
    const patch=interaction.options.getString("json");
    if(patch) result=db.transaction(()=>configureSimulationEntity(db,guildId,type,key,objectInput(interaction)));
    else result=db.getSimulationEntity(guildId,type,key);
    summary=`${type}: ${key}`;
  }else if(sub==="update"){
    const update=objectInput(interaction);
    result=db.transaction(()=>applySimulationUpdates(db,guildId,[{confidence:100,importance:60,...update}],
      {provenance:{actorType:"human_gm",actorId:interaction.user.id,interactionId:interaction.id}}));
    summary="Simulation update recorded";
  }else if(sub==="action"){
    const input=objectInput(interaction);
    result=db.transaction(()=>input.op==="transfer"?transferSupply(db,guildId,input,interaction.user.id):submitNpcAction(db,guildId,input,{cycleKey:`gm:${interaction.id}`}));
    summary=input.op==="transfer"?"Reviewed NPC material delivery recorded":`NPC action ${result.status}`;
    publish=input.op!=="transfer";
  }else if(sub==="review"){
    const query=interaction.options.getString("action_id",true);
    const rows=db.listSimulationRecords(guildId,{kind:"action",limit:1000});
    const matches=rows.filter(row=>row.id===query||row.id.startsWith(query));
    if(matches.length!==1) throw new NotFoundError("Use one unambiguous pending action ID.");
    const patch=interaction.options.getString("json")?objectInput(interaction):{};
    result=resolveNpcAction(db,guildId,matches[0].id,{decision:interaction.options.getString("decision",true),patch,actorId:interaction.user.id});
    summary=`NPC action ${result.status}`;
    publish=true;
  }else if(sub==="advance"){
    const minutes=interaction.options.getInteger("minutes",true);
    db.snapshotCampaign(guildId,{label:"Pre-fictional-time advance",createdBy:interaction.user.id});
    result=db.transaction(()=>({clock:db.advanceSimulationClock(guildId,{minutes}),events:processSimulationEvents(db,guildId)}));
    summary=`Campaign time advanced by ${minutes} fictional minute(s)`;
    publish=true;
  }else if(sub==="share"){
    result=db.transaction(()=>shareInformation(db,guildId,objectInput(interaction)));
    summary="Information shared with its source preserved";
  }else if(sub==="publish"){
    await interaction.deferReply({ephemeral:true});
    const delivered=await publishSimulationHooks({db,guild:interaction.guild,sessionId:db.getActiveSession(guildId)?.id||null});
    await interaction.editReply(`Delivered ${delivered} queued NPC hook(s).`);
    return true;
  }else throw new Error("Unknown simulation command.");
  const files=[new AttachmentBuilder(Buffer.from(JSON.stringify(result,null,2)),{name:"simulation.json"})];
  // The receipt wrapper captures completion before any Discord publication.
  await interaction.reply({content:summary,files,ephemeral:true});
  if(publish) await publishSimulationHooks({db,guild:interaction.guild,sessionId:db.getActiveSession(guildId)?.id||null});
  return true;
}
