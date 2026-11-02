import {relationshipLine} from './command-record-text.js';

/** Original Discord presentation for the character-scoped relationship list. */
export function relationshipListText(rows){
  return rows.length
    ?rows.slice(0,30).map(relationshipLine).join("\n").slice(0,1950)
    :"No matching relationships are recorded.";
}
