# Interactive math direction

Reviewed 2026-09-20, using primary sources.

## Learning pattern

[Brilliant](https://brilliant.org/) describes a shared interactive canvas, guiding questions, hints, feedback, and adaptation around gaps. [Its algebra-course discussion](https://blog.brilliant.org/solving-equations/) describes making learners reason actively through problems. The implementation here uses original materials and adopts a practical cycle: predict, manipulate a mathematical object, explain the change, practice, then check independently. No claim is made that this prototype reproduces Brilliant's curriculum research, expert review, adaptive tutor, or measured learning outcomes.

## Options examined

| Option | What it supports | Decision here |
| --- | --- | --- |
| [JSXGraph](https://github.com/jsxgraph/jsxgraph) | Interactive geometry and function plotting; MIT/LGPL dual licensing. Its [point](https://jsxgraph.org/docs/symbols/Point.html) and [function graph](https://jsxgraph.org/docs/symbols/Functiongraph.html) APIs support dependent, draggable constructions. | A good candidate as the number of geometric constructions grows. |
| [Desmos API](https://www.desmos.com/api/v1.11/docs/index.html) | A full embeddable graphing calculator; production integration calls for an appropriate API key arrangement. | More calculator capability than these bounded local explorations need. |
| Native SVG with pointer events | Custom points, curves, hit targets, labels, and parameter controls, implemented directly in the browser. | Used now: no runtime download, API key, or external dependency; mathematics and interaction are small enough to audit directly. |

## What changes in real time

In a quadratic, the vertex handle determines h and k, and a second handle determines a. The displayed equation y=a(x−h)²+k, sampled curve, and probe f(x) all use that same state. Editing the numbers updates the same state in the opposite direction. Other families use appropriate handles: a line's intercept and slope, an exponential's initial value and factor, or a logarithm's base. This is direct manipulation of a chosen function family, not inference of an arbitrary symbolic function from a freehand sketch.

The additional labs compute their actual mathematical relationships: supplementary straight angles; area under a horizontal shear; radius and sector scaling; population mean/median/standard deviation under moved observations; conditional counts without replacement; and multiplication by i on equal-scale axes.

## Next improvements should follow learner evidence

Add a bespoke construction when the learner needs it: congruence transformations, a surface-area net, a correlation scatterplot, or a geometric-series rearrangement. Add new assessment variants and explanatory steps when the existing attempts show a gap. Improve the learning sequence through observed responses rather than equating visual polish with teaching effectiveness.
