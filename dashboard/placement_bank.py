"""Original placement probes. Server-only keys; two distinct forms per skill.

Rungs are local to each area, not a universal ranking of mathematical subjects.
Choice rows put the key first here; the engine shuffles choices before delivery.
"""
AREAS = {
    'foundations': ('Number sense & arithmetic', [
        ('number-sense.counting', [('How many objects are in this group: ● ● ● ● ?', 4), ('What whole number comes immediately after 8?', 9)]),
        ('number-sense.addition-subtraction', [('Calculate 17 − 9.', 8), ('You have 6 counters and receive 7 more. How many now?', 13)]),
        ('number-sense.multiplication-division', [('Calculate 6 × 7.', 42), ('Share 32 objects equally among 4 people. How many each?', 8)]),
        ('arithmetic.fractions', [('Calculate 2/3 + 1/4.', 11/12), ('A ribbon is 3/4 m long. Cut off 1/6 m. How many metres remain?', 7/12)]),
        ('arithmetic.percentages', [('What is 15% of 80?', 12), ('A price of 60 is reduced by 20%. What is the new price?', 48)]),
        ('arithmetic.exponents', [('Calculate 2^3 × 2^4.', 128), ('Calculate 3^5 / 3^2.', 27)]),
    ]),
    'algebra': ('Algebra', [
        ('pre-algebra.variables', [('If x = 4, what is x + 3?', 7), ('If n = 6, what is 2n?', 12)]),
        ('pre-algebra.one-step-equations', [('Solve x + 7 = 12. Enter x.', 5), ('Solve 4x = 28. Enter x.', 7)]),
        ('pre-algebra.multi-step-equations', [('Solve 3(x − 2) = 15. Enter x.', 7), ('Solve 5x + 4 = 2x + 19. Enter x.', 5)]),
        ('algebra-1.quadratics', [('Solve x² − 5x + 6 = 0. Enter the smaller root.', 2), ('Solve x² − 7x + 12 = 0. Enter the larger root.', 4)]),
        ('algebra-2.rational-functions', [('For (x² − 9)/(x − 3), which statement is valid?', ['It equals x + 3 only when x ≠ 3', 'It equals x + 3 for every real x', 'It equals x − 3 only when x ≠ 3', 'It equals 1 only when x ≠ 3']), ('For (x² − 16)/(x − 4), which input must stay excluded after simplifying?', 4)]),
        ('algebra-2.logarithms', [('Solve log₂(x − 1) = 3. Enter x.', 9), ('Solve log₃(2x + 1) = 2. Enter x.', 4)]),
        ('algebra-2.complex-numbers', [('Using i² = −1, what is (2 + i)(2 − i)?', 5), ('Using i² = −1, what is (3 + 2i)(3 − 2i)?', 13)]),
    ]),
    'functions': ('Functions & precalculus', [
        ('pre-algebra.basic-functions', [('If f(x) = 2x + 1, find f(3).', 7), ('If g(t) = 4t − 3, find g(2).', 5)]),
        ('algebra-1.slope', [('Find the slope of the line through (1, 2) and (3, 8).', 3), ('A line rises 10 units when its input increases by 4. What is its slope?', 2.5)]),
        ('precalculus.composite-functions', [('If f(x) = x² and g(x) = x + 3, find f(g(2)).', 25), ('If f(x) = 2x − 1 and g(x) = x², find g(f(3)).', 25)]),
        ('precalculus.inverse-functions', [('For f(x) = 3x − 2, find f⁻¹(10).', 4), ('For g(x) = 5x + 1, find g⁻¹(16).', 3)]),
        ('precalculus.sequences-series', [('Find the infinite sum 3 + 3/2 + 3/4 + … .', 6), ('Find the infinite sum 4 + 1 + 1/4 + … .', 16/3)]),
        ('calculus-2.taylor-series', [('In the Maclaurin series of eˣ, what is the coefficient of x³?', 1/6), ('In the Maclaurin series of cos(x), what is the coefficient of x⁴?', 1/24)]),
    ]),
    'geometry': ('Geometry', [
        ('geometry.angles', [('Two angles form a straight line. One is 65°. How many degrees is the other?', 115), ('Two angles form a right angle. One is 28°. How many degrees is the other?', 62)]),
        ('geometry.area', [('A rectangle is 7 cm by 4 cm. Find its area in cm².', 28), ('A triangle has base 10 cm and perpendicular height 3 cm. Find its area in cm².', 15)]),
        ('geometry.triangles', [('A right triangle has legs 5 and 12. Find its hypotenuse.', 13), ('A right triangle has hypotenuse 10 and one leg 6. Find the other leg.', 8)]),
        ('geometry.similarity', [('Similar triangles have corresponding sides 3 and 9. The smaller has area 5. What is the larger area?', 45), ('A model is enlarged by a length scale factor of 2.5. By what factor does its area grow?', 6.25)]),
        ('geometry.proof-basics', [('Which guarantees congruent Euclidean triangles?', ['Two sides and their included angle agree (SAS)', 'All three angles agree (AAA)', 'Two angles agree', 'Their perimeters agree']), ('A triangle has two equal sides. Which conclusion must hold?', ['The angles opposite those sides are equal', 'Every angle is 60°', 'The triangle is right-angled', 'Its area equals its perimeter'])]),
    ]),
    'trigonometry': ('Trigonometry', [
        ('trigonometry.right-triangle-trig', [('In a right triangle, the side opposite θ is 3 and the hypotenuse is 5. Find sin(θ).', .6), ('In a right triangle, the side adjacent to acute θ is 12 and the hypotenuse is 13. Find cos(θ).', 12/13)]),
        ('trigonometry.radians', [('Convert 180° to radians. You may enter pi.', 3.141592653589793), ('Convert 60° to radians. Use pi for π.', 3.141592653589793/3)]),
        ('trigonometry.unit-circle', [('Find cos(π).', -1), ('Find sin(3π/2).', -1)]),
        ('trigonometry.identities', [('For cos(x) ≠ 0, simplify (1 − sin²(x))/cos(x).', ['cos(x)', 'sin(x)', 'tan(x)', '1']), ('For sin(x) ≠ 0, simplify (1 − cos²(x))/sin(x).', ['sin(x)', 'cos(x)', 'tan(x)', '1'])]),
        ('trigonometry.trig-equations', [('How many solutions does sin(x) = 1/2 have in 0 ≤ x < 2π?', 2), ('How many solutions does cos(2x) = 0 have in 0 ≤ x < 2π?', 4)]),
    ]),
    'calculus': ('Calculus & multivariable', [
        ('calculus-1.limits', [('Find lim as x → 2 of (x² − 4)/(x − 2).', 4), ('Find lim as h → 0 of ((3 + h)² − 9)/h.', 6)]),
        ('calculus-1.derivatives', [('If position s(t) = t³ metres, find instantaneous velocity at t = 2 seconds, in m/s.', 12), ('For f(x) = x² + 3x, find the slope of the tangent at x = 2.', 7)]),
        ('calculus-1.chain-rule', [('For f(x) = (3x + 1)⁴, find f′(0).', 12), ('For g(x) = (2x − 1)³, find g′(1).', 6)]),
        ('calculus-2.integrals', [('Evaluate the definite integral of 2x from x = 0 to x = 3.', 9), ('Evaluate the definite integral of 3x² from x = 0 to x = 2.', 8)]),
        ('multivariable.partial-derivatives', [('For f(x,y) = x²y + y³, find ∂f/∂x at (2,3).', 12), ('For f(x,y) = xy² + x³, find ∂f/∂y at (2,3).', 12)]),
        ('differential-equations.odes', [('Solve y′ = 2y with y(0) = 3. Which is y(t)?', ['3e^(2t)', '2e^(3t)', '3 + 2t', '3e^t']), ('Solve y′ = −y with y(0) = 4. Which is y(t)?', ['4e^(−t)', '4e^t', '4 − t', 'e^(−4t)'])]),
        ('multivariable.multiple-integrals', [('Integrate x + y over the rectangle 0 ≤ x ≤ 1, 0 ≤ y ≤ 2.', 3), ('Integrate xy over the rectangle 0 ≤ x ≤ 2, 0 ≤ y ≤ 3.', 9)]),
    ]),
    'statistics': ('Probability & statistics', [
        ('statistics-basics.center', [('Find the mean of 2, 4, and 9.', 5), ('Find the median of 1, 3, 8, 10, and 13.', 8)]),
        ('statistics-basics.basic-probability', [('A fair six-sided die is rolled once. Find P(result greater than 4).', 1/3), ('A bag has 3 red and 5 blue balls. One is drawn uniformly at random. Find P(red).', 3/8)]),
        ('probability.conditional-probability', [('A bag has 3 red and 2 blue balls. Draw two without replacement. Find P(both red).', .3), ('A fair coin is tossed twice. Given at least one head, find P(two heads).', 1/3)]),
        ('probability.expectation', [('X equals 0 with probability 3/4 and 8 with probability 1/4. Find E[X].', 2), ('X equals −2 or 6, each with probability 1/2. Find E[X].', 2)]),
        ('statistics.confidence-intervals', [('Which describes a frequentist 95% confidence procedure?', ['Across repeated samples, about 95% of its intervals cover the fixed parameter', '95% of individual data points are in every interval', 'The observed fixed interval contains 95% of possible parameter values', 'The parameter changes in 95% of samples']), ('A large-sample mean interval has half-width 1.96σ/√n. Keeping σ fixed, multiplying n by 4 changes the half-width by what factor?', .5)]),
        ('probability.bayes-theorem', [('A condition occurs in 1% of people. A test is positive for 90% with it and 10% without it. Find P(condition | positive).', 1/12), ('P(A)=1/4, P(B|A)=4/5, and P(B|not A)=1/5. Find P(A|B).', 4/7)]),
    ]),
    'linear': ('Vectors & linear algebra', [
        ('linear-algebra.vectors', [('For u = (2,3) and v = (4,1), find the first coordinate of u + v.', 6), ('For v = (3,−2), find the second coordinate of 2v.', -4)]),
        ('linear-algebra.matrices', [('A = [[1,2],[0,3]]. Find the first coordinate of A(2,1).', 4), ('A = [[2,0],[1,4]]. Find the second coordinate of A(3,2).', 11)]),
        ('linear-algebra.linear-systems', [('Solve x + y = 5 and x − y = 1. Enter x.', 3), ('Solve 2x + y = 7 and x − y = 2. Enter y.', 1)]),
        ('linear-algebra.eigenvalues', [('A = [[2,0],[0,5]]. For v = (0,1), find λ such that Av = λv.', 5), ('A = [[3,1],[0,2]]. For v = (1,0), find λ such that Av = λv.', 3)]),
        ('linear-algebra.vector-spaces', [('A linear map from R⁵ to R³ has rank 3. Find its nullity.', 2), ('Which subset is a vector subspace of R²?', ['{(x,y): x + y = 0}', '{(x,y): x + y = 1}', '{(x,y): x > 0}', '{(x,y): x² + y² = 1}'])]),
    ]),
    'proof': ('Discrete math & advanced reasoning', [
        ('discrete-math.sets', [('How many elements are in {1,2,3} ∩ {2,3,4}?', 2), ('How many subsets does a set of 3 elements have?', 8)]),
        ('discrete-math.logic', [('Which is the negation of “Every student passed”?', ['At least one student did not pass', 'No student passed', 'Every student failed twice', 'At least one student passed']), ('Which is logically equivalent to “If P, then Q”?', ['If not Q, then not P', 'If Q, then P', 'If not P, then not Q', 'P and Q'])]),
        ('discrete-math.combinatorics', [('How many unordered pairs can be selected from 6 distinct people?', 15), ('How many ways can 3 distinct books be ordered on a shelf?', 6)]),
        ('proof-foundations.proof-strategies', [('An induction proof establishes P(1). What induction step is sufficient to prove P(n) for every integer n ≥ 1?', ['For arbitrary k ≥ 1, assume P(k) and prove P(k+1)', 'Check P(2), P(3), and P(4)', 'Assume P(n) for every n', 'Prove P(k+1) implies P(k) only']), ('To disprove “Every prime number is odd,” which suffices?', ['2 is prime and even', '3 and 5 are odd', 'Most primes are odd', '4 is even and composite'])]),
        ('real-analysis.sequences-limits', [('Every bounded monotone sequence of real numbers…', ['Converges to a real limit', 'Is eventually constant', 'Has limit zero', 'Is periodic']), ('What must accompany boundedness to ensure convergence of a real sequence?', ['Monotonicity is a sufficient additional condition', 'Having infinitely many terms is sufficient', 'Being nonzero is sufficient', 'Alternating signs is sufficient'])]),
        ('abstract-algebra.groups', [('In a finite group of order 12, which CANNOT be the order of an element?', ['5', '2', '3', '4']), ('In the additive group of integers modulo 8, what is the order of the element 2?', 4)]),
        ('real-analysis.function-sequences', [('Continuous functions fₙ converge uniformly to f on [0,1]. Which must hold?', ['f is continuous', 'f is differentiable', 'f is constant', 'All fₙ equal f']), ('The functions fₙ(x) = xⁿ on [0,1] converge pointwise. Is convergence uniform?', ['No, because the pointwise limit is discontinuous', 'Yes, because each function is continuous', 'Yes, because values stay between 0 and 1', 'No, because the sequence has no pointwise limit'])]),
    ]),
}


def build_bank():
    bank = {}
    for area, (_, rungs) in AREAS.items():
        for level, (topic, forms) in enumerate(rungs):
            for form, (prompt, key) in enumerate(forms):
                qid = f'P1-{area}-{level}-{form}'
                choice = isinstance(key, list)
                bank[qid] = dict(id=qid, area=area, rung=level, topic_id=topic,
                                 prompt=prompt, kind='choice' if choice else 'number',
                                 answer=key[0] if choice else key, tolerance=1e-6,
                                 **({'options':key[:]} if choice else {}))
    return bank


BANK = build_bank()
