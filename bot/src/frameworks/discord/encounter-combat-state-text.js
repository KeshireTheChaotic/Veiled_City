/** Original Discord message wrapper for the command's already-read combat state. */
export function encounterCombatStateText({encounterNumber,fear,spotlight,body}){
  return `**Encounter #${encounterNumber} Combat State**\nFear: **${fear}/12**\nSpotlight actions: ${spotlight}\n\n${body}`.slice(0,1950);
}
