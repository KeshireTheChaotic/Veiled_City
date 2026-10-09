# Online Daggerheart SRD rules lookup

`/vc-rules ask question:<question>` and questions in the configured rules channel
now retrieve relevant material from the official [Daggerheart SRD page](https://www.daggerheart.com/srd/).
The page currently links to the official
[SRD 2.0 PDF](https://www.daggerheart.com/wp-content/uploads/2026/08/DH_SRD_2_2026_08_25.pdf).
The download link is discovered from the official page rather than hard-coded to
that dated PDF. It is read-only reference retrieval, never a campaign rules migration.

## Setup and use

Install updated dependencies in `bot` with `npm install`, then restart the bot after
deploying. Online lookup is enabled by default in `loadConfig`:

```dotenv
RULES_ONLINE_SRD=true
```

Set `RULES_ONLINE_SRD=false` to use only local references and saved rulings.
No slash-command registration, AI delegation or campaign flag changes are required.
The first online rules question downloads and indexes the public PDF in memory.
The cache lasts six hours, is shared across questions in the running GM service,
and coalesces simultaneous downloads. Restarting clears it. Failed refreshes use
stale cached material with an explicit warning; a cold failure uses local sources
with an online-unavailable warning. Failures have a one-minute retry backoff.

## Authority, privacy and limits

Saved human GM rulings take precedence over online SRD excerpts, followed by local
RAW-derived references, house rules and homebrew. Missing or ambiguous coverage must
remain a provisional ruling, not invented RAW. Returned online source identifiers
include PDF page links; unknown model-generated citation identifiers are filtered out.
Page selection is lexical and bounded, not a guarantee that every interacting rule
has been retrieved or interpreted correctly.

Only fixed official HTTPS hosts are fetched; redirect destinations are checked too.
The site receives no rules question, character sheet, transcript, campaign ruling,
user ID or search query. Only public index/PDF downloads occur. Retrieved text is
untrusted reference data, not instructions, and cannot mutate campaign state. The
existing structured-answer API contract is retained; [official OpenAI documentation](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses)
was consulted for that integration. There is no additional model/search-tool call,
though supplying excerpts increases the normal rules answer's input-token usage.

Bounds: 20-second refresh deadline, 1 MB index, 16 MB PDF, at most three redirects
per download, 350 pages, two million extracted characters and four excerpts of up
to 3,000 characters. The PDF parser is pinned as a runtime dependency; the complete
SRD is not committed to the repository or persisted in campaign tables.

Offline tests use synthetic HTTP responses and a real minimal PDF extraction fixture.
A public-download smoke check successfully fetched/indexed the official 224-page
SRD without any model, Discord or campaign-state calls. Required validation remains
network-denied and uses no paid services. Live model answer quality is not certified.
