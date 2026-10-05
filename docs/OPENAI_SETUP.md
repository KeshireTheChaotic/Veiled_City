# OpenAI API Setup

The Discord bot uses the OpenAI **Responses API** through the official JavaScript SDK.

## 1. Create an API key
In the OpenAI Platform dashboard:
1. Create/use a Project for Veiled City.
2. Add billing/credits as required.
3. Create an API key for the project.
4. Prefer a project/service-account key scoped to the application when practical.
5. Set a spend alert and, if appropriate, a hard spend limit.

Put the key only in:
`bot/.env`

```env
OPENAI_API_KEY=sk-...
```

Do not put the key in Discord, source files, or Git.

## 2. Model configuration
The shipped defaults are:

```env
OPENAI_GM_MODEL=gpt-6.1-sol
OPENAI_ROUTER_MODEL=gpt-6-luna
OPENAI_SUMMARY_MODEL=gpt-6-luna
OPENAI_RULES_MODEL=gpt-6-luna
OPENAI_ASSEMBLY_MODEL=gpt-6-luna
OPENAI_NPC_PROXY_MODEL=gpt-6-luna
OPENAI_REASONING_EFFORT=low
RULES_MAX_OUTPUT_TOKENS=500
ASSEMBLY_MAX_OUTPUT_TOKENS=1200
NPC_PROXY_MAX_OUTPUT_TOKENS=1200
```

### Why
- **gpt-6.1-sol**: main GM narration, rule interpretation, NPC/world simulation.
- **gpt-6-luna**: cheap routing, recap generation, the v3.1 Rules Desk, v3.1.1 party assembly/arrival planning, and v3.1.2 NPC Proxy packet generation by default.
- **Rules Desk**: `OPENAI_RULES_MODEL` is deliberately separate from `OPENAI_GM_MODEL`, so routine rules questions do not require the main scene model.
- **Assembly planner**: `OPENAI_ASSEMBLY_MODEL` is also separate. It is used only for convergence and late/guest/replacement entry planning, so these logistics do not need the main GM model.
- **NPC Proxy packet builder**: `OPENAI_NPC_PROXY_MODEL` creates a one-time sanitized antagonist-control packet. It defaults to the assembly/router model and does not need the primary narrative model.

For maximum economy you can set all routing, summary, rules, assembly, and NPC-proxy models to `gpt-6-luna`.
For especially important scenes you can manually switch the GM model to `gpt-6-astra`, though it is substantially more expensive.

## 3. Cost controls already built into the package
The bot does not resend the entire campaign transcript or all Veiled City source material on every turn.

It sends:
- recent messages only;
- current roster/presence;
- structured facts/clocks;
- a small set of locally retrieved relevant content chunks.

Dice, character lifecycle, attendance, and resource storage are local code/SQLite and cost no model tokens by themselves.

## 4. Spend safety
Recommended for a home campaign:
- create a dedicated OpenAI Project;
- set spend alerts;
- consider a hard monthly cap;
- keep the API key in `.env`;
- rotate the key if it is exposed;
- stop the bot when not needed if you use Active response mode in a busy server.

## 5. API vs ChatGPT subscription
The bot uses API billing. A ChatGPT subscription is not used as its inference balance.
