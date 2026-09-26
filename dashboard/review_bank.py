"""Reviewed, deterministic algebra-to-calculus problem families.

This is a bounded authored generator, not symbolic AI. A fingerprint identifies
the family version and all mathematical parameters; the random seed is not part
of that identity. Public payloads must use public_question(), not this module's
private generated dictionaries.
"""
from fractions import Fraction
import hashlib
import json
import random
import re
import unicodedata


VERSION = 1
_ROWS = [
    ('fractions', 'Fractions and common units', ['arithmetic.fractions'], ['calculation', 'quantity-model', 'error-diagnosis']),
    ('distribution', 'Distribute to every term', ['pre-algebra.expressions', 'algebra-1.polynomials'], ['coefficient', 'equation', 'error-diagnosis']),
    ('binomial', 'Expand a binomial square', ['algebra-1.polynomials'], ['coefficient', 'value', 'error-diagnosis']),
    ('factoring', 'Factoring and zero products', ['algebra-1.factoring', 'algebra-2.advanced-quadratics'], ['factor-form', 'roots', 'error-diagnosis']),
    ('cancellation', 'Cancel factors with domain restrictions', ['algebra-2.rational-functions'], ['calculation', 'domain', 'error-diagnosis']),
    ('functions', 'Function inputs and outputs', ['pre-algebra.basic-functions', 'algebra-1.functions'], ['evaluation', 'input', 'change-in-output']),
    ('composition', 'Compose functions in order', ['precalculus.composite-functions'], ['evaluation', 'expression', 'error-diagnosis']),
    ('linear-equations', 'Keep an equation balanced', ['pre-algebra.multi-step-equations', 'algebra-1.linear-equations'], ['solve', 'equivalent-step', 'error-diagnosis']),
    ('exponents', 'Exponent laws and restrictions', ['arithmetic.exponents', 'algebra-2.polynomial-functions'], ['calculation', 'symbolic-product', 'domain']),
    ('limits', 'Limits, values, and removable holes', ['precalculus.introduction-to-limits', 'calculus-1.limits'], ['removable-hole', 'value-versus-limit', 'method-choice']),
    ('derivatives', 'Derivatives and local change', ['calculus-1.derivatives'], ['power-rule', 'tangent-estimate', 'error-diagnosis']),
    ('product-rule', 'Differentiate a product', ['calculus-1.product-quotient-rule'], ['calculation', 'method-choice', 'error-diagnosis']),
    ('chain-rule', 'Differentiate nested functions', ['calculus-1.chain-rule'], ['calculation', 'method-choice', 'missing-factor']),
    ('integrals', 'Antiderivatives and signed accumulation', ['calculus-2.integrals', 'calculus-2.fundamental-theorem'], ['power-integral', 'signed-accumulation', 'antiderivative']),
]
SKILLS = {sid: {'id': sid, 'title': title, 'topic_ids': topics, 'representations': reps} for sid, title, topics, reps in _ROWS}
SKILLS['factoring']['evidence_topic_ids'] = ['algebra-1.factoring']
SKILLS['exponents']['evidence_topic_ids'] = ['arithmetic.exponents']
SKILLS['distribution']['evidence_topic_ids'] = ['pre-algebra.expressions']


def normalize_text(value):
    superscripts = str.maketrans('⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺', '0123456789-+')
    value = re.sub(r'[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+', lambda m: '^'+m[0].translate(superscripts), str(value))
    value = unicodedata.normalize('NFKC', value).lower()
    value = value.replace('−', '-').replace('–', '-').replace('×', '*').replace('·', '*')
    value = value.replace('**', '^')
    value = re.sub(r'\s+', '', value)
    value = re.sub(r'\^\(([+-]?\d+)\)', r'^\1', value)
    value = re.sub(r'\+\((-?\d+)\)', lambda m: m[1] if m[1].startswith('-') else '+'+m[1], value)
    return value


def fingerprint(family, parameters):
    raw = json.dumps({'family': family, 'parameters': parameters}, sort_keys=True, separators=(',', ':'))
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()


def public_catalog():
    return {'version': VERSION, 'skills': [dict(s) for s in SKILLS.values()],
            'interval_days': [1, 3, 7, 14, 30],
            'scope_note': 'Fresh authored variations support practice and delayed recall of these skills. They do not certify course mastery.'}


def public_question(q):
    return {k: q[k] for k in ('id', 'skill_id', 'topic_ids', 'kind', 'prompt', 'options', 'representation', 'previously_exposed') if k in q}


def generate(skill_id, seed, representation=None):
    if skill_id not in SKILLS:
        raise ValueError('Choose an available review skill.')
    if type(seed) is not int or not 0 <= seed <= 2**63-1:
        raise ValueError('Use an integer generation seed between 0 and 2^63-1.')
    rng = random.Random(seed)
    meta = SKILLS[skill_id]
    rep = representation or rng.choice(meta['representations'])
    if rep not in meta['representations']:
        raise ValueError('Unknown problem representation.')
    index = meta['representations'].index(rep)
    p = {}
    options = None
    forms = []
    display_answer = None

    if skill_id == 'fractions':
        b, d = rng.sample(range(3, 20), 2)
        a, c = rng.randint(1, b-1), rng.randint(1, d-1)
        p = dict(a=a, b=b, c=c, d=d)
        expression = f'{a}/{b} + {c}/{d}'
        forms = [expression]
        total = Fraction(a, b) + Fraction(c, d)
        hint = 'Both fractions need to count equal-sized parts before you add their numerators.'
        if index == 0:
            prompt = f'Calculate {expression}. A fraction is welcome.'
            answer = float(total)
            display_answer = str(total)
            explanation = f'Using denominator {b*d}, the numerator is {a*d} + {c*b} = {a*d+c*b}. The result simplifies to {total}.'
        elif index == 1:
            n = b*d
            prompt = f'Two separate containers each hold {n} liters when full. One is {a}/{b} full and the other is {c}/{d} full. How many liters do they contain altogether?'
            answer = a*d+c*b
            explanation = f'The amounts are {n} × {a}/{b} = {a*d} L and {n} × {c}/{d} = {c*b} L. Add these amounts to get {answer} L.'
        else:
            prompt = f'A student writes {expression} = {a+c}/{b+d}. Which correction explains the error?'
            answer = 'Convert to a common denominator, then add the adjusted numerators.'
            options = [answer, 'Add denominators first; the numerators stay unchanged.', 'Multiply the numerators and add the denominators.']
            explanation = f'The original denominators describe different part sizes. After scaling, the sum is {a*d+c*b}/{b*d} = {total}; adding denominators does not preserve those units.'

    elif skill_id == 'distribution':
        a, b, c = rng.choice(list(range(-9, -1))+list(range(2, 10))), rng.randint(2, 12), rng.randint(2, 15)
        p = dict(a=a, b=b, c=c)
        expression = f'{a}({b}x + {c})'
        forms = [expression]
        hint = 'The outside factor multiplies each entire term inside the parentheses.'
        if index == 0:
            prompt = f'What is the coefficient of x after expanding {expression}?'
            answer = a*b
            explanation = f'Distribution gives ({a} × {b})x + ({a} × {c}) = {a*b}x + ({a*c}). The x coefficient is {answer}.'
        elif index == 1:
            prompt = f'Solve {a}(x − {b}) = {a*c}. What is x?'
            forms = [f'{a}(x - {b}) = {a*c}']
            answer = b+c
            explanation = f'Divide both sides by the nonzero number {a}: x − {b} = {c}. Add {b} to both sides, so x = {answer}.'
        else:
            prompt = f'A student rewrites {expression} as {a*b}x + {c}. What was missed?'
            answer = f'The constant {c} must also be multiplied by {a}.'
            options = [answer, f'The x term should not be multiplied by {a}.', 'An outside factor is added to each term instead of multiplied.']
            explanation = f'Both terms are scaled: {a}({b}x + {c}) = {a*b}x + ({a*c}). Leaving {c} unchanged changes the expression.'

    elif skill_id == 'binomial':
        b, t = rng.randint(2, 19), rng.randint(-9, 12)
        p = dict(b=b, t=t) if index == 1 else dict(b=b)
        expression = f'(x + {b})^2'
        forms = [expression]
        hint = 'Write the square as two identical factors and distribute all four products.'
        if index == 0:
            prompt = f'After expanding {expression}, what is the coefficient of x?'
            answer = 2*b
            explanation = f'(x + {b})(x + {b}) has two cross terms, each {b}x. Their sum is {2*b}x.'
        elif index == 1:
            prompt = f'The square {expression} expands to x^2 + {2*b}x + {b*b}. Evaluate this expanded expression at x = {t}.'
            forms = [f'{expression} at x = {t}']
            answer = (t+b)**2
            explanation = f'Substitution gives {t*t} + ({2*b*t}) + {b*b} = {answer}. It agrees with ({t} + {b})²; expansion preserves the value.'
        else:
            prompt = f'A student says {expression} = x^2 + {b*b} for every real x. Which term is missing?'
            answer = f'{2*b}x'
            options = [answer, f'{b}x', f'{b*b}x']
            # b=2 would make the first and third choices mathematically identical.
            if b == 2:
                options[2] = 'x'
            explanation = f'The products x·{b} and {b}·x contribute {2*b}x. Squaring a sum requires these cross terms.'

    elif skill_id == 'factoring':
        r, s = sorted(rng.sample(range(2, 22), 2))
        p = dict(r=r, s=s)
        expression = f'x^2 - {r+s}x + {r*s}'
        forms = [expression]
        hint = 'For (x − r)(x − s), the middle coefficient is −(r+s) and the constant is rs.'
        if index == 0:
            prompt = f'Which factorization equals {expression} for every real x?'
            answer = f'(x − {r})(x − {s})'
            options = [answer, f'(x + {r})(x + {s})', f'(x − {r})(x + {s})']
            explanation = f'The two negative terms sum to −{r+s}, and their product is {r*s}. Expanding the selected factors restores the polynomial.'
        elif index == 1:
            prompt = f'Solve {expression} = 0 by factoring. What is the larger root?'
            answer = s
            explanation = f'The equation is (x − {r})(x − {s}) = 0. A real product is zero only if a factor is zero, so the roots are {r} and {s}; the larger is {s}.'
        else:
            p = dict(n=r+s)
            forms = [f'x^2 - {r+s}x = 0']
            prompt = f'A student divides x^2 − {r+s}x = 0 by x and reports only x = {r+s}. Which solution was lost?'
            answer = 0
            explanation = f'Factoring gives x(x − {r+s}) = 0, with roots 0 and {r+s}. Dividing by x silently assumes x ≠ 0 and discards that solution.'

    elif skill_id == 'cancellation':
        a, b = rng.randint(2, 19), rng.randint(2, 19)
        t = rng.choice([n for n in range(-12, 23) if n != a])
        p = dict(a=a, b=b, t=t) if index == 0 else dict(a=a, b=b)
        expression = f'((x - {a})(x + {b}))/(x - {a})'
        forms = [expression]
        hint = 'Cancel a common factor only where it is nonzero, and retain the original excluded input.'
        if index == 0:
            prompt = f'For f(x) = {expression}, calculate f({t}).'
            answer = t+b
            explanation = f'The input {t} is different from {a}, so x − {a} is nonzero. Cancellation gives x + {b} on that domain, yielding {answer}.'
        elif index == 1:
            prompt = f'After simplifying {expression} to x + {b}, which real input is still excluded from the original function?'
            answer = a
            explanation = f'The original denominator is zero at x = {a}. The simplified expression has a value there, but that does not fill the hole in the original function.'
        else:
            prompt = f'A student cancels in {expression} and says the original function equals x + {b} at every real input. Which statement is valid?'
            answer = f'The expressions agree when x ≠ {a}; the original is undefined at {a}.'
            options = [answer, 'Cancellation makes every originally excluded input valid.', f'The original is undefined only at x = −{b}.']
            explanation = f'Cancellation divides numerator and denominator by x − {a}; that operation requires x ≠ {a}. A numerator of zero alone does not exclude x = −{b}.'

    elif skill_id == 'functions':
        a, b, t, h = rng.randint(2, 12), rng.randint(-15, 15), rng.randint(-9, 12), rng.randint(2, 9)
        p = dict(a=a, b=b, t=t) if index != 2 else dict(a=a, b=b, h=h)
        expression = f'f(x) = {a}x + ({b})'
        forms = [expression]
        hint = 'A function takes an input and returns the value specified by its rule; keep input and output distinct.'
        if index == 0:
            prompt = f'If {expression}, what is f({t})?'
            answer = a*t+b
            explanation = f'Replace the entire input x by {t}: {a} × ({t}) + ({b}) = {answer}.'
        elif index == 1:
            prompt = f'For {expression}, which input x gives output {a*t+b}?'
            answer = t
            explanation = f'Solve {a}x + ({b}) = {a*t+b}. Subtract {b}, then divide by the nonzero coefficient {a}; x = {t}.'
        else:
            prompt = f'For {expression}, the input increases from x to x + {h}. By how much does the output increase?'
            answer = a*h
            explanation = f'f(x + {h}) − f(x) = [{a}x + {a*h} + ({b})] − [{a}x + ({b})] = {a*h}. The output change is scaled by the slope.'

    elif skill_id == 'composition':
        a, b, c, t = rng.randint(2, 9), rng.randint(1, 12), rng.randint(1, 9), rng.randint(2, 7)
        p = dict(a=a, b=b, c=c, t=t) if index != 1 else dict(a=a, b=b, c=c)
        rule = f'f(x) = {a}x + {c} and g(x) = x^2 + {b}'
        forms = [rule]
        hint = 'In f(g(x)), compute the inside function g first and put its entire output into f.'
        if index == 0:
            prompt = f'Let {rule}. What is f(g({t}))?'
            answer = a*(t*t+b)+c
            explanation = f'g({t}) = {t*t+b}. Feeding that output into f gives {a} × {t*t+b} + {c} = {answer}.'
        elif index == 1:
            prompt = f'Let {rule}. Which expression represents g(f(x))?'
            answer = f'({a}x + {c})^2 + {b}'
            options = [answer, f'{a}(x^2 + {b}) + {c}', f'{a}x^2 + {c+b}']
            explanation = f'The outer function g squares its entire input and adds {b}. Its input is f(x) = {a}x + {c}, so parentheses are essential.'
        else:
            prompt = f'For {rule}, a student computes g(f({t})) when asked for f(g({t})). What is the error?'
            answer = 'The order was reversed; composition does not generally commute.'
            options = [answer, 'There is no error: function order never changes the output.', 'Composition means multiplying the two separate outputs.']
            explanation = f'Here f(g({t})) = {a*(t*t+b)+c}, while g(f({t})) = {(a*t+c)**2+b}. The outputs differ because a different operation is applied first.'

    elif skill_id == 'linear-equations':
        a, c = rng.sample(range(2, 15), 2)
        b, k = rng.choice([v for v in range(-15, 16) if v]), rng.randint(-9, 15)
        d = (a-c)*k+b
        p = dict(a=a, b=b, c=c, d=d)
        expression = f'{a}x + ({b}) = {c}x + ({d})'
        forms = [expression]
        hint = 'Apply the same operation to both sides. Moving a term is shorthand for adding its negative to both sides.'
        if index == 0:
            prompt = f'Solve {expression}. What is x?'
            answer = k
            explanation = f'Subtract {c}x and {b} from both sides: ({a-c})x = {d-b}. Divide by the nonzero number {a-c}, giving x = {k}.'
        elif index == 1:
            prompt = f'Which action preserves exactly the solutions of {expression}?'
            answer = f'Subtract {c}x from both sides.'
            options = [answer, f'Subtract {c}x from the right side only.', 'Delete both constants without applying the same operation to both sides.']
            explanation = f'Adding the same expression, here −{c}x, to both sides preserves equality in both directions. Altering only one side generally does not.'
        else:
            prompt = f'From {expression}, a student writes {a-c}x = {d+b}. Which operation correctly removes the constant on the left?'
            answer = f'Subtract {b} from both sides, giving ({a-c})x = {d-b}.'
            options = [answer, f'Add {b} to the right side only.', 'Divide the right-side constant by the left-side constant only.']
            explanation = f'The left contains +({b}), so its additive inverse must be added to both sides. Thus the right becomes {d} − ({b}) = {d-b}.'

    elif skill_id == 'exponents':
        a, m, n, k = rng.randint(2, 4), rng.randint(2, 5), rng.randint(2, 5), rng.randint(1, 3)
        if index == 0:
            p = dict(a=a, m=m, n=n, k=k)
            expression = f'({a}^{m} * {a}^{n})/{a}^{k}'
            prompt = f'Calculate {expression}.'
            answer = a**(m+n-k)
            explanation = f'Multiplying the same nonzero base adds exponents; dividing subtracts them. The result is {a}^{m+n-k} = {answer}.'
        elif index == 1:
            p = dict(m=m, n=n)
            expression = f'x^{m} * x^{n}'
            prompt = f'For every real x, which expression equals {expression}?'
            answer = f'x^{m+n}'
            options = [answer, f'x^{m*n}', f'{m+n}x']
            if m*n == m+n:
                options[1] = f'x^{m+n+1}'
            explanation = f'The product contains {m} + {n} = {m+n} copies of x. These positive integer powers also obey the identity at x = 0.'
        else:
            p = dict(m=m)
            expression = f'x^{m}/x^{m}'
            prompt = f'The quotient {expression} simplifies to 1. What restriction must remain?'
            answer = 'x ≠ 0'
            options = [answer, 'No restriction; the original quotient is defined at zero.', 'x > 0 only; all negative inputs are excluded.']
            explanation = f'Division by x^{m} requires x ≠ 0. Every nonzero negative or positive real input is allowed; 0/0 is undefined.'
        forms = [expression]
        hint = 'Use the meaning of integer powers, and keep every restriction imposed by a denominator.'

    elif skill_id == 'limits':
        a, m, b = rng.randint(2, 24), rng.randint(2, 9), rng.randint(-12, 12)
        p = dict(a=a) if index != 1 else dict(a=a, m=m, b=b, hole=m*a+b+7)
        expression = f'(x^2 - {a*a})/(x - {a})'
        forms = [expression]
        hint = 'A limit concerns nearby inputs. An excluded input or a separately assigned point value need not determine that limit.'
        if index == 0:
            prompt = f'Find the limit as x approaches {a} of {expression}.'
            answer = 2*a
            explanation = f'For x ≠ {a}, factor x² − {a*a} = (x − {a})(x + {a}), then cancel the nonzero factor. The nearby expression x + {a} tends to {2*a}; the original value at {a} is still undefined.'
        elif index == 1:
            prompt = f'f(x) = {m}x + ({b}) for x ≠ {a}, but f({a}) = {m*a+b+7}. What is the limit of f(x) as x approaches {a}?'
            forms = [prompt]
            answer = m*a+b
            explanation = f'For nearby inputs the linear rule tends to {m} × {a} + ({b}) = {answer}. Assigning a different value at the single input {a} does not change that limit.'
        else:
            prompt = f'Direct substitution into {expression} at x = {a} gives 0/0. Which method is valid for finding the limit there?'
            answer = f'Factor and cancel for x ≠ {a}, then take the limit of x + {a}.'
            options = [answer, 'Set 0/0 equal to zero.', 'Conclude every limit with an undefined point value fails to exist.']
            explanation = f'The quotient agrees with x + {a} on a punctured neighborhood. That equality away from {a} determines the limit {2*a}; it does not define 0/0.'

    elif skill_id == 'derivatives':
        a, n, c, b = rng.randint(2, 9), rng.randint(2, 5), rng.randint(-3, 5), rng.randint(-12, 12)
        hint = 'A derivative is a local rate; the power rule lowers the exponent by one. A tangent estimate is not generally an exact finite change.'
        if index == 0:
            p = dict(a=a, n=n, c=c, b=b)
            expression = f'f(x) = {a}x^{n} + ({b})'
            prompt = f'For {expression}, calculate f′({c}).'
            answer = a*n*c**(n-1)
            explanation = f'f′(x) = {a*n}x^{n-1}; the constant derivative is zero. At x = {c}, the result is {answer}.'
        elif index == 1:
            y, slope, h_num = rng.randint(-12, 20), rng.choice([-9, -5, -2, 2, 5, 9]), rng.choice([-3, -2, -1, 1, 2, 3])
            p = dict(c=c, y=y, slope=slope, h_tenths=h_num)
            expression = f'f({c}) = {y}, f′({c}) = {slope}'
            prompt = f'A differentiable function has {expression}. What is its tangent-line estimate at x = {c} + ({h_num}/10)?'
            answer = float(Fraction(y)+Fraction(slope*h_num, 10))
            display_answer = str(Fraction(y)+Fraction(slope*h_num, 10))
            explanation = f'The linear estimate is f({c}) + f′({c})h = {y} + ({slope})({h_num}/10) = {Fraction(y)+Fraction(slope*h_num,10)}. Differentiability alone does not make this finite estimate exact.'
        else:
            p = dict(a=a, n=n)
            expression = f'{a}x^{n}'
            prompt = f'A student differentiates {expression} as {a*n}x^{n}. Which correction is needed?'
            answer = f'The new exponent must be {n-1}, so the derivative is {a*n}x^{n-1}.'
            options = [answer, 'Keep the exponent and remove the coefficient.', f'The derivative is the original expression plus {n}.']
            explanation = f'The power rule is d(x^n)/dx = n x^(n−1). Both multiplying by n and reducing the exponent are required.'
        forms = [expression]

    elif skill_id == 'product-rule':
        a, b, c = rng.randint(2, 15), rng.randint(2, 19), rng.randint(1, 7)
        p = dict(a=a, b=b, c=c) if index == 0 else dict(a=a, b=b)
        expression = f'(x + {a})(x^2 + {b})'
        forms = [expression]
        hint = 'Each factor can change. The product rule adds first-derivative times second and first times second-derivative.'
        correct = f'(x^2 + {b}) + (x + {a})(2x)'
        if index == 0:
            prompt = f'For f(x) = {expression}, calculate f′({c}).'
            answer = c*c+b+(c+a)*2*c
            explanation = f'f′(x) = {correct}. At x = {c}, this is {c*c+b} + {2*c*(c+a)} = {answer}. Expansion followed by the power rule gives the same result.'
        elif index == 1:
            prompt = f'Which expression is the derivative of {expression}?'
            answer = correct
            options = [answer, '2x', f'(x + {a}) + (x^2 + {b})']
            explanation = f'With u = x + {a} and v = x² + {b}, u′ = 1 and v′ = 2x. The derivative is u′v + uv′, giving {correct}.'
        else:
            prompt = f'A student differentiates {expression} as 1 × 2x = 2x. What explains the mistake?'
            answer = 'The derivative of a product adds two contributions; it is not the product of the derivatives.'
            options = [answer, 'The derivative of a product always equals the product of derivatives.', 'A product must be left unchanged when differentiating.']
            explanation = f'The valid derivative is {correct}. Each term accounts for one factor changing while the other contributes its current value.'

    elif skill_id == 'chain-rule':
        a, b, n, c = rng.randint(2, 9), rng.randint(1, 9), rng.randint(2, 4), rng.randint(0, 5)
        p = dict(a=a, b=b, n=n, c=c) if index == 0 else dict(a=a, b=b, n=n)
        expression = f'({a}x + {b})^{n}'
        forms = [expression]
        hint = 'Differentiate the outer power at the inner expression, then multiply by the derivative of that inner expression.'
        if index == 0:
            prompt = f'For f(x) = {expression}, calculate f′({c}).'
            answer = n*a*(a*c+b)**(n-1)
            explanation = f'f′(x) = {n}({a}x + {b})^{n-1} × {a}. At x = {c}, the inner value is {a*c+b}, so the derivative is {answer}.'
        elif index == 1:
            prompt = f'Which procedure correctly differentiates {expression}?'
            answer = f'Use {n}({a}x + {b})^{n-1}, then multiply by the inner derivative {a}.'
            options = [answer, f'Use only {n}({a}x + {b})^{n-1}; the inner function never matters.', f'Multiply the original expression by {a} without changing the power.']
            explanation = f'For an outer function F(u)=u^{n} and inner u={a}x+{b}, df/dx = (dF/du)(du/dx). The inner factor {a} converts the rate with respect to u into a rate with respect to x.'
        else:
            prompt = f'A student gives {n}({a}x + {b})^{n-1} as the derivative of {expression}. What multiplicative factor is missing?'
            answer = a
            explanation = f'The derivative of the inside, {a}x + {b}, is {a}. The chain rule multiplies the displayed outer derivative by this factor.'

    elif skill_id == 'integrals':
        a, n, t = rng.randint(2, 11), rng.randint(1, 4), rng.randint(1, 6)
        hint = 'Check an antiderivative by differentiating it. A definite integral is signed accumulation, and equals an antiderivative at the upper bound minus its value at the lower bound.'
        if index == 0:
            p = dict(a=a, n=n, t=t)
            expression = f'integral from 0 to {t} of {a}x^{n} dx'
            prompt = f'Calculate the {expression}. A fraction is welcome.'
            answer = float(Fraction(a*t**(n+1), n+1))
            display_answer = str(Fraction(a*t**(n+1), n+1))
            explanation = f'An antiderivative is ({a}/{n+1})x^{n+1}. Evaluate at {t} and subtract its value at 0 to get {Fraction(a*t**(n+1), n+1)}.'
        elif index == 1:
            left, right, down = rng.randint(1, 7), rng.randint(1, 7), rng.randint(2, 11)
            p = dict(up=a, left=left, down=down, right=right)
            expression = f'rate {a} on [0,{left}), then -{down} on [{left},{left+right}]'
            prompt = f'A tank has net flow +{a} L/min for {left} minutes, then −{down} L/min for {right} minutes. Assuming enough liquid remains, what is the signed change in volume in liters?'
            answer = a*left-down*right
            explanation = f'The signed areas are +{a*left} L and −{down*right} L. Their sum is {answer} L. Adding the magnitudes instead would measure a different quantity.'
        else:
            p = dict(a=a, n=n)
            expression = f'{a}x^{n}'
            prompt = f'Which expression gives all antiderivatives of {expression} on the real line? C is any real constant.'
            answer = f'({a}/{n+1})x^{n+1} + C'
            options = [answer, f'{a*n}x^{n-1} + C', f'{a}x^{n+1} + C']
            explanation = f'Differentiating ({a}/{n+1})x^{n+1} gives {a}x^{n}. The derivative of C is zero, so all constant shifts are included.'
        forms = [expression]

    family = f'{skill_id}.{rep}.v1'
    fp = fingerprint(family, p)
    if options is not None:
        if len(options) != len(set(options)) or options.count(answer) != 1:
            raise AssertionError(f'Ambiguous generated choice: {family}, {p}')
        rng.shuffle(options)
    result = {'id': f'mixed-{fp[:24]}', 'fingerprint': fp, 'family': family,
              'parameters': p, 'skill_id': skill_id, 'topic_ids': list(meta['topic_ids']),
              'representation': rep, 'kind': 'choice' if options else 'number',
              'prompt': prompt, 'answer': answer, 'explanation': explanation, 'hint': hint,
              'tolerance': 1e-7, 'avoid_forms': forms, 'previously_exposed': False}
    if options:
        result['options'] = options
    if display_answer is not None:
        result['display_answer'] = display_answer
    return result
