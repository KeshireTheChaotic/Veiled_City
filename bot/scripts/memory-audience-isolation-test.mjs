/** T05a red/green security target: private output must never promote party memory. */
import assert from "node:assert/strict";
import { persistentMemories } from "../src/context-memory.js";

const privateOnly={
  narration:"Rain ticks against the diner window.",
  player_intents:[],
  context_memories:[{
    kind:"detail",
    key:"morrow-locker-code",
    name:"Morrow locker code",
    summary:"Morrow's locker code is 3141.",
    retention:"durable"
  }],
  private_messages:[{
    discord_user_id:"player-a",
    content:"Only you notice the Morrow locker code: 3141."
  }]
};

assert.deepEqual(
  persistentMemories(privateOnly,"I watch the rain."),
  [],
  "a private-message-only detail must not qualify for party-scoped persistence"
);

console.log("T05a memory audience isolation PASS: private output cannot promote party memory.");
