/** Print the reproducible Phase E evaluation report from checked-in synthetic fixtures. */
import fs from "node:fs";
import { evaluateImplementationPack } from "../src/evaluation-harness.js";
const pack=JSON.parse(fs.readFileSync(new URL("./fixtures/implementation-evaluation.json",import.meta.url),"utf8"));
const report=evaluateImplementationPack(pack);
console.log(`IMPLEMENTATION_EVALUATION ${JSON.stringify(report)}`);
if(report.failures.length)process.exit(1);
