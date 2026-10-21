/** Closed combined-request dispatch. All permissions, costs and results remain in existing native adapters. */
import {applyEnvironmentArrival} from './native-environment-arrivals.js';
import {applyEnvironmentSceneAction} from './native-environment-scene.js';
import {applyEnvironmentWitnessAccounts} from './native-environment-witnesses.js';
import {applyEnvironmentDoorChain} from './native-environment-door-chain.js';
import {applyEnvironmentImagingRecord} from './native-environment-imaging.js';
import {establishEnvironmentUploadRecording,startEnvironmentUploadCountdown,advanceEnvironmentUploadCountdown,
  adjustEnvironmentUploadCountdown} from './native-environment-countdown.js';
import {arbitrationFailure as fail} from './gm-arbitration-contract.js';
const UPLOAD='environment:apartment-veil-breach:upload-in-progress';
export function executeEnvironmentProposal(db,guild,origin,board,proposal,options={}){
  if(proposal.feature_ref==='environment:haunted-nightclub:everybody-saw-something-different')
    return applyEnvironmentWitnessAccounts(db,guild,origin,board,proposal);
  if(proposal.feature_ref==='environment:apartment-veil-breach:door-chain')
    return applyEnvironmentDoorChain(db,guild,origin,board,proposal,options);
  if(proposal.feature_ref==='environment:after-hours-emergency-department:something-in-imaging')
    return applyEnvironmentImagingRecord(db,guild,origin,board,proposal);
  if(Object.hasOwn(proposal,'detail'))return applyEnvironmentSceneAction(db,guild,origin,board,proposal);
  if(!Object.hasOwn(proposal,'operation'))return applyEnvironmentArrival(db,guild,origin,board,proposal,options);
  if(proposal.version!==1||proposal.feature_ref!==UPLOAD)throw fail('environment_exact_dispatch_source');
  return db.transaction(()=>{
    if(proposal.operation==='upload_start'){
      if(Object.keys(proposal).sort().join()!=='creation_source,environment,feature_ref,handout,operation,version')throw fail('environment_upload_closed_start_dispatch');
      establishEnvironmentUploadRecording(db,guild,origin,board,{environment:proposal.environment,handout:proposal.handout,creation_source:proposal.creation_source});
      return startEnvironmentUploadCountdown(db,guild,origin,board,{version:1,feature_ref:UPLOAD,environment:proposal.environment,handout:proposal.handout});
    }
    if(proposal.operation==='upload_advance'){
      if(Object.keys(proposal).sort().join()!=='accepted_intent,beat_kind,beat_ref,countdown,feature_ref,operation,ruling,version')throw fail('environment_upload_closed_beat_dispatch');
      const {version,feature_ref,operation,...input}=proposal;
      return advanceEnvironmentUploadCountdown(db,guild,origin,board,input);
    }
    if(proposal.operation==='upload_adjust'){
      if(Object.keys(proposal).sort().join()!=='accepted_intent,countdown,feature_ref,operation,prerequisite,ruling,version')throw fail('environment_upload_closed_owner_dispatch');
      const {version,feature_ref,operation,...input}=proposal;
      return adjustEnvironmentUploadCountdown(db,guild,origin,board,input);
    }
    throw fail('environment_no_generic_effect_dispatch');
  });
}
