import {createHash} from 'node:crypto';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
/** Fixed native creation from an observed human declaration. Opening is a scene
 * occasion only; owner registration/attendance and fictional position stay separate.
 */
export function createNativeSessionSetup({sceneStore,gmAuthority}){
  if(typeof sceneStore?.activeSessions!=='function'||typeof sceneStore?.commitSnapshot!=='function'||typeof gmAuthority?.check!=='function'||typeof gmAuthority?.readDeclaration!=='function')throw new TypeError('Native session store and human GM authority required');
  function start(proof){
    const declaration=gmAuthority.readDeclaration(proof);
    if(proof?.kind!=='native_human_gm_authority'||proof.role!=='human_gm'||proof.operation!=='session_start'||declaration.operation!=='session_start'||declaration.targetRef!==proof.targetRef||hash(declaration.payload)!==proof.snapshotHash||declaration.snapshotHash!==proof.snapshotHash)throw new Error('Exact observed human session-start declaration required');
    const campaignId=proof.campaignId,sessionId=proof.targetRef,sceneId=`${sessionId}:opening`,session={id:sessionId,campaignId,status:'active',title:declaration.payload.title,assembly:declaration.payload.assembly,setup:{interactionId:proof.interactionId,principal:proof.principal,sourceRef:proof.sourceRef,sourceRevision:proof.sourceRevision,snapshotHash:proof.snapshotHash}},scene={id:sceneId,campaignId,sessionId,status:'active',participants:[]};
    const check=()=>{gmAuthority.check(proof);if(hash(gmAuthority.readDeclaration(proof))!==hash(declaration))throw new Error('Native session declaration changed');const active=sceneStore.activeSessions(campaignId),own=sceneStore.readers.readSession(campaignId,sessionId);if(active.length>1||!own&&active.length)throw new Error('Existing active session requires native lifecycle review');};
    const receipt=sceneStore.commitSnapshot({campaignId,principal:proof.principal,sourceRef:`session-start:${proof.sourceRef}`,records:[{kind:'session',data:session,expectedRevision:null},{kind:'scene',data:scene,expectedRevision:null}]},{check});
    return {session:sceneStore.readers.readSession(campaignId,sessionId),scene:sceneStore.readers.readScene(campaignId,sceneId),receipt};
  }
  return Object.freeze({start});
}
