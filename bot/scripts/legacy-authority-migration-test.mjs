/** T07: lexical modules remain only nonbinding hints or reviewed native compatibility adapters. */
import assert from "node:assert/strict";
import fs from "node:fs";
import { auditLegacyLanguageAuthority } from "../src/legacy-authority.js";
import { rollDeclaration } from "../src/roll-language.js";

const read=file=>fs.readFileSync(new URL(`../src/${file}`,import.meta.url),"utf8");
const report=auditLegacyLanguageAuthority({
  index:read("index.js"),autonomous:read("autonomous-world.js"),sceneEntry:read("scene-entry.js"),
  dialogue:read("dialogue-continuity.js"),candidates:read("authored-candidates.js")
});
assert.equal(report.authoritative_general_lexical_routes,0);
assert(report.compatibility_adapters.includes("legacy_scene_entry"));
assert(report.native_exact_adapters.includes("roll_owner_authorization"));
assert(report.native_exact_adapters.includes("consent_terms_revision"));
assert(!read("index.js").includes('routeRollMessage({'),"message intake does not run legacy free-form roll routing");
assert(!read("index.js").includes('routeConsentMessage({'),"message intake does not run legacy free-form consent routing");
assert(!read("autonomous-world.js").includes("worldRequirements("),"world effects do not use phrase classification");
assert.equal(rollDeclaration("Please help Mara and spend Hope."),null);
assert.equal(rollDeclaration("If I spend 1 Hope to help Mara by watching the door"),null);
assert.equal(rollDeclaration("I spend 1 Hope to help Mara by watching the door")?.op,"help");
console.log("T07 legacy authority PASS: no general lexical execution; bounded UI hints and reviewed native adapters retained.");
