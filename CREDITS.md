# Credits

The idea for a two-panel link-and-text checker came from an earlier student project, which its
author has since stopped working on.

**No code was copied.** This is an independent implementation with a different model:

| | That earlier approach | ClaimCheck |
| --- | --- | --- |
| Link output | A 0-100 risk score built from a baseline plus weighted signals | Five questions, each answered pass / warn / fail |
| Name check | Edit distance against a brand list | Confusable-skeleton comparison (digits and lookalike pairs collapsed) |
| Text output | A credibility score | A per-claim table of the evidence attached |
| Dependencies | Python backend, local LLM, live feeds | One HTML file, no network |

The five-question model, the skeleton matcher, the evidence classification, the interface and
the test suite were written for this project.
