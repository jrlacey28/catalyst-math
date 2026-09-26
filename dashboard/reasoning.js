// Curated, worked examples. This is supported practice, not a symbolic algebra engine
// or an independent assessment. Domain restrictions travel with every rewrite.
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const step=(expression,rule,why,domain='All real x.')=>({expression,rule,why,domain});
const quiz=(prompt,answers,correct,feedback)=>({prompt,answers,correct,feedback});
const prereq=(id,label)=>({id,label});

export const reasoningCatalog=[
 {id:'fractions',title:'Make the pieces the same size',short:'Common denominators',symbol:'⅓',level:'Arithmetic → algebra',topicId:'arithmetic.fractions',topicIds:['arithmetic.fractions','algebra-2.rational-functions'],lead:'A denominator names the size of a piece. Add the counts only after the pieces match.',prerequisites:[prereq('arithmetic.fractions','Fractions'),prereq('pre-algebra.expressions','Expressions')],examples:[
  {id:'numeric-fractions',label:'Start simple',goal:'Add 1/2 and 1/3 without changing either amount.',steps:[
   step('1/2 + 1/3','Name the pieces','One half and one third are different-size pieces. We need a shared unit.','The denominators 2 and 3 are nonzero.'),
   step('3/6 + 2/6','Multiply by one','1/2 × 3/3 = 3/6 and 1/3 × 2/2 = 2/6. Each multiplier equals one, so the values stay the same.','The new denominator 6 is nonzero.'),
   step('(3 + 2)/6','Count the sixths','Both terms now count sixths. Three sixths plus two sixths is five sixths; the piece size stays fixed.','Denominator: 6.'),
   step('5/6','Simplify the count','We added the numerators because they count the same unit. We did not add the denominators.','Denominator: 6.')
  ],prediction:quiz('Which rewrite preserves 1/2 while changing its denominator to 6?',['3/6','1/6','2/6'],0,['Yes. Multiply both numerator and denominator by 3: 3/3 is one.','This makes the pieces smaller without increasing their count. The value is only one third of the original.','2/6 is 1/3. The multiplier must turn 2 into 6, so use 3 in both places.'])},
  {id:'algebraic-fractions',label:'Add complexity',goal:'Use the same rule when the piece sizes depend on x.',steps:[
   step('2/(x + 1) + 3/(x − 1)','Record the restrictions','Each original denominator must be nonzero. Record x ≠ −1 and x ≠ 1 before changing the expression.','x ≠ −1 and x ≠ 1.'),
   step('2(x − 1)/[(x + 1)(x − 1)]\n+ 3(x + 1)/[(x + 1)(x − 1)]','Multiply by one','Multiply the first term by (x − 1)/(x − 1) and the second by (x + 1)/(x + 1). On the original domain, both multipliers equal one.','x ≠ −1 and x ≠ 1.'),
   step('[2(x − 1) + 3(x + 1)]\n/ [(x + 1)(x − 1)]','Combine equal units','The denominators match, so add the entire numerators. Keep parentheses until distribution is complete.','x ≠ −1 and x ≠ 1.'),
   step('(2x − 2 + 3x + 3)/(x² − 1)','Distribute and multiply','2(x − 1) = 2x − 2, and 3(x + 1) = 3x + 3. The denominator is a difference of squares.','x ≠ −1 and x ≠ 1.'),
   step('(5x + 1)/(x² − 1)','Collect like terms','Combine 2x with 3x, and −2 with 3. A shorter formula keeps all the original restrictions.','x ≠ −1 and x ≠ 1.')
  ],prediction:quiz('What must multiply the numerator 2 when its denominator changes from x + 1 to (x + 1)(x − 1)?',['x − 1','x + 1','Nothing; only denominators change'],0,['Exactly. Multiply top and bottom by the same nonzero factor x − 1.','That would create (x + 1)² in the denominator. Look at the missing factor instead.','Changing only the denominator changes the value. The numerator needs the same multiplier.'])}
 ],trap:quiz('Which proposed addition is invalid?',['1/2 + 1/2 = 2/4','1/2 + 1/2 = 2/2','1/2 + 1/3 = 3/6 + 2/6'],0,['Correct diagnosis. Two halves make one, while 2/4 is only one half. Denominators are not counts to add.','This is valid: one half plus one half is two halves, which equals one.','This is valid: both fractions were multiplied by one to count sixths.'])},

 {id:'distribute',title:'Every term gets a turn',short:'Expand expressions',symbol:'( )²',level:'Pre-algebra → Algebra I',topicId:'algebra-1.polynomials',topicIds:['pre-algebra.expressions','algebra-1.polynomials'],lead:'Parentheses describe structure. Expanding means multiplying every required pair, then collecting matching terms.',prerequisites:[prereq('pre-algebra.expressions','Expressions'),prereq('algebra-1.polynomials','Polynomials')],examples:[
  {id:'single-distribution',label:'Start simple',goal:'Keep track of both products in 3(x − 2).',steps:[
   step('3(x − 2)','See the two terms','The factor 3 multiplies the entire quantity x − 2. The terms inside are x and −2.'),
   step('3·x + 3·(−2)','Distributive property','Multiplication distributes over addition. Thinking of subtraction as adding a negative helps preserve the sign.'),
   step('3x − 6','Evaluate each product','3 times x is 3x; 3 times −2 is −6. Nothing was moved across an equals sign—we rewrote one expression.')
  ],prediction:quiz('Expand −2(x − 4).',['−2x + 8','−2x − 4','−2x − 8'],0,['Yes. −2 multiplies both terms, and (−2)(−4) = +8.','The second term also needs multiplication by −2. It cannot stay −4.','The second product has two negative factors, so it is positive.'])},
  {id:'binomial-square',label:'Add complexity',goal:'Find where the middle term of (x + 2)² comes from.',steps:[
   step('(x + 2)²','Read the exponent','Squaring means multiplying the whole expression by itself. It does not mean squaring each term separately.'),
   step('(x + 2)(x + 2)','Write the two factors','There are two terms in each factor, so expansion requires four products.'),
   step('x(x + 2) + 2(x + 2)','Distribute the first factor','Both x and 2 multiply the entire second factor.'),
   step('x² + 2x + 2x + 4','Distribute again','The four products are x·x, x·2, 2·x, and 2·2. The middle two are separate contributions.'),
   step('x² + 4x + 4','Collect like terms','The two cross-products combine to 4x. They are the part missing from the tempting shortcut x² + 4.')
  ],prediction:quiz('What is the coefficient of x in the expansion of (x + 2)²?',['4','2','0'],0,['Yes. There are two cross-products, 2x + 2x = 4x.','That counts only one cross-product. Each factor contributes a 2.','The cross-products do not disappear. Write (x + 2)(x + 2) to see them.'])}
 ],trap:quiz('Which expansion is invalid?',['(x + 2)² = x² + 4','3(x − 2) = 3x − 6','x(x + 2) = x² + 2x'],0,['Correct diagnosis. At x = 1, the left side is 9 but the proposed right side is 5. The 4x cross-term is missing.','This is valid: 3 multiplies both x and −2.','This is valid: x multiplies both terms in the parentheses.'])},

 {id:'cancel',title:'Cancel factors, keep the restrictions',short:'Factoring & cancellation',symbol:'÷',level:'Algebra I → Algebra II',topicId:'algebra-2.rational-functions',topicIds:['algebra-1.factoring','algebra-2.rational-functions'],lead:'Cancellation is division by a shared nonzero factor. A piece of a sum is not a factor of the whole sum.',prerequisites:[prereq('algebra-1.factoring','Factoring'),prereq('algebra-2.rational-functions','Rational functions')],examples:[
  {id:'difference-of-squares',label:'Start simple',goal:'Simplify a quotient while preserving a missing input.',steps:[
   step('(x² − 9)/(x − 3)','Check the denominator','The original expression has no value at x = 3. Simplifying later cannot change that original fact.','x ≠ 3.'),
   step('[(x − 3)(x + 3)]/(x − 3)','Factor the whole numerator','x² − 9 is a difference of squares: (x − 3)(x + 3). Now x − 3 is visibly a factor of the entire numerator.','x ≠ 3.'),
   step('[(x − 3)/(x − 3)](x + 3)','Group the shared factor','Division and multiplication let us group the common factor. Since x ≠ 3, this ratio equals one.','x ≠ 3.'),
   step('x + 3, with x ≠ 3','Cancel a nonzero factor','The formulas agree everywhere the original was defined. The unrestricted line x + 3 has an extra point; the original graph has a hole at (3, 6).','Keep x ≠ 3, even though the new formula has no denominator.')
  ],prediction:quiz('What is the original expression (x² − 9)/(x − 3) at x = 3?',['Undefined','6','0'],0,['Yes. Its original denominator is zero. The nearby values approach 6, but the original value is missing.','6 is the value of the extended line x + 3. It is not the value of the original quotient at its excluded input.','0/0 is undefined; it is not zero. Both numerator and denominator vanish here.'])},
  {id:'two-quadratics',label:'Add complexity',goal:'Track two original exclusions while removing one visible factor.',steps:[
   step('(x² + 5x + 6)/(x² + x − 2)','Find the original exclusions','Factor the denominator to locate its zeros. x² + x − 2 = (x + 2)(x − 1), so exclude −2 and 1.','x ≠ −2 and x ≠ 1.'),
   step('[(x + 2)(x + 3)]/[(x + 2)(x − 1)]','Factor numerator and denominator','The numerator factors because 2 + 3 = 5 and 2·3 = 6. The denominator uses 2 and −1.','x ≠ −2 and x ≠ 1.'),
   step('(x + 3)/(x − 1)','Divide by the common factor','x + 2 is nonzero on the original domain. Cancelling it does not authorize the formerly missing input −2.','Keep x ≠ −2 and x ≠ 1.'),
   step('At x = −2: original undefined\nSimplified extension: −1/3','Distinguish equality from extension','The formula (x + 3)/(x − 1) alone would accept −2. Pair it with the original restrictions to describe the same function.','x = −2 remains a hole; x = 1 remains excluded.')
  ],prediction:quiz('Which restrictions must accompany the simplified formula?',['x ≠ −2 and x ≠ 1','Only x ≠ 1','Only x ≠ −2'],0,['Correct. Domain restrictions come from the original expression and survive cancellation.','The cancelled factor leaves a hole at x = −2. Keep that exclusion too.','The denominator x − 1 still excludes 1. Both original restrictions remain.'])}
 ],trap:quiz('Which proposed cancellation is invalid?',['(x + 3)/x = 3, for x ≠ 0','x(x + 3)/x = x + 3, for x ≠ 0','(2x + 6)/2 = x + 3'],0,['Correct diagnosis. x + 3 is a sum, not x times 3. In fact (x + 3)/x = 1 + 3/x. At x = 3, the original is 2.','This is valid: x is a factor of the whole numerator, and the stated domain makes it nonzero.','This is valid: factor 2 from the entire numerator, or divide both terms by 2.'])},

 {id:'rationalize',title:'A conjugate makes a difference of squares',short:'Rationalization',symbol:'√',level:'Algebra II → limits',topicId:'algebra-2.radicals',topicIds:['algebra-2.radicals','calculus-1.limits'],lead:'A carefully chosen form of one can remove a square root from a difference. Keep the original domain throughout.',prerequisites:[prereq('algebra-2.radicals','Radicals'),prereq('algebra-1.factoring','Factoring')],examples:[
  {id:'numeric-conjugate',label:'Start simple',goal:'Rewrite 1/(√5 − 2) using its conjugate.',steps:[
   step('1/(√5 − 2)','Notice the difference','The conjugate of √5 − 2 is √5 + 2. Their product is a difference of squares.','√5 − 2 and √5 + 2 are both nonzero.'),
   step('(√5 + 2)/[(√5 − 2)(√5 + 2)]','Multiply by one','We multiply numerator and denominator by the same nonzero expression √5 + 2, so the fraction keeps its value.','All quantities here are fixed real numbers.'),
   step('(√5 + 2)/(5 − 4)','Use the conjugate product','The opposite cross-terms cancel: (a − b)(a + b) = a² − b². Here (√5)² = 5.','Denominator: 1.'),
   step('√5 + 2','Divide by one','The denominator has become 1. This is an exact rewrite, not a decimal approximation.','No variable restrictions are needed.')
  ],prediction:quiz('Which multiplier equals one and rationalizes 1/(√5 − 2)?',['(√5 + 2)/(√5 + 2)','√5 + 2','(√5 − 2)/(√5 + 2)'],0,['Yes. The same nonzero conjugate goes on top and bottom.','Multiplying by only the numerator changes the value. You need the same factor in the denominator.','The numerator and denominator are different, so this multiplier is not one.'])},
  {id:'radical-limit-algebra',label:'Add complexity',goal:'Prepare (√(x + 1) − 1)/x for a later limit.',steps:[
   step('(√(x + 1) − 1)/x','Record both restrictions','For real square roots, x + 1 ≥ 0. The original denominator also requires x ≠ 0.','x ≥ −1 and x ≠ 0.'),
   step('[(√(x + 1) − 1)(√(x + 1) + 1)]\n/ [x(√(x + 1) + 1)]','Multiply by the conjugate ratio','√(x + 1) + 1 is at least 1 on this domain, so dividing by it is safe. Its ratio with itself equals one.','x ≥ −1 and x ≠ 0.'),
   step('[(x + 1) − 1]/[x(√(x + 1) + 1)]','Difference of squares','The numerator is (√(x + 1))² − 1². Squaring the real square root returns x + 1.','x ≥ −1 and x ≠ 0.'),
   step('x/[x(√(x + 1) + 1)]','Combine constants','The +1 and −1 cancel as terms in a sum, leaving x as a factor of the whole numerator.','x ≥ −1 and x ≠ 0.'),
   step('1/(√(x + 1) + 1)','Cancel a nonzero factor','x/x = 1 because the original domain excludes zero. The new formula has a value 1/2 at zero, but the original still does not.','Keep x ≥ −1 and x ≠ 0.')
  ],prediction:quiz('Why is multiplying by (√(x + 1) + 1)/(√(x + 1) + 1) safe on the original domain?',['Its denominator is at least 1, so the ratio is one.','Every expression divided by itself is one, even at zero.','Square roots can always be cancelled.'],0,['Yes. The square root is nonnegative, so adding 1 makes a nonzero denominator.','A zero divided by itself is undefined. We must first know this denominator is nonzero.','There is no general rule to cancel square roots across sums. The conjugate works because its ratio equals one.'])}
 ],trap:quiz('Which square-root rewrite is invalid?',['√(9 + 16) = √9 + √16','√(9·16) = √9·√16','(√5 − 2)(√5 + 2) = 1'],0,['Correct diagnosis. The left side is 5; the proposed right side is 7. Square roots do not distribute over addition.','This is valid for these nonnegative factors: both sides equal 12.','This is valid: the product is 5 − 4 = 1.'])},

 {id:'roots',title:'A square root returns a nonnegative number',short:'Roots, powers & signs',symbol:'|x|',level:'Arithmetic → Algebra II',topicId:'algebra-2.radicals',topicIds:['arithmetic.exponents','arithmetic.roots','algebra-2.radicals'],lead:'Roots and powers follow rules with conditions. A square hides a sign; the principal square root cannot recover it.',prerequisites:[prereq('arithmetic.exponents','Exponents'),prereq('arithmetic.roots','Roots'),prereq('algebra-2.radicals','Radicals')],examples:[
  {id:'root-of-square',label:'Start simple',goal:'Understand why √(x²) is |x|, not always x.',steps:[
   step('√(x²)','Start with the principal root','x² is nonnegative for every real x. The symbol √ asks for its nonnegative square root.'),
   step('|x|','Preserve the sign condition','Both x and −x square to x². Exactly one is nonnegative (or both are zero), and |x| selects that value.'),
   step('x if x ≥ 0\n−x if x < 0','Unpack absolute value','For a negative x, −x is positive. This piecewise expression says the same thing as |x|.'),
   step('x = −3: √((−3)²) = 3','Test a negative input','Squaring gives 9 and the principal square root is 3. A single negative input exposes the mistake in claiming √(x²) = x for all real x.')
  ],prediction:quiz('If x = −4, what is √(x²)?',['4','−4','Both 4 and −4'],0,['Yes. The principal square root of 16 is 4.','−4 squares to 16, but the principal root is the nonnegative one.','The equation y² = 16 has two solutions. The expression √16 names only the nonnegative one.'])},
  {id:'nested-signs',label:'Add complexity',goal:'Simplify √(x²(x − 1)²) without losing sign information.',steps:[
   step('√(x²(x − 1)²)','Recognize squared factors','Both factors inside the square root are nonnegative. The whole radicand is the square of x(x − 1).'),
   step('√([x(x − 1)]²)','Combine the squares','a²b² = (ab)². This exponent rule is valid for all real a and b.'),
   step('|x(x − 1)|','Take the principal root','The square root of a real expression squared is its absolute value, even when the expression is a product.'),
   step('|x|·|x − 1|','Separate magnitudes','The absolute value of a product equals the product of absolute values. No sign assumptions have been added.')
  ],prediction:quiz('At x = 1/2, x(x − 1) = −1/4. What is √([x(x − 1)]²)?',['1/4','−1/4','1/16'],0,['Yes. Squaring gives 1/16, and its principal square root is 1/4.','The square root cannot be negative. Keep the absolute value around the product.','That is the squared quantity before taking its square root.'])},
  {id:'fractional-powers',label:'Connect exponents',goal:'Combine fractional powers only where they are real and the denominator is nonzero.',steps:[
   step('(x^(1/2) · x^(3/2))/x','Establish a safe domain','The real square root requires x ≥ 0, and the denominator excludes zero. Together these give x > 0.','x > 0.'),
   step('x^(1/2 + 3/2)/x','Add exponents of a shared base','For this positive base, multiplying powers of x adds their exponents. The exponents need their own ordinary fraction arithmetic.','x > 0.'),
   step('x²/x','Add the fractions','1/2 + 3/2 = 4/2 = 2. The denominator x remains.','x > 0.'),
   step('x','Subtract exponents, or cancel x','x²/x = x because x is nonzero. This simpler formula remains restricted to positive x when representing the original.','Keep x > 0.')
  ],prediction:quiz('What is the original real domain of (x^(1/2) · x^(3/2))/x?',['x > 0','Every real x','x ≥ 0'],0,['Yes. Square roots exclude negative inputs, and division by x excludes zero.','The real half-powers are not defined for negative x.','Zero satisfies the root condition but makes the original denominator zero.'])}
 ],trap:quiz('Which statement is invalid over all real x?',['√(x²) = x','√(x²) = |x|','(x²)³ = x⁶'],0,['Correct diagnosis. x = −1 gives 1 on the left and −1 on the right. The missing absolute value matters.','This is valid: the principal root returns the magnitude of x.','This is valid: a power of a power multiplies these integer exponents.'])},

 {id:'trig',title:'Identities change the form, not the domain',short:'Trigonometric identities',symbol:'sin',level:'Trigonometry → calculus',topicId:'trigonometry.identities',topicIds:['trigonometry.identities','algebra-2.rational-functions'],lead:'An identity can reveal a factor to cancel. The denominator still decides which angles are allowed.',prerequisites:[prereq('trigonometry.identities','Trig identities'),prereq('algebra-2.rational-functions','Rational functions')],examples:[
  {id:'pythagorean-identity',label:'Start simple',goal:'Reveal a factor by using sin²θ + cos²θ = 1.',steps:[
   step('(1 − cos²θ)/sinθ','Record the excluded angles','The denominator is zero at integer multiples of π. All angles here are in radians.','θ is real; θ ≠ kπ for every integer k.'),
   step('sin²θ/sinθ','Use a Pythagorean identity','sin²θ + cos²θ = 1, so subtracting cos²θ gives 1 − cos²θ = sin²θ.','θ ≠ kπ for every integer k.'),
   step('(sinθ·sinθ)/sinθ','Expose a product','The numerator is the product of two identical factors. Now one factor sinθ matches the denominator.','θ ≠ kπ for every integer k.'),
   step('sinθ','Cancel the nonzero factor','sinθ is nonzero on the original domain. The simplified sine formula still carries the original exclusions.','Keep θ ≠ kπ for every integer k.')
  ],prediction:quiz('At θ = 0, what is the value of the original expression (1 − cos²θ)/sinθ?',['Undefined','0','1'],0,['Yes. The denominator sin0 is zero. The simplified sine formula does not fill the original missing value.','The simplified extension sinθ equals zero there, but the original expression is 0/0.','The denominator is zero, so no real quotient exists there.'])},
  {id:'trig-conjugate',label:'Add complexity',goal:'Use the same conjugate idea you used with radicals.',steps:[
   step('(1 − cosθ)/sinθ','Record the original domain','sinθ cannot be zero. Therefore θ is not any integer multiple of π.','θ is real; θ ≠ kπ for every integer k.'),
   step('[(1 − cosθ)(1 + cosθ)]/[sinθ(1 + cosθ)]','Multiply by one','On the original domain, 1 + cosθ is nonzero: cosθ = −1 occurs only at odd multiples of π, which are already excluded.','θ ≠ kπ for every integer k.'),
   step('(1 − cos²θ)/[sinθ(1 + cosθ)]','Difference of squares','The conjugate product removes the middle terms. This is ordinary algebra with cosθ as the quantity being squared.','θ ≠ kπ for every integer k.'),
   step('sin²θ/[sinθ(1 + cosθ)]','Apply the identity','Replace 1 − cos²θ with sin²θ. Now numerator and denominator share an entire factor sinθ.','θ ≠ kπ for every integer k.'),
   step('sinθ/(1 + cosθ)','Cancel and retain exclusions','Cancel sinθ only where it is nonzero. The final formula alone allows even multiples of π, but the original does not.','Keep θ ≠ kπ for every integer k.')
  ],prediction:quiz('Why can we cancel sinθ in the last step?',['The original domain already guarantees sinθ ≠ 0.','Trigonometric functions never equal zero.','We can cancel matching symbols even when they are zero.'],0,['Exactly. The original denominator supplies the condition needed for cancellation.','Sine is zero at multiples of π. Those angles must be excluded.','Cancellation divides by the factor. Division by zero is not allowed.'])}
 ],trap:quiz('For sinθ ≠ 0, which rewrite is invalid?',['(sinθ + cosθ)/sinθ = 1 + cosθ','(sinθ + cosθ)/sinθ = 1 + cosθ/sinθ','sin²θ/sinθ = sinθ'],0,['Correct diagnosis. The entire numerator is divided by sinθ. The cosine term still needs that denominator.','This is valid: divide each numerator term by the common denominator.','This is valid on the stated domain: cancel a nonzero sine factor.'])},

 {id:'difference-quotient',title:'Simplify nearby, then take the limit',short:'Difference quotients',symbol:'h→0',level:'Algebra → Calculus I',topicId:'calculus-1.derivatives',topicIds:['calculus-1.derivatives','calculus-1.limits','algebra-2.rational-functions'],lead:'A derivative needs algebra you already know. Keep h nonzero while simplifying; a limit asks what happens as h approaches zero.',prerequisites:[prereq('algebra-1.polynomials','Expansion'),prereq('algebra-2.rational-functions','Rational expressions'),prereq('calculus-1.limits','Limits')],examples:[
  {id:'square-difference-quotient',label:'Start simple',goal:'Find the slope of f(x) = x² at x = 2 from its definition.',steps:[
   step('[f(2 + h) − f(2)]/h','Two different inputs','This quotient compares the output change with the input change h. For a secant slope, those inputs must differ.','h ≠ 0.'),
   step('[(2 + h)² − 4]/h','Evaluate the function','f takes its entire input and squares it. f(2 + h) is (2 + h)², while f(2) is 4.','h ≠ 0.'),
   step('(4 + 4h + h² − 4)/h','Expand the binomial','The cross-products 2h + 2h make 4h. Expansion makes the constant cancellation visible.','h ≠ 0.'),
   step('h(4 + h)/h','Collect, then factor','The constants add to zero. Both remaining numerator terms share a factor h: 4h + h² = h(4 + h).','h ≠ 0.'),
   step('4 + h','Cancel away from zero','h/h equals one for nonzero h. We have not plugged zero into the original quotient.','This equality with the original quotient requires h ≠ 0.'),
   step('lim (h → 0) (4 + h) = 4','Now take the limit','For every nonzero h near zero, the quotient equals 4 + h. Those values approach 4, so f′(2) = 4. The limit does not require a value of the original quotient at h = 0.','Approach h = 0 through nonzero values; f′(2) exists.')
  ],prediction:quiz('Why is cancelling h allowed before taking the limit?',['We are simplifying for h ≠ 0, then studying the approach to zero.','h is already zero, so h/h = 1.','Limits let us ignore division by zero.'],0,['Yes. Equality on a punctured neighborhood is enough for this limit comparison.','0/0 is undefined. The order matters: simplify at nonzero h first.','Division by zero is still undefined. Limits reason about nearby values.'])},
  {id:'reciprocal-difference-quotient',label:'Add complexity',goal:'Use common denominators to differentiate f(x) = 1/x at x = 2.',steps:[
   step('[1/(2 + h) − 1/2]/h','Check every denominator','h cannot be zero, and 2 + h cannot be zero. Around h = 0, both function inputs stay in the domain.','h ≠ 0 and h ≠ −2.'),
   step('[(2 − (2 + h))/(2(2 + h))]/h','Find a common denominator','Rewrite 1/(2 + h) with numerator 2, and 1/2 with numerator 2 + h. Subtract the entire second numerator.','h ≠ 0 and h ≠ −2.'),
   step('[−h/(2(2 + h))]/h','Distribute the subtraction','2 − (2 + h) = 2 − 2 − h = −h. The parentheses prevent a sign error.','h ≠ 0 and h ≠ −2.'),
   step('−h/[2h(2 + h)]','Divide by h','Dividing a fraction by nonzero h is the same as multiplying by 1/h. That puts h in the denominator.','h ≠ 0 and h ≠ −2.'),
   step('−1/[2(2 + h)]','Cancel the shared h','Both numerator and denominator have the factor h. It is nonzero for this algebra step.','Keep h ≠ 0 and h ≠ −2 when equating to the original quotient.'),
   step('lim (h → 0) −1/[2(2 + h)] = −1/4','Take the limit of a continuous formula','The simplified formula has nonzero denominator at h = 0, so its limit is −1/4. Thus f′(2) = −1/4: the reciprocal decreases at this input.','The simplified formula is continuous near h = 0; the original quotient still excludes h = 0.')
  ],prediction:quiz('When subtracting the fractions, what is 2 − (2 + h)?',['−h','h','4 + h'],0,['Yes. Distribute the minus sign to both terms: 2 − 2 − h.','The minus sign also applies to h. It becomes −h.','Subtracting the entire parenthesis changes both signs; it is not addition.'])}
 ],trap:quiz('Which step in a derivative calculation is invalid?',['At h = 0, 0/0 = 0.','For h ≠ 0, h(4 + h)/h = 4 + h.','lim (h → 0) (4 + h) = 4.'],0,['Correct diagnosis. 0/0 is undefined. A limit can exist even though the original quotient has no value at zero.','This is valid with the stated nonzero condition.','This is valid by continuity of 4 + h.'])},

 {id:'chain-rule',title:'Follow a change through each layer',short:'The chain rule',symbol:'∘',level:'Functions → Calculus I',topicId:'calculus-1.chain-rule',topicIds:['calculus-1.chain-rule','calculus-1.derivatives'],lead:'First identify the inner function. A change in x changes the inside, which then changes the outside.',prerequisites:[prereq('precalculus.composite-functions','Composite functions'),prereq('calculus-1.derivatives','Derivatives')],examples:[
  {id:'linear-inside-square',label:'Start simple',goal:'Differentiate y = (3x + 1)² without losing the inner rate of change.',steps:[
   step('y = (3x + 1)²','Identify the layers','The inner operation makes 3x + 1. The outer operation squares that result.'),
   step('u = 3x + 1,   y = u²','Name the inside','A temporary name keeps the two jobs separate. We still want a derivative with respect to x, not u.'),
   step('dy/dx = (dy/du)(du/dx)','Chain rule','The outer rate dy/du is multiplied by the inner rate du/dx. This is a derivative rule; the notation is not permission to cancel arbitrary fractions.'),
   step('dy/dx = (2u)·3','Differentiate each layer','The derivative of u² with respect to u is 2u. The derivative of 3x + 1 with respect to x is 3.'),
   step('dy/dx = 6(3x + 1)','Substitute the original inside','Replace u with 3x + 1. The factor 3 accounts for how quickly the inner input changes.')
  ],prediction:quiz('Which factor is missing from 2(3x + 1) when differentiating (3x + 1)²?',['3','2','3x + 1'],0,['Yes. The inner function 3x + 1 has derivative 3.','The 2 already came from differentiating the outer square. We still need the inner derivative.','The inside has already been substituted into the outer derivative. Its derivative, not another copy of it, is needed.'])},
  {id:'square-inside-root',label:'Add complexity',goal:'Differentiate √(1 + x²), then justify the simplification.',steps:[
   step('y = √(1 + x²)','Check differentiability','The inner quantity is at least 1, so the square root is defined and differentiable for every real x.'),
   step('u = 1 + x²,   y = √u','Name the composition','The outer derivative is 1/(2√u) for u > 0. Our inside always satisfies that condition.'),
   step('dy/dx = [1/(2√u)]·2x','Multiply outer and inner rates','Use the derivative of the square root, then multiply by du/dx = 2x.'),
   step('dy/dx = 2x/[2√(1 + x²)]','Substitute and combine factors','Replace u with 1 + x² and express multiplication as a single quotient.'),
   step('dy/dx = x/√(1 + x²)','Cancel the constant factor 2','We divide numerator and denominator by 2, which is always nonzero. We did not divide by x, so x = 0 stays allowed.')
  ],prediction:quiz('Does the final simplification exclude x = 0?',['No. Only the nonzero constant 2 was cancelled.','Yes. Every cancellation excludes zero.','Yes. A derivative cannot be zero.'],0,['Exactly. x was never divided out, and √(1 + 0²) is 1. The derivative is defined and equals zero there.','The relevant question is which factor was divided out. Here it was 2, not x.','Derivatives can be zero; that means the instantaneous rate of change is zero.'])}
 ],trap:quiz('Which derivative is missing part of the chain rule?',['d/dx (x² + 1)³ = 3(x² + 1)²','d/dx (3x + 1)² = 6(3x + 1)','d/dx √(1 + x²) = x/√(1 + x²)'],0,['Correct diagnosis. The derivative also needs the inner factor 2x, giving 6x(x² + 1)².','This is valid: 2(3x + 1) times the inner derivative 3.','This is valid: multiply 1/(2√(1 + x²)) by 2x, then cancel 2.'])},

 {id:'product-rule',title:'Differentiate the structure, then simplify',short:'Product + chain rule',symbol:'uv',level:'Calculus I',topicId:'calculus-1.product-quotient-rule',topicIds:['calculus-1.product-quotient-rule','calculus-1.chain-rule','algebra-1.factoring'],lead:'A complicated derivative becomes manageable when you separate the calculus rule from the algebra that follows.',prerequisites:[prereq('calculus-1.product-quotient-rule','Product rule'),prereq('calculus-1.chain-rule','Chain rule'),prereq('algebra-1.factoring','Factoring')],examples:[
  {id:'small-product',label:'Start simple',goal:'Differentiate y = x²(x + 1), with two contributions.',steps:[
   step('y = x²(x + 1)','Find the main structure','The function is a product of x² and x + 1. Either factor changes when x changes.'),
   step('u = x²,   v = x + 1\ny′ = u′v + uv′','Product rule','One contribution changes the first factor while retaining the second. The other changes the second while retaining the first.'),
   step('y′ = 2x(x + 1) + x²·1','Differentiate each factor','u′ = 2x and v′ = 1. The unchanged factors must still appear in their corresponding terms.'),
   step('y′ = 2x² + 2x + x²','Distribute after differentiating','The calculus step is finished. Now ordinary algebra expands 2x(x + 1).'),
   step('y′ = 3x² + 2x','Combine like terms','2x² and x² are matching quadratic terms. You can check the result by expanding y to x³ + x² before differentiating.')
  ],prediction:quiz('For y = u·v, which rule includes both ways the product changes?',['y′ = u′v + uv′','y′ = u′v′','y′ = u′ + v′'],0,['Yes. Each contribution keeps the other factor, then the contributions are added.','Multiplying derivatives loses the unchanged factors. Try u = v = x: this would give 1 instead of 2x.','That is the rule for a sum, not a product. The original expression multiplies the functions.'])},
  {id:'product-chain-factor',label:'Add complexity',goal:'Differentiate x³(x² + 1)⁴ and explain the final factorization.',steps:[
   step('y = x³(x² + 1)⁴','Identify the outer structure','At the top level, two factors are multiplied. The second factor also contains a composition, so it will need the chain rule.'),
   step('u′ = 3x²\nv′ = 4(x² + 1)³·2x','Use a rule for each part','For u = x³ use the power rule. For v = (x² + 1)⁴, use the outer power derivative and multiply by the inner derivative 2x.'),
   step('y′ = 3x²(x² + 1)⁴\n+ 8x⁴(x² + 1)³','Apply the product rule','u′v gives the first term. uv′ gives x³·4(x² + 1)³·2x = 8x⁴(x² + 1)³. Add exponents when multiplying x³ by x.'),
   step('y′ = x²(x² + 1)³\n·[3(x² + 1) + 8x²]','Factor out the shared product','Both terms contain x² and three copies of x² + 1. The first leaves 3(x² + 1); the second leaves 8x². Expanding this form returns the previous line.'),
   step('y′ = x²(x² + 1)³(11x² + 3)','Simplify inside the brackets','3(x² + 1) + 8x² = 3x² + 3 + 8x² = 11x² + 3. Factoring rewrites the expression; it does not divide an equation by x², so x = 0 remains allowed.')
  ],prediction:quiz('When x²(x² + 1)³ is factored out of 3x²(x² + 1)⁴, what remains?',['3(x² + 1)','3','3x²(x² + 1)'],0,['Yes. Three of the four copies of x² + 1 go into the common factor, leaving one copy and the coefficient 3.','One copy of x² + 1 remains because the original has exponent 4 and the common factor has exponent 3.','The common factor already contains all of this term’s x², so no additional x² remains.'])}
 ],trap:quiz('Which proposed rule is invalid?',['d/dx [u(x)v(x)] = u′(x)v′(x)','d/dx [u(x) + v(x)] = u′(x) + v′(x)','d/dx [5u(x)] = 5u′(x)'],0,['Correct diagnosis. Use u′v + uv′. For u = v = x, the product is x² and its derivative is 2x, not 1.','This is the valid sum rule when both derivatives exist.','This is the valid constant-multiple rule when u is differentiable.'])}
];

// Vary the position of correct choices without making the worked examples random.
function rotateQuiz(q,amount){const n=q.answers.length,shift=amount%n;return {...q,answers:[...q.answers.slice(shift),...q.answers.slice(0,shift)],feedback:[...q.feedback.slice(shift),...q.feedback.slice(0,shift)],correct:(q.correct-shift+n)%n}}
reasoningCatalog.forEach((path,i)=>{path.examples.forEach((ex,j)=>ex.prediction=rotateQuiz(ex.prediction,i+j));path.trap=rotateQuiz(path.trap,i+1)});

export const reasoningPaths=Object.fromEntries(reasoningCatalog.map(p=>[p.id,{title:p.title,short:p.short,topicId:p.topicId,examples:p.examples.length}]));

// A directory never reveals a worked answer or sends an assistance event.
// Navigation uses real hash links; the host router owns browser Back / Forward.
function reasoningView(options={}){
 if(options.section==='live')return {kind:'live',path:reasoningCatalog.find(p=>p.id==='cancel')};
 const path=reasoningCatalog.find(p=>p.id===options.path);
 return path?{kind:'guide',path}:{kind:'directory',missing:!!options.path};
}
function createFlow(path,example=0){
 const index=Number(example);
 return {exampleIndex:Number.isFinite(index)?Math.max(0,Math.min(path.examples.length-1,Math.floor(index))):0,step:0,phase:'steps',prediction:null,misconception:null};
}
// Supported practice only. These transitions never record a pass or mastery.
function changeFlow(path,state,action){
 const ex=path.examples[state.exampleIndex],next={...state};
 if(action.type==='example')return createFlow(path,action.index);
 if(action.type==='restart')return {...next,phase:'steps',step:0};
 if(action.type==='answer'){
  if(!['prediction','misconception'].includes(state.phase))return state;
  const q=state.phase==='prediction'?ex.prediction:path.trap;
  if(!Number.isInteger(action.value)||action.value<0||action.value>=q.answers.length)return state;
  next[state.phase]=action.value;return next;
 }
 if(action.type==='previous'){
  if(state.phase==='steps')next.step=Math.max(0,state.step-1);
  else if(state.phase==='prediction'){next.phase='steps';next.step=ex.steps.length-1;}
  else if(state.phase==='misconception')next.phase='prediction';
  else if(state.phase==='complete')next.phase='misconception';
 }
 if(action.type==='next'){
  if(state.phase==='steps'){
   if(state.step<ex.steps.length-1)next.step++;
   else next.phase='prediction';
  }else if(state.phase==='prediction'&&state.prediction!==null)next.phase='misconception';
  else if(state.phase==='misconception'&&state.misconception!==null)next.phase='complete';
 }
 return next;
}
function directoryHTML(missing=false){
 return `<section class="reasoning rw-directory"><header class="rw-directory-heading"><div class="eyebrow">STEP GUIDES</div><h1>Why this step?</h1><p>Choose an idea. Follow one example, then try two short questions.</p>${missing?'<p class="rw-notice" role="status">That guide is not available. Choose one below.</p>':''}</header><nav class="rw-paths" aria-label="All step guides">${reasoningCatalog.map((p,i)=>`<a class="rw-path" data-rw-path="${p.id}" href="#reasoning/${p.id}" style="--rw-tint:${['#edf3e5','#eeeaf6','#e6f1f4'][i%3]};--rw-accent:${['#547a54','#80689c','#477e98'][i%3]}"><span class="rw-path-symbol" aria-hidden="true">${esc(p.symbol)}</span><span class="rw-path-label"><strong>${esc(p.short)}</strong><small>${esc(p.level)} · ${p.examples.length} examples</small></span><span class="rw-path-arrow" aria-hidden="true">→</span></a>`).join('')}</nav><p class="rw-footnote">Guided practice. No timer or score.</p></section>`;
}
function answerHTML(q,value){
 if(value===null)return '';
 return `<div class="rw-answer ${value===q.correct?'correct':''}"><strong>${value===q.correct?'Yes — here’s why.':'Take another look.'}</strong>${esc(q.feedback[value])}</div>`;
}
function flowHTML(path,state){
 const ex=path.examples[state.exampleIndex],s=ex.steps[state.step];
 if(state.phase==='steps')return `<section class="rw-step-card" aria-labelledby="rw-step-heading"><p class="rw-progress-note">Step ${state.step+1} of ${ex.steps.length}</p><h2 id="rw-step-heading" data-rw-focus tabindex="-1">${esc(s.rule)}</h2>${state.step?`<div class="rw-previous"><span>Previous line</span><div class="rw-expression">${esc(ex.steps[state.step-1].expression)}</div></div>`:''}<div class="rw-expression rw-current" data-rw-expression>${esc(s.expression)}</div><p class="rw-why" data-rw-why>${esc(s.why)}</p><p class="rw-domain"><strong>Allowed inputs:</strong> <span data-rw-domain>${esc(s.domain)}</span></p><div class="rw-actions"><button class="rw-text-button" data-rw-previous ${state.step===0?'disabled':''}>← Previous step</button><button class="button" data-rw-next>${state.step===ex.steps.length-1?'Try a question →':'Next step →'}</button></div></section>`;
 if(state.phase==='complete')return `<section class="rw-step-card rw-complete" aria-labelledby="rw-step-heading"><p class="rw-progress-note">Example finished</p><h2 id="rw-step-heading" data-rw-focus tabindex="-1">You’ve worked through the idea.</h2><p>You can revisit any step or try another example. This practice does not change your lesson-check results.</p><div class="rw-actions"><button class="rw-text-button" data-rw-restart>Review the steps</button>${state.exampleIndex+1<path.examples.length?`<button class="button" data-rw-next-example>Next example →</button>`:'<a class="button" href="#reasoning">All step guides →</a>'}</div></section>`;
 const kind=state.phase,q=kind==='prediction'?ex.prediction:path.trap,value=state[kind];
 return `<section class="rw-step-card rw-problem" aria-labelledby="rw-step-heading"><p class="rw-progress-note">Question ${kind==='prediction'?1:2} of 2 · guided practice</p><h2 id="rw-step-heading" data-rw-focus tabindex="-1">${kind==='prediction'?'Try the idea':'Spot the invalid step'}</h2><p class="rw-question">${esc(q.prompt)}</p><div class="rw-options" role="group" aria-label="${esc(q.prompt)}">${q.answers.map((answer,i)=>`<button class="rw-choice" data-rw-answer="${i}" data-rw-${kind}="${i}" aria-pressed="${value===i}">${esc(answer)}</button>`).join('')}</div><div data-rw-feedback="${kind}" role="status">${answerHTML(q,value)}</div><div class="rw-actions"><button class="rw-text-button" data-rw-previous>${kind==='prediction'?'← Back to the steps':'← Previous question'}</button><button class="button" data-rw-next ${value===null?'disabled':''}>${kind==='prediction'?'Next question →':'Finish example →'}</button></div></section>`;
}
function guideHTML(path,state,question){
 return `<article class="reasoning rw-guide"><a class="rw-back" href="#reasoning">← All step guides</a><header class="rw-guide-heading"><h1>${esc(path.short)}</h1><p>${esc(path.lead)}</p></header><div class="rw-example-picker"><label for="rw-example-select">Example</label><select id="rw-example-select" data-rw-example>${path.examples.map((ex,i)=>`<option value="${i}" ${i===state.exampleIndex?'selected':''}>${i+1}. ${esc(ex.label)}</option>`).join('')}</select></div><p class="rw-example-goal" data-rw-goal>${esc(path.examples[state.exampleIndex].goal)}</p><div data-rw-flow></div><details class="rw-help"><summary>Need more help?</summary><div class="rw-help-content"><p>Copy the current step and your question for your tutor. Nothing is sent automatically.</p><label for="rw-help-question">What is unclear?</label><textarea id="rw-help-question" data-rw-help placeholder="Why can we…?">${esc(question)}</textarea><button class="button secondary small" data-rw-copy>Copy my question with this step</button><div class="rw-copy-status" data-rw-copy-status role="status"></div><div class="rw-prereqs"><span>Revisit a foundation</span>${path.prerequisites.map(p=>`<a href="#topic/${encodeURIComponent(p.id)}">${esc(p.label)} →</a>`).join('')}<a href="#topic/${encodeURIComponent(path.topicId)}">Full topic lesson →</a>${['cancel','fractions','rationalize','trig','difference-quotient'].includes(path.id)?'<a href="#lab/compare">Explore an expression with a missing input →</a>':''}</div></div></details><p class="rw-footnote">Guided practice · no timer or score.</p></article>`;
}
function liveHTML(){
 return `<div class="reasoning rw-comparison"><section class="rw-live" aria-label="Interactive equivalence experiment"><div class="rw-live-head"><h3>Same values. One missing point.</h3><p>Change a, then move x. Compare (x² − a²)/(x − a) with x + a. The open circle is an input the original never accepts.</p></div><div class="rw-live-grid"><div class="rw-live-board"><svg viewBox="0 0 660 360" role="group" aria-label="Graph of two equivalent expressions for x not equal to a. Arrow keys move the input and excluded-point handles."></svg><div class="rw-legend"><span>Original quotient · open point</span><span>Extended line · filled point</span></div></div><div class="rw-live-controls"><div class="rw-live-equation" data-rw-live-equation></div><label><span class="rw-inputrow">Excluded input · a<input type="number" min="-2" max="2" step="0.1" value="1" data-rw-live="a" aria-label="Excluded input a"></span><input type="range" min="-2" max="2" step="0.1" value="1" data-rw-live="a" aria-label="Excluded input a slider"></label><label><span class="rw-inputrow">Probe input · x<input type="number" min="-4" max="4" step="0.1" value="3" data-rw-live="x" aria-label="Probe input x"></span><input type="range" min="-4" max="4" step="0.1" value="3" data-rw-live="x" aria-label="Probe input x slider"></label><button class="button secondary small" data-rw-hole>Try the excluded input: x = a</button><div class="rw-values" aria-live="polite"><div><small>ORIGINAL QUOTIENT</small><strong data-rw-original></strong></div><div><small>EXTENDED LINE</small><strong data-rw-extended></strong></div></div></div></div><div class="rw-live-status" data-rw-live-status role="status"></div></section><a class="rw-comparison-link" href="#reasoning/cancel">Walk through cancellation step by step →</a></div>`;
}

export function mountReasoning(host,options={}){
 const view=reasoningView(options),path=view.path;
 const events=new AbortController();let flowEvents=new AbortController();
 let state=path?createFlow(path,options.example):null,disposed=false,dragging=null,copyVersion=0;
 const live={a:1,x:3},questions=new Map();
 const $=selector=>host.querySelector(selector);
 const on=(element,event,fn,signal=events.signal)=>element?.addEventListener(event,fn,{signal});
 const notify=(type,extra={})=>{
  if(disposed||!path)return;
  try{const result=options.onEvent?.({type,pathId:path.id,topicId:path.topicId,topicIds:[...path.topicIds],exampleId:path.examples[state.exampleIndex].id,step:state.step,phase:state.phase,assisted:true,...extra});result?.catch?.(()=>{});}catch{ /* Optional host callbacks must not break teaching. */ }
 };
 function renderFlow(focus=false){
  flowEvents.abort();flowEvents=new AbortController();
  $('[data-rw-flow]').innerHTML=flowHTML(path,state);
  const bind=(selector,event,fn)=>on($(selector),event,fn,flowEvents.signal);
  const move=action=>{state=changeFlow(path,state,action);copyVersion++;$('[data-rw-copy-status]').textContent='';renderFlow(true);};
  bind('[data-rw-next]','click',()=>{const previous=state;move({type:'next'});if(previous.phase==='steps'&&state.phase==='steps'&&previous.step!==state.step)notify('reveal');});
  bind('[data-rw-previous]','click',()=>move({type:'previous'}));
  bind('[data-rw-restart]','click',()=>move({type:'restart'}));
  bind('[data-rw-next-example]','click',()=>selectExample(state.exampleIndex+1,true));
  host.querySelectorAll('[data-rw-answer]').forEach(button=>on(button,'click',()=>{
   const value=Number(button.dataset.rwAnswer),kind=state.phase;
   state=changeFlow(path,state,{type:'answer',value});
   const q=kind==='prediction'?path.examples[state.exampleIndex].prediction:path.trap;
   host.querySelectorAll('[data-rw-answer]').forEach(choice=>choice.setAttribute('aria-pressed',String(Number(choice.dataset.rwAnswer)===value)));
   $('[data-rw-feedback]').innerHTML=answerHTML(q,value);$('[data-rw-next]').disabled=false;
   copyVersion++;$('[data-rw-copy-status]').textContent='';notify(kind,{answer:value,correct:value===q.correct});
  },flowEvents.signal));
  if(focus)$('[data-rw-focus]')?.focus();
 }
 function selectExample(index,focus=false){
  state=changeFlow(path,state,{type:'example',index});copyVersion++;
  $('[data-rw-example]').value=String(state.exampleIndex);
  $('[data-rw-goal]').textContent=path.examples[state.exampleIndex].goal;
  $('[data-rw-help]').value=questions.get(path.examples[state.exampleIndex].id)||'';
  $('[data-rw-copy-status]').textContent='';renderFlow(focus);notify('open');
 }
 function mountLive(){
  host.innerHTML=liveHTML();renderLive();
  host.querySelectorAll('[data-rw-live]').forEach(input=>{
   on(input,'input',()=>{if(input.value===''||!Number.isFinite(Number(input.value)))return;const value=Number(input.value);setLive(input.dataset.rwLive,value);if(value<Number(input.min)||value>Number(input.max))input.value=live[input.dataset.rwLive];notify('explore');});
   on(input,'change',()=>{input.value=live[input.dataset.rwLive];});
  });
  on($('[data-rw-hole]'),'click',()=>{live.x=live.a;renderLive();notify('explore');});
  const board=$('.rw-live-board svg');
  on(board,'pointerdown',e=>{const handle=e.target.closest('[data-rw-handle]');if(!handle)return;dragging=handle.dataset.rwHandle;board.setPointerCapture(e.pointerId);e.preventDefault();notify('explore');});
  on(board,'pointermove',e=>{if(!dragging)return;const matrix=board.getScreenCTM();if(!matrix)return;const point=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());setLive(dragging,(point.x-60)/540*8-4);});
  for(const name of ['pointerup','pointercancel','lostpointercapture'])on(board,name,()=>{dragging=null;});
  on(board,'keydown',e=>{const handle=e.target.closest('[data-rw-handle]');if(!handle||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;e.preventDefault();const key=handle.dataset.rwHandle,max=key==='a'?2:4;setLive(key,e.key==='Home'?-max:e.key==='End'?max:live[key]+(['ArrowRight','ArrowUp'].includes(e.key)?1:-1)*(e.shiftKey?1:.1));$(`[data-rw-handle="${key}"]`)?.focus();notify('explore');});
  notify('open');
 }
 function setLive(key,value){const bound=key==='a'?2:4;live[key]=Math.round(Math.max(-bound,Math.min(bound,value))*10)/10;renderLive();}
 const fmt=n=>String(Number(n.toFixed(3)));
 function renderLive(){
  const a=live.a,x=live.x,y=x+a,hole=Math.abs(x-a)<1e-9,svg=$('.rw-live-board svg');
  const X=x=>60+(x+4)/8*540,Y=y=>304-(y+6)/12*252;
  let graph='<defs><clipPath id="rw-equivalence-clip"><rect x="60" y="52" width="540" height="252"/></clipPath></defs>';
  for(let i=-4;i<=4;i++)graph+=`<line x1="${X(i)}" y1="52" x2="${X(i)}" y2="304" stroke="${i===0?'#cad7bf':'#edf2e6'}"/><text x="${X(i)}" y="325" text-anchor="middle" fill="#8fa180" font-size="11">${i}</text>`;
  for(let i=-6;i<=6;i+=2)graph+=`<line x1="60" y1="${Y(i)}" x2="600" y2="${Y(i)}" stroke="${i===0?'#cad7bf':'#edf2e6'}"/><text x="46" y="${Y(i)+4}" text-anchor="end" fill="#8fa180" font-size="11">${i}</text>`;
  graph+=`<g clip-path="url(#rw-equivalence-clip)"><line x1="${X(-4)}" y1="${Y(-4+a)}" x2="${X(4)}" y2="${Y(4+a)}" stroke="#a996bf" stroke-width="5" opacity=".55"/><line x1="${X(-4)}" y1="${Y(-4+a)}" x2="${X(4)}" y2="${Y(4+a)}" stroke="#6c925e" stroke-width="2.5" stroke-dasharray="9 4"/><line x1="${X(x)}" y1="${Y(-6)}" x2="${X(x)}" y2="${Y(y)}" stroke="#c9d7bb" stroke-dasharray="4 4"/></g>`;
  graph+=`<circle cx="${X(a)}" cy="${Y(2*a)}" r="10" fill="#fcfdf9" stroke="#6c925e" stroke-width="2.5"/><circle cx="${X(a)}" cy="${Y(2*a)}" r="3" fill="#a28bbb"/><text x="${Math.min(550,Math.max(95,X(a)+16))}" y="${Y(2*a)-16}" fill="#839c73" font-size="11">x = a: original undefined</text>`;
  if(!hole)graph+=`<circle cx="${X(x)}" cy="${Y(y)}" r="7" fill="#fff" stroke="#6c925e" stroke-width="3"/>`;
  graph+=`<circle tabindex="0" role="slider" aria-label="Probe input x; use arrow keys" aria-valuemin="-4" aria-valuemax="4" aria-valuenow="${x}" data-rw-handle="x" cx="${X(x)}" cy="${Y(y)}" r="15" fill="transparent" stroke="transparent"/><circle tabindex="0" role="slider" aria-label="Excluded input a; use arrow keys" aria-valuemin="-2" aria-valuemax="2" aria-valuenow="${a}" data-rw-handle="a" cx="${X(a)}" cy="342" r="7" fill="#f3eef8" stroke="#aa96bb" stroke-width="2"/><text x="${X(a)+14}" y="346" fill="#9583a7" font-size="10">a = ${fmt(a)}</text><text x="617" y="${Y(0)+4}" font-size="11" fill="#7e936d">x</text><text x="${X(0)+4}" y="36" font-size="11" fill="#7e936d">y</text>`;
  svg.innerHTML=graph;
  const plus=a<0?' − '+fmt(-a):' + '+fmt(a),minus=a<0?' + '+fmt(-a):' − '+fmt(a);
  $('[data-rw-live-equation]').innerHTML=`(x² − ${fmt(a*a)}) / (x${minus})<span>x${plus}</span>`;
  $('[data-rw-original]').textContent=hole?'undefined':fmt((x*x-a*a)/(x-a));$('[data-rw-extended]').textContent=fmt(y);
  const status=$('[data-rw-live-status]');status.classList.toggle('excluded',hole);status.textContent=hole?`At x = a = ${fmt(a)}, the original is 0/0 and has no value. The extended line gives ${fmt(2*a)}. Cancelling a factor does not add this missing input to the original domain.`:`At x = ${fmt(x)}, the nonzero factor x − a = ${fmt(x-a)} cancels. Both expressions give ${fmt(y)}. Move to x = a to see why the domain still matters.`;
  host.querySelectorAll('[data-rw-live]').forEach(input=>{if(document.activeElement!==input)input.value=live[input.dataset.rwLive]});
 }
 async function copyQuestion(){
  const ex=path.examples[state.exampleIndex],s=ex.steps[state.step],ticket=++copyVersion;
  const q=state.phase==='prediction'?ex.prediction:state.phase==='misconception'?path.trap:null;
  const answer=q&&state[state.phase]!==null?`\nMy choice: ${q.answers[state[state.phase]]}\nFeedback: ${q.feedback[state[state.phase]]}`:'';
  const message=`Please help me understand this guided math example. This is supported practice, not independent assessment.\n\nTopic: ${path.title}\nExample: ${ex.goal}\nStep ${state.step+1}: ${s.expression}\nRule: ${s.rule}\nExplanation: ${s.why}\nAllowed inputs: ${s.domain}${q?`\n\nCurrent question: ${q.prompt}${answer}`:''}\n\nMy question: ${(questions.get(ex.id)||'').trim()||'Please help me explain why this step is valid and give me a fresh example to try.'}`;
  try{
   if(options.onCopy)await options.onCopy(message);else await navigator.clipboard.writeText(message);
   if(!disposed&&ticket===copyVersion)$('[data-rw-copy-status]').textContent='Copied. Paste it into your tutor conversation.';
  }catch{
   if(!disposed&&ticket===copyVersion)$('[data-rw-copy-status]').innerHTML=`Select and copy this question:<div class="rw-copy-fallback">${esc(message)}</div>`;
  }
 }
 if(view.kind==='directory'){
  host.innerHTML=directoryHTML(view.missing);
  host.querySelectorAll('[data-rw-path]').forEach(link=>on(link,'click',()=>{try{options.onPathChange?.(link.dataset.rwPath);}catch{ /* Keep ordinary link navigation. */ }}));
 }else if(view.kind==='live')mountLive();
 else{
  host.innerHTML=guideHTML(path,state,'');renderFlow();
  on($('[data-rw-example]'),'change',e=>selectExample(Number(e.target.value)));
  on($('[data-rw-help]'),'input',e=>{questions.set(path.examples[state.exampleIndex].id,e.target.value);copyVersion++;$('[data-rw-copy-status]').textContent='';});
  on($('[data-rw-copy]'),'click',copyQuestion);notify('open');
 }
 return ()=>{disposed=true;dragging=null;copyVersion++;flowEvents.abort();events.abort();host.replaceChildren();};
}
