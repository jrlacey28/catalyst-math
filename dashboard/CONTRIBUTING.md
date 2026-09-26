# Contributing to Catalyst

Catalyst is a free, local mathematics learning application. The goal is a checked, accessible path from number sense to advanced university mathematics. A topic on the roadmap is not a finished course. See CURRICULUM_COVERAGE.md for current status.

## Run and verify

Use Python 3.10 or newer. No third-party Python packages or JavaScript dependencies are required for the dashboard. In a release, run `python start.py` and open the printed localhost address. In the original workspace, use `python math-tutor/dashboard/server.py`.

Run the applicable tests in dashboard/qa. Tests must use temporary directories or `--state-dir`; never exercise grading against a real learner's records. Browser tests additionally require Playwright and an available browser; update their documented paths to your environment. No paid service is needed for runtime use.

## Add a concept

1. Find the concept in curriculum_catalog.json. Use stable IDs and link genuine prerequisites; the graph must remain acyclic.
2. State a narrow, observable objective. Explain the idea before the rule. Include at least one simple example and one more demanding example, with a reason for every transformation.
3. State all restrictions: nonzero denominators, real square-root domains, positive logarithm inputs, inverse branches, and assumptions behind identities. Include a plausible wrong turn and why it fails.
4. Add three original practice questions at each of `gentle`, `standard`, and `stretch`. Provide a correct answer, tolerance where needed, explanation, and graduated hint. Vary representations and applications, not just the constants. Put independent check variations in `lesson.independent_check`; do not reuse worked examples verbatim.
5. Include an explain-back question. Numerical success alone does not justify a claim that a learner can prove or explain the result.
6. Use `availability: reference` for a checked written guide. Only call it a completed video lesson after a narrated animation has been rendered and inspected. The rendered-media index supplements this written-guide field; never remove an existing video because a written guide is still planned.
7. Validate every answer independently, including boundary cases and units. Ask a second reviewer to inspect the mathematical argument. Tests comparing a generated answer to the same answer key are not enough.

## Interactive lessons

Use accessible HTML and SVG. Every draggable handle also needs keyboard controls and a visible numerical control. Changing a parameter should update the equation, picture, and reported values together. Show undefined values and excluded points explicitly. Do not call sampled numerical agreement a proof of algebraic equivalence.

The reasoning workshop uses curated transformations with explicit explanations, not an unrestricted symbolic verifier. Add tested examples through its data model. Honor reduced-motion preferences. Avoid a screen full of prose; put the reason beside the exact step it explains.

## Learning evidence

### Application investigations

Author investigations in `studio_content.json` and their corresponding numerical models in `studio-labs.js`. State the decision, quantities, units and model assumptions. Supply conceptual explanations, a simple and connected worked example with justified transformations, a plausible misconception, a prediction, three integrated written challenges, a rubric and transfer to another context.

Each application has exactly three questions in each of `build`, `connect`, `transfer` and `review`. Keep IDs stable and keys server-side. Reserve the review items for delayed retrieval; do not duplicate worked or supported problems. Independently recompute every key and review restrictions, finite versus instantaneous changes, units and edge cases. Add genuinely new families when the finite bank is exhausted. A model renderer must update the diagram, equation and numerical table from the same calculation, support keyboard input, and retain a readable mobile alternative.

Run `dashboard/qa/test_studio.py` and `dashboard/qa/test_tutor_ai.py` after changing studio or assistance behavior. The latter uses a mocked local model; it never downloads weights. Optional AI output must remain labeled unverified, profile-bound assistance. It must never receive hidden assessment keys or award mastery. [LEARNING_DESIGN.md](LEARNING_DESIGN.md) explains the research and limits behind this structure.

### Deeper guides, generated review and written feedback

Use `advanced_guides.json` to extend an existing unguided topic without duplicating the roadmap. Supply two justified examples, nine practice and nine independent questions, valid topic connections, an application and a three-part written argument with a task-specific rubric. Preserve all theorem hypotheses and domains; get an independent mathematical review. Run `qa/test_advanced_guides.py` and the topic suite.

Add a skill family in `review_bank.py` with reviewed bounded parameters, unique valid choices, multiple representations, a useful hint, explanation, and exact display value where needed. A fingerprint must describe the mathematical item, not its seed. Keep answers and displays private until feedback. Test generated answers by a separate calculation, including boundary cases; do not merely compare a key with itself. Update `qa/test_mixed_review.py` for family changes.

`review.py` owns retrieval schedules only. Never grant a course unlock or change original mastery estimates from these short sets. Mark relevant help per skill, preserve unrelated evidence, track all exposed variants, and reject stale drafts. Intervals are teaching heuristics. Do not promise infinite fresh questions.

`feedback.py` resolves sources from the selected learner's saved work. Preserve immutable versions and source snapshots, require revisions to say what changed, and use optimistic revisions plus idempotency keys. All note-source labels are learner supplied; none certify correctness. Guidance and optional AI replies are assistance. Do not grade arbitrary proofs by keyword, and do not include hidden assessment keys in tutor briefs. Run `qa/test_feedback.py` and `qa/test_learning_extension.py` after modifying this flow. The latter mocks a local AI service and also checks profile and version changes during inference.

### Evidence boundaries

Keep learners separate. A fresh profile must have empty assessment and progress. Save actual responses, assistance, exposure, feedback, and review dates. Keep new independent checks separate from assisted or previously seen problems. Store written reasoning for review; do not grade arbitrary proofs with a keyword match. Do not label a passed short check as permanent mastery.

Reading, viewing, and production QA are not mathematical performance. Do not write test results into student records. Public releases must exclude learner names, responses, personal plans, diagnostic histories, and authentication data.

## Review and release

For a change, describe what the learner can now do, which mathematical assumptions apply, and how it was verified. Review desktop and mobile layout, keyboard navigation, persistence, fresh checks, and a wrong-answer path. Source and full-offline archives are built by tools/build_release.py from explicit allowlists; extend that allowlist only for shared content.

Keep linked third-party resources under their own licenses. Original Catalyst code and shared authored materials in the release use the included MIT license. The Catalyst mark is reused from the owner's earlier project with their authorization.

## Produce or revise a video

The authoring schema is in `tools/full_catalog/AUTHORING.md`. Edit the appropriate topic in basics.json, middle.json, or advanced.json. Use four mathematical scenes, explain why the transformations work, and supply three fresh written problems with checked tutor solutions. Keep the topic narrow and state restrictions.

Install the optional video requirements and local Kokoro model files, then run:

```sh
python -m pip install -r tools/requirements.txt
python tools/download_models.py
python tools/build_catalog_videos.py --prepare --narrate --render --publish --workers 4
python dashboard/qa/test_video_catalog.py
```

The pinned production environment uses Python 3.13; the dashboard itself needs only Python 3.10 or newer. Install the video dependencies in a separate virtual environment. The model downloader retrieves public Kokoro files for local synthesis; model weights are not included in the app download.

Use `--only course.topic` for a focused revision. Narration is reused when only the diagram changes, but the complete timed storyboard is refreshed and its video is rendered again. Read the transcript while inspecting the actual captured frames and playable video; a successful typeset or encoder run cannot establish mathematical correctness. Keep narration, captions, chapters, diagrams, and written problems consistent.

The full offline release contains every MP4. The source release contains reproducible scenes, lesson specifications, transcripts, captions, posters, and practice. Model weights and intermediate renders are omitted.
