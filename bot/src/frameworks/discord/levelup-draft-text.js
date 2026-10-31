/** Original draft display only; existing composed rules own advancement policy and choices. */
export function createLevelupDraftFormatter({tierAchievement,legalAdvancements}){
  if(typeof tierAchievement!=="function"||typeof legalAdvancements!=="function")throw new TypeError("Level-up display requires the original advancement callbacks.");
function formatLevelupDraft(draft,character){
  if(!draft) return "No pending level-up draft.";
  const p=draft.choices?.plan;
  const achievement=tierAchievement(draft.to_level);
  return [
    `**Level Up — ${character?.name||"Character"} ${draft.from_level} → ${draft.to_level}**`,
    `Tier achievement: ${achievement.new_experience?"new Experience +2; ":""}${achievement.proficiency?"+1 Proficiency; ":""}${achievement.clear_trait_marks?"clear marked traits":"none"}`,
    `Legal advancements: ${legalAdvancements(draft.to_level).join(", ")}`,
    p?`Selected: ${p.advancements.join(" + ")}\nMandatory card: ${p.automatic_domain_card.name} (${p.automatic_domain_card.domain} ${p.automatic_domain_card.level})\nStatus: **${draft.status}**`:`Use \`/vc-level level-choose\` to choose two advancements and the mandatory domain card.`,
    `Draft ID: \`${draft.id.slice(0,8)}\``
  ].join("\n").slice(0,1900);
}
  return formatLevelupDraft;
}
