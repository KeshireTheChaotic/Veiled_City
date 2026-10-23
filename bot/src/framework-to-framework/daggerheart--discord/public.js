import {combatantLine} from '../../frameworks/discord/public.js';

/** Already-resolved native combatant -> Discord presentation. No source, permission, outcome or acknowledgment is minted. */
export function nativeCombatantLine(combatant){
  const {id,display_name,role,hp_current,hp_max,stress_current,stress_max,status,conditions}=combatant;
  return combatantLine({id,display_name,role,hp_current,hp_max,stress_current,stress_max,status,conditions});
}
