// An ellipse described by one clock and two coordinates. No gravity model is implied.
import {calculate} from './calculator-engine.js';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean=(n,min,max,fallback)=>Number.isFinite(Number(n))?Math.max(min,Math.min(max,Number(n))):fallback;
const fmt=n=>Math.abs(n)<1e-9?'0':Number(n.toFixed(2)).toString();
export function coordinateAnswer(source){const result=calculate(source);if(result.hasX||!Number.isFinite(result.value)||Math.abs(result.value)>1e6)throw new Error('Enter a finite number or expression without x.');return result.value;}
export function ellipsePosition({a=4,b=2,seconds=0,period=8}={}){
 if(![a,b,seconds,period].every(Number.isFinite)||a<=0||b<=0||period<=0)throw new Error('Use positive axis lengths and a positive period.');
 const angle=2*Math.PI*seconds/period;
 return {x:a*Math.cos(angle),y:b*Math.sin(angle),angle};
}
export function ellipseScene({a=4,b=2,seconds=0,answer=null,challenge=false}={}){
 const p=ellipsePosition({a,b,seconds}),scale=31,cx=280,cy=145,X=n=>cx+n*scale,Y=n=>cy-n*scale;
 const answerVisible=Number.isFinite(answer)&&Math.abs(answer)<=8;
 let body=`<line x1="20" y1="${cy}" x2="540" y2="${cy}" stroke="#bbcdbb"/><line x1="${cx}" y1="16" x2="${cx}" y2="274" stroke="#bbcdbb"/><ellipse cx="${cx}" cy="${cy}" rx="${a*scale}" ry="${b*scale}" fill="#eaf2e6" stroke="#769571" stroke-width="2"/><text x="528" y="136">x</text><text x="288" y="25">y</text>`;
 for(let n=-8;n<=8;n+=2)body+=`<text x="${X(n)}" y="${cy+18}" text-anchor="middle" class="ellipse-tick">${n}</text>`;
 for(let n=-4;n<=4;n+=2)if(n)body+=`<text x="${cx-10}" y="${Y(n)+4}" text-anchor="end" class="ellipse-tick">${n}</text>`;
 if(!challenge||Number.isFinite(answer))body+=`<line x1="${cx}" y1="${Y(p.y)}" x2="${X(p.x)}" y2="${Y(p.y)}" stroke="#287aa1" stroke-width="2" stroke-dasharray="5 4"/><line x1="${X(p.x)}" y1="${cy}" x2="${X(p.x)}" y2="${Y(p.y)}" stroke="#b27a26" stroke-width="2" stroke-dasharray="5 4"/><circle cx="${X(p.x)}" cy="${Y(p.y)}" r="7" fill="#315f45" stroke="white" stroke-width="2"/>`;
 if(answerVisible)body+=`<circle cx="${X(answer)}" cy="${Y(p.y)}" r="11" fill="none" stroke="#b27a26" stroke-width="3"/>`;
 return `<svg viewBox="0 0 560 290" role="img" aria-label="${challenge&&!Number.isFinite(answer)?'Oval track, four metres from center to each side and two metres to top and bottom.':escape(`Dot at x ${fmt(p.x)}, y ${fmt(p.y)} metres${Number.isFinite(answer)?`. Your predicted x is ${fmt(answer)}`:''}`)}"><title>One clock, two coordinates</title>${body}</svg>`;
}
export function mountParametricMotion(host,{initialDraft={},onDraft=()=>{},onSupport=async()=>{},esc=escape}={}){
 const abort=new AbortController();let disposed=false,busy=false;
 let draft={stage:Math.round(clean(initialDraft.stage,0,2,0)),seconds:clean(initialDraft.seconds,0,8,0),a:clean(initialDraft.a,1,7,4),b:clean(initialDraft.b,1,4,2),answer:typeof initialDraft.answer==='string'?initialDraft.answer.slice(0,120):'',shown:false};
 const $=s=>host.querySelector(s),labels=['Move the clock','Change the shape','Try it yourself'];
 function save(){Promise.resolve(onDraft({...draft})).catch(()=>{if(!disposed)$('[data-ellipse-status]').textContent='Could not save. Keep this page open and try again.';});}
 function controls(){return draft.stage===0?`<label class="ellipse-control">Time <output data-time-label>${fmt(draft.seconds)} s</output><input type="range" data-seconds aria-label="Time in seconds" min="0" max="8" step=".1" value="${draft.seconds}"></label>`:draft.stage===1?`<div class="ellipse-shape-controls"><label class="ellipse-control">Half-width <output data-a-label>${draft.a} m</output><input type="range" data-a aria-label="Half-width in metres" min="1" max="7" step=".5" value="${draft.a}"></label><label class="ellipse-control">Half-height <output data-b-label>${draft.b} m</output><input type="range" data-b aria-label="Half-height in metres" min="1" max="4" step=".5" value="${draft.b}"></label></div>`:`<form data-ellipse-form><label for="ellipse-answer">At 4 seconds, what is x? <small>(metres)</small></label><div class="ellipse-answer-row"><input id="ellipse-answer" class="answer-input" value="${esc(draft.answer)}" maxlength="120" placeholder="Your x-coordinate" autocomplete="off"><button class="button" type="submit">Place my dot</button></div></form>`;}
 function draw(){
  const challenge=draft.stage===2,params=challenge?{a:4,b:2,seconds:4}:{a:draft.stage===0?4:draft.a,b:draft.stage===0?2:draft.b,seconds:draft.stage===1?1:draft.seconds};
  let answer=null;if(draft.shown){try{answer=coordinateAnswer(draft.answer);}catch{}}
  $('[data-ellipse-scene]').innerHTML=ellipseScene({...params,challenge,answer});
  const p=ellipsePosition(params);
  $('[data-ellipse-readout]').textContent=challenge?(draft.shown?`Green: the track position. Gold: your prediction${Math.abs(answer)>8?' (outside this view)':''}.`:'The clock takes 8 seconds for one full lap.'): `x = ${fmt(p.x)} m     y = ${fmt(p.y)} m`;
  if($('[data-time-label]'))$('[data-time-label]').textContent=fmt(draft.seconds)+' s';
  if($('[data-a-label]'))$('[data-a-label]').textContent=draft.a+' m';
  if($('[data-b-label]'))$('[data-b-label]').textContent=draft.b+' m';
 }
 function render(focus=false){
  host.innerHTML=`<section class="ellipse-activity"><header><h2>Move a dot around an oval</h2><p>One clock tells the camera where to go horizontally and vertically.</p></header><div class="mission-step-heading"><h3 tabindex="-1" data-ellipse-heading>${labels[draft.stage]}</h3><span>Step ${draft.stage+1} of 3</span></div><p class="mission-action">${['Drag the clock to 2 seconds. Watch where the dot goes.','Stretch the oval. The clock stays at 1 second.','The track is 4 metres from the center to each side, and 2 metres to the top.'][draft.stage]}</p><div class="ellipse-scene" data-ellipse-scene></div><output class="ellipse-readout" data-ellipse-readout></output>${controls()}<p data-ellipse-feedback aria-live="polite"></p><details class="mission-detail"><summary>Show me the math</summary><p>x = a cos(2πt / 8) &nbsp; y = b sin(2πt / 8)</p><p>t is time in seconds. a is the half-width; b is the half-height. The same time goes into both rules. At 2 seconds, the angle is π/2: the camera is at the top.</p><a href="#watch/precalculus.parametric-equations">Review the lesson →</a></details><div class="mission-step-footer"><button class="button secondary small" data-ellipse-back ${draft.stage===0?'disabled':''}>← Back</button>${draft.stage<2?'<button class="button" data-ellipse-next>Next →</button>':'<a class="button secondary" href="#watch/precalculus.parametric-equations/practice">Back to lesson practice →</a>'}</div><p class="mission-save-note" data-ellipse-status role="status"></p><details class="mission-detail"><summary>How does this connect to an orbit?</summary><p>This clock traces the shape of an ellipse. A spacecraft’s clock also depends on gravity: it moves faster near the body it orbits. Learn the coordinate idea here first.</p><a href="https://openstax.org/books/calculus-volume-2/pages/7-1-parametric-equations" target="_blank" rel="noopener noreferrer">Parametric equations · OpenStax</a></details></section>`;
  for(const key of ['seconds','a','b'])$('[data-'+key+']')?.addEventListener('input',e=>{draft[key]=Number(e.target.value);draw();save();},{signal:abort.signal});
  $('[data-ellipse-back]').onclick=()=>{draft.stage--;draft.shown=false;save();render(true);};
  $('[data-ellipse-next]')?.addEventListener('click',()=>{draft.stage++;draft.shown=false;save();render(true);},{signal:abort.signal});
  $('#ellipse-answer')?.addEventListener('input',e=>{draft.answer=e.target.value;draft.shown=false;$('[data-ellipse-feedback]').textContent='';draw();save();},{signal:abort.signal});
  $('[data-ellipse-form]')?.addEventListener('submit',async e=>{e.preventDefault();if(busy)return;busy=true;const answer=draft.answer;
   try{const value=coordinateAnswer(answer);await onSupport({kind:'parametric-comparison'});if(disposed||draft.stage!==2||answer!==draft.answer)return;draft.shown=true;draw();$('[data-ellipse-feedback]').textContent=Math.abs(value+4)<1e-8?'Yes — half a lap puts the dot on the left, at x = −4.':`Your x = ${fmt(value)} places the dot ${value>0?'on the right':value===0?'at the center':'on the left'}. Half a lap reaches the left edge, x = −4.`;save();}catch(error){if(!disposed&&draft.stage===2)$('[data-ellipse-feedback]').textContent=error.message;}finally{busy=false;}},{signal:abort.signal});
  draw();if(focus)$('[data-ellipse-heading]').focus({preventScroll:true});
 }
 render();return()=>{disposed=true;abort.abort();host.replaceChildren();};
}
