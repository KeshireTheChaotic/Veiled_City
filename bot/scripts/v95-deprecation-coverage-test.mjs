/** DEP01-12: conservative retirement, exact retained gates and isolated negative mutation proof. */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";

const root=path.resolve(".."),evidence=JSON.parse(fs.readFileSync(new URL("./fixtures/historical/V95_05_DEPRECATION_EVIDENCE.json",import.meta.url),"utf8"));
// V96-05R: exact one-for-one native transport fixture/API migrations, not assertion removals. Historical inventory is unchanged.
const publicationFixtureMigrations=[{suite:'v9-publication-test',
  old:"assert.throws(()=>queueTurnPublications(db,{guild:{id:'g'},session:{id:'s'},scope:{mode:'party'},turnId:turn,result:{narration:'different'}}),/immutable|identity|payload/i);",
  current:"assert.throws(()=>queueTurnPublications(db,{guild:{id:'g'},session,scope:{mode:'party'},turnId:turn,result:nativeResult('different')}),/immutable|identity|payload/i);"},
  {suite:'simulation-regression-test',old:'assert.deepEqual(sent,["A courier knocks at Mercer Investigations."]);',
    current:'assert.deepEqual(sent,["The mara prepares to investigate the ward breach at Hollow Street."]);'},
  {suite:'city-depth-regression-test',old:'await assert.rejects(()=>publishSimulationHooks({db,guild:discordGuild}),/delivery failure/);',
    current:'assert.match(db.listPendingPublications(guild)[0].last_failure,/^NOT_SENT:.*delivery failure/);'},
  {suite:'endurance-test',old:'await assert.rejects(()=>publishSimulationHooks({db,guild}),/delivery failure/);',
    current:'assert.match(db.listPendingPublications(guildId)[0].last_failure,/^NOT_SENT:.*delivery failure/);'},
  {suite:'portrayal-authoring-test',old:'await voice.narrate(guild,"Welcome",{npcKey:"new-clerk"});assert(!lastOptions.instructions?.includes("PRIVATE_SYNTHETIC_STYLE"));',
    current:'await voice.narrate(guild,first.text,{npcKey:"new-clerk",turnId:first.turnId});assert(!lastOptions.instructions?.includes("PRIVATE_SYNTHETIC_STYLE"));'},
  {suite:'portrayal-authoring-test',old:'await voice.narrate(guild,"Welcome",{npcKey:"new-clerk"});assert(lastOptions.instructions.includes("Clear syllables"));assert.equal(lastOptions.voice,"cedar");',
    current:'await voice.narrate(guild,second.text,{npcKey:"new-clerk",turnId:second.turnId});assert(lastOptions.instructions.includes("Clear syllables"));assert.equal(lastOptions.voice,"cedar");'},
  {suite:'narrative-contract-test',
    old:'assert.equal((await gm.runTurn({guildId:guild,actorUserId:"owner",actorName:"Tester",messageText:"What is outside?"})).narration,turn.narration);',
    current:'assert.equal(candidateNarrative(repaired).narration,turn.narration);'},
  {suite:'prompt-budget-test',
    old:'assert.equal(db.db.prepare("SELECT total_changes() n").get().n,before,"Compaction/retries do not mutate campaign state");',
    current:'assert.equal(committedState(),before,"Compaction/retries do not mutate campaign state");'},
  {suite:'expansion-quality-test',
    old:'assert.equal((await gm.runTurn({guildId:guild,actorUserId:"owner",actorName:"Detective",messageText:"Describe the station window"})).narration,',
    current:'assert.equal(candidateNarrative(legacy).narration,fixtures.compatibility_5_0.narration);'},
  {suite:'expansion-quality-test',
    old:'fixtures.compatibility_5_0.narration);assert.equal(fake.requests.length,1);metrics.golden_passes++;metrics.compatibility_5_0="unchanged fixture accepted";',
    current:'assert.equal(fake.requests.length,1);metrics.golden_passes++;metrics.compatibility_5_0="unchanged candidate parsed; no-session publication held";'},
  {suite:'end-to-end-a-test',
    old:'assert.equal(narrative.narration,"The witness intends to inspect the cable.","Nonbinding prose is retained; actual effects are checked separately");return result.intents[0];',
    current:'assert.equal(candidateNarrative(narrative).narration,"The witness intends to inspect the cable.","Nonbinding draft is retained; actual effects are checked separately");'},
  {suite:'end-to-end-i-test',
    old:'assert.equal(result.narration,"Rain patters against the window.","Native validation retains safe narration instead of replacing every intent turn");',
    current:'assert.equal(result.narration,"A low, uneven hum hangs in the room. The scent of coffee drifts through the air.","Native validation retains safe narration instead of replacing every intent turn");'}];
// V96-05S deliberately removes inferred traits; explicit dossier/history contrasts preserve the positive authority lane.
const semanticFixtureMigrations=[{suite:'npc-cognition-regression-test',
  old:'assert(Number(eliasWren.decision_profile.contract_honor)>50,"contract-specialist profile did not receive contract lens");',
  current:'assert.equal(eliasWren.decision_profile.contract_honor,50,"Unstructured dossier wording is not a contract score.");'},
  {suite:'npc-cognition-regression-test',old:'assert(Number(eliasWren.decision_profile.hospitality_reciprocity)>50,"hospitality/contract reciprocity lens missing");',
    current:'assert.equal(eliasWren.decision_profile.hospitality_reciprocity,50,"Unstructured dossier wording is not a reciprocity score.");'},
  {suite:'npc-cognition-regression-test',old:'assert.equal(eliasWren.decision_profile.veil_awareness,"aware");',
    current:'assert.equal(eliasWren.decision_profile.veil_awareness,"limited");'},
  {suite:'production-regression-test',old:'assert.equal(playerProposalResults[0].row.source,"player_private_scene");',
    current:'assert.equal(playerProposalResults[0].row.source,"typed_private_proposal_v2");'},
  // Existing native UA rule hierarchy predates this fixture relocation. Retain
  // the exact assertion of scoped-ruling precedence rather than the obsolete prompt wording.
  {suite:'rules-srd-test',old:'assert.match(ai.requests[0].input,/saved human GM rulings > supplied official online/);',
    current:'assert.match(ai.requests[0].input,/saved scoped GM ruling > verified explicit campaign override > verified Daggerheart SRD/);'},
  // W2 qualified identity-authority migration (26f7555). The old positive
  // narrator-name persistence is deliberately prohibited; native GM setup is
  // independently established BEFORE previews, which must not alter it or move PCs.
  {suite:'typed-intents-regression-test',
    old:"assert.equal(tierWorldAdditions(named,'Where is the nearest pharmacy?').durable.length,1);",
    current:"assert.equal(tierWorldAdditions(named,'Where is the nearest pharmacy?').ephemeral.length,1,"},
  {suite:'gm-recovery-regression-test',
    old:"assert.equal(db.getSimulationEntity(guild, 'location', 'relay-night-staffing'), null,",
    current:"assert.deepEqual(db.getSimulationEntity(guild, 'location', 'relay-night-staffing'), established,"},
  {suite:'gm-recovery-regression-test',
    old:"assert.equal(db.getSimulationEntity(guild, 'location', 'relay-night-staffing'), null);",
    current:"assert.deepEqual(db.getSimulationEntity(guild, 'location', 'relay-night-staffing'), established);"},
  {suite:'relax-end-to-end-test',
    old:'assert.equal(db.getSimulationEntity(guild,"location","diner"),null,"Generation previews but never commits");',
    current:'assert.deepEqual(db.getSimulationEntity(guild,"location","diner"),established,"Generation cannot alter independent native GM identity");'}];
test("DEP01/02/04 retired artifacts are absent; historical hashes and all mandatory suites remain",()=>{
  for(const row of evidence.retired){assert(!fs.existsSync(path.join(root,row.file)),row.file);assert.match(row.sha256,/^[a-f0-9]{64}$/);
    assert.match(row.last_change,/^[a-f0-9]{40}$/);}
  const runner=fs.readFileSync("scripts/validate-offline.mjs","utf8").split("const report=")[0];
  assert.equal(evidence.mandatory_suites.length,130);
  for(const id of evidence.mandatory_suites)assert(runner.includes(`"${id}"`),`${id} cannot be removed without proof`);
  for(const row of evidence.assertions){
    const source=fs.readFileSync(`scripts/${row.old_suite}.mjs`,"utf8");
    assert(source.includes(row.assertion)||[...publicationFixtureMigrations,...semanticFixtureMigrations].some(migration=>row.old_suite===migration.suite
      &&row.assertion===migration.old&&source.includes(migration.current)),`${row.old_suite}:${row.line} historical assertion cannot be silently dropped`);
  }
});
test("all original PvP inventory IDs and native exports survive consolidation",async()=>{
  const service=await import("../src/narrative-pvp.js");
  for(const name of ["proposePvp","reviewPvp","respondPvp","revisePvp","rollPvp","authorPvpNarrative","sharePvpNarrative"])
    assert.equal(typeof service[name],"function",name);
  const matrix=fs.readFileSync(new URL("./fixtures/historical/V9_REGRESSION_MATRIX.csv",import.meta.url),"utf8");assert.equal(evidence.availability.length,32);
  for(const row of evidence.availability)assert(matrix.includes(`,${row.old_case_id},`));
});
test("DEP03/06/08/09 compatibility and corrected v7 behavioral sentinel are retained",()=>{
  for(const file of ["src/legacy-authority.js","scripts/legacy-authority-migration-test.mjs","scripts/v7-delta-baseline-test.mjs"])
    assert(fs.existsSync(file));
  const v7=fs.readFileSync("scripts/v7-delta-baseline-test.mjs","utf8");
  assert(v7.includes("d01-roll-lifecycle-test.mjs"));assert(v7.includes("d05-live-window-test.mjs"));
  for(const prefix of ["i-heard-you-","systems-to-players-","implementation-phase-","end-to-end-"])
    assert(evidence.mandatory_suites.some(id=>id.startsWith(prefix)));
});
test("DEP11 unchanged D08 negative detects removal of consent authority in an isolated source copy",()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"vc-deprecation-mutant-"));
  try{
    fs.cpSync("src",path.join(dir,"src"),{recursive:true});fs.cpSync("sql",path.join(dir,"sql"),{recursive:true});
    fs.mkdirSync(path.join(dir,"scripts"));fs.writeFileSync(path.join(dir,"package.json"),'{"type":"module"}');
    for(const file of ["d08-window-security-test.mjs","offline-guard.mjs"])fs.copyFileSync(`scripts/${file}`,path.join(dir,"scripts",file));
    const run=()=>spawnSync(process.execPath,["--import","./scripts/offline-guard.mjs","scripts/d08-window-security-test.mjs"],
      {cwd:dir,encoding:"utf8",env:{...process.env,OPENAI_API_KEY:"offline-dummy",DISCORD_TOKEN:"offline-dummy"}});
    const before=run();assert.equal(before.status,0,before.stderr);
    const file=path.join(dir,"src/scene-action-window.js"),source=fs.readFileSync(file,"utf8");
    const guard="&&(!required.length||!validateActionConsent(db,guild,input.consent_refs||[],{window,accepted,input})))";
    assert.equal(source.split(guard).length,2,"mutant must remove exactly the native consent guard");
    fs.writeFileSync(file,source.replace(guard,"&&false)"));
    const after=run();assert.notEqual(after.status,0);assert.match(after.stderr,/Missing expected exception/);
    assert.match(after.stderr,/stale unrelated consent must not authorize/);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
