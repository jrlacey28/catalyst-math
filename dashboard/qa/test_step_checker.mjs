import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {checkSteps,compareSteps,normalizeMathText,STEP_LIMITS} from '../step-checker.js';
import {mathPreview,mathInsertion} from '../math-input.js';
import {normalizeStepDraft,buildStepBrief} from '../step-workspace.js';

let checks=0;
function expect(a,b,status,options){const result=compareSteps(a,b,options);assert.equal(result.status,status,`${a} → ${b}: ${JSON.stringify(result)}`);checks++;return result;}
expect('1/2 + 1/3','5/6','valid');expect('2/3 + 1/4','11/12','valid');expect('1/2 + 1/3','2/5','invalid');
expect('0.1 + 0.2','3/10','valid');expect('0.3 - 0.2 - 0.1','0','valid');
expect('9007199254740993 - 9007199254740992','1','valid');
expect('3(x-2)','3x-6','valid');expect('3(x-2)','3x-2','invalid');
expect('-(x-2)','-x+2','valid');expect('(x+1)^2','x^2+2x+1','valid');expect('(x+1)^2','x^2+1','invalid');
expect('(x-2)(x-3)','x^2-5x+6','valid');expect('x+x','2x','valid');expect('x+x','x^2','invalid');
expect('-2^2','-4','valid');expect('(-2)^2','4','valid');expect('2^-2','1/4','valid');
expect('x² + 2·x + 1','(x+1)²','valid');assert.equal(normalizeMathText('√(4) + x³'),'sqrt(4) + x^3');checks++;

const cancelled=expect('(x^2-1)/(x-1)','x+1','conditional');assert.deepEqual(cancelled.restrictions,['x ≠ 1']);assert.equal(cancelled.sameNaturalDomain,false);checks+=2;
expect('x+1','(x^2-1)/(x-1)','invalid');
expect('x+1','(x^2-1)/(x-1)','conditional',{assumptions:'x != 1'});
expect('(x+1)/(x+2)','1/2','invalid');
expect('x/x','1','conditional');expect('1','x/x','invalid');
expect('1/(1/x)','x','conditional');expect('x^0','1','conditional');
expect('0^0','1','input_error');expect('1/(x-x)','0','input_error');
expect('(x^2+1)/(x^2+1)','1','valid');expect('1','(x^4+1)/(x^4+1)','valid');
expect('(x^2-2)/(x^2-2)','1','conditional');
expect('(x^2-2)/(x^2-2)','(x^2-8)/(x^2-8)','invalid');
expect('1/(x^2-1)','1/((x-1)(x+1))','conditional');
expect('1','(x^2-1)/(x^2-1)','conditional',{assumptions:'x != 1; x != -1'});
expect('1','(x^2-1)/(x^2-1)','invalid',{assumptions:'x != 1'});
expect('(x-1)/(x-1)','1','needs_review',{assumptions:'all real x'});
expect('1/(x^2+1)','1/(1+x^2)','valid',{assumptions:'all real x'});
expect('x^2','x*x','needs_review',{assumptions:'x > 0'});
expect('x','x','input_error',{assumptions:'x != x'});
expect('x','x','conditional',{assumptions:'x^2-2 != 0'});
expect('1','(x^2+2x+1)/(x+1)^2','invalid');

expect('3(x-2)=2x+5','3x-6=2x+5','valid');
expect('3x-6=2x+5','x=11','valid');expect('3x-6=2x+5','x=-1','invalid');
expect('x=2','2x=4','valid');expect('x=2','0*x=0','invalid');
expect('x=x','0=0','valid');expect('x=x','x=0','invalid');
expect('x=x+1','0=1','valid');expect('x=x+1','0=0','invalid');
expect('2x=1','x=1/2','valid');expect('x/3=1/6','x=1/2','valid');
expect('x=0','x^2/x=0','invalid');expect('x=2','x^2/x=2','conditional');
expect('(x^2-1)/(x-1)=2','0=1','conditional');
const rejectedCandidate=expect('(x^2-1)/(x-1)=2','x=1','conditional');assert.equal(rejectedCandidate.code,'excluded_candidate');assert.equal(rejectedCandidate.afterSolutions,'No solutions');checks+=2;
// Nonlinear equations are deliberately not graded by this tool.
for(const [a,b] of [['x^2=4','x=2'],['x^2=x','x=1'],['1/x=2','x=1/2'],['sin(x)^2+cos(x)^2','1'],['sqrt(x^2)','x'],['abs(x)','x'],['pi+pi','2pi'],['ln(x*x)','2ln(x)'],['y+y','2y'],['f(x)=x+1','x+1'],['x^13','x*x^12'],['x^(1/2)','sqrt(x)']])expect(a,b,'needs_review');
expect('x+1','x=1','needs_review');

const chain=checkSteps(['3(x-2)','3x-6','3x-2','x-2']);assert.equal(chain.firstInvalidIndex,2);assert.equal(chain.items.length,2);checks+=2;
const carried=checkSteps(['(x^2-1)/(x-1)','x+1','1+x']);assert.equal(carried.status,'conditional');assert.deepEqual(carried.restrictions,['x ≠ 1']);checks+=2;
const laterHole=checkSteps(['x/x','1','(x-2)/(x-2)']);assert.equal(laterHole.firstInvalidIndex,2);checks++;
assert.equal(checkSteps(['','x','','x']).items[0].index,3);checks++;
assert.equal(checkSteps(['x']).status,'incomplete');assert.equal(checkSteps([]).status,'incomplete');checks+=2;
for(const input of ['constructor(1)','x.constructor','1;globalThis.stepAttack=1','<script>','[x]','1,2','x==1','((x)','x+','"x"','2**3','x => x']){const result=checkSteps([input,'x']);assert.ok(!['valid','conditional'].includes(result.status),input);checks++;}
assert.equal(globalThis.stepAttack,undefined);checks++;
for(const input of ['('.repeat(60)+'x'+')'.repeat(60),'1+'.repeat(300)+'1','1e1000','1e-1000','(x+1)^12*(x+2)^12','2^12^12']){const result=checkSteps([input,'x']);assert.ok(!['valid','conditional'].includes(result.status),input);checks++;}
assert.equal(checkSteps(Array(13).fill('x')).status,'needs_review');checks++;
// These agree at many sample inputs. Their unequal polynomials must still fail.
expect('0','x*(x-1)*(x+1)*(x-2)*(x+2)*(x-3)*(x+3)','invalid');
// Exact rational identities across signs and coefficients exercise normalization.
for(let a=-4;a<=4;a++)for(let b=-3;b<=3;b++){
 expect(`(${a}x+${b})(x-2)`,`${a}x^2+${b-2*a}x+${-2*b}`,'valid');
 if(a!==0)expect(`(${a}x+${b})/${a}`,`x+(${b})/(${a})`,'valid');
}
// Domain comparisons distinguish real holes from complex-only roots, including
// irrational roots and repeated factors, without approximate zero sampling.
expect('1','(x^4+2x^2+1)/(x^2+1)^2','valid');
expect('1','(x^4-4x^2+4)/(x^2-2)^2','invalid');
expect('(x^4-4x^2+4)/(x^2-2)^2','1','conditional');
expect('1','(x^4-4x^2+4)/(x^2-2)^2','conditional',{assumptions:'x^2 != 2'});
expect('(x-1)/(x-1)','(x-1)^3/(x-1)^3','conditional');
expect('x=x','x^2/x=x','invalid');
assert.equal(JSON.stringify(checkSteps(['x/x','1'])).includes('BigInt'),false);checks++;

// Previews format syntax only. They never evaluate the submitted field.
const previewCases=[['2/3+1/4','<mfrac>'],['sqrt(x^2)','<msqrt>'],['x^2','<msup>'],['sin(x)','mathvariant="normal"'],['x+1=3','<mo>=</mo>'],['1e-3','<mn>-3</mn>']];
for(const [input,fragment] of previewCases){const p=mathPreview(input);assert.equal(p.status,'math');assert.equal(p.text,input);assert.ok(p.mathML.includes(fragment));checks+=3;}
assert.match(mathPreview('(x^2)^3').mathML,/<msup><mrow><mo>\(<\/mo><msup>/);checks++;
assert.match(mathPreview('(-2)^2').mathML,/<msup><mrow><mo>\(<\/mo>/);checks++;
assert.equal(mathPreview('-2^2').mathML.includes('<mo>−</mo><msup>'),true);checks++;
for(const input of ['I divided both sides by three.','a+b','x+','<img src=x onerror=alert(1)>','x'.repeat(501)]){const p=mathPreview(input);assert.equal(p.status,'text');assert.equal(p.text,input);assert.equal(p.mathML,null);checks+=3;}
assert.equal(mathPreview('').status,'empty');checks++;
const fraction=mathInsertion('x+1',0,3,'fraction');assert.equal(fraction.value,'(x+1)/()');assert.equal(fraction.start,7);checks+=2;
assert.deepEqual(mathInsertion('',0,0,'fraction'),{value:'()/()',start:1,end:1,insert:'()/()',prompt:'Type the numerator, then the denominator, inside the parentheses.'});checks++;
assert.equal(mathInsertion('2+x',2,3,'root').value,'2+sqrt(x)');checks++;
assert.equal(mathInsertion('x+1',0,3,'square').value,'(x+1)^2');checks++;
assert.equal(mathInsertion('x',0,1,'power').value,'(x)^()');checks++;
assert.equal(mathInsertion('2',1,1,'multiply').value,'2*');checks++;
assert.equal(mathInsertion('',0,0,'pi').value,'pi');checks++;
assert.throws(()=>mathInsertion('x',0,1,'constructor'));checks++;
const original={version:9,lines:['  x/x  ','1'],assumptions:'x != 0',reflection:'Why can this cancel?'};
const normalized=normalizeStepDraft(original);assert.equal(normalized.version,1);assert.equal(normalized.lines[0],'  x/x  ');assert.equal(original.version,9);checks+=3;
assert.equal(normalizeStepDraft({lines:Array(50).fill('x'.repeat(501)),reflection:'x'.repeat(2001)}).lines.length,12);checks++;
assert.equal(normalizeStepDraft({lines:['x'.repeat(501)]}).lines[0].length,500);checks++;
assert.equal(normalizeStepDraft({reflection:'x'.repeat(2001)}).reflection.length,2000);checks++;
assert.equal(normalizeStepDraft(null).lines.length,2);checks++;
const brief=buildStepBrief(normalized,checkSteps(normalized.lines,{assumptions:normalized.assumptions}),'arithmetic.fractions');
assert.ok(brief.includes('1.   x/x  '));assert.ok(brief.includes('x ≠ 0'));assert.ok(brief.includes('not mastery evidence'));assert.ok(brief.includes('original problem is not supplied'));checks+=4;
for(const source of ['../step-checker.js','../step-workspace.js','../math-input.js']){const text=await readFile(new URL(source,import.meta.url),'utf8');assert.ok(!/\beval\s*\(|new\s+Function\b/.test(text));checks++;}
console.log(`Step tools: ${checks} exact-algebra, domain, equation, adversarial-input, bounds, notation and draft checks passed.`);
