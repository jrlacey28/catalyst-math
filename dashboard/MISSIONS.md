# Real-world lesson missions

The mission layer pairs each canonical roadmap topic with an authored application brief. Seven shared interactive models support these briefs. The prediction, investigation, decision and clue are specific to the lesson; a brief does not mean a full simulator or a complete advanced course has been built for that topic.

Missions are **supported exploration**, never automatic mastery evidence. The lesson host controls when to offer the activity after practice. Opening a model, moving a slider, hearing a preview or writing a response does not grant a pass. Topics whose full calculation or proof lies outside the displayed model carry a visible **Conceptual extension** label.

## Integration

Load lesson-missions.css and import from lesson-missions.js:

    const content = await loadMissionContent(api); // api('missions'), read-only
    const summary = relatedMission(topicId, content);
    const dispose = mountMission(container, {
      topicId, content, api, esc,
      onSupport: ({topicId, modelId, kind}) => recordSupportedUse(topicId, kind),
      initialDraft: {prediction: '', explanation: ''},
      onDraft: ({topicId, prediction, explanation}) => saveDraft(/* host-owned */),
    });

**mountMission** returns its disposer synchronously. Content loading is asynchronous when no content argument is supplied, and late responses cannot render after disposal. Call the disposer when changing routes or learners. It aborts DOM listeners, stops animation/audio, and releases the model.

**onSupport** receives model-open, model, or clue. Each kind is reported once per mount, unless saving rejects and a later interaction retries it. The host owns assessment eligibility and persistence. The module never calls profile, assessment, grade or learner-state endpoints.

The integrated Catalyst lesson and standalone mission pages provide **initialDraft/onDraft** through the host's **/api/topic/mission** persistence route. Predictions and explanations autosave for the selected learner and appear in **My homework**. The host debounces saves and guards learner identity. Rejected saves show a copy-before-leaving message.

For a separate embedding, **onDraft** remains optional. If omitted, the module explicitly calls the text fields scratch notes and asks the learner to copy them to homework before leaving. It never silently promises persistence without a save callback.

**mountMissionDirectory(container, {content, api, esc, defaultModel: 'orbit', onSelect})** also returns a synchronous disposer. Without onSelect, links navigate to #mission/topic-id. Filtering uses the model, course and search phrase, with twelve cards per page. All prerequisites navigate to actual #topic/topic-id routes.

The public **/api/missions** response is the complete mission-content.json document. It contains supported prompts and clues, no private answers or learner evidence. The models, courses, sources and missions arrays use stable string IDs. Every mission has:

topic_id, course_id, title, brief, model_id, extension, connection, prediction, manipulate, decision, clue, prerequisite_ids.

## Numerical models

| Model | What is actually calculated | Important boundary |
| --- | --- | --- |
| Orbit | Conic type, energy, angular momentum, periapsis/apoapsis, closed-orbit period, and position/velocity at elapsed time | Planar spherical two-body dynamics; no thrust after the initial tangential state |
| Rocket | Remaining mass, ideal velocity gain, acceleration and integrated distance during a constant-flow burn | Straight deep-space idealization with positive dry mass; no gravity, drag or staging |
| Supplies | Crew-day water requirement, whole 5 L tank count, unused capacity | Invented water allowance; no reserve or recycling |
| Signal | Sum of two sine components, full-period RMS and waveform samples | Integer harmonics, linear addition, relative amplitude rather than perceived loudness |
| Camera | Affine 2D point transformation, matrix, determinant and transformed polygon | Scale, rotate, then translate; no 3D perspective |
| Energy | Exact solar energy per dispatch interval, battery storage, spill and unmet demand | Synthetic 12-hour daylight curve; half-minute battery dispatch and ideal efficiency |
| Network | All simple routes, total latency, minimum-delay ties, independent-edge delivery probability and expected deliveries | Synthetic undirected network; no retries, routing dynamics or measured packet data |

### Orbit method and units

Distances use kilometers and times seconds internally. Moon mode uses a negligible spacecraft mass, lunar GM = 4902.800118 km³/s², and a mean radius of 1737.4 km. Earth–Moon mode uses the **sum** of the Earth and lunar gravitational parameters and displays the relative separation vector. Earth is the coordinate origin in that view, not a claim that Earth is stationary in an inertial frame.

Specific energy is ε = v²/2 − μ/r, angular momentum magnitude is h = rv, and eccentricity for the tangential start is e = abs(rv²/μ − 1). Closed motion has a = −μ/(2ε) and T = 2π√(a³/μ). Elliptic and hyperbolic Kepler equations are solved by monotone bisection; the parabolic case uses Barker's equation. Half-angle coordinate formulas avoid large near-equal subtraction close to escape.

Collision classification comes from periapsis intersecting the mean spherical surface. The time path stops at the first contact. Earth–Moon contact uses the sum of the mean radii. A surface-intersecting mathematical ellipse is never labeled a completed orbit.

Equal-time dots are generated from the same elapsed-time equations as the marker. Horizontal and vertical geometric scales are equal. Arrow directions are physical, but arrow lengths and the moving marker are enlarged for readability. Open paths show a finite window; exceptionally long bound ellipses are visibly labeled as partial paths. Preset circular and escape speeds use unrounded internal values.

The Earth–Moon preset uses a chosen semimajor axis of 384400 km and eccentricity 0.0549 to illustrate a lunar-like relative ellipse. Its roughly monthly period is an idealized two-body result, not a fitted ephemeris. Solar perturbations, terrain, oblateness, tides, maneuvers and other mission constraints are excluded. This is not an Earth-to-Moon flight planner.

### Rocket method and units

For positive dry mass and constant expelled mass rate q,

- m(t) = m0 − qt
- v(t) = ve ln(m0/m(t))
- a(t) = ve q/m(t)
- s(t) = ve/q · [m0 − m(t) − m(t) ln(m0/m(t))]

Velocity starts at zero in the chosen frame. Time stops at propellant exhaustion. At 100% progress, the reported acceleration is the limit immediately **before** cutoff; afterward an ideal unforced spacecraft would coast. A zero-propellant design has no powered acceleration. Rocket distances/speeds use meters and meters per second, unlike the orbital model's kilometers.

### Sources

Physical constants and context were checked against primary NASA references. The authored tasks and implementations are original.

- [NASA JPL: Astrodynamic parameters](https://ssd.jpl.nasa.gov/astro_par.html) supplies the gravitational parameters.
- [NASA: Moon fact sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html) supplies mean radii and lunar comparison values.
- [NASA: Gravity and mechanics](https://science.nasa.gov/learn/basics-of-space-flight/chapter3-1/) explains ellipse geometry and orbital mechanics.
- [NASA Glenn: Ideal rocket equation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/ideal-rocket-equation/) supports the ideal mass-ratio model and its exclusions.
- [OpenStax: Interference of waves](https://openstax.org/books/university-physics-volume-1/pages/16-5-interference-of-waves) supports linear superposition and phase cancellation.

Energy, supply, game and relay scenarios use explicitly invented quantities. Their outputs are teaching models, not operational recommendations.

## Verification

Run **node --test qa/test_missions.mjs** from the dashboard directory. The suite checks canonical coverage and references, plus independent numerical invariants:

- Circular solutions and closed periods; 288 orbital states spanning surface contact, ellipses, near-escape limits, parabolas and hyperbolas.
- Analytic orbital states against a separate fourth-order Runge–Kutta integration of Newton's equation.
- Rocket mass conservation and 324 parameter cases whose distance is independently checked by Simpson integration of velocity.
- Minimal whole-tank packing, harmonic RMS against numerical integration, affine determinants against polygon area.
- Energy conservation with finite storage and a daily-surplus counterexample; route minima against Floyd–Warshall.

These checks establish model consistency, not learner understanding. Browser rendering, keyboard behavior, audio permission and route cleanup are separate integration checks. No tests need original learner records.
