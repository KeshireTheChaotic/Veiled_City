// Usage:
// node scripts/cost-estimate.mjs <gmTurns> <avgInputTokens> <avgOutputTokens>
// Defaults approximate a 4-player text session.
const turns=Number(process.argv[2]||120);
const input=Number(process.argv[3]||4000);
const output=Number(process.argv[4]||350);

// Update these when OpenAI pricing changes.
// 2026-10-01 Standard short-context published rates, per 1M tokens.
const models={
  "gpt-6.1-sol":{in:2.00,out:10.00},
  "gpt-6-luna":{in:0.10,out:0.50},
  "gpt-6-astra":{in:10.00,out:50.00}
};
for(const [name,p] of Object.entries(models)){
  const cost=turns*((input/1_000_000)*p.in+(output/1_000_000)*p.out);
  console.log(`${name}: ~$${cost.toFixed(2)} for ${turns} GM turns at ${input} input / ${output} output tokens each`);
}
console.log("Router/classifier calls add a small amount and prompt caching can reduce repeated-input cost.");
