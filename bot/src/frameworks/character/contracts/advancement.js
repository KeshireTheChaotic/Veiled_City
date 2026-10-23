/** Character-owned consumer contract for native level-up planning/application. No rule or state commitment lives in this port. */
export function createCharacterAdvancementPort(rules){
  const names=['prepareLevelup','applyLevelupToData','legalAdvancements','tierAchievement'];
  if(names.some(name=>typeof rules?.[name]!=='function'))throw new TypeError('Complete native character advancement service required.');
  return Object.freeze(Object.fromEntries(names.map(name=>[name,rules[name].bind(rules)])));
}
