/** Command continuation: finish the initial worker before private entries can commit competing work. */
import {runSessionOpening} from './session-opening-runner.js';
import {deliverOpeningEntry} from './opening-entry.js';
import {runOpeningCohort} from './opening-cohort-runner.js';
import {openingErrorCode} from './frameworks/operations/public.js';
export async function continueSessionOpening({db,guild,gm}){
  const session=db.getActiveSession(guild.id);if(!session||session.assembly_mode==='manual')return {opening:null,entries:[],cohort:null};
  const opening=await runSessionOpening({db,guild,gm});
  // A sibling process owns the initial generation. Its command continuation drains native opportunities.
  if(opening&&['queued','planning','publishing','prepared_rebase','held_paused'].includes(opening.status))return {opening,entries:[],cohort:null};
  const entries=[],opportunities=db.openingEntryOpportunities(guild.id,session.id);
  if(opportunities.length>5000)return {opening,entries,cohort:null,hold:'OPENING_ENTRY_HISTORY'};
  for(const opportunity of opportunities){
    try{entries.push(await deliverOpeningEntry({db,guild,gm,key:opportunity.record_key}));}
    catch(error){entries.push({status:'needs_review',data:{hold_code:openingErrorCode(error)}});}
  }
  const cohort=await runOpeningCohort({db,guild,gm});return {opening,entries,cohort};
}
