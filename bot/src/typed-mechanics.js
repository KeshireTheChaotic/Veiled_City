/** Transitional provider composition for typed rolls; native rules/receipts live in Daggerheart. Actual application injects its two-framework connector. */
import { rollRevision } from './roll-requests.js';
import { contributeRoll } from './roll-collaboration.js';
import { isPvpIntent } from './pvp-authority.js';
import {consentAction,historicalActionSource} from './action-consent.js';
import {exactTypedRollSelection,exactTypedPvpSelection} from './mechanical-native-v9.js';
import {rollPvpAttack,validatePvpAttackRoll} from './pvp-attacks.js';
import {rollPvpDamage,validatePvpDamageRoll} from './pvp-damage.js';
import {reserveCampaignAttackNotices} from './native-publications.js';


export function resolveTypedNativeRolls(db,guild,scope,intents=[],messageId='',{connectTypedRolls}={}){
  if(typeof connectTypedRolls!=='function')throw new TypeError('Application-supplied typed-roll integration required.');
  const native=connectTypedRolls({mechanics:{rollRevision,contributeRoll,isPvpIntent,consentAction,historicalActionSource,exactTypedRollSelection,exactTypedPvpSelection,rollPvpAttack,validatePvpAttackRoll,rollPvpDamage,validatePvpDamageRoll},reserveCampaignAttackNotices});
  return native.resolveTypedNativeRolls(db,guild,scope,intents,messageId);
}
