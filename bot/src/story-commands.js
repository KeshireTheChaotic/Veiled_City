/** GM-only expansion operations; read-only diagnostics never create command receipts or campaign state. */
import { AttachmentBuilder, PermissionFlagsBits } from "discord.js";
import { PermissionError } from "./errors.js";
import { cityObject } from "./city-calendar.js";
import { ContextPlanner } from "./context-planner.js";
import { resolveNpcConversation } from "./npc-conversations.js";
import { validateNarrativeClaims } from "./narrative-integrity.js";
import { setPacingCues, pacingAdvice, configureMystery, mysteryView, recordMysteryAttempt } from "./story-continuity.js";
import { negotiateAgreement } from "./negotiations.js";
import { previewOutcomes } from "./outcome-preview.js";
import { explainWhy } from "./provenance.js";
import { configurePortrayal } from "./portrayal.js";
import { authorWorldDraft, reviewWorldDraft } from "./world-authoring.js";
import { recordScenePresence, sceneView } from "./scene-continuity.js";
import { manageGroup } from "./city-groups.js";
import { manageStrategy } from "./simulation-strategy.js";
import { proposeArcBeat } from "./personal-continuity.js";
import { manageMemoryCluster } from "./memory-clusters.js";
import { expansionStatus } from "./expansion-contracts.js";
export async function handleStoryCommand(interaction,{db,gm}){
  if(!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)&&
    !interaction.member?.roles?.cache?.has(db.getCampaign(interaction.guildId)?.gm_role_id)) throw new PermissionError("GM/admin permission required.");
  const sub=interaction.options.getSubcommand(),raw=interaction.options.getString("json"),input=cityObject(JSON.parse(raw||"{}")),guild=interaction.guildId;
  let result;
  if(sub==="context") result=new ContextPlanner(db).plan(guild,input);
  else if(sub==="expansion-status") result=expansionStatus(db,guild);
  else if(sub==="scene") result=recordScenePresence(db,guild,input,interaction.user.id);
  else if(sub==="group") result=manageGroup(db,guild,input,interaction.user.id);
  else if(sub==="strategy") result=manageStrategy(db,guild,input,interaction.user.id);
  else if(sub==="arc-beat") result=proposeArcBeat(db,guild,input,interaction.user.id);
  else if(sub==="memory") result=manageMemoryCluster(db,guild,input,interaction.user.id);
  else if(sub==="scene-view") result=sceneView(db,guild,{...input,gm:input.observer_type?false:true});
  else if(sub==="conversation") result=resolveNpcConversation(db,guild,input,interaction.user.id);
  else if(sub==="pacing") result=setPacingCues(db,guild,input,interaction.user.id);
  else if(sub==="pacing-status") result=pacingAdvice(db,guild,input.message||"");
  else if(sub==="mystery") result=configureMystery(db,guild,input,interaction.user.id);
  else if(sub==="clues") result=mysteryView(db,guild,input.key,input);
  else if(sub==="attempt") result=recordMysteryAttempt(db,guild,input,interaction.user.id);
  else if(sub==="negotiate") result=negotiateAgreement(db,guild,input,interaction.user.id);
  else if(sub==="forecast") result=previewOutcomes(db,guild,input);
  else if(sub==="why") result=explainWhy(db,guild,input);
  else if(sub==="portray") result=configurePortrayal(db,guild,input,interaction.user.id);
  else if(sub==="author") result=authorWorldDraft(db,gm.content,guild,input,interaction.user.id);
  else if(sub==="author-review") result=reviewWorldDraft(db,gm.content,guild,input,interaction.user.id);
  else if(sub==="diagnose"){
    try{result=validateNarrativeClaims(db,guild,input.result||{},input.scope||{mode:"party"});}
    catch(error){if(error.code!=="NARRATIVE_INTEGRITY") throw error;result={ok:false,...error.diagnostic};}
  }else throw new Error("Unknown story operation.");
  await interaction.reply({ephemeral:true,content:`Story ${sub}: GM-private result.`,
    files:[new AttachmentBuilder(Buffer.from(JSON.stringify(result,null,2)),{name:"story-result.json"})]});
}
