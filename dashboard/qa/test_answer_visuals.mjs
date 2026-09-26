// Pure rendering QA; no browser, network, learner files or persisted state.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fallbackVisual, renderAnswerVisual, mountAnswerVisual} from '../answer-visuals.js';

function safe(v) {
  const html=renderAnswerVisual(v);
  if(!html){assert.notEqual(v.phase,'feedback');return '';}
  assert.match(html, /class="answer-visual(?: [^"]*)?"/);
  assert.doesNotMatch(html, /(?:cx|cy|x\d?|y\d?|width|height|d|points)="[^"]*(?:NaN|Infinity)/);
  assert.doesNotMatch(html, /<script|<iframe|onerror\s*=|javascript:/i);
  assert.match(html, new RegExp(`data-visual-phase="${v.phase==='feedback'?'feedback':'problem'}"`));
  if(v.phase!=='feedback') {
    assert.doesNotMatch(html, /class="av-status|class="av-values|Checked value|Checked claim/);
  }
  return html;
}

let count=0;
if(process.argv.includes('--stdin')) {
  const corpus=JSON.parse(fs.readFileSync(0,'utf8'));
  for(const v of corpus){try{const html=safe(v);if(v.phase==='problem'&&!['quantity','choice','written'].includes(v.type))assert.ok(html,'A substantive diagram must remain visible.');}catch(e){e.message=`${v.id} (${v.type}, ${v.phase}): ${e.message}`;throw e;}count++;}
}
const poison={id:'example',kind:'number',prompt:'Compute a real value.',answer:'SECRET_KEY',display_answer:'EXACT_SECRET',explanation:'PRIVATE_SOLUTION',learner:{name:'PRIVATE_LEARNER'}};
assert.doesNotMatch(safe(fallbackVisual(poison)), /SECRET|PRIVATE/);
assert.deepEqual(fallbackVisual(poison),fallbackVisual({...poison,answer:'CHANGED_KEY'}));
safe({version:1,phase:'problem',type:'quantity',kind:'number',expected:'SECRET_KEY',response:'PRIVATE_RESPONSE',expected_value:9382,response_value:812});
const numeric={id:'n',kind:'number',prompt:'Use the stated units.'};
const compact=safe(fallbackVisual(numeric));
assert.equal(compact,'');
assert.doesNotMatch(compact, /<svg|Read the givens|Choose a relationship|Enter your result|problem map/i);
assert.doesNotMatch(safe(fallbackVisual({kind:'choice',prompt:'Choose the valid statement.',options:['A','B']})),/<svg|av-choice-map/);
const equivalent={version:1,id:'equivalent',kind:'number',type:'equivalent-fractions',phase:'problem',title:'Same amount, different parts',givens:{fraction:[3,4],target_denominator:12,task:'numerator'}};
const initial=safe(equivalent),target=initial.match(/<g data-fraction-row="target"[^>]*>(.*?)<\/g>/s)[1];
assert.match(initial,/data-parts="12"/);
assert.equal((target.match(/<line /g)||[]).length,11);
assert.doesNotMatch(initial,/data-numerator-fill|Green boundary|9\/12/);
assert.match(initial,/width="330"/); // The given 3/4 occupies 330 of 440 pixels.
const feedback={...equivalent,phase:'feedback',correct:false,response:'6',response_value:6,expected:'9',expected_value:9,explanation:'DUPLICATE_EXPLANATION_SENTINEL'};
const submitted=safe(feedback);
assert.match(submitted,/data-numerator-fill="6"[^>]*width="220"/);
assert.match(submitted,/x1="465"[^>]*x2="465"/); // Independent 3/4 reference, 135+330.
assert.match(submitted,/9\/12 matches 3\/4/);
assert.doesNotMatch(submitted,/DUPLICATE_EXPLANATION_SENTINEL|av-explanation/);
for(const response of [-1,13,1e300,null]) {
  const html=safe({...feedback,response_value:response});
  assert.doesNotMatch(html,/data-numerator-fill=/); // Out-of-whole values are never silently clamped.
}
for(const [response,answer] of [['0',0],['-7',3],['1e300',-1e300],['1e-300',0],['sqrt(4)/2',1],['2pi',Math.PI*2],['nan',2],['x',4],['sin(0)',0],['sqrt(-1)',0]]) {
  const v=fallbackVisual(numeric,{answer,response,correct:response==='0',explanation:'Interpret the same numerical scale.'});
  safe(v);
  if(['nan','x','sin(0)','sqrt(-1)'].includes(response))assert.equal(v.response_value,null);
}
const raw='<img src=x onerror="alert(1)">';
const malicious=fallbackVisual({kind:'choice',prompt:raw,options:[raw]}, {answer:'<script>alert(1)</script>',response:raw,correct:false,explanation:'<svg onload="alert(1)">'});
const escaped=renderAnswerVisual(malicious);
assert.doesNotMatch(escaped, /<img|<script|<svg onload/);
assert.match(escaped,/&lt;img/);
assert.match(escaped,/&lt;script/);
for(const v of [null,{}, {type:'made-up',phase:'problem'}, {type:'function',givens:{coefficients:[1e300],input:1e300}}, {type:'fractions',givens:{operands:[[1,0],[2,3]]}}, {type:'vectors',givens:{vectors:[[Infinity,0]]}}, {type:'integral',givens:{upper:1e-300,coefficient:1,power:4},phase:'feedback',correct:false,response_value:1e300,expected_value:0}])safe(v||{});
const element={innerHTML:'',replaceChildren(){this.innerHTML='';}};
const dispose=mountAnswerVisual(element,equivalent);
assert.match(element.innerHTML,/answer-visual/);dispose();assert.equal(element.innerHTML,'');
assert.throws(()=>mountAnswerVisual(null,{}),TypeError);
console.log(`Answer visual render checks passed; corpus=${count}.`);
