# ClaimCheck

**What is this link actually pointing at, and what evidence does this claim come with?**

**[Live: quantumcoder-14.github.io/claimcheck](https://quantumcoder-14.github.io/claimcheck/)**

Two readings, no score to take on faith. One reads an address; the other reads a text's
assertions and says what kind of source stands behind each.

## Part one: seven questions about an address

| Question | What it examines |
| --- | --- |
| Is the name honest? | Punycode decoded back to Unicode, scripts compared, letters transliterated and skeleton-matched against names people log into |
| Is the connection encrypted? | `https` versus plain `http` |
| Does it go where it appears to? | Shorteners, destinations carried in the query string, raw IPs |
| Is it a public site? | Loopback, private ranges and cloud-metadata addresses |
| Is the name a word, or a keyboard mash? | Vowel ratio, digit density, consonant runs — what throwaway domains look like |
| Is the path itself dangerous? | Executables, double extensions, account-pressure words, opaque parameters |
| Is the address itself clean? | Punycode, embedded credentials, encoding density, subdomain depth |

The headline comes from **which** questions failed. A dishonest name, a private address or a
dangerous path is disqualifying on its own; a single cosmetic oddity is not.

### The three tricks in the name check

**Punycode decoding.** Browsers hand you `xn--80ak6aa92e` and render `аррӏе`. To say anything
true about that, the label is decoded with a full RFC 3492 implementation, so the reading names
what the reader actually sees.

**Transliteration.** `аррӏе` is *entirely* Cyrillic, so "mixed scripts" detection never fires.
Instead the common confusable letters are folded to Latin — `а`→`a`, `ӏ`→`l`, `р`→`p` — which
turns the label into `apple` and exposes the homograph.

**Skeleton matching.** `paypa1-secure` is not one edit from `paypal`, it is two, so edit distance
misses it. Digits that read as letters are folded (`1`→`l`, `0`→`o`), lookalike pairs collapse
(`rn`→`m`), doubled letters merge, punctuation drops — then `paypa1secure` and `paypal` meet in
the middle.

## Part two: what backs each claim

Every sentence that asserts something is tagged with the **kind** of source behind it, strongest
first:

| Kind | Strength |
| --- | --- |
| linked document — circular, notification, gazette, filing | 4 |
| court or ministry | 4 |
| academic study — peer-reviewed, journal, preprint | 3 |
| named official — spokesperson, press release, "said in a statement" | 3 |
| news agency — Reuters, PTI, ANI | 2 |
| unnamed officials — "sources say", "on condition of anonymity" | 1 |
| figures only | 1 |
| nothing offered | 0 |

"Sources say" deliberately scores **1, not 3**: an authority nobody can name cannot be checked.
Quotes are inspected separately — a quotation with nobody named as saying it is flagged as such,
and sentence splitting understands `Dr.`, `Mr.` and `e.g.` so those do not become fragments.

## What this cannot do

- **It cannot tell you whether a claim is true.** It tells you whether a checkable source exists.
- **It cannot follow a link.** No redirect resolution, no certificate inspection, no live feeds —
  those need network access the page does not have.
- **A clean address is not a safe page.** Honest domains host swindles; ugly addresses belong to
  legitimate internal tools.

## Privacy

No server, no analytics, no storage. Nothing you paste leaves the tab.

## Tests

```bash
node tests/test.js     # 81 assertions
```

Covers the punycode decoder against known values (`bcher-kva` → `bücher`, `80ak6aa92e` → `аррӏе`)
and its rejection of invalid input; transliteration; script detection; skeleton matching in both
directions; readability heuristics; all six path hazards; each of the seven questions in pass,
warn and fail states; abbreviation-aware segmentation; the full source taxonomy including that
anonymous sources outrank nothing but lose to named ones; and quote attribution.

## Licence

MIT with Commons Clause. Copyright (c) 2026 Siddhant Neekhra. See [LICENSE.md](LICENSE.md).
