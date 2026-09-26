# Adaptive starting-point screen

The home page and **Find my level** navigation open `#placement`. A learner explicitly starts the test; opening the page alone does not restart an earlier diagnostic. It uses 25 questions selected from 108 original, server-keyed items. No timer, fixed passing percentage, or whole-course grade is used.

## Coverage and branching

- Four algebra routing questions start at multi-step equations. Independent correct responses move up one rung; difficulty, unfamiliarity, reported guessing, or help moves the next probe toward an easier rung. Confidence alone does not override correctness; “unsure” is not treated as guessing.
- Sixteen questions then sample eight other areas twice each: number sense/arithmetic, functions/precalculus, geometry, trigonometry, calculus/multivariable, probability/statistics, linear algebra, and discrete math/proof. Algebra evidence seeds the initial probe difficulty but never awards evidence in those areas.
- The last five questions preferentially check uncertain skills with the other authored form. When no such boundary remains, they extend calculus and mathematical reasoning and check functions. The strongest route can reach differential equations and abstract algebra. More advanced branches in the roadmap can remain untested.
- Each skill has two different prompts. Questions never repeat within this assessment. A completed assessment remains reviewable; there is no repeated-test shortcut that awards fresh evidence from memorized answers.

The bank is in `placement_bank.py`; selection and reporting are in `placement.py`. Rungs are local screening order, not a claim that different branches form one universal prerequisite ladder. The method is a transparent heuristic, not a psychometrically calibrated test. Twenty-five items can find useful starting points but cannot exhaustively assess all 159 curriculum topics or certify advanced proof ability.

## Evidence and recommendations

Each submitted response saves its item ID, exact answer, reasoning, reported confidence, assistance, correctness, independent status, time, and action (answer, don't know, or unfamiliar). Wrong answers are not automatically classified as specific misconceptions. Written explanations remain pending tutor review. Unanswered/unfamiliar probes have null correctness rather than being labeled mathematically incorrect. Assisted or explicitly guessed correct answers do not move the independent boundary upward.

The result distinguishes positive evidence, mixed responses, review needs, unfamiliarity, assisted/guessed work, and unknown skills. Two matching independent responses corroborate a local finding; one response remains limited evidence. Recommendations first address observed number-sense, algebra, or function issues, then other sampled branches. Each area also has its own starting link, preserving uneven strengths. Even an issue-based starting link calls for a brief check before prescribing remediation. Entire untested curriculum topics are listed as unknown.

No placement response mutates lesson unlocks, original mastery estimates, delayed-retention records, or a learner's selected course. Home shows the assessed recommendation; existing in-progress lessons and explicit course preferences remain usable. A completed screen supports teaching decisions, not durable mastery claims.

## Saving and isolation

The existing profile store writes `placement_session` inside that learner's `dashboard_progress.json`, under the request lock and with atomic replacement. It contains one saved pending item, response history, draft, revision, and eventual report. Draft updates use optimistic revision checks; stale tabs are rejected. Exact retries of submitted requests are idempotent. The regular progress export includes placement evidence and drafts without unrevealed answer keys. State remains separate from the original chat diagnostic.

Only the pending question is sent to the browser. Keys and future questions stay on the local server, and their files are not static routes. Correctness and responses appear at completion; hints and worked solutions are not shown during the screen. Opening a lesson or exploration from an active placement flags the pending item as assisted; learners can also report outside help. This local self-assessment does not claim proctoring or protection against someone reading the installed source bank.

## Validation

Run `python math-tutor/dashboard/qa/test_placement.py`. It exercises strong, struggling, uneven, unfamiliar, guessed and assisted paths; all-nine-area coverage and the 25-item bound; stale revisions and exact retry deduplication; private keys; disk resume; and distinct learners over actual HTTP. Use temporary profiles for browser QA, never the owner's records.
