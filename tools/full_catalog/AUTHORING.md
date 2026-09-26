# Complete video catalog — authoring contract

User request 2026-09-20: render a narrated Manim video for every topic on the 159-topic roadmap, retaining 24 existing videos. This explicit full-catalog request supersedes earlier just-in-time production limits. Preserve learner evidence. Use local Kokoro af_heart and original mathematical animation, black video canvas, minimal text, small real course/lesson count in corners. Dashboard stays colorful.

Each author owns a separate JSON list: basics.json, middle.json, advanced.json. Do not edit the existing curriculum catalog. Cover exactly your assigned courses' topics without existing_lesson_id. Each entry:

```
{"id":"course.topic", "beats":[
 {"formula":"x^2 - 4 = (x-2)(x+2)", "text":"Speak a clear 25–45 word explanation. Explain why, not merely what. Use plain spoken numbers and symbol names, with no LaTeX in speech.", "visual":{"kind":"graph", ...}}
], "practice":[{"prompt":"A fresh small problem with working requested.","answer":"Checked tutor solution."}, ...], "takeaway":"One concise idea with assumptions.", "scope":"Focused first lesson, not exhaustive treatment of the field."}
```

Use FOUR beats: intuition/meaning; simple worked example; connected/stronger example; limitation or transfer. Aim 120–170 words spoken total, never fewer than 100. Narration must actually teach this topic; do not simply advertise it. Each topic gets three fresh written prompts: simple, connected, explain/transfer. These are saved written work for human review, not an auto-graded readiness claim. Do not reuse the existing independent_check prompts or their exact examples.

Formula strings are **Typst math**, not LaTeX. Use `frac(a,b)`, `sqrt(x)`, `sum_(k=1)^n`, `integral_0^1`, `arrow.r`, `infinity`, `pi`, `theta`, `lambda`, `in`, `RR`, `CC`, `NN`, `abs(x)`, `norm(v)`, `"short words"`. Avoid complicated formatting/macros. Equations will be preflighted; keep each <80 characters when possible. Do not use full paragraphs as formulas.

Every beat needs a meaningful mathematical visual, not an unrelated graph. Specify ONE supported kind with the following exact schema. Numbers are raw JSON numbers. Colors use `blue`, `gold`, `pink`, `green`.

- `dots`: `groups:[3,2]`, `labels:["3","2"]`; up to 36 dots total. Counts grow/rearrange across beats to teach quantity.
- `numberline`: `range:[-5,5]`, `points:[-3,2]`, optional `labels:["-3","2"]`, optional `arrows:[[0,2],[2,-3]]`, optional `interval:[-3,2]`, optional `open:[-3]`.
- `bars`: `values:[2,4,6]`, optional `labels:["A","B","C"]`, optional `mean:4`; nonnegative values.
- `grid`: `rows:3`, `cols:4`, `filled:5`; equal area cells. Optional `secondary:3` for a second color group. Optional `fill_rows:2,fill_cols:3` selects a rectangular overlap instead of row-major filling.
- `graph`: `x:[-3,3]`, `y:[-2,8]`, `curves:[{"f":"x*x","color":"blue","domain":[-2.5,2.5]},...]`; optionally `points:[[1,1],[2,4]]`, `labels:["A","B"]`, `segments:[[[1,1],[2,4]]]`, `holes:[[1,1]]`, `shade:[0,2]` (area from first curve to x-axis), `sweep:true`, `equal:true` (equal physical x/y units, essential for circles or Euclidean shapes). Python expression variables x and allowed math names sin,cos,tan,exp,log,sqrt,abs,pi; use ** for powers. Singular curves must be split into safe domains. Point/segment coordinates must match the plotted mathematics. No numerical differentiation in expressions.
- `plane`: `vectors:[[2,1],[-1,2]]`, optional `matrix:[[a,b],[c,d]]`, optional `points:[[x,y]]`. Axes -4..4; arrows begin at origin, matrix animates source vectors and grid. Vector coordinates must fit -4..4 including transformed ends.
- `circle`: `angle:1.0471975512` radians, optional `radius:2`, optional `triangle:true`, optional `arc:true`. Unit-circle labels present as cos and sin only when triangle is true. Radius scales drawn object but not trig relation.
- `network`: `nodes:["A","B","C"]`, `edges:[[0,1],[1,2]]`, optional `weights:["0.5","0.7"]`, optional `directed:true`, optional `active:[0,1]`. Up to 8 nodes arranged around a circle; edge weights displayed. Use for graphs, state transitions, mappings, implications with explicitly meaningful node names.
- `sets`: `left:["1","2"]`, `right:["4","5"]`, `both:["3"]`, optional `highlight:"intersection"|"union"|"left"`; these lists are disjoint regions, not complete sets.
- `sequence`: `values:[0.5,0.75,0.875,...]`, optional `limit:1`, optional `bars:true`, optional `connect:true` for a connected sampled path. Sequence values at integer n starting at 1; axes fit values, limit highlighted.
- `field`: `mode:"radial"|"rotation"|"constant"`, optional `path:"circle"|"line"`. Radial F=(x,y), rotation F=(-y,x), constant F=(1,0). Circle radius 2 counterclockwise, line from (-2,0) to (2,0).
- `surface`: `mode:"paraboloid"|"plane"|"saddle"`, optional `slice:"x"|"y"`. Draw projected mesh for z=x²+y², z=x+y, or z=x²-y² on [-2,2]², with an indicated fixed-coordinate slice.
- `tiles`: `a:3`, `b:1`; geometric (a+b)² area partition with a², ab, ab, b² labels. Positive a,b. Optional `labels:["x^2","x","x","1"]` replaces the four face labels to match the spoken variables.

Use visual variety that fits each topic. Adjacent beats should transform the SAME mathematical objects where possible. Avoid claims that a tiny example proves a universal statement; give essential theorem assumptions and distinguish illustration from proof. Advanced lessons should explain one concrete entry point carefully. Supply rigorous domain/independence/invertibility assumptions when relevant. Research uncertain advanced facts from primary sources.

Do not render or change shared renderer; parent handles all rendering, validation, catalog integration and home page. Return content files, any review notes, and precise coverage count.
