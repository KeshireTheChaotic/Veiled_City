import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import {createNarrativeContextBuilder} from '../../src/frameworks/narrative/public.js';
import {buildNarrativeContext as compatibilityBuild,narrativeVisible as compatibilityVisible}
 from '../../src/narrative-authority-context.js';
import {currentScene,scenePresence,lastVerifiedCharacterPresence} from '../../src/scene-continuity.js';
import {conversationPrincipal} from '../../src/conversation-principal.js';
import {assemblyOrientation} from '../../src/assembly-state.js';
import {factVisibleTo} from '../../src/disclosure-authority.js';
import {objectiveEvidence,evidenceType} from '../../src/epistemic.js';
import {sceneFictionHash,sceneFictionFailure,narrativeSourceVisible} from '../../src/scene-fiction-context.js';
import {protectedPvpScope} from '../../src/pvp-output.js';
import {activeCityProxy} from '../../src/city-constraints.js';
import {selectDisclosedNarrativeMemory} from '../../src/narrative-memory.js';
import {rankNarrativeMemory} from '../../src/narrative-salience.js';
import {speakerBrief} from '../../src/narrative-speakers.js';
import {directorBriefForAudience} from '../../src/narrative-director-source.js';
import {mentionsPublicIdentity} from '../../src/public-referents.js';
import {registerNarrativeContext} from '../../src/audience-native-v9.js';
import {assemblyWriterBrief} from '../../src/assembly-context.js';
import {worldIdentityOrigin} from '../../src/world-authorship.js';
import {backgroundIdentityContext} from '../../src/world-background-identities.js';
import {openingEntryProjection} from '../../src/opening-entry-context.js';
import {nativeEnvironmentSituation} from '../../src/native-environment-scene.js';
import {inspectOpeningCohortSource} from '../../src/opening-cohort-state.js';
import {indexWorldEvent} from '../../src/city-calendar.js';

test('Narrative-owned context builder preserves authorized context and compatibility behavior',t=>{
 const dir=mkdtempSync(join(tmpdir(),'rf04-context-c03p03-')),file=join(dir,'context.sqlite'),
  schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url)),db=new VeiledDB(file,schema),guild='context-c03p03',
  scope={mode:'party',actorUserId:null,actorCharacterId:null};
 db.ensureCampaign(guild);
 db.setCityCalendar(guild,{flags:{narrative_authority:true,playable_narration:true,narrative_camera:true,narrative_encounters:true}});
 const session=db.startSession(guild,'Narrative context extraction','already_together'),scene=currentScene(db,guild),
  source=indexWorldEvent(db,guild,{key:'director-context-c03p03',kind:'native_director_narrative_scope',
   title:'Native director scene scope',source_id:'native:director',visibility:'party',session_id:session.id,scene:scene.key,
   details:{version:1,scope,layer:'world',input_source:null}});
 t.after(()=>{db.close();rmSync(dir,{recursive:true,force:true});});

 const builder=createNarrativeContextBuilder({currentScene,scenePresence,lastVerifiedCharacterPresence,conversationPrincipal,assemblyOrientation,
  factVisibleTo,objectiveEvidence,evidenceType,sceneFictionHash,sceneFictionFailure,narrativeSourceVisible,protectedPvpScope,activeCityProxy,
  selectDisclosedNarrativeMemory,rankNarrativeMemory,speakerBrief,directorBriefForAudience,mentionsPublicIdentity,registerNarrativeContext,
  assemblyWriterBrief,worldIdentityOrigin,backgroundIdentityContext,openingEntryProjection,nativeEnvironmentSituation,inspectOpeningCohortSource});
 const owned=builder.buildNarrativeContext(db,guild,scope,source.event_key),compatible=compatibilityBuild(db,guild,scope,source.event_key);
 assert.deepEqual(owned,compatible);
 assert.equal(owned.binding.viewpoint,'camera');
 assert.equal(owned.packet.audience.mode,'party');
 assert.equal(owned.packet.viewpoint.pc_witness,false);
 assert.equal(owned.packet.request,'Portray a contextual world response without inventing PC actions or consequences.');
 assert.equal(builder.narrativeVisible({visibility:'character',subject_key:'pc-other'},scope),false);
 assert.equal(builder.narrativeVisible({visibility:'party'},scope),compatibilityVisible({visibility:'party'},scope));

 const mismatched={...scope,mode:'private'};
 const unauthorized=error=>error.code==='SCENE_FICTION'&&error.diagnostic?.category==='authenticated_source';
 assert.throws(()=>builder.buildNarrativeContext(db,guild,mismatched,source.event_key),unauthorized);
 assert.throws(()=>compatibilityBuild(db,guild,mismatched,source.event_key),unauthorized);
 indexWorldEvent(db,guild,{key:source.event_key,status:'retracted'});
 assert.throws(()=>builder.buildNarrativeContext(db,guild,scope,source.event_key),unauthorized);
 assert.throws(()=>compatibilityBuild(db,guild,scope,source.event_key),unauthorized);
 assert.throws(()=>createNarrativeContextBuilder({}),/Complete native narrative context capabilities required/);
});
