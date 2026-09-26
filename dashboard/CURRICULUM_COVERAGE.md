# Curriculum coverage and delivery status

Updated 2026-09-26. Shared content only; authoring does not change learner placement or mastery.

## What is available

- 159 narrated concept videos across 29 courses, one for every mapped topic.
- 137 worked guide banks, each with 9 supported practice and 9 reserved check questions across three difficulties: 2,466 numeric/choice items in total.
- 24 original Geometry, Statistics Basics and Algebra II packages retain their homework, lesson checks and unit checks. Two also have guide banks.
- All 159 distinct topics therefore have an introductory practice/check sequence. The 85 newly completed guides add 170 worked examples, 1,530 keyed items and 255 structured writing parts.
- 22 legacy-only topics add 44 worked examples for the gradually reduced guidance flow. Their existing assessment banks remain intact.
- The 135 additional videos retain 405 written homework questions with captions and transcripts. Written arguments and proofs remain pending tutor review.
- Topic-wide delayed recall uses fresh remaining questions after dated independent passes. The separate generated bank provides 42 parameterized families across 14 skills. Both track exposure and report exhaustion.
- 159 lesson application missions use seven live models. Four connected projects add 18 saved stages spanning supplies, spacecraft, graphics, sound and energy. Eight earlier application investigations remain available.
- Written-step feedback, in-place prerequisite repairs, partial examples, math notation help, saved project decisions and a voluntary learner pilot are included.

## Availability contract

`curriculum_catalog.json` supplies the original catalog and 28 guides. `advanced_guides.json` adds 24; `completed-guides-foundations.json` and `completed-guides-college.json` add 43 and 42 respectively. `legacy-scaffolds.json` supplies examples for 22 original lesson packages without a separate guide bank. `/api/roadmap` merges these files by stable topic ID and removes reserved checks and answer keys from its public response.

`video_catalog.json` indexes completed media. Source-only downloads retain transcripts and practice and accurately report missing local MP4 files. A video is a focused introduction, not an exhaustive course. Automatic numeric/choice checks provide evidence for those tasks; they do not establish proof competence, whole-course mastery or long-term retention. Written explanations, unfamiliar transfer and delayed recall supply additional evidence.

## Course inventory

| Course | Topics / videos | Guide banks | Original packages | Topics with checks |
| --- | ---: | ---: | ---: | ---: |
| Number sense | 6 | 6 | 0 | 6 |
| Arithmetic | 8 | 8 | 0 | 8 |
| Pre-algebra | 8 | 8 | 0 | 8 |
| Algebra I | 10 | 10 | 0 | 10 |
| Geometry | 9 | 0 | 9 | 9 |
| Statistics basics | 6 | 0 | 6 | 6 |
| Algebra II | 9 | 2 | 9 | 9 |
| Trigonometry | 7 | 7 | 0 | 7 |
| Precalculus | 8 | 8 | 0 | 8 |
| Calculus I | 8 | 8 | 0 | 8 |
| Calculus II | 8 | 8 | 0 | 8 |
| Multivariable calculus | 7 | 7 | 0 | 7 |
| Linear algebra | 6 | 6 | 0 | 6 |
| Discrete mathematics | 6 | 6 | 0 | 6 |
| Probability | 6 | 6 | 0 | 6 |
| Statistics and inference | 6 | 6 | 0 | 6 |
| Proof writing and mathematical foundations | 3 | 3 | 0 | 3 |
| Real analysis | 5 | 5 | 0 | 5 |
| Complex analysis | 3 | 3 | 0 | 3 |
| Abstract algebra | 3 | 3 | 0 | 3 |
| Number theory | 3 | 3 | 0 | 3 |
| Differential equations | 2 | 2 | 0 | 2 |
| Optimization | 3 | 3 | 0 | 3 |
| Numerical analysis | 4 | 4 | 0 | 4 |
| Topology | 3 | 3 | 0 | 3 |
| Differential geometry | 3 | 3 | 0 | 3 |
| Measure theory | 3 | 3 | 0 | 3 |
| Stochastic processes | 3 | 3 | 0 | 3 |
| Functional analysis | 3 | 3 | 0 | 3 |

## Why-this-step preparation for calculus

The guide sequence repairs algebraic structure instead of merely presenting derivative recipes. Each arrow below identifies support, not a requirement to repeat every earlier course:

1. `arithmetic.fractions`: name common units, invert a nonzero divisor, and cancel factors instead of terms.
2. `pre-algebra.expressions`: distinguish sums from products, distribute a minus sign, and separate rewriting from solving.
3. `pre-algebra.basic-functions`: replace the whole input; distinguish `f(t+1)` from `f(t)+1` and from solving `f(x)=1`.
4. `algebra-1.polynomials`: derive every cross term in `(x+h)²`, then cancel matching additive terms before factoring.
5. `algebra-1.factoring`: expose a product and use the zero-product property only when a product equals zero.
6. `algebra-2.rational-functions`: preserve exclusions while cancelling a common nonzero factor.
7. `algebra-2.radicals`: rationalize with a nonzero conjugate and check candidates after squaring.
8. `precalculus.composite-functions`: track inner and outer inputs, their order, and both domain checks.
9. `calculus-1.limits`: distinguish nearby agreement from the original function value at a missing input.
10. `calculus-1.derivatives`: derive the difference quotient, explain why `h≠0` during cancellation, and attach rate units.
11. `calculus-1.product-quotient-rule` and `calculus-1.chain-rule`: connect rules with expression structure, then simplify with the same algebraic reasons.

Further authored introductions include signed integrals versus total distance, partial versus path derivatives, vector linear combinations, matrix composition order, and proof versus examples. The separate reasoning workshop can link directly to these stable topic IDs.

## Assessment and privacy contract

- `lesson.practice` holds nine exercises. Default presentation is three at one difficulty, with opportunities to request help and explain reasoning.
- `lesson.independent_check` holds nine other problems with stable IDs. Exclude this entire array from the public catalog response; serve only the active questions through the assessment endpoint.
- Every question has `kind` (`number` or `choice`), `prompt`, `answer`, `explanation`, `difficulty`, and a stable `id`. Choices have `options`; numeric keys have `tolerance: 0.00001`. The safe arithmetic parser from the existing question bank supports numerical expressions.
- `answer`, `explanation`, `hint` if later added, and `tolerance` are server-side grading data and are stripped from unsolved question responses. The source repository is intentionally open; local API privacy prevents accidental UI spoilers, not adversarial high-stakes exam security.
- Each authored check pool supports three fresh mixed-difficulty sets. Keep exposure fingerprints across attempts; help or feedback cannot turn an already exposed problem into independent evidence by changing its ID.
- If all fresh checks are exhausted, request an additional genuinely new set after focused repair. The finite authored bank must not silently recycle a known item and award independent credit.
- An auto-graded check provides provisional task evidence. The separate explain-back prompt, transfer reasoning, and delayed retrieval still need review under `curriculum/lesson_policy.md`. Written proof quality is not automatically graded by these numeric/choice items.
- Course and topic prerequisites are support graphs. Do not turn every preceding course into a blanket hard lock or infer failure from unknown evidence.
- Store all attempts in the currently selected learner only. The shared catalog contains no learner records.

## Verification

Run `math-tutor/.venv/Scripts/python.exe math-tutor/dashboard/qa/test_curriculum.py`. The eight checks verify:

- Complete 29-course inventory and advanced named topic coverage.
- Unique stable IDs and valid metadata.
- No missing prerequisites or cycles in either dependency graph.
- Exact one-to-one mapping of the 24 existing rendered lesson IDs.
- Substantive examples with explanations, nine practice and nine independent-check items per guide, and distinct question prompts within each bank.
- Numeric finiteness, valid choice options, and private answer filtering.
- Independent numerical spot calculations for high-risk algebra, composition, calculus, vector, and matrix keys.

A separate backend reviewer recalculated the calculus, composition, integrals, partial derivatives, vectors, matrices, and proof guide questions, plus 90 of the 168 added retest items; no unresolved mathematical errors were found. A domain qualifier in a conjugate limit and the time units of a derivative example were clarified. A repeated generic factorization prompt was made expression-specific so exposure tracking treats distinct items correctly. These checks support release; they do not replace ongoing mathematical/pedagogical review as the curriculum expands.

## Authoring and contribution boundaries

All newly written explanations and question wording are original for this project; no paid-platform lesson content was copied. The learning approach uses visual intuition, clear transformations, varied problems, meaningful feedback, and independent reasoning. Future authors should add a focused guide and fresh checks, verify every rewrite and its domain, produce and inspect its animation, and publish verified media through video_catalog.json. Extend advanced courses beyond their current focused introductions with further examples and reviewed assessments.

## Video verification

`dashboard/qa/test_video_catalog.py` verifies exact coverage, authored/prepared/timed storyboard agreement, current render and narration fingerprints, 1080p media, embedded AAC audio, normalized loudness, complete-stream decode records, four captured stages per new video, and all 405 written questions. Browser checks exercise captions, seeking, saved work, profile isolation, route changes, and mobile layout. Source scripts and mathematical keys receive independent review; representative actual frames are inspected for notation, scale, overlap, and narration alignment.

Final delivery audit (2026-09-20): 159 playable videos, 183.6 total minutes, 135 new caption tracks, 405 new written problems, and 29 verified course pages. A fresh source installation starts with empty learner evidence, serves all transcripts, and saves written homework. The full offline archive contains exactly 159 MP4 files.

## Depth and retrieval verification, 2026-09-21

`qa/test_advanced_guides.py` checks the 24-guide overlay, private keys, unique fresh prompts, valid connections and independently calculated selected answers. Two independent reviewers inspected calculus/integration and proof-oriented additions, clarifying theorem hypotheses, domains and geometric regions. `qa/test_mixed_review.py` independently recomputes 3,360 generated instances and checks freshness, per-skill assistance and 1→3→7→14→30-day scheduling. `qa/test_feedback.py` and `qa/test_learning_extension.py` cover saved-writing sources, immutable revisions, profile isolation, stale changes and cross-feature help. Numeric/choice checks still leave the quality of a written argument awaiting review.
