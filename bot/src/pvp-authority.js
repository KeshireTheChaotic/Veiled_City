/** Character repository projection supplied to native PC identity guards; no duplicated authority policy. */
import {createNativePvpAuthority} from './frameworks/daggerheart/public.js';
export const {pvpAttemptKey,pvpTarget,isPvpIntent,assertNonPvpCombatant}=createNativePvpAuthority({getCharacter:(db,key)=>db.getCharacter(key)});
