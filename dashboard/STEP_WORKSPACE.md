# Written step support

The step workspace is supported practice. It does not write assessment results or award mastery. It checks actual entered lines, stops at the first invalid or unsupported transition, and keeps the original domain visible through cancellation. A confirmed rewrite is not certification of an explanation or of the answer to an unseen problem.

## Integration

Load `step-workspace.css` and `math-input.css` once. Import:

```js
import {mountStepWorkspace} from './step-workspace.js';
import {enhanceMathInput,enhanceMathInputs} from './math-input.js';

const dispose = mountStepWorkspace(host, {
  esc,
  topicId,
  initialDraft,
  getContext: () => ({topicId,profileId,independentCheck:false}),
  onDraft: draft => saveForMountedLearner(topicId,profileId,draft),
  onSupport: event => markSupportForMountedLearner(event),
  onRepair: ({prerequisiteId,topicId,work,review}) => openRepair(...),
  onSendToCoach: ({topicId,work,review,brief}) => openCoach(...)
});
```

The disposer is synchronous. It removes listeners/UI and flushes any pending save through the captured callback. Bind callbacks to the mounted learner and topic. Dispose/remount on route or profile change. Never mount the workspace on an independent check; the optional `getContext` additionally blocks use if its topic/profile identity changes or `independentCheck` becomes true. Dispatch `step-workspace-context` on the host to apply an in-place context change immediately.

`onDraft` receives only:

```json
{"version":1,"lines":["(x^2-1)/(x-1)","x+1"],"assumptions":"","reflection":"Why can x-1 cancel?"}
```

There are at most 12 lines, each at most 500 characters; assumptions are at most 500, reflection at most 2000. Edits debounce for 350 ms and save serially, retaining the newest draft if another edit arrives during a save. Failed saves preserve all fields, display a retry control, and leave a copyable brief available. Repair/coach navigation waits for the current save. No computed correctness or mastery is persisted by this module.

`onSupport` can return a promise; a failed support call prevents the requested check or help from opening. Event kinds are `step_help`, `step_check`, `notation_help`, and `notation_insert`. Events include `topicId` and optional `profileId`. Opening supported explanations and applying checks can pause corresponding independent work through the host. Typed edits, focus, and draft saves do not call it. Checks whose input changes while support is pending are discarded.

`onRepair` gets the related prerequisite ID, original work snapshot, and public review. Its wording is a possible refresher for this pattern, not an ability diagnosis. `onSendToCoach` gets only these entered lines, supplied assumptions/reflection, and the bounded review brief. It contains no hidden keys, model solution, or other learner record.

## Input helpers

```js
const disposeInput = enhanceMathInput(input, {
  esc, getContext: () => ({topicId,profileId,independentCheck}), onSupport,
  preview: true
});
const disposeGroup = enhanceMathInputs(container, {
  selector:'input.answer-input, textarea.homework-answer',
  filter: input => !input.closest('.calculator,.coach'),
  esc, getContext, onSupport
});
```

Enhancement is idempotent and leaves the original input in place. The root can enhance newly rendered fields or use a filtered MutationObserver. It supports text/search/tel/url inputs and textareas, not numeric inputs. Dispose helpers when their fields are removed. Reopening a helper in the same context reuses its recorded support; each new context requires support again. Dispatch `math-input-context` on a field after an in-place context change; focus/input also refresh the guard.

The collapsed helper offers explicit fraction, square-root, square/power, parentheses, pi, multiplication and x insertions. Insertions replace the selected range and emit a normal bubbling input event; asynchronous support or a changed selection cannot silently replace newer text. Merely focusing, typing or previewing never normalizes or changes the answer value. Independent checks hide these controls and previews. Previews are safe MathML, with a plain-text fallback for unsupported notation/prose. Previewing `sqrt(x^2)` does not claim that it equals x.

## Exact scope and limitations

- Exact rational numbers, finite decimal/scientific literals, one variable x, polynomial/rational arithmetic and integer powers from -12 through 12. Unary minus and exponent precedence use the existing bounded calculator parser.
- Linear equations are checked by exact solution sets after each side simplifies to affine form. Nonlinear/general rational equations, transcendental functions, roots, absolute values, other variables, and arbitrary proofs return `needs_review`.
- Rational coefficients use bounded BigInt arithmetic. Cross-products establish polynomial identities; exact gcd and Sturm sequences establish carried real-domain exclusions. No numerical sampling certifies equivalence. An exact integer counterexample may illustrate a difference already established algebraically.
- Original denominator/nonpositive-power exclusions persist through all later lines. Under this convention 0^0 is undefined. `x/x → 1` is conditional on x≠0 and is explicitly not the same unrestricted function. A new real hole in an expression is invalid unless excluded by a supplied, justified assumption. Constants with only complex zeros add no real exclusion.
- Equation candidates excluded by the original domain are explicitly rejected as final solutions. For example `(x^2-1)/(x-1)=2 → x=1` preserves an empty solution set on x≠1; the interface explains that x=1 cannot be the final answer.
- The domain field supports `x != 1`, `x ≠ -2`, or polynomial exclusions such as `x^2-2 != 0`, separated by commas, semicolons, line breaks or `and`. Other assumptions need review. An explicit “all real x” claim conflicting with an original hole is not accepted.
- Resource limits: 500 characters/line, parser token/node/depth bounds, polynomial degree 12 (intermediate degree 24), 512-bit exact coefficients and 60,000 counted algebra operations. Limit hits request review, never guess correctness.

Public `checkSteps` results contain status, ordered items, firstIssue/firstInvalidIndex, restrictions and scope; they contain no BigInt values. Status is `valid`, `conditional`, `invalid`, `needs_review`, `input_error` or `incomplete`. Public pure helpers `mathPreview`, `mathInsertion`, `normalizeStepDraft`, and `buildStepBrief` support tests or other bounded integrations.

## Validation

Run `node math-tutor/dashboard/qa/test_step_checker.mjs`. It covers exact decimals, fractions, distribution, powers/precedence, false polynomial identities, cancellation and irrational/complex-domain distinctions, affine solution sets, rejected candidates, adversarial parsing, resource limits, safe previews, selection insertions and draft normalization. Browser QA should additionally check keyboard-only disclosure/insertion, mobile wrapping, save failure/retry, pending save plus edit, profile switch and independent-check guards using isolated QA learner state.
