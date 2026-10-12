# Private native roll controls

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

Use `/vc-roll pending` to find a current request, `/vc-roll result request:<exact key>` to retrieve its complete private status, and `/vc-roll menu request:<exact key>` to open the acting owner's choices. **Previous/Next** pages select options; **Earlier details/More details** pages show complete costs, reasons and source conditions. A complete private text attachment is also supplied. Dropdown labels are shortened only to fit Discord; full terms are never discarded.

Selection spends nothing. **Confirm** authorizes selected, currently eligible native costs once; **Roll now** separately rolls the native request. Alternate traits must be confirmed before recalculated Experiences. Blocked/additional-authorization options explain what native review or separate owner action is needed; they cannot be clicked into eligibility. A changed request, sheet, registry or owner makes the menu stale. Reopen it; do not repeat saved dice/costs after delivery failure. Older menu tokens without the registry binding must be replaced, not migrated into consent.

Helpers and Tag Team partners use scoped `/vc-roll contribute json:<authorization>` operations (`help`, `participate`, `roll`, `select`, `damage-type`, as applicable), with the exact current request/revision and their own reviewed proof/cost authorization. They receive only their permitted updates, not the acting owner's complete option menu. Existing human feasibility and Daggerheart requirements remain mandatory. No new flags or command registration were performed by development tests.

## Optional non-PvP public context

First privately request the exact current accepted-action preview:

```text
/vc-roll contribute json:{"op":"share-preview","request":"<request key>"}
```

Review the returned text and preview key, then explicitly approve that exact preview:

```text
/vc-roll contribute json:{"op":"share","request":"<request key>","expected_revision":"<full current revision>","key":"<new stable operation key>","scope":"party","confirm":true,"preview":"<preview key>"}
```

Omit `preview` to share saved dice/status only. Sharing never rolls again. Only the selected accepted occurrence is exposed, even if its source post contains several actions or private lines. Older unsegmented declarations have no provable bounded context and retain result-only sharing. A PC-target/action-outcome claim or protected PvP scene cannot use this generic preview as prose authority; use native independently verified PvP clauses instead. Current source/owner/audience revalidate before every publication.

## PvP: three different authorizations

All flows remain available privately through `/vc-roll pvp json:<operation>`; no new general-purpose button authorizes another PC.

1. Agreement and dice: `inbox`, `review`, `respond`, `revise`, `choose`, `roll`, `progress`, `continue`. Both owners approve the same mode, stakes, boundaries and audience; changing terms invalidates prior approvals. `respond` decline/withdraw is neutral, never implied victory. These operations do not author reactions or approve public narration.
2. Material authorship: `narrate` with a supported own-success/own-reaction/withhold template, or `draft` followed by exact affected-owner `ratify`. Winner authors only their own permitted success; losing player authors/ratifies/withholds their own response. `scope-review` is nonauthorizing GM review. Free text remains private until individually verified; whole-paragraph approval is insufficient.
3. Disclosure: each participant separately uses `narrative-review` and `share` for the same verified narration/revision. Neither seeing a prompt nor winning a roll grants public disclosure. Withheld reactions remain withheld while native terminal outcomes are retained.

Use returned exact proposal, terms, round/window, resolution and narration references; do not copy stale examples as real authorizations. See [PvP examples](V9_4_PVP_EXAMPLES.md) for narrative-only, declined/withdrawn, vanilla-risk damage and multiplayer examples. Damage profiles have their separate native approvals; narrative Duel/Three Strikes never applies HP, Armor or Stress. PvP grants no Hope or action-Critical Stress clear; actual Fear creates an immediate contextual native obligation. Saved history is not fresh consent.
