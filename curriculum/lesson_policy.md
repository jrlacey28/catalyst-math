# Animation, assessment, and progression policy

Applies to every learner. User instruction adopted 2026-09-19: place on the shared roadmap, explain each needed concept with an animation, then use questions to determine readiness to move on.

## Lesson package

Follow `visual_style.md` for the user-approved production direction: geometric explanations inspired by the supplied reference, minimal text, unobtrusive corner metadata, and audible embedded narration. Do not reuse the rejected card-based L001 revision as a visual template.

Each introduced concept gets: objective and prerequisites; placement reason; checked Manim animation with local Kokoro narration; transcript; question bank; tutor rubric stored separately from the learner-facing materials; and a learner-specific status record. Use readable notation and movement that explains a relationship. Accessible text remains available if video cannot be played. Do not call an unrendered script a completed animation.

For the explicitly requested 4A, 4B, and 5 collection, retain all 24 packages and follow courses/levels-4a-4b-5/assessment_policy.md. The user's 2026-09-20 request additionally authorizes narrated videos for every topic in the full 159-topic roadmap now. Each new video introduces one focused idea, with captions, a transcript, and three written problems; advanced introductions do not imply textbook-scale course depth. Beyond this requested catalog, create additional packages for actual learning needs. Reuse verified generic materials and adapt examples and remediation to evidence.

## Readiness gate

After any guided practice, use a short set of four fresh independent checks: two applications, one transfer/context item, and one explain-back/task-interpretation item. A starting gate is at least three of four correct, including the transfer and explanation items. Every essential objective must have independent evidence. If the remaining error affects an essential objective, add a fresh targeted replacement check and resolve it before advancing. A minor arithmetic slip can be corrected by the learner without reteaching the concept; record it.

This gate is a tutoring heuristic, not a validated exam score. Adjust for complexity and corroborating prior evidence. Never pass a learner solely on a percentage when a prerequisite misconception remains. Never require arbitrary identical repetitions when varied evidence already supports readiness.

Hints make an item assisted; it cannot satisfy an independent gate. If hints or solutions are given, teach as needed and use a genuinely fresh replacement later. Do not leak pending gate answers in the animation, transcript, next-question prompt, or learner-facing files.

If the gate is passed, mark `ready_to_advance` and begin the next supported concept while scheduling delayed retrieval (initially 1–3 days, then adapt). Mark `retained` only after a delayed independent variation. Failure in retrieval triggers focused repair; no blanket course demotion. Do not increment mastery from preparing or viewing a video. Mastery estimates still require evidence and remain separate from lesson status.

## State and adaptation

Updated delivery preference: normal lessons and unit tests use batches of three problems, with time for the learner to work and ask questions. Do not dribble out a single exercise by default or dump the whole course's question bank into chat. Independent tests remain distinct from supported practice. For the requested 4A/4B/5 packages, a unit-end test supplements ongoing lesson checks; its scoring and retest rules are saved with the course.

Save item ID, exact response, reasoning, independent/assisted status, correctness, hints, reported confidence, and the next pending item. Keep retries attached to their original problem. Distinguish notation, task interpretation, conceptual errors, arithmetic slips, and uncertainty.

Use statuses `prepared`, `in_progress`, `needs_practice`, `ready_to_advance`, and `retained`. Preparing files alone leaves status `prepared`; do not claim watched, answered, or passed. When teaching starts, deliver three problems at a time and wait for the learner to work or ask questions. Do not restart the original diagnostic.

## Separate learners

The original learner uses `student/`, `diagnostic/`, and the personalized `curriculum/roadmap.md` and `curriculum/current_plan.md`. Shared framework/policy/media are reusable.

When someone explicitly identifies as a different learner, choose a distinct profile ID and create `students/<id>/` with its own `student/`, `diagnostic/`, and `curriculum/`. Start their evidence empty and perform their own assessment. Read `students/README.md`; never copy the original learner's results or expose their personal history in a new learner's lesson. If identity is ambiguous and affects whose records will be modified, clarify before recording responses. Do not infer a new person merely from a new session.

These are project-local reusable instructions, not a claim of installation in other agents or accounts.
