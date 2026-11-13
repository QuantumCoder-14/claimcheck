# ClaimCheck

**Score a link's technical risk, or a piece of text's credibility signals — in the browser,
with every point explained.**

**[Live: quantumcoder-14.github.io/claimcheck](https://quantumcoder-14.github.io/claimcheck/)**

Two panels: paste a link and see what is structurally wrong with it, or paste a message and see
whether it is written like reporting or like a forward.

This is a **client-side reimplementation of an earlier project** written by another student and
since handed over to this repository's author. That original needs a Python backend and a local
LLM; this runs from a single HTML file, so it can live on the open web. See
[CREDITS.md](CREDITS.md).

## The link model, unchanged

```
risk  = clamp(35 + Σ weights, 0, 100)
score = 100 − risk
```

`35` is the baseline, so an unknown site with no other evidence scores **65** — deliberately
"uncertain", never "safe". Higher score = lower detected risk.

| Signal | Points |
| --- | --- |
| `transport.no_https` | +6 |
| `transport.https_valid` | −8 |
| `url.ip_literal_host` | +25 |
| `url.punycode_host` | +22 |
| `url.lookalike_domain` | +20 |
| `url.credentials_in_url` | +15 |
| `url.brand_in_subdomain` | +15 |
| `url.suspicious_tld` | +12 |
| `url.encoded_redirect` | +12 |
| `url.url_shortener` | +10 |
| `url.nonstandard_port` | +8 |
| `url.excessive_subdomains` | +6 |
| `url.many_encoded_chars` | +6 |
| `url.long_url` | +5 |

Bands, also from the original: 0-34 critical · 35-59 elevated · 60-79 moderate · 80-100 lower.

The analyser behind those numbers is ported too, not approximated: the same brand, TLD and
shortener lists, the same multi-part registrable-domain handling (`co.in` and friends), the same
typosquat rule — **one Levenshtein edit from a brand of five letters or more**, which catches
`gooogle.com` where a substring check would not — and the same 120-character threshold for a
long URL. Private, loopback and cloud-metadata hosts get a plain-language advisory.

Every row in the results panel shows the signal id, the points it added, why it matters, and
the exact substring that triggered it. The line under the list shows the arithmetic, so the
number is auditable rather than mystical.

## The text model

Thirteen signals that describe **how** something is written, each with a weight and a reason:
sensational framing, chain-message phrasing, shouting, exclamation stacking, unnamed
authority, absolute certainty, conspiracy framing, missing dates, missing figures, link bait —
and on the positive side, named sources, appropriate hedging, and direct quotation.

```
score = clamp(50 + Σ weights, 0, 100)
```

50 means "no signals either way". The panel then lists the **checkable sentences**, ranked with
his factual-score formula: numbers, years, assertion verbs, superlatives and proper nouns add
weight; hedging subtracts; the total is divided by sentence length so long sentences do not
always win. Four words minimum, 0.35 threshold, six results at most.

## What this cannot do

- **It cannot tell you whether a claim is true.** The original verifies claims against public
  fact-check APIs and a local LLM; that needs a backend and is not part of this page. What
  remains is style analysis, which catches forwards and propaganda patterns, not confident
  liars who write well.
- **It has no live threat feed.** The original's blocklists are refreshed from public feeds by the
  backend. A static page cannot do that, so link scoring is structural only.
- **It cannot see the sender, the certificate chain, or the redirect path.** Those need network
  access the page deliberately does not have.
- **A low score is not proof of a lie, and a high score is not a fact-check.**

## Privacy

No server, no analytics, no storage. The link and the text are analysed in the page and
disappear when you close the tab.

## Tests

```bash
node tests/test.js     # 62 assertions
```

Includes the model's documented invariants — baseline risk, the HTTPS adjustment, clamping at
0 and 100, every band boundary — plus a check that **all fourteen documented weights are
present**, so a future edit cannot silently drop one. The ported internals are tested directly:
registrable-domain extraction, Levenshtein distance, typosquat detection (`gooogle.com` flagged,
`google.com` not), private-host detection, the 120-character threshold at both sides, the
private-address advisory, and the claim scorer rewarding figures while penalising hedging.

## Licence

MIT with Commons Clause. Copyright (c) 2026 Siddhant Neekhra. See [LICENSE.md](LICENSE.md).
