# What Catalyst needs for deeper, efficient learning

Reviewed 2026-09-21. The design below combines an audit of the actual app, independent mathematical review, and research. It is a development plan and an explanation of the present learning experience, not a claim that Catalyst has been experimentally shown to be the fastest way to learn mathematics.

## Main finding

The app has introductory video coverage across all 159 roadmap topics, but depth is uneven. Before this iteration, 28 study guides and 24 original lesson packages covered 50 distinct topics with structured checks. The other 109 topics had short videos and saved written problems, without equivalent in-app feedback and independent-check sequences. Advanced course names identify a destination; a one-minute introduction is not a university course.

The highest-value improvement is a complete cycle that connects explanation, mathematical representations, supported attempts, feedback, independent method selection, applications, and later retrieval. Add videos when they resolve a particular misconception or explain a process that movement makes clearer. Increasing the video count alone does not establish understanding.

## Research and design decisions

| Finding and source | Application in Catalyst | Important limit |
| --- | --- | --- |
| Space study, alternate worked examples with problems, connect graphics and words, and ask explanatory questions. [IES practice guide](https://ies.ed.gov/ncee/wwc/PracticeGuide/1) | Worked steps explain the operation and its conditions; learners propose a next step, attempt three questions, and return later. | Evidence strength varies by recommendation. The app's exact sequence and intervals are design choices, not an experimentally optimized dose. |
| Faded worked examples can support an efficient transition to solving problems in the studied tutoring contexts. [Salden et al., author-hosted research paper](https://pact.cs.cmu.edu/pubs/SaldenEtAl-BeneficialEffectsWorkedExamplesinTutoredProbSolving-EdPsychRev2010.pdf) | Reveal a step with its reason; offer an entire example for learners who need it; then reduce support across practice stages. | This evidence does not establish that the same amount of support suits every learner or every advanced topic. |
| Mixed mathematics practice can help students learn to choose among strategies. [Rohrer et al., randomized trial record](https://ies.ed.gov/ncee/wwc/Study/88770) | Include questions that require a method or model choice, and provide cumulative mixed reviews across previously practiced skills. | Interleaving is not random mixing of wholly unfamiliar methods. Studio sets are within-project; a separate review engine now mixes 14 selected prerequisite and calculus skills. It does not yet span every roadmap topic. |
| An analysis of 225 undergraduate STEM studies favored active learning over traditional lecturing on average. [Freeman et al., PNAS](https://www.pnas.org/doi/10.1073/pnas.1319030111) | Learners predict, manipulate, calculate, explain, and make a decision. | Those classroom results are not an effect-size prediction for this app or proof that any interactive widget works. |
| Understanding and explicit connections across contexts matter for transfer. [National Research Council, Learning and Transfer](https://www.nationalacademies.org/read/9853/chapter/6) | Each application has quantities, units, assumptions, a decision, and a second context that shares the underlying structure. | A realistic story alone does not guarantee transfer. Test an unfamiliar context without naming the required method. |
| Simulations work best as deliberately designed learning activities, with mathematical goals and useful prompts. [PhET math activity-design guidance](https://phet.colorado.edu/en/teaching-resources/virtual-workshop/math-activity-design) | Hide the model until the learner considers a prediction; connect controls, a diagram, a numerical table, and equations. | Allow exploration and avoid turning every action into a rigid worksheet. A graph movement is not assessed mastery. |
| A high-school mathematics field experiment distinguished assisted practice performance from later unassisted learning, with different outcomes for unrestricted and more carefully designed AI tutoring. [Bastani et al., PNAS](https://pmc.ncbi.nlm.nih.gov/articles/PMC12232635/) | AI starts from authored reference material and requests hint-first explanations, while its responses are labeled drafts and excluded from grading. Related checks become assisted after help. | Prompt instructions do not guarantee correct mathematics or learning gains. The study does not validate this local model integration; independent attempts remain necessary. |

## The connected application layer

Eight authored applications add 16 worked examples, 96 structured questions in three-item sets, eight live models, and 24 integrated project tasks. Each also includes a misconception, an explain-back, a cross-context transfer prompt, and an explicit rubric for written reasoning.

| Application | Connected mathematics | What the learner must decide |
| --- | --- | --- |
| Scale a recipe | Fractions, ratios, per-unit quantities, constraints, rounding | Preserve a mixture while buying enough supplies and handling a limiting ingredient. |
| Compare workshop plans | Expressions, functions, graphs, inequalities, break-even | Choose a plan based on expected use and explain when that recommendation changes. |
| Design a garden | Perimeter, area, equivalent quadratic forms, feasible domains, optimization | Justify dimensions under a fixed fence budget, then revise for a wall constraint. |
| Interpret motion | Position, difference quotients, derivatives, signed accumulation | Distinguish rate, displacement and distance, including a reversal of direction. |
| Animate a growing circle | Composition, expansion, chain rule, rates, units | Connect a radius animation to changing area and compare two valid derivations. |
| Evaluate inspection | Percentages, conditional probability, expected counts, Bayes | Interpret flagged items using the underlying defect rate and error rates. |
| Transform graphics | Vectors, matrices, rotation, scaling, order of operations | Choose an ordered transformation and explain why reversing it changes the result. |
| Reason from samples | Mean, sampling variation, finite populations, evidence | Compare a sample with a population and explain what an estimate can support. |

These are original teaching scenarios and explicitly simplified models. Their example parameters and synthetic datasets are not empirical claims about a real business, factory, or population. Questions state their own parameters; changing a slider cannot change a saved question's answer.

## Personalization and AI

The learner can select any of the 159 topics, choose interests, and describe a goal. Authored application recommendations use those explicit selections; they do not infer ability, a diagnosis, or a preferred sensory “learning style.” A portable tutor brief includes the selected context and any deliberately selected project's work. It excludes private assessment history and can be reviewed before copying.

An optional Ollama adapter can ask an installed local model for a personalized explanation. The service address is fixed to localhost; cloud model entries, redirects, and environment proxies are excluded. No model is installed automatically and no paid API key is required. When no model is present, the app says so and retains the brief workflow. Model replies are saved separately as unverified drafts. They never award grades, unlocks, or mastery. Profile changes during inference discard the stale reply.

## Feedback and evidence

Numeric and choice questions receive checked answer feedback with reasons. Hints and explanations support learning, and they are recorded as assistance. Written models, proofs, explanations, and decisions remain pending tutor review; keyword matching is not used to judge their quality.

Within an application investigation, a successful supported set makes a reserved review available after a delay. Related explanation or AI help resets the meaningful delay. An unassisted successful review supports recall of those tasks, not an entire course. This fixed studio bank is finite: after exposure, a genuinely new authored variation is required for further fresh independent evidence. The separate mixed-review engine below adds continuing fresh families for selected skills.

## The next implemented layer, 2026-09-21

- **Deeper selected topics:** 24 new guides bring the total to 52, adding 59 worked examples, 432 numeric/choice practice and independent-check questions, and 72 written tasks. The calculus sequence now has a guide for each topic; selected advanced branches add explicit hypotheses, counterexamples and proof obligations. All reuse their existing narrated animations.
- **Fresh families:** 42 reviewed parameterized families across 14 skills rotate calculation, interpretation and method/error representations. Parameter changes alone are not claimed to prove unfamiliar transfer. Each family has bounded valid inputs, semantic exposure tracking and independent mathematical tests.
- **Continuing mixed recall:** three-question sets mix eligible skills and retain per-skill intervals of 1, 3, 7, 14 and 30 days. Hints and related explanations mark assistance. Only fresh delayed unassisted performance supports recall; ordinary practice cannot silently become independent mastery.
- **Written reasoning:** a learner selects actual saved work, identifies an uncertain step, uses five concrete review criteria, preserves attributed feedback, and records a revised explanation and reason for the change. Original versions remain readable. The workflow supports tutor review without pretending that rubric keywords certify a proof.

## What still needs development

1. **Complete course depth.** Introductory practice/check sequences now cover all 159 topics. Continue expanding multi-lesson strands, advanced proofs and unfamiliar transfer tasks; a focused guide does not supply a whole university course.
2. **Broader fresh review.** The 14-skill engine needs additional reviewed geometry, probability, statistics, proof and advanced families. Its current parameter spaces are finite and exhaustion must remain honest.
3. **Human review and learning evidence.** The written desk needs trials with learners and tutors. Optional model output is unverified help, not an authoritative proof checker. Measure whether revisions correct the reasoning on a fresh task.
4. **Advanced investigations.** Four connected projects now preserve decisions across18 stages. Additional wave/heat models with boundary conditions, spectral dynamics and numerical error experiments remain useful future depth.
5. **Accessibility and evaluation.** Continue keyboard, notation, text-alternative and language-load review with actual learners. Evaluate unfamiliar transfer and delayed retention, not only clicks, confidence, immediate scores or time watched.

## How to find out whether it helps people learn faster

Measure time to independent success at comparable prior knowledge, hint dependence, explanation quality, unfamiliar transfer, misconception recurrence, and recall after a delay. Use fresh matched pre/post tasks and explicit rubrics. Let prepared learners skip redundant teaching through independent evidence, and route a learner with a narrow algebra gap to a short repair before returning to calculus. Do not interpret slower performance on productive retrieval as failure, or fast assisted answers as learning. A pilot should compare alternatives and revise the app from evidence before claiming general learning gains.


## Implemented learning flow, 2026-09-26

- 85 formerly unguided topics now have two worked examples, nine practice questions in three difficulty levels, nine reserved check questions, and three writing parts each. The combined catalog has137 guide banks plus24 original packages (two overlaps), covering159 distinct topics.22 legacy-only packages have new worked scaffolds.
- Faded guidance presents a complete example, a missing-step task with a saved explanation, and a return to independent practice. Comparing a solution is assistance, not a grade.
- The written-step tool verifies exact univariate polynomial/rational equivalence and supported affine equations, keeping denominator exclusions. It explains the first issue and routes a suggested prerequisite into an in-place repair. An unsupported expression or proof is not numerically sampled and declared correct.
- Topic-wide recall imports actual dated, complete, unaided check sessions rather than sticky completion flags. Up to three fresh tasks appear in a warm-up; help and answer exposure are tracked separately from stars. The original generated 14-skill engine remains available for more variations.
- Four connected projects preserve models and decisions through 18 stages. One concrete cross-model dependency carries supply tank mass into rocket dry mass; other stages reuse saved controls and require a written connection. Model assumptions and the limits of real-world inference remain visible.
- Plain keyboard entry, optional MathML previews, symbol insertion, saved scratch work, native dialog focus, and reduced-motion styling support the flow. Automated and browser checks do not substitute for accessibility evaluation by learners using their own assistive technology.

The [local learner-pilot protocol](LEARNER_PILOT.md) specifies what would count as observed learning, independent transfer and delayed retention. The application is prepared for voluntary testing; no human efficacy results are invented from software QA.
