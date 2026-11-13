# ClaimCheck

**What is this link actually pointing at, and what evidence does this claim come with?**

**[Live: quantumcoder-14.github.io/claimcheck](https://quantumcoder-14.github.io/claimcheck/)**

Two panels, no score to take on faith. One reads a link's identity. The other reads a text's
claims and says what, if anything, backs each one.

## Links: five questions, not a number

Instead of adding weights into a risk score, the page asks five questions and answers each with
a verdict and a reason:

| Question | Fails when |
| --- | --- |
| Is the name honest? | The domain is dressed up to read as a name people log into |
| Is the connection encrypted? | The address is plain `http` |
| Does it go where it appears to? | A shortener, a redirect in the query string, or a raw IP |
| Is it a public site? | It points at a loopback, private or cloud-metadata address |
| Is the address itself clean? | Punycode, embedded credentials, heavy encoding, deep subdomains, padding |

The headline comes from **how many questions failed and which ones** — a dishonest name or a
private address is disqualifying on its own, while a single cosmetic oddity is not. Every row
shows its reasoning, so there is nothing to trust blindly.

### How the name check works

`paypa1-secure.com` is not one character away from `paypal.com` — it is two, so edit distance
misses it. Instead the domain is reduced to a **skeleton**: digits that read as letters are
swapped (`1`→`l`, `0`→`o`, `5`→`s`), lookalike pairs are folded (`rn`→`m`, `vv`→`w`), doubled
letters collapse, punctuation is dropped. `paypa1secure` and `paypal` then meet in the middle,
and so do `rnicrosoft` and `microsoft`, and `g00gle` and `google`.

## Text: a table of evidence

For each sentence that actually asserts something, the page names the evidence attached to it:

- **linked document** — a circular, notification, filing or URL
- **named source** — a ministry, court, spokesperson, or "according to the department"
- **direct quote** — a quoted line
- **figures only** — numbers with nothing behind them
- **nothing offered** — the common case

"Sources say" deliberately counts as *nothing offered*: an authority nobody can check is not
evidence. The tally underneath counts sourced claims, unsourced ones, hedges and absolutes, and
the headline changes when a well-sourced piece is still written in absolutes.

## What this cannot do

- **It cannot tell you whether a claim is true.** It tells you whether anyone is named who could
  be checked.
- **It cannot see the sender, the certificate, or where a shortener leads.** Those need network
  access the page does not have.
- **A clean link is not a safe page.** An honest domain can host a scam, and an ugly address can
  be a legitimate internal tool.

## Privacy

No server, no analytics, no storage. Nothing you paste leaves the tab.

## Tests

```bash
node tests/test.js     # 63 assertions
```

The skeleton matcher in both directions (`paypa1` and `rnicrosoft` collapse, `example` does
not), ownership parsing for `co.in` style domains, each of the five questions in pass, warn and
fail states, the disqualifying-failure rule, and evidence classification — including that
"sources say" is *not* a named source.

## Licence

MIT with Commons Clause. Copyright (c) 2026 Siddhant Neekhra. See [LICENSE.md](LICENSE.md).
