"""Pure, bounded visual metadata for public questions and submitted feedback.

prepare_question reads only public givens. It never reads a key, hint, solution,
profile or disk file. prepare_feedback requires the already-submitted result's
answer/response/correct fields; it is not a grading or mastery operation.

Recognizers deliberately match narrow mathematical statements. An unrecognized
problem gets an explicitly limited answer comparison, never an invented model.
"""
from fractions import Fraction
import ast
import math
import re

from question_bank import parse_number

VERSION = 1
MAX_PROMPT = 3000
NUM = r'[+-]?(?:\d+(?:\.\d+)?|\.\d+)'
POINT = rf'\(\s*({NUM})\s*,\s*({NUM})\s*\)'
MODEL_LIMIT = 1e6


def _text(value, limit=MAX_PROMPT):
    return str(value)[:limit] if isinstance(value, (str, int, float)) else ''


def _normalized(value):
    return (_text(value).replace('−', '-').replace('–', '-').replace('×', '*')
            .replace('·', '*').replace('÷', '/').replace('²', '^2').replace('³', '^3')
            .replace('′', "'").strip())


def _finite(value):
    if type(value) not in (int, float) or abs(value) > 1e300 or not math.isfinite(value):
        return None
    return float(value) if abs(value) <= 1e300 else None


def _response_number(value):
    if not isinstance(value, (str, int, float)) or isinstance(value, bool):
        return None
    try:
        return _finite(parse_number(value))
    except (ValueError, TypeError, ZeroDivisionError, OverflowError, SyntaxError, RecursionError):
        return None


def _numbers(groups, *, positive=False):
    values = [float(s) for s in groups]
    if any(not math.isfinite(v) or abs(v) > MODEL_LIMIT or (positive and v <= 0) for v in values):
        raise ValueError('Givens outside the supported diagram range.')
    return values


def _poly(expression):
    """Only a bounded degree <=4 real polynomial in x; no eval or names/calls."""
    expression = expression.strip().rstrip('.').replace('^', '**')
    expression = re.sub(r'(?<=[0-9)])\s*(?=x|\()', '*', expression)
    expression = re.sub(r'(?<=x)\s*(?=\()', '*', expression)
    if len(expression) > 180 or not re.fullmatch(r'[0-9x+\-*/().\s]+', expression):
        raise ValueError('Not a supported polynomial.')
    tree = ast.parse(expression, mode='eval')
    if sum(1 for _ in ast.walk(tree)) > 100:
        raise ValueError('Expression too large.')

    def trim(p):
        while len(p) > 1 and p[-1] == 0:
            p.pop()
        if len(p) > 5 or any(not math.isfinite(x) or abs(x) > MODEL_LIMIT for x in p):
            raise ValueError('Polynomial outside diagram bounds.')
        return p

    def mul(a, b):
        if len(a) + len(b) - 1 > 5:
            raise ValueError('Degree too high.')
        result = [0.] * (len(a) + len(b) - 1)
        for i, x in enumerate(a):
            for j, y in enumerate(b):
                result[i+j] += x*y
        return trim(result)

    def walk(n):
        if isinstance(n, ast.Expression):
            return walk(n.body)
        if isinstance(n, ast.Constant) and type(n.value) in (int, float):
            return trim([float(n.value)])
        if isinstance(n, ast.Name) and n.id == 'x':
            return [0., 1.]
        if isinstance(n, ast.UnaryOp) and isinstance(n.op, (ast.UAdd, ast.USub)):
            return [x*(-1 if isinstance(n.op, ast.USub) else 1) for x in walk(n.operand)]
        if isinstance(n, ast.BinOp):
            a, b = walk(n.left), walk(n.right)
            if isinstance(n.op, (ast.Add, ast.Sub)):
                sign = -1 if isinstance(n.op, ast.Sub) else 1
                return trim([(a[i] if i < len(a) else 0) + sign*(b[i] if i < len(b) else 0) for i in range(max(len(a), len(b)))])
            if isinstance(n.op, ast.Mult):
                return mul(a, b)
            if isinstance(n.op, ast.Div) and len(b) == 1 and b[0] != 0:
                return trim([x/b[0] for x in a])
            if isinstance(n.op, ast.Pow) and len(b) == 1 and b[0].is_integer() and 0 <= b[0] <= 4:
                result = [1.]
                for _ in range(int(b[0])):
                    result = mul(result, a)
                return result
        raise ValueError('Unsupported polynomial operation.')
    return walk(tree)


def _unit(prompt):
    p = prompt.lower()
    for pattern, unit in [(r'percent(?:age)?[^.]*as a number|percent decrease', '%'),
                          (r'in degrees|angle[^.]*degrees', 'degrees'),
                          (r'in meters per second', 'm/s'), (r'in meters|in metres', 'm'),
                          (r'in centimeters|in centimetres|in cm\b', 'cm'),
                          (r'in dollars', '$'), (r'in minutes', 'min'), (r'in seconds', 's')]:
        if re.search(pattern, p):
            return unit
    return ''


def _recognize(prompt):
    p = _normalized(prompt)
    m = re.fullmatch(r'Give a fraction equivalent to (\d+)/(\d+) with denominator (\d+)\. Enter its numerator\.', p, re.I)
    if m:
        numerator, denominator, target = map(int, m.groups())
        if 0 < denominator <= 96 and 0 <= numerator <= denominator and 0 < target <= 96 and numerator*target % denominator == 0:
            return 'equivalent-fractions', dict(fraction=[numerator, denominator], target_denominator=target, task='numerator')
    # Independent bars show only the operands before submission, never a sum bar.
    m = re.fullmatch(r'(?:Compute|Calculate|Evaluate)\s+\(?([+-]?\d+)/(\d+)\)?\s*([+\-*/])\s*\(?([+-]?\d+)/(\d+)\)?\.?\s*(?:A fraction is welcome\.)?', p, re.I)
    if m:
        a, b, op, c, d = m.groups()
        a, b, c, d = map(int, (a, b, c, d))
        grouped_division = op != '/' or re.search(r'\([+-]?\d+/\d+\)\s*/\s*\([+-]?\d+/\d+\)', p)
        if grouped_division and b and d and max(abs(a), b, abs(c), d) <= 10000 and (op != '/' or c):
            return 'fractions', dict(operands=[[a, b], [c, d]], operation=op)
    m = re.fullmatch(r'(?:Solve|Find x in)\s+(.+?)\s*=\s*(.+?)(?:\.\s*What is x\?)?[.?]*', p, re.I)
    if m:
        left, right = _poly(m[1]), _poly(m[2])
        if max(len(left), len(right)) <= 2:
            return 'balance', dict(left=(left+[0., 0.])[:2], right=(right+[0., 0.])[:2], variable='x', expression=f'{m[1]} = {m[2].rstrip(".")}')
    m = re.fullmatch(r'(?:If|For)\s+([fgh])\(x\)\s*=\s*(.+?),\s*(?:find|evaluate|compute|calculate)\s+([fgh])(?P<prime>\x27)?\(\s*('+NUM+r')\s*\)[.?]*', p, re.I)
    if m and m[1].lower() == m[3].lower():
        coefficients = _poly(m[2])
        x = _numbers([m[5]])[0]
        return 'function', dict(coefficients=coefficients, input=x, task='derivative' if m['prime'] else 'value', expression=f'{m[1]}(x)={m[2]}')
    m = re.fullmatch(r'Calculate the integral from 0 to ('+NUM+r') of ('+NUM+r')x\^([1-4]) dx\. A fraction is welcome\.', p, re.I)
    if m:
        upper, coefficient = _numbers(m.groups()[:2], positive=True)
        return 'integral', dict(lower=0, upper=upper, coefficient=coefficient, power=int(m[3]), unit='signed area')
    m = re.fullmatch(r'A tank has net flow \+('+NUM+r') L/min for ('+NUM+r') minutes, then -('+NUM+r') L/min for ('+NUM+r') minutes\. Assuming enough liquid remains, what is the signed change in volume in liters\?', p, re.I)
    if m:
        up, first, down, second = _numbers(m.groups(), positive=True)
        return 'accumulation', dict(rates=[up, -down], durations=[first, second], unit='L')
    m = re.fullmatch(r'A right triangle has legs ('+NUM+r') and ('+NUM+r')\. Find its hypotenuse\.?', p, re.I)
    if m:
        return 'triangle', dict(legs=_numbers(m.groups(), positive=True), task='hypotenuse')
    m = re.fullmatch(r'Two triangle angles are ('+NUM+r')°? and ('+NUM+r')°?\. Find the third\.?', p, re.I)
    if m:
        angles = _numbers(m.groups(), positive=True)
        if sum(angles) < 180:
            return 'angles', dict(angles=angles, total=180, task='triangle')
    m = re.fullmatch(r'An angle and ('+NUM+r')° form a straight angle\. Find the unknown angle in degrees\.?', p, re.I)
    if m:
        v = _numbers(m.groups(), positive=True)[0]
        if v < 180:
            return 'angles', dict(angles=[v], total=180, task='straight')
    m = re.fullmatch(r'Find the (?:length|magnitude) of '+POINT+r'\.?', p, re.I)
    if m:
        return 'vectors', dict(vectors=[_numbers(m.groups())], task='length')
    m = re.fullmatch(r'Find the dot product '+POINT+r'\s*\*\s*'+POINT+r'\.?', p, re.I)
    if m:
        v = _numbers(m.groups())
        return 'vectors', dict(vectors=[v[:2], v[2:]], task='dot')
    m = re.fullmatch(r'For u\s*=\s*'+POINT+r'\s*(?:and|,)\s*v\s*=\s*'+POINT+r',\s*find the ([xy])-component of u\s*([+-])\s*v\.?', p, re.I)
    if m:
        v = _numbers(m.groups()[:4])
        return 'vectors', dict(vectors=[v[:2], v[2:]], task='component', component=m[5].lower(), operation=m[6])
    m = re.fullmatch(r'Find the distance from '+POINT+r' to '+POINT+r'\.?', p, re.I)
    if m:
        v = _numbers(m.groups())
        return 'points', dict(points=[v[:2], v[2:]], task='distance')
    m = re.fullmatch(r'A bag has (\d+) red and (\d+) blue balls\. (?:Draw two without replacement\. Find P\(two red\)|Find P\(at least one red in two draws without replacement\))\.?', p, re.I)
    if m:
        red, blue = map(int, m.groups())
        if 0 < red <= 10000 and 0 <= blue <= 10000 and red + blue >= 2:
            return 'probability', dict(red=red, blue=blue, task='at_least_one_red' if 'at least' in p else 'two_red', unit='probability')
    return 'quantity', dict(unit=_unit(p))


def prepare_question(question, topic_id=''):
    """Create metadata from public fields only, safe even for an unattempted check."""
    q = question if isinstance(question, dict) else {}
    prompt = _text(q.get('prompt', ''))
    kind = q.get('kind') if q.get('kind') in ('number', 'choice') else 'written'
    v = dict(version=VERSION, phase='problem', id=_text(q.get('id', ''), 160), kind=kind,
             topic_id=_text(topic_id or q.get('topic_id', ''), 160), prompt=prompt,
             title='Picture the givens', scope='givens', type='quantity', givens={},
             note='This diagram uses the stated givens. It does not grade written reasoning.')
    if kind == 'choice':
        v.update(type='choice', title='Compare the claims',
                 givens={'options': [_text(x, 600) for x in q.get('options', [])[:8]] if isinstance(q.get('options'), list) else []},
                 note='No option is marked before submission. Check the stated conditions when choosing.')
    elif kind == 'number':
        try:
            v['type'], v['givens'] = _recognize(prompt)
        except (ValueError, TypeError, SyntaxError, OverflowError, ZeroDivisionError, RecursionError):
            v['type'], v['givens'] = 'quantity', {'unit': _unit(prompt)}
        if v['type'] == 'quantity':
            v.update(title='Feedback after submission', note='Your value will be compared after submission. No full mathematical model is inferred.')
        elif v['type'] == 'equivalent-fractions':
            v.update(title='Same amount, different parts', note='The two bars use the same whole. The target bar stays unfilled until you submit a numerator.')
    else:
        v.update(type='written', title='Make your reasoning visible',
                 note='A drawing can support a written argument; it does not establish that a proof is valid.')
    return v


def _model_value(v):
    g, t = v['givens'], v['type']
    if t == 'equivalent-fractions':
        return Fraction(*g['fraction']) * g['target_denominator']
    if t == 'fractions':
        x, y = [Fraction(*a) for a in g['operands']]
        return {'+': lambda: x+y, '-': lambda: x-y, '*': lambda: x*y, '/': lambda: x/y}[g['operation']]()
    if t == 'balance':
        b, a = g['left']; d, c = g['right']
        return (d-b)/(a-c) if a != c else None
    if t == 'function':
        p = g['coefficients']; x = g['input']
        return sum(i*a*x**(i-1) for i, a in enumerate(p) if i) if g['task'] == 'derivative' else sum(a*x**i for i,a in enumerate(p))
    if t == 'integral':
        return Fraction(str(g['coefficient'])) * Fraction(str(g['upper']))**(g['power']+1) / (g['power']+1)
    if t == 'accumulation':
        return sum(a*b for a, b in zip(g['rates'], g['durations']))
    if t == 'triangle':
        return math.hypot(*g['legs'])
    if t == 'angles':
        return g['total']-sum(g['angles'])
    if t == 'vectors':
        a = g['vectors'][0]
        if g['task'] == 'length': return math.hypot(*a)
        b = g['vectors'][1]
        if g['task'] == 'dot': return sum(x*y for x,y in zip(a,b))
        i = 0 if g['component'] == 'x' else 1
        return a[i]+(1 if g['operation']=='+' else -1)*b[i]
    if t == 'points':
        a,b = g['points']; return math.hypot(b[0]-a[0], b[1]-a[1])
    if t == 'probability':
        r,b = g['red'],g['blue']; n=r+b
        return Fraction(r*(r-1), n*(n-1)) if g['task']=='two_red' else 1-Fraction(b*(b-1),n*(n-1))
    return None


def prepare_feedback(question, result, topic_id=''):
    """Decorate a submitted result; never manufacture a grade or reveal q's key."""
    if not isinstance(result, dict) or not {'answer', 'response', 'correct'} <= result.keys() or type(result['correct']) is not bool:
        raise ValueError('Visual feedback requires an already submitted graded result.')
    v = prepare_question(question, topic_id)
    v.update(phase='feedback', correct=result['correct'], response=_text(result['response'], 1000),
             expected=_text(result.get('display_answer', result['answer']), 1000),
             explanation=_text(result.get('explanation', ''), 1800), mastery_changed=False,
             independence_claim=False)
    if v['kind'] == 'number':
        expected = _finite(result['answer'])
        response = _response_number(result['response'])
        v.update(expected_value=expected, response_value=response, scope='answer-comparison', title='Your value and the checked value')
        modeled = _model_value(v)
        if modeled is not None and expected is not None and math.isclose(float(modeled), expected, rel_tol=1e-8, abs_tol=1e-8):
            v.update(scope='mathematical-model', title='Try your value in the picture')
            if v['type'] == 'equivalent-fractions':
                v['note'] = 'Orange shows your numerator in the new partition. The green boundary marks the same amount as the given fraction.'
            if isinstance(modeled, Fraction) and 'display_answer' not in result:
                v['expected'] = str(modeled)
            if v['type'] == 'balance' and response is not None and abs(response) <= MODEL_LIMIT:
                b,a = v['givens']['left']; d,c = v['givens']['right']
                v['witness'] = dict(left=a*response+b, right=c*response+d, difference=(a-c)*response+b-d)
            if v['type'] == 'triangle' and response is not None and abs(response) <= MODEL_LIMIT:
                v['witness'] = dict(leg_square_sum=sum(x*x for x in v['givens']['legs']), proposed_square=response*response, valid_length=response>=0)
        elif v['type'] not in ('quantity',):
            # Never show a reconstructed model that disagrees with the supplied result.
            v.update(type='quantity', givens={'unit': _unit(v['prompt'])})
        if v['scope'] == 'answer-comparison':
            v['note'] = 'A comparison on one numerical scale. It does not reconstruct the full problem or verify each written step.'
        if response is None:
            v['note'] += ' Your entry could not be placed as a finite real number; its original text remains visible.'
    elif v['kind'] == 'choice':
        v.update(scope='choice-comparison', title='Your claim and the checked claim',
                 note='The feedback compares the selected statement with this item’s key. Choosing it does not verify an advanced proof.')
    else:
        v.update(scope='written-review', title='Reasoning awaits review', note='Written arguments require review; this visual does not certify a proof.')
    return v


def feedback_from_result(result, topic_id=''):
    """Fallback for stored results whose public question is no longer attached."""
    kind = 'number' if type(result.get('answer')) in (int, float) else 'choice'
    return prepare_feedback({'id': result.get('id', ''), 'kind': kind, 'prompt': result.get('prompt', '')}, result, topic_id)
