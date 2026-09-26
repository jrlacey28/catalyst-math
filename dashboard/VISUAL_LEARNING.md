# See the idea, test the number, follow a purpose

## Topic illustrations

Course, lesson, mission, project and playground cards use original inline SVG illustrations from `card-art.js`. All 159 canonical topics and 29 courses have explicit mappings. Mission previews combine the application world with the topic's mathematical motif. These are orientation diagrams, not previews of private assessment answers. They contain no external images, downloads or tracking.

## What would your answer do?

Applications show one step at a time: make a prediction, explore, then explain. Most missions offer an optional **Extra calculation in this model** after those steps; it is not a substitute for the lesson's specific question. The parametric lesson instead has its own three-part coordinate activity, with no unrelated launch-speed problem. Enter a number or a bounded expression, run it, and compare its consequence with the model. Inputs remain editable, and changing model controls invalidates feedback from the old situation.

- **Orbit scaling:** a radius multiplier changes the physical period by its power 3/2. A dashed marker uses the learner's period prediction; a green marker uses the circular-orbit law. The radius is measured from the center, not the surface. Temporary positional agreement is not proof of equal periods.
- **Orbit speed:** the entered tangential speed drives the existing two-body trajectory. A circular reference ring makes a surface intersection, elliptical path or escape visible.
- **Water supplies:** the learner's whole-tank count becomes litres of capacity on the same scale as the crew's requirement.
- **Rocket burn:** the proposed duration becomes propellant consumed at the chosen mass flow. A plan exceeding the available fuel cannot be carried out.
- **Sound:** the calculated period drives a comparison sine wave. The full model separately includes the harmonic.
- **Game transformations:** a predicted horizontal coordinate becomes a point beside the scaled, rotated and translated unit vector. The vertical coordinate is provided, not assessed.
- **Solar power:** the proposed energy budget becomes a rectangle with that area over the same twelve-hour daylight interval. Equal daily energy does not guarantee enough battery power at night.
- **Networks:** additive edge delays determine the fastest route and arrival time. A time line compares the learner's arrival estimate with the route total.

The models are intentionally limited and explain their assumptions. A calculation experiment checks one measurable part of a mission; it does not certify an advanced theorem, a flight plan or an engineering design. Controls, answers, and the displayed time save separately for each learner and lesson. Experiment feedback does not award check passes or mastery.

## Problem diagrams and feedback

Before submission, `answer_visuals.py` produces a descriptor using only the public prompt, options and givens. It does not read a hidden answer to choose diagram positions, bounds, labels or units. After submission, it can show the learner's response alongside the released result.

Recognized families use fraction diagrams, equation balances, function/tangent plots, triangles, angles, coordinates, vectors, probabilities, signed flows and integral areas. A mathematical model is only used when its independent calculation agrees with the already-released result. Other numeric questions use a labeled answer comparison; choice and proof questions use a comparison of claims. A number line or choice comparison is not described as a simulation or proof checker.

## Math for physics, engineering, architecture and finance

The field directory starts five additional paths containing eighteen stages:

- **Physics:** distance, velocity, kinetic energy and accumulation for a moving cart.
- **Mechanical engineering:** gear ratio, torque, power balance and stored spring work.
- **Electrical engineering:** current, resistor power and capacitor charging.
- **Architecture & civil engineering:** beam volume, balanced support reactions and bending sensitivity.
- **Finance:** compound growth, rate, year-end contributions and purchasing power in an illustrative savings model.

Each stage has one active scalar control and one result, with a diagram and optional formulas, assumptions, primary sources and lesson links. These are simplified educational models. They do not replace a full subject curriculum or certify real designs or financial outcomes. Source references and SI/display-unit definitions live in `purpose-paths.json`; pure calculations live in `purpose-math.js`. Bounds, stage and notes save per learner in `learning_support.purpose_paths` without awarding mastery.

## A first parametric activity

The oval-track activity uses x = a cos(2πt/8), y = b sin(2πt/8). The clock completes a lap in eight seconds. Learners move time, change the half-axis lengths, then predict x at half a lap. A submitted prediction is drawn separately from the model position. A later disclosure distinguishes this chosen clock from gravitational orbital timing. See [OpenStax, Parametric Equations](https://openstax.org/books/calculus-volume-2/pages/7-1-parametric-equations) for the coordinate construction.

## Math behind AI

Open **Apply the math → AI & machine learning**. The seven-stage rover project connects:

1. Fractions, signed numbers, ratios and coordinates → normalized features.
2. Algebra, vectors and dot products → a weighted prediction.
3. Squaring and means → prediction error and mean squared loss.
4. Derivatives, the chain rule and gradients → an actual parameter update.
5. Exponentials, logarithms and probability → a sigmoid classifier and cross-entropy loss.
6. Matrices and composed functions → a two-neuron hidden layer with backpropagation.
7. Dot products, exponentials and weighted averages → a small attention calculation.

Each stage shows a live diagram, one main control, and a next action. Worked examples, a practice question, notes and prerequisite lessons open on request. The foundation map also identifies broader AI subjects beyond this project. Exploration order is open; the learner can revisit arithmetic before continuing a more advanced stage.

The dataset contains eight invented labeled patches with supplied brightness and texture measurements. It is not an image recognition system trained on photographs, a benchmark, a language model or a substitute for an AI/ML course. Loss histories are training histories, not held-out evaluation. The small model runs entirely in the browser without downloading model weights or enabling the optional AI coach.

Parameters, probes, training histories, choices and reflections save in the learner's `learning_support.ai_path` record. Training and visiting stages do not earn topic stars. Opening the mathematical help marks related work as assisted and pauses affected pending independent checks. New independent evidence requires fresh checks.

Sources for the model formulas are linked in the path's **Model assumptions, scope and primary sources** disclosure and stored in `ai-learning-path.json`.
