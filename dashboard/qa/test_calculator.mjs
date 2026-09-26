import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CalculatorError,LIMITS,parseExpression,evaluateAST,calculate,valueAt,sampleGraph,graphTransform,zoomWindow,validateWindow,clipSegment,detectedBreaks,graphTicks} from '../calculator-engine.js';

let checks=0;
const eq=(source,expected,options={})=>{const actual=calculate(source,options).value;assert.ok(Math.abs(actual-expected)<=1e-11*Math.max(1,Math.abs(expected)),`${source}: ${actual} != ${expected}`);checks++;};
const rejects=(source,code)=>{assert.throws(()=>calculate(source),error=>error instanceof CalculatorError&&(!code||error.code===code),source);checks++;};
eq('14 - 2 / 3',40/3);eq('(14 - 2) / 3',4);
eq('2/3 + 1/4',11/12);assert.equal(calculate('2/3 + 1/4').fraction.display,'11/12');checks++;
eq('-2^2',-4);eq('(-2)^2',4);eq('2^3^2',512);eq('2^-2',.25);eq('-2^-2',-.25);eq('2^-2^2',1/16);
eq('3(x-2)',9,{x:5});eq('(x+1)(x-1)',8,{x:3});eq('2x + 3pi',4+3*Math.PI,{x:2});eq('2sin(pi/2)',2);
eq('.25 + .5',.75);eq('1e3 + 2E-2',1000.02);eq('2e',2*Math.E);eq('π × 2',2*Math.PI);eq('6 ÷ 2',3);
eq('sqrt(9)',3);eq('abs(-5)',5);eq('ln(e)',1);eq('log(1000)',3);eq('exp(0)',1);
eq('sin(pi/2)',1);eq('cos(pi)',-1);eq('tan(pi/4)',1);eq('sin(30)',.5,{angleMode:'degrees'});eq('cos(60)',.5,{angleMode:'degrees'});eq('tan(45)',1,{angleMode:'degrees'});
eq('asin(0.5)',30,{angleMode:'degrees'});eq('acos(0)',90,{angleMode:'degrees'});eq('atan(1)',Math.PI/4);
eq('(-8)^(1/3)',-2);eq('(-8)^(2/3)',4);eq('cbrt(-27)',-3);eq('x^(1/3)',-2,{x:-8});
assert.equal(calculate('0.1 + 0.2').fraction.display,'3/10');assert.equal(calculate('3^-2').fraction.display,'1/9');assert.equal(calculate('sqrt(4)').fraction,null);checks+=3;
eq('0.3 - 0.2 - 0.1',0);eq('sqrt(0.3 - 0.2 - 0.1)',0);eq('(0.1 + 0.2) / 0.3',1);
rejects('1/(0.3 - 0.2 - 0.1)','domain');rejects('(0.3 - 0.2 - 0.1)^-1','domain');
for(const source of ['1/0','sqrt(-1)','ln(0)','log(-3)','0^0','0^-2','(-2)^0.5','tan(pi/2)','asin(2)'])rejects(source,'domain');
assert.throws(()=>calculate('tan(90)',{angleMode:'degrees'}),e=>e.code==='domain');checks++;
assert.throws(()=>calculate('sin(1)',{angleMode:'unknown'}),e=>e.code==='syntax');checks++;
for(const source of ['',')','2 +','((2+1)','2 3','2..3','sin x','sin()','y+1','Math.sin(2)','x.constructor','constructor(1)','alert(1)','x=2','[1,2]','1;globalThis.secret=1','"hello"','2**3','sin(1,2)','<script>'])rejects(source);
rejects('('.repeat(50)+'1'+')'.repeat(50),'limit');rejects('1+'.repeat(300)+'1','limit');rejects('1e999','range');rejects('exp(1000)','range');
assert.equal(globalThis.secret,undefined);checks++;

const window={xmin:-5,xmax:5,ymin:-5,ymax:5};
const graph=source=>sampleGraph(parseExpression(source),window);
for(const source of ['x','x^2','sin(x)','abs(x)','sqrt(x)','ln(x)','1/x','tan(x)','(x^2-1)/(x-1)','1/(x-0.1)^2']){
  const result=graph(source);assert.ok(result.sampleCount<=LIMITS.samples,source);
  for(const segment of result.segments)for(const p of segment){assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y),source);assert.ok(p.x>=-5-1e-8&&p.x<=5+1e-8&&p.y>=-5-1e-8&&p.y<=5+1e-8,source);}
  checks++;
}
for(const source of ['1/x','(x^2-1)/(x-1)','1/(x-0.1)','tan(x)']){
 const result=graph(source);
 for(const cut of result.breaks)for(const [a,b] of result.segments)assert.ok(!(a.x<cut&&b.x>cut),`${source} bridges a domain cut at ${cut}`);
 checks++;
}
assert.deepEqual(detectedBreaks(parseExpression('1/(x-0.1)'),window).points,[.1]);checks++;
const hole=graph('(x^2-1)/(x-1)').holes.find(p=>Math.abs(p.x-1)<1e-9);assert.ok(hole&&Math.abs(hole.y-2)<1e-6);checks++;
assert.equal(graph('1/x').holes.length,0);assert.equal(valueAt(parseExpression('(x^2-1)/(x-1)'),1).defined,false);checks+=2;
assert.ok(graph('sqrt(x)').segments.every(s=>s.every(p=>p.x>=0)));assert.ok(graph('ln(x)').segments.every(s=>s.every(p=>p.x>0)));checks+=2;
const pole=graph('1/(x-0.1)^2');assert.ok(pole.segments.every(([a,b])=>!(a.x<.1&&b.x>.1)),'Adaptive sampling bridges a non-affine denominator pole');checks++;
const steep=graph('1000x');assert.ok(steep.segments.some(([a,b])=>a.y<=0&&b.y>=0),'A steep continuous line should remain visible');checks++;
const degrees=sampleGraph(parseExpression('tan(x)'),{xmin:-180,xmax:180,ymin:-5,ymax:5},{angleMode:'degrees'});assert.equal(degrees.breaks.length,2);assert.ok(Math.abs(degrees.breaks[0]+90)<1e-8);checks++;

const transform=graphTransform(window);
for(const n of [-5,-2,0,1,5]){assert.ok(Math.abs(transform.input(transform.x(n))-n)<1e-12);assert.ok(Math.abs(transform.output(transform.y(n))-n)<1e-12);checks++;}
assert.deepEqual(zoomWindow(window,.5),{xmin:-2.5,xmax:2.5,ymin:-2.5,ymax:2.5});checks++;
assert.deepEqual(clipSegment({x:-10,y:0},{x:10,y:0},window),[{x:-5,y:0},{x:5,y:0}]);assert.equal(clipSegment({x:-10,y:7},{x:10,y:7},window),null);checks+=2;
assert.throws(()=>validateWindow({xmin:1,xmax:1,ymin:-5,ymax:5}));assert.throws(()=>validateWindow({...window,xmax:Infinity}));assert.throws(()=>zoomWindow(window,0));checks+=3;
assert.deepEqual(graphTicks(-5,5),[-4,-2,0,2,4]);checks++;
assert.deepEqual(graphTicks(-5,Infinity),[]);assert.deepEqual(graphTicks(-5,5,0),[]);checks+=2;
assert.equal(clipSegment({x:0,y:-1e308},{x:1,y:1e308},window),null);checks++;
assert.throws(()=>sampleGraph(parseExpression('x'),window,{steps:NaN}),e=>e.code==='limit');checks++;
for(const file of ['../calculator-engine.js','../calculator.js']){
 const source=await readFile(new URL(file,import.meta.url),'utf8');assert.ok(!/\beval\s*\(|new\s+Function\b/.test(source),'Executable user input in '+file);checks++;
}
console.log(`Calculator: ${checks} precedence, fraction, function, domain, parser-safety, graph-gap, sampling-bound, and transform checks passed.`);
