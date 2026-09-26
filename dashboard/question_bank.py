"""Original parameterized short checks. Server-only keys; no model-based grading claims."""
import ast, math, random, re
from concept_variants import DATA as VARIANTS

def numeric(prompt,answer,why,hint=None):
    return dict(kind='number',prompt=prompt,answer=answer,explanation=why,hint=hint or 'Write the relationship first, then substitute the given values.',tolerance=1e-5)
def choice(prompt,correct,others,why,hint=None):
    return dict(kind='choice',prompt=prompt,answer=correct,options=[correct,*others],explanation=why,hint=hint or 'Check which definition or condition applies before choosing.')

def questions(slug,seed):
    rng=random.Random(seed);n=rng.randint(3,12);a=rng.randint(2,6);b=rng.randint(7,12);q=[]
    N=numeric;C=choice
    if slug=='angles':
        v=rng.randint(25,75);q=[N(f'An angle and {v}° form a straight angle. Find the unknown angle in degrees.',180-v,'A straight angle is 180°, so subtract the known angle.','The two adjacent angles together make a half turn.'),N(f'Two lines cross. One angle is {v+10}°. Find the vertically opposite angle.',v+10,'Vertical opposite angles are equal.'),C('Which condition guarantees equal alternate interior angles?','The two lines are parallel',['The transversal is long','The angles look equal','The lines have different slopes'],'Parallel lines are the required condition.')]
    elif slug=='triangles':
        q=[N(f'Two triangle angles are {n+30}° and {a+50}°. Find the third.',100-n-a,'The three interior angles total 180°.'),N(f'A right triangle has legs {3*a} and {4*a}. Find its hypotenuse.',5*a,'Square the two legs, add, then take the positive square root.'),C(f'Can lengths {a}, {b}, and {a+b+1} form a triangle?','No: the two shorter sides do not reach the longest',['Yes: all are positive','Yes: there are three lengths','Only if one angle is 90°'],'The sum of two sides must exceed the third.')]
    elif slug=='congruence':
        q=[C('If triangle JKL is congruent to triangle RST, which side matches JL?','RT',['RS','ST','JK'],'The order gives J↔R, K↔S, L↔T.'),C('Two sides and the angle between them match in two triangles. Which criterion applies?','SAS',['SSA','AAA','AA'],'SAS requires the included angle, between the sides.'),C('Two triangles have three matching angles. What is guaranteed?','Same shape, but not necessarily the same size',['Congruence','Equal perimeters','Equal areas'],'AAA establishes similarity; a dilation can change every length.')]
    elif slug=='similarity':
        q=[N(f'A dilation takes a length of {a} to {a*n}. What is its scale factor?',n,'Divide image length by original length.'),N(f'Lengths are scaled by {a}. What is the area scale factor?',a*a,'Area scales in two dimensions: k².'),C('A model is enlarged by factor 2 in every length. Its volume becomes…','8 times as large',['2 times as large','4 times as large','Unchanged'],'Volume scales by k³, so 2³=8.')]
    elif slug=='circles':
        q=[N(f'A circle has radius {a}. Enter its exact circumference (pi is allowed).',2*math.pi*a,'Circumference is 2πr.'),N(f'A radius-{2*a} disk has a 90° sector. Find its exact area.',math.pi*a*a,'A quarter of π(2a)² is πa².'),C('An arc length and a sector area use which units?','Length units and square units, respectively',['Both square units','Both length units','Square units and cubic units'],'A boundary is one-dimensional; a region is two-dimensional.')]
    elif slug=='area':
        q=[N(f'A triangle has base {2*a} and perpendicular height {n}. Find its area.',a*n,'Triangle area is half of base times perpendicular height.'),N(f'A trapezoid has parallel sides {a} and {b}, and height {n}. Find its area.',(a+b)*n/2,'Average the parallel sides, then multiply by height.'),C('Which length is the height used in parallelogram area?','The perpendicular distance between the parallel bases',['Always the slanted side','The longer diagonal','Half the perimeter'],'The shear changes the slanted edge but not the perpendicular height.')]
    elif slug=='volume':
        q=[N(f'A rectangular prism is {a} by {b} by {n}. Find its volume.',a*b*n,'Multiply base area by perpendicular height.'),N(f'Find the surface area of a {a} by {b} by {n} rectangular prism.',2*(a*b+a*n+b*n),'Add the three pairs of equal opposite faces.'),C('A cone and cylinder share the same base and perpendicular height. The cone has…','One third of the cylinder’s volume',['The same volume','Three times the volume','Half the volume'],'The cone volume is Bh/3.')]
    elif slug=='coordinate-geometry':
        q=[N(f'Find the distance from (1, 2) to ({1+3*a}, {2+4*a}).',5*a,'Horizontal change is 3a and vertical change is 4a; use Pythagoras.'),N(f'Find the x-coordinate of the midpoint of ({a}, 2) and ({a+2*n}, 8).',a+n,'Average the two x-coordinates independently.'),C('Two points have the same x-coordinate and different y-coordinates. Their line’s slope is…','Undefined',['Zero','One','The difference of the y-coordinates'],'Horizontal change is zero, so the slope quotient would divide by zero.')]
    elif slug=='proof':
        q=[C('AB=AC. D is the midpoint of BC. What third side fact helps prove ABD and ACD congruent?','AD=AD',['AB=BC','AD=BC','Angle A=90°'],'The triangles share AD; this is the reflexive equality.'),C('After SSS proves two triangles congruent, why can their corresponding angles be declared equal?','Congruence preserves corresponding angles',['They look equal','Every triangle is equilateral','The sides add to 180°'],'A justified congruence transfers matching lengths and angles.'),C('Which disproves “every rectangle is a square”?','A 3 by 5 rectangle',['Ten examples of squares','A triangle with equal sides','A drawing with no measurements'],'One valid counterexample disproves a universal claim.')]
    elif slug=='center':
        vals=[a,a,a+2,a+4,a+9];q=[N(f'Find the mean of {", ".join(map(str,vals))}.',sum(vals)/5,'Add all five values and divide by five.'),N(f'Find the median of {vals[-1]}, {vals[0]}, {vals[3]}, {vals[1]}, {vals[2]}.',a+2,'Sort the observations, then take the middle one.'),C('Only the largest value increases greatly. What happens to this five-value data set?','The mean increases; the median stays the same',['Both must stay the same','The median increases more than the mean','The mean decreases'],'The mean uses magnitude; the middle ordered position is unchanged.')]
    elif slug=='variance':
        d=a;q=[N(f'Treat {n-d}, {n}, {n+d} as a population. Find its variance.',2*d*d/3,'Deviations are −d, 0, d. Divide their squared sum by 3.'),N(f'Treat {n-d}, {n}, {n+d} as a sample. Find the usual sample variance.',d*d,'Divide the squared sum by n−1=2 when estimating population variance.'),C('Why do we square deviations before averaging them?','Signed deviations cancel, hiding spread',['It makes all data values positive','Variance must equal the mean','It removes every outlier'],'Positive and negative deviations from the mean sum to zero.')]
    elif slug=='standard-deviation':
        q=[N(f'Variance is {n*n} cm². Find standard deviation in cm.',n,'The positive square root returns the original units.'),N(f'Standard deviation is {a}. Every value is transformed by y=−{n}x+7. Find the new standard deviation.',a*n,'Shifting leaves spread unchanged; scaling uses the absolute factor.'),C('Does about 68% within one standard deviation apply to every distribution?','No; that familiar rule assumes an approximately normal shape',['Yes, by definition','Only when the mean is zero','Only when variance equals one'],'Standard deviation alone does not describe distribution shape.')]
    elif slug=='distributions':
        q=[N(f'Three histogram bins have counts {a}, {b}, {n}. Find the total count.',a+b+n,'Every observation belongs to one bin; add the frequencies.'),N(f'A bin contains {a} of {a+b} observations. Enter its relative frequency as a fraction or decimal.',a/(a+b),'Divide the bin count by total count; do not average the counts.'),C('Most observations are low, with a long tail toward high values. This distribution is…','Right-skewed',['Left-skewed','Necessarily normal','Necessarily uniform'],'Skew is named for the direction of the long tail.')]
    elif slug=='correlation':
        q=[C('Which indicates stronger linear association?','r = −0.93',['r = 0.41','r = 0.06','r = −0.20'],'Strength depends on |r|; the sign gives direction.'),C('A scatterplot forms a clear U shape but r is near zero. What follows?','Linear correlation misses the curved relationship',['There is no relationship','The measurements must be wrong','x causes y'],'Pearson correlation summarizes linear association.'),C('Ice cream sales and swimming both increase in hot weather. Does correlation establish one causes the other?','No; temperature may influence both',['Yes, because both increase','Yes, if r is positive','No, because correlation is always zero'],'A common cause can create association without the claimed causal link.')]
    elif slug=='probability':
        r=a;blue=b-3;total=r+blue;q=[N(f'A bag has {r} red and {blue} blue balls. Draw two without replacement. Find P(two red).',r/total*(r-1)/(total-1),'Multiply P(first red) by P(second red given the first).'),N(f'A bag has {r} red and {blue} blue balls. Find P(at least one red in two draws without replacement).',1-blue/total*(blue-1)/(total-1),'Exclude the complementary event of drawing two blues.'),C('For two coin tosses, which outcomes mean exactly one head?','HT and TH',['HH, HT, and TH','HH only','HT only'],'Exactly one excludes both HH and TT; at least one would include HH.')]
    elif slug=='quadratics':
        q=[N(f'For y=(x−{a})²−{n}, give the vertex’s x-coordinate.',a,'Vertex form y=(x−h)²+k has vertex (h,k).'),N(f'Solve (x−{a})²={n*n}. Enter the SMALLER root.',a-n,'Both x−a=+n and x−a=−n are needed.'),C('For real coefficients, a negative discriminant means…','No real roots',['Two real roots','One repeated real root','The leading coefficient is zero'],'b²−4ac<0 has no real square root.')]
    elif slug=='polynomials':
        even=2*rng.randint(1,3);odd=2*rng.randint(0,2)+1
        q=[N(f'What is the degree of (x−{a})^{even}(x+{b})^{odd}?',even+odd,'Degrees add when multiplying these nonzero factors.'),N(f'For (x−{a})²(x+{b})³, give the zero where the graph crosses the axis.',-b,'The odd-multiplicity root crosses; the even-multiplicity root touches.'),C('What is the end behavior of −2x⁴+x?','Both ends go down',['Both ends go up','Left down, right up','Left up, right down'],'Even degree gives matching ends; a negative leading coefficient sends them down.')]
    elif slug=='rational-functions':
        q=[N(f'For (x²−{a*a})/(x−{a}), give the excluded x-value.',a,'The original denominator is zero there, even after cancellation.'),N(f'For (x²−{a*a})/(x−{a}), the graph follows y=x+{a} except at x={a}. What is the hole’s y-coordinate?',2*a,'Evaluate the simplified line at the excluded input; the original point remains missing.'),C('An excluded value cancels out while simplifying. Is it restored to the original domain?','No; the original expression is still undefined there',['Yes, cancellation restores it','Only if it is positive','Only if it is zero'],'Equivalent simplification agrees on the original domain only.')]
    elif slug=='radicals':
        q=[N(f'Evaluate the principal square root of {n*n}.',n,'The radical symbol denotes the nonnegative principal root.'),N(f'Solve √(x+{n*(n-1)})=x. Enter the valid real solution.',n,'Squaring gives candidates n and 1−n; only n has nonnegative right side.'),C('After squaring an equation, what must be done with candidate solutions?','Check them in the original equation',['Accept every candidate','Discard all negative candidates in every problem','Square again until only one remains'],'Squaring can introduce extraneous candidates; the original equation decides validity.')]
    elif slug=='complex-numbers':
        q=[N(f'What is the real part of ({a}+i)(2−i)?',2*a+1,'Distribute and replace i² with −1.'),N(f'Multiply {a}+{b}i by i. Give the new real part.',-b,'i(a+bi)=−b+ai, a quarter-turn counterclockwise.'),C('Which lists all complex solutions to x²=−9?','3i and −3i',['3 and −3','3i only','−3i only'],'Both signs square to −9.')]
    elif slug=='exponentials':
        decrease=rng.randint(12,45);factor=(100-decrease)/100
        q=[N(f'An amount starts at {n} and doubles each step. Find its value after {a} steps.',n*2**a,'Use initial value times 2 to the number of steps.'),N(f'A model uses the factor {factor:.2f} each month. Enter the monthly percent decrease as a number.',decrease,f'1−{factor:.2f}={decrease/100:.2f}, or {decrease}%.'),C('Which distinguishes exponential growth from linear growth?','Equal time steps multiply by a fixed factor',['Equal time steps add a fixed amount','Every graph is a straight line','The initial value must be one'],'A constant ratio distinguishes exponential change from a constant difference.')]
    elif slug=='logarithms':
        q=[N(f'Evaluate log₂({2**a}).',a,'A logarithm asks which exponent gives the argument.'),N(f'Solve log₂(x−{n})={a}.',n+2**a,'Rewrite as x−n=2^a; the argument is positive at this solution.'),C('For positive x and y, which identity is valid?','log(xy)=log(x)+log(y)',['log(x+y)=log(x)+log(y)','log(xy)=log(x)log(y)','log(x/y)=log(y)−log(x)'],'Multiplying same-base powers adds exponents, giving the product rule.')]
    elif slug=='sequences':
        q=[N(f'An arithmetic sequence has first term {a} and common difference {n}. Find its sixth term.',a+5*n,'Index 1 is the start; there are five additions to reach term 6.'),N(f'A geometric sequence starts at {a} and doubles. Find its fifth term.',16*a,'There are four multiplications from a₁ to a₅.'),C('What must accompany a recursive rule to specify a particular sequence?','An initial value',['A graph with no scale','A constant ratio in every case','A positive common difference'],'A recursion needs a starting value, and higher-order recursions may need more than one.')]
    elif slug=='series':
        q=[N(f'Find the sum 1+2+…+{2*n}.',n*(2*n+1),'Pair first and last terms: n pairs, each equal to 2n+1.'),N(f'Find {a}+{a}/2+{a}/4+… to infinity.',2*a,'The ratio is 1/2, so the sum is a/(1−1/2)=2a.'),C('When is a/(1−r) valid as the sum of a nonzero infinite geometric series?','When |r|<1',['Whenever r≠1','Whenever r>0','For every real r'],'The powers rⁿ must tend to zero, requiring |r|<1.')]
    elif slug=='bridge':
        q=[N(f'If f(x)=2x−1, find f({n}).',2*n-1,'Replace the input x by the given number.'),C('Which is the expansion of (x+4)²?','x²+8x+16',['x²+16','x²+4x+16','2x+8'],'Multiply (x+4)(x+4); the two cross terms add to 8x.'),C('If f(x)=3x+1, which equals f(t+2)?','3t+7',['3t+3','t=−7/3','3t+1'],'The whole input t+2 replaces x: 3(t+2)+1=3t+7.')]
    else:raise KeyError(slug)
    slots=[i for i,item in enumerate(q) if item['kind']=='choice']
    pool=[q[i] for i in slots]+[C(p,c,[w1,w2],why) for p,c,w1,w2,why in VARIANTS.get(slug,[])]
    for i,item in zip(slots,rng.sample(pool,len(slots))):q[i]=item
    for i,item in enumerate(q):
        item['id']=f'{slug}-{seed}-{i+1}';item['objective_index']=i
        if item['kind']=='choice':rng.shuffle(item['options'])
    return q

def public(q):
    # Local import: visual parsing uses the same bounded number parser below.
    from answer_visuals import prepare_question
    result = {k:v for k,v in q.items() if k not in ('answer','display_answer','explanation','hint','tolerance')}
    result['visual'] = prepare_question(q, q.get('topic_id', ''))
    return result

def parse_number(value):
    s=str(value).strip().lower().replace('π','pi').replace('−','-').replace('^','**')
    s=re.sub(r'(?<=\d)(?=pi|sqrt)', '*',s)
    if len(s)>120:raise ValueError('Use a short numerical expression.')
    tree=ast.parse(s,mode='eval')
    def calc(node):
        if isinstance(node,ast.Expression):return calc(node.body)
        if isinstance(node,ast.Constant) and type(node.value) in (int,float):return float(node.value)
        if isinstance(node,ast.Name) and node.id=='pi':return math.pi
        if isinstance(node,ast.UnaryOp) and isinstance(node.op,(ast.UAdd,ast.USub)):return calc(node.operand)*(1 if isinstance(node.op,ast.UAdd) else -1)
        if isinstance(node,ast.Call) and isinstance(node.func,ast.Name) and node.func.id=='sqrt' and len(node.args)==1 and not node.keywords:return math.sqrt(calc(node.args[0]))
        if isinstance(node,ast.BinOp):
            x,y=calc(node.left),calc(node.right)
            if abs(x)>1e12 or abs(y)>1e12:raise ValueError('Number too large.')
            if isinstance(node.op,ast.Add):return x+y
            if isinstance(node.op,ast.Sub):return x-y
            if isinstance(node.op,ast.Mult):return x*y
            if isinstance(node.op,ast.Div):return x/y
            if isinstance(node.op,ast.Pow) and abs(y)<=20:return x**y
        raise ValueError('Use numbers, fractions, pi, sqrt(), and arithmetic only.')
    x=calc(tree)
    if not isinstance(x,(int,float)) or not math.isfinite(x):raise ValueError('Enter a finite real number.')
    return x

def grade(q,value):
    if q['kind']=='choice':return str(value)==q['answer']
    try:return math.isclose(parse_number(value),q['answer'],rel_tol=q['tolerance'],abs_tol=q['tolerance'])
    except (ValueError,TypeError,ZeroDivisionError,OverflowError,SyntaxError,RecursionError):return False
