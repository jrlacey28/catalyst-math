# Shared mathematics curriculum

Saved from the learner's roadmap on 2026-09-19. This is the shared scope for every learner using this project. Individual placement, questions, mastery, and progress remain separate. Levels organize topics; they are not a single ability score or mandatory lockstep sequence.

## Core levels

| Level | Area | Concepts |
| --- | --- | --- |
| 0 | Number sense | Counting; place value; addition/subtraction; multiplication/division; order of operations; estimation |
| 1 | Arithmetic | Fractions; decimals; percentages; ratios; proportions; negative numbers; exponents; roots |
| 2 | Pre-algebra | Variables; expressions; one-step equations; multi-step equations; inequalities; coordinate plane; basic functions; word problems |
| 3 | Algebra I | Linear equations; linear inequalities; systems of equations; functions; slope; graphing; polynomials; factoring; quadratics; exponential functions |
| 4A | Geometry | Angles; triangles; congruence; similarity; circles; area/volume; coordinate geometry; proof basics |
| 4B | Statistics basics | Mean/median/mode; variance; standard deviation; distributions; correlation; basic probability |
| 5 | Algebra II | Advanced quadratics; polynomial functions; rational functions; radicals; complex numbers; exponentials; logarithms; sequences; series |
| 6 | Trigonometry | Right-triangle trig; sin/cos/tan; unit circle; radians; trig graphs; identities; trig equations |
| 7 | Precalculus | Function transformations; composite functions; inverse functions; advanced exponentials/logs; parametric equations; polar coordinates; sequences/series; introduction to limits |
| 8 | Calculus I | Limits; continuity; derivatives; product/quotient rule; chain rule; implicit differentiation; optimization; related rates |
| 9 | Calculus II | Integrals; fundamental theorem of calculus; integration techniques; applications of integration; improper integrals; infinite sequences; infinite series; Taylor series |
| 10 | Multivariable calculus | Vectors; 3D geometry; partial derivatives; multiple integrals; vector fields; line integrals; surface integrals |

## Parallel branches from relevant core prerequisites

| Branch | Concepts |
| --- | --- |
| Linear algebra | Vectors; matrices; linear systems; vector spaces; eigenvalues; eigenvectors |
| Discrete mathematics | Logic; sets; proofs; combinatorics; graph theory; algorithms |
| Probability | Counting; conditional probability; Bayes theorem; random variables; distributions; expectation |
| Statistics | Sampling; estimation; hypothesis testing; regression; confidence intervals; statistical inference |

## Advanced branches

Proof writing / mathematical foundations; real analysis; complex analysis; abstract algebra (groups, rings, fields); number theory; differential equations (ODEs and PDEs); optimization; numerical analysis; topology; differential geometry; measure theory; stochastic processes; functional analysis.

## How to interpret the arrows

Use `prerequisite_graph.md` to decide readiness for a concept. Geometry and statistics can run in parallel with algebra. Elementary probability and discrete mathematics can begin before calculus. Linear algebra need not wait for multivariable calculus. Introduce vectors earlier when helpful. Advanced branches have different dependencies; real analysis is not a universal prerequisite for every introductory complex-analysis topic. Do not require finishing every earlier level to start a supported topic.

## Required teaching cycle

1. Assess the learner independently, keeping assessment separate from teaching. Map evidence to individual concepts in this framework; untested means unknown.
2. Choose the earliest relevant prerequisite gap that blocks the learner's goals. Briefly verify uncertain prerequisites instead of restarting every lower level.
3. Create or reuse a checked animation for each concept that needs teaching, with one clear learning objective. Default to 30 seconds–3 minutes, Manim visuals, local Kokoro narration, and a readable transcript. Prefer on-demand production over rendering the entire catalog before placement.
4. Follow with three problems at a time: practice, then fresh independent questions, a different representation/context, and explain-back. Allow questions and help during practice. Keep the original diagnostic one item at a time. Label help honestly.
5. Use the progression gate in `lesson_policy.md`. If ready, unlock the next supported concept; if not, identify the error, give a targeted explanation/animation revision, and use fresh questions.
6. Schedule delayed retrieval and adapt. A passed lesson is not permanent mastery. Persist results in that learner's profile only.

Animations and their question banks may be reused by multiple learners; watching, attempts, hints, scores, and review dates may not be inherited from another learner.
