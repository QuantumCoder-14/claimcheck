# Credits and provenance

ClaimCheck is a **JavaScript reimplementation** of the analyser from **DeepShield 3.3**, an
earlier student project by a classmate, used with his permission. No Python from that project
is included here — this is a port, written from scratch in the browser, not a copy of files.

What came from his design:

| Part | Where it came from |
| --- | --- |
| Risk weights and baseline | His documented model: `risk = clamp(35 + Σ weights)`, `score = 100 − risk` |
| Brand, suspicious-TLD and shortener lists | Ported as-is |
| Typosquat rule | One Levenshtein edit from a brand of five letters or more |
| Registrable-domain handling | Same multi-part suffix approach (`co.in`, `co.uk`, …) |
| Claim scoring | Same formula: numbers, years, assertion verbs, superlatives, proper nouns, `%`, minus hedging, normalised by length; four-word minimum, 0.35 threshold |

What is new in this version: the browser implementation, the thirteen writing-style signals,
the claim list, the advisory for private and metadata addresses, the interface, and the test
suite.

If you reuse this, credit both — his model and this implementation.
