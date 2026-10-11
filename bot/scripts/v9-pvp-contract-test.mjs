/** V9-00 contract fixtures: scenario-specific executable tests are added by the two owning PvP phases. */
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const matrix=fs.readFileSync(new URL("../../docs/V9_REGRESSION_MATRIX.csv",import.meta.url),"utf8");
const rows=matrix.split(/\r?\n/).filter(line=>/^V9-PVP-/.test(line));
assert.equal(rows.length,32,"all supplied PvP acceptance scenarios must remain in the baseline inventory");
for(const line of rows){
  const [phase,,id,scenario]=line.split(",");
  test(`${phase}/${id}/${scenario}: native implementation availability (NOT scenario qualification)`,async()=>{
    const service=await import("../src/narrative-pvp.js");
    const required=phase==="V9-PVP-A"?["proposePvp","reviewPvp","respondPvp","revisePvp"]
      :["rollPvp","reviewPvp","authorPvpNarrative","sharePvpNarrative"];
    for(const name of required)assert.equal(typeof service[name],"function",`${id}: missing native ${name}`);
  });
}
