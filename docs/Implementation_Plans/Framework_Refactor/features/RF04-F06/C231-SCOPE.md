# C231 — Native Fear original callback sources

Base9f2b3c01. World NPC producer is separated C230. Native Fear still imports eight legacy native providers and Narrative bilateral-owner wrapper. Introduce one fixed own source per actual native provider; each original module registers only original functions at load. Reuse existing action-consent source. Bilateral owner read reaches same Narrative consumer proxy through existing Native–Narrative pair and fixed native consumer; agreement service construction unchanged. Preserve exact arguments/results/errors/singletons, current caller authority and callback load order. Static entrypoint graph must prove all original provider modules still load from index. Fresh contract tests cover fixed completeness/replacement/forwarding; actual provider test covers real pure gate identity. No native Fear mechanics, spending, privacy, policy, or deadlines changed. RF04 incomplete; native Fear physical move and World–Narrative bridge remain overdue.

{
  "peers": [
    [
      "pvp-rounds.js",
      "nativeFearRoundSource",
      [
        "validatePvpRoundReceipt"
      ]
    ],
    [
      "pvp-fear-gate.js",
      "nativeFearGateSource",
      [
        "fearGateKey",
        "pendingPvpFear"
      ]
    ],
    [
      "pvp-terminal.js",
      "nativeFearTerminalSource",
      [
        "settlePvpWindow"
      ]
    ],
    [
      "pvp-attacks.js",
      "nativeFearAttackSource",
      [
        "validatePvpAttackRoll"
      ]
    ],
    [
      "pvp-damage.js",
      "nativeFearDamageSource",
      [
        "settlePvpDamageAction"
      ]
    ],
    [
      "pvp-brawl.js",
      "nativeFearBrawlSource",
      [
        "assertBrawlFearOrder",
        "orderedBrawlFear"
      ]
    ],
    [
      "pc-incoming.js",
      "nativeFearIncomingSource",
      [
        "incomingAttackEvidence",
        "rollAutonomousFearIncomingAttack"
      ]
    ],
    [
      "pvp-campaign-policy.js",
      "nativeFearSafetySource",
      [
        "assertPvpSafety"
      ]
    ]
  ]
}

C231 complete: eight original native callback providers register fixed own sources; consent reuses existing source, bilateral context uses same Narrative agreement proxy through existing pair. Eight provider bodies and remaining Fear factory unchanged except routing/registration. Static index graph reaches all10 original provider modules; actual modules loaded in fresh tests. Frozen batch11/11 passed854.3295ms: eight source completeness/argument/result/error/replacement cases, actual bilateral proxy, actual provider registration, deterministic Fear exchange identity/empty pending. Contract test renamed with identical SHA to rf04-f05-c31.test.mjs for canonical registry naming; no rerun. Fakes qualify forwarding only; no real Fear spending, owner authorization, ledger/receipt recovery or full runtime bootstrap proof. Syntax14/14;18 exact obsolete records retired (1cross-framework import,17cyclic). Gate926modules,0unowned,1cycle/largest77,920accepted legacy,0active/transition errors. Tests remain local/ignored. RF04 incomplete. Next: physical Native Fear service migration, then remaining overdue World–Narrative bridge. No deadlines/allowances expanded.
