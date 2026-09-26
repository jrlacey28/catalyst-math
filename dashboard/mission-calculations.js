import {missionModels} from './mission-math.js';
import {calculate} from './calculator-engine.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(n,d=3)=>Number.isFinite(n)?n.toLocaleString(undefined,{maximumFractionDigits:d}):'—';
const TAU=2*Math.PI, green='#367954', gold='#ab7223', purple='#8064aa', ink='#254538';
let serial=0;

// These small experiments test a measurable piece of the mission, not its entire
// advanced proof or an engineering design. Their models use the same units as the lab.
export function createCalculation({modelId,topicId='',controls={},factor=4}={}){
 if(!Object.hasOwn(missionModels,modelId))throw Error('Unknown mission model.');
 const m=missionModels[modelId](controls),base={modelId,topicId,controls:{...controls},model:m};
 if(modelId==='orbit'&&topicId==='arithmetic.exponents'){
  if(!Number.isFinite(factor)||factor<1||factor>8)throw Error('Choose a radius factor from 1 to 8.');
  return {...base,type:'orbit-ratio',factor,expected:factor**1.5,unit:'× the original period',label:'New period ÷ original period',
   prompt:`Two circular orbits surround the same body. Make the center-to-center radius ${fmt(factor)} times larger. How many times longer will one orbit take?`,
   givens:`First center distance: ${fmt(m.r0)} km. Second: ${fmt(m.r0*factor)} km. The first orbit takes T₁.`,
   formula:'T² ∝ r³, so T₂ / T₁ = √((r₂ / r₁)³). A radius factor of 4 gives a period factor of 8.',
   scope:'Ideal circular, two-body orbits. The dashed marker is your timing prediction; it is not a second physical orbit solution.'};
 }
 if(modelId==='orbit')return {...base,type:'orbit-speed',expected:m.circularSpeed,unit:'km/s',label:'Tangential launch speed',
  prompt:`What tangential speed will keep the spacecraft in a circular orbit at this altitude?`,
  givens:`Center distance r = ${fmt(m.r0)} km; gravitational parameter μ = ${fmt(m.mu)} km³/s².`,
  formula:'Gravity supplies centripetal acceleration: v² / r = μ / r², so v = √(μ / r).',scope:'Ideal two-body motion, no atmosphere or propulsion. Try a value between 0.02 and 12 km/s; the path stops at the surface.'};
 if(modelId==='supply')return {...base,type:'supply',expected:m.tanks,unit:'whole tanks',label:'Tanks to load',
  prompt:'How many full 5-litre tanks must you pack to cover the entire stay?',givens:`${m.crew} people × ${m.days} days × ${fmt(m.perPerson)} litres per person per day.`,
  formula:'Water required = people × days × litres per person per day. Divide by 5, then round up to a whole tank.',scope:'Invented water budget with constant consumption and no recycling. Whole tanks only; excess capacity is not extra water consumed.'};
 if(modelId==='rocket')return {...base,type:'rocket',expected:m.burnSeconds,unit:'seconds',label:'Planned engine burn',
  prompt:'How long can the engine burn before this propellant tank is empty?',givens:`Propellant: ${fmt(m.propellant)} kg. Constant flow: ${fmt(m.flow)} kg/s.`,
  formula:'Burn duration = propellant mass / mass flow. The ideal rocket model also changes acceleration as mass falls.',scope:'Ideal constant-flow burn. No gravity, drag or thrust throttling. A burn past fuel depletion cannot be carried out.'};
 if(modelId==='signal')return {...base,type:'signal',expected:1000/m.frequency,unit:'milliseconds',label:'One base-wave period',
  prompt:'How long should one complete cycle of the base wave take?',givens:`The base wave repeats ${fmt(m.frequency)} times per second.`,
  formula:'Period T = 1 / frequency. Multiply seconds by 1000 to obtain milliseconds.',scope:'The comparison shows the base sine wave only; the full model below also adds its chosen harmonic.'};
 if(modelId==='camera')return {...base,type:'camera',expected:m.unitX[0],unit:'map units',label:'Predicted x coordinate',
  prompt:'Where does the point (1, 0) land horizontally after this scale, turn and slide?',givens:`Horizontal scale ${fmt(m.sx)}; counterclockwise turn ${fmt(m.angle)}°; horizontal slide ${fmt(m.pan)}.`,
  formula:'Scale first, rotate next, translate last: x′ = sx cos(θ) + pan; y′ = sx sin(θ).',scope:'This probe checks the horizontal coordinate. The vertical coordinate is held at the model value, so it is not a complete coordinate-pair check.'};
 if(modelId==='energy')return {...base,type:'energy',expected:m.produced,unit:'kWh',label:'Solar energy available today',
  prompt:'How much solar energy does this ideal daylight curve produce between 6 a.m. and 6 p.m.?',givens:`Power = ${fmt(m.peak)} sin(π(t − 6)/12) kW during daylight; t is hours after midnight.`,
  formula:'Energy is area under power: ∫₆¹⁸ peak·sin(π(t−6)/12) dt = 24·peak / π kWh.',scope:'This compares daily energy totals. Enough total energy does not guarantee power at night; use the battery model to investigate timing.'};
 return {...base,type:'network',expected:m.best.cost,unit:'milliseconds',label:'Predicted shortest-route delay',
  prompt:'How soon can a packet reach E from A along the fastest route?',givens:'Add the edge delays along each possible route in the diagram; use the smallest route total.',
  formula:'A route delay is the sum of its edge delays. Compare the totals, not just the number of edges.',scope:'Fixed additive link delays, no congestion or retries. Packet loss is a separate quantity in the full model.'};
}

export function evaluateCalculation(task,source){
 if(typeof source!=='string'||source.length>120||!source.trim())throw Error('Enter a number or an expression, such as 12/5 or sqrt(8).');
 const parsed=calculate(source);if(parsed.hasX)throw Error('Evaluate your expression to a number; this field has no variable x.');const n=parsed.value;
 if(!Number.isFinite(n)||Math.abs(n)>1e6)throw Error('Use a finite value with magnitude at most 1,000,000.');
 if(['orbit-ratio','signal'].includes(task.type)&&n<=0)throw Error('A period must be greater than zero.');
 if(['orbit-ratio','signal'].includes(task.type)&&n<.000001)throw Error('This display supports periods of at least 0.000001 in the stated units. Your value has not been changed.');
 if(task.type==='orbit-speed'&&(n<.02||n>12))throw Error('The orbit simulator supports speeds from 0.02 to 12 km/s. Your value has not been changed.');
 if(['supply','rocket','energy','network'].includes(task.type)&&n<0)throw Error('Use a nonnegative amount for this quantity.');
 if(task.type==='supply'&&!Number.isInteger(n))throw Error('Pack a whole number of full tanks. Your fractional tank count has not been rounded for you.');
 const error=n-task.expected,close=task.type==='supply'?n===task.expected:Math.abs(error)<=Math.max(.0005,Math.abs(task.expected)*.002);
 let meaning='';let physical=null;
 if(task.type==='orbit-ratio')meaning=`Your spacecraft prediction takes ${fmt(n)}T₁ for a lap. The circular-orbit law gives ${fmt(task.expected)}T₁. Move time forward to see them separate or stay together.`;
 if(task.type==='orbit-speed'){physical=missionModels.orbit({...task.controls,speedKmS:n});meaning=`At your speed the model gives ${physical.kind}. Circular speed is ${fmt(task.expected,5)} km/s. ${physical.periapsis<physical.primary.contactKm?'The path reaches the surface.':'Compare its distance from the circular reference ring.'}`;}
 if(task.type==='supply'){const delta=n*5-task.model.total;meaning=delta<0?`Your ${n} tanks carry ${fmt(n*5)} L: ${fmt(-delta)} L short. The water runs out before the stay ends.`:`Your ${n} tanks cover the stay with ${fmt(delta)} L of unused capacity. ${n>task.expected?'You could carry fewer full tanks and still cover it.':'This is the smallest whole-tank count that covers it.'}`;}
 if(task.type==='rocket'){const fuel=n*task.model.flow;meaning=fuel>task.model.propellant?`This plan needs ${fmt(fuel)} kg of propellant, ${fmt(fuel-task.model.propellant)} kg more than the tank contains. The burn stops at ${fmt(task.expected)} s.`:`The planned burn uses ${fmt(fuel)} kg, leaving ${fmt(task.model.propellant-fuel)} kg. ${close?'You reach fuel depletion.':'You stop before fuel depletion.'}`;}
 if(task.type==='signal')meaning=`Your period implies ${fmt(1000/n)} Hz. The generator is set to ${fmt(task.model.frequency)} Hz. Trace one full cycle of each curve.`;
 if(task.type==='camera')meaning=`Your predicted point is (${fmt(n)}, ${fmt(task.model.unitX[1])}); the transform puts it at (${fmt(task.expected)}, ${fmt(task.model.unitX[1])}). The dotted segment is the horizontal placement error.`;
 if(task.type==='energy')meaning=error>0?`Your budget promises ${fmt(error)} kWh more than the daylight curve produces. That energy would need another source.`:`Your budget leaves ${fmt(-error)} kWh of today's production uncounted. ${close?'The energy budget agrees.':'The rectangle and curve should have the same area.'}`;
 if(task.type==='network')meaning=`The fastest route is ${task.model.best.nodes.join(' → ')} at ${fmt(task.expected)} ms. ${error<0?`Your arrival is ${fmt(-error)} ms too early for these links.`:error>0?`Your estimate arrives ${fmt(error)} ms later than the fastest route.`:'Your timing agrees with the route.'}`;
 return {value:n,expected:task.expected,error,close,meaning,physical};
}

const txt=(x,y,s,size=14,color=ink)=>`<text x="${x}" y="${y}" fill="${color}" font-size="${size}">${esc(s)}</text>`;
const line=(a,b,c,d,color='#cbd8ce',dash='')=>`<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="${color}" stroke-width="2" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
const dot=(x,y,color,r=7)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" stroke="white" stroke-width="2"/>`;
const poly=(points,color,dash='')=>`<polyline points="${points.map(p=>p.map(v=>Number(v).toFixed(2)).join(',')).join(' ')}" fill="none" stroke="${color}" stroke-width="3" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
function bars(expected,actual,labels,unit){
 const max=Math.max(expected,actual??0,1)*1.08,k=500/max;
 return [expected,actual].map((v,i)=>v==null?'':txt(30,45+i*90,labels[i])+`<rect x="30" y="${58+i*90}" width="${Math.max(0,v*k)}" height="28" rx="5" fill="${i?gold:green}"/>`+txt(30,110+i*90,fmt(v)+' '+unit)).join('');
}

export function renderCalculationScene(task,outcome=null,{time=1}={}){
 const m=task.model,n=outcome?.value;let body='',caption='Explore the givens, enter your calculation, then run it in the scene.';
 if(task.type==='orbit-ratio'){
  const outer=112,inner=outer/task.factor,cx=290,cy=137,angle=TAU*time/task.expected;
  body=`<circle cx="${cx}" cy="${cy}" r="${Math.max(4,inner*m.primary.radiusKm/m.r0)}" fill="#ccd6df"/><circle cx="${cx}" cy="${cy}" r="${inner}" fill="none" stroke="#b6c9bd"/><circle cx="${cx}" cy="${cy}" r="${outer}" fill="none" stroke="${green}" stroke-width="2"/>`;
  body+=dot(cx+inner*Math.cos(TAU*time),cy-inner*Math.sin(TAU*time),'#708799',5)+txt(20,23,`Center radius × ${fmt(task.factor)}; elapsed time ${fmt(time)}T₁`);
  if(outcome){const a=TAU*time/n,x=cx+outer*Math.cos(angle),y=cy-outer*Math.sin(angle),px=cx+outer*Math.cos(a),py=cy-outer*Math.sin(a);body+=line(x,y,px,py,gold,'5 5')+dot(x,y,green,9)+`<circle cx="${px}" cy="${py}" r="13" fill="none" stroke="${gold}" stroke-width="3" stroke-dasharray="4 3"/>`;caption='Green dot: position from the circular-orbit law. Dashed gold ring: position from your predicted period. They can meet temporarily even when the periods differ; compare a full lap.';}
 }else if(task.type==='orbit-speed'){
  const physical=outcome?.physical||m,points=physical.points.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
  const max=Math.max(m.r0*1.2,...points.map(p=>Math.hypot(p.x,p.y))),k=112/max,cx=290,cy=133;
  body=`<circle cx="${cx}" cy="${cy}" r="${m.primary.radiusKm*k}" fill="#ccd6df"/><circle cx="${cx}" cy="${cy}" r="${m.r0*k}" fill="none" stroke="${green}" stroke-width="2" stroke-dasharray="5 4"/>`+poly(points.map(p=>[cx+p.x*k,cy-p.y*k]),gold)+txt(20,24,'Equal distance scale in both directions · km');
  caption='Gold: trajectory from the chosen speed. Green dashed ring: circular reference. Wide escape paths make the body look smaller because the whole plot uses one distance scale.';
 }else if(task.type==='signal'){
  const end=m.periodSeconds*2,yscale=62,base=Array.from({length:301},(_,i)=>[35+510*i/300,140-yscale*Math.sin(TAU*i/300*2)]);
  body=line(35,140,550,140)+poly(base,green)+txt(30,30,'Base-wave amplitude')+txt(390,254,fmt(end*1000)+' ms →');
  if(outcome){const cycles=end/(n/1000),step=Math.min(800,Math.max(300,Math.ceil(cycles*30)));body+=poly(Array.from({length:step+1},(_,i)=>[35+510*i/step,140-yscale*Math.sin(TAU*end*i/step/(n/1000))]),gold,'6 4');caption=cycles>25?'Your period is so short that many cycles fit in this window; the dense dashed trace is a sampled preview. The frequency readout is the precise comparison.':'Green: the generator’s base wave. Dashed gold: a wave with your calculated period.';}
 }else if(task.type==='camera'){
  const a=m.unitX,max=Math.max(3,Math.abs(a[0]),Math.abs(a[1]),Math.abs(n??0)),k=100/max,cx=285,cy=142;
  body=line(30,cy,550,cy)+line(cx,30,cx,250)+txt(530,cy-8,'x')+txt(cx+8,28,'y')+poly([[cx,cy],[cx+k,cy]],'#8eaaa0')+dot(cx+k,cy,'#8eaaa0')+txt(25,25,'Point (1, 0) → scale → rotate → slide');
  if(outcome)body+=poly([[cx+m.pan*k,cy],[cx+a[0]*k,cy-a[1]*k]],green)+dot(cx+a[0]*k,cy-a[1]*k,green)+line(cx+a[0]*k,cy-a[1]*k,cx+n*k,cy-a[1]*k,gold,'4 4')+dot(cx+n*k,cy-a[1]*k,gold);
  caption='Equal coordinate scales. Green point: transformed (1, 0). Gold point: your horizontal prediction with the same vertical coordinate.';
 }else if(task.type==='energy'){
  const high=Math.max(m.peak,(n??0)/12,1),ky=160/high,pts=Array.from({length:101},(_,i)=>[35+510*i/100,210-ky*m.peak*Math.sin(Math.PI*i/100)]);
  body=`<path d="M35 210 ${pts.map(p=>'L'+p.join(' ')).join(' ')} L545 210Z" fill="#d9e8d2"/>`+poly(pts,green)+line(35,210,545,210)+txt(30,245,'6 a.m.')+txt(485,245,'6 p.m.')+txt(30,26,'Power (kW); area is energy (kWh)');
  if(outcome)body+=`<rect x="35" y="${210-ky*n/12}" width="510" height="${ky*n/12}" fill="none" stroke="${gold}" stroke-width="3" stroke-dasharray="6 5"/>`;
  caption='Green area: the energy produced by the sine-shaped power curve. Gold rectangle: your energy budget spread evenly across the same 12 hours. Equal area matters, not equal height.';
 }else if(task.type==='network'){
  const positions={A:[60,140],B:[235,65],C:[235,215],D:[410,140],E:[535,65]};
  body=m.edges.map(([from,to,cost])=>{const [a,b]=[positions[from],positions[to]];return line(...a,...b)+txt((a[0]+b[0])/2,(a[1]+b[1])/2-7,fmt(cost)+' ms',12);}).join('');
  if(outcome)body+=poly(m.best.nodes.map(id=>positions[id]),green);
  body+=Object.entries(positions).map(([name,p])=>dot(...p,purple,17)+txt(p[0]-5,p[1]+5,name,14,'white')).join('');
  if(outcome){const scale=490/Math.max(n,task.expected,1);body+=line(35,255,535,255)+dot(35+task.expected*scale,255,green,7)+dot(35+n*scale,255,gold,5)+txt(25,25,`Arrival: your ${fmt(n)} ms · fastest ${fmt(task.expected)} ms`);}
  caption='Edges display link delays. After running, the green route is the fastest available path; the readout compares your arrival estimate.';
 }else{
  const expected=task.type==='supply'?m.total:m.propellant,actual=outcome?(task.type==='supply'?n*5:n*m.flow):null;
  body=bars(expected,actual,task.type==='supply'?['Water the crew needs','Capacity you packed']:['Propellant in the tank','Propellant your burn requires'],task.type==='supply'?'litres':'kg');
  if(outcome){const max=Math.max(expected,actual,1)*1.08;body+=line(30+500*expected/max,47,30+500*expected/max,207,purple,'4 4');}
  caption=task.type==='supply'?'Both bars use the same litre scale. Packing too few tanks leaves a visible shortage.':'Both bars use the same mass scale. The dashed line marks the actual fuel available.';
 }
 return `<figure class="calculation-scene"><svg viewBox="0 0 580 280" role="img" aria-label="${esc(caption)}"><title>${esc(task.label)}</title><desc>${esc(caption)}</desc>${body}</svg><figcaption>${esc(caption)}</figcaption></figure>`;
}

export function mountMissionCalculation(host,{topicId,modelId,initialControls={},initialDraft={},onSupport=async()=>{},onDraft=()=>{}}={}){
 const abort=new AbortController(),id='calculation-'+(++serial);let disposed=false,busy=false,controls={...initialControls},draft={answer:'',factor:4,time:1,ran:false,...initialDraft},outcome=null,task;
 const $=s=>host.querySelector(s);
 function save(){Promise.resolve(onDraft({...draft})).catch(()=>{if(!disposed)$('[data-calc-status]').textContent='This experiment could not be saved. Copy your value before leaving.';});}
 function build(){task=createCalculation({topicId,modelId,controls,factor:draft.factor});}
 function scene(){if(disposed)return;$('[data-calc-scene]').innerHTML=renderCalculationScene(task,outcome,{time:draft.time});$('[data-calc-feedback]').innerHTML=outcome?`<p class="calculation-verdict ${outcome.close?'agrees':'revise'}">${outcome.close?'Your calculation agrees with this model.':'See what your calculation changes.'}</p><p>${esc(outcome.meaning)}</p><details><summary>Walk through the relationship</summary><p>${esc(task.formula)}</p><p>Model value: <strong>${fmt(task.expected,6)} ${esc(task.unit)}</strong>. Display agreement uses a 0.2% rounding allowance; it does not award a lesson pass.</p></details>`:'';}
 build();
 host.innerHTML=`<section class="mission-calculation" aria-labelledby="${id}-title"><span class="eyebrow">PUT YOUR CALCULATION TO WORK</span><h3 id="${id}-title">What would your answer do?</h3><p data-calc-prompt>${esc(task.prompt)}</p><p class="calculation-givens" data-calc-givens>${esc(task.givens)}</p>${task.type==='orbit-ratio'?`<label class="calculation-slider">Radius multiplier <output data-factor-value>${draft.factor}</output><input type="range" aria-label="Radius multiplier" min="1" max="8" step=".25" value="${draft.factor}" data-factor></label>`:''}<form class="calculation-form"><label for="${id}-answer">${esc(task.label)} <small>(${esc(task.unit)})</small></label><div><input type="text" id="${id}-answer" class="answer-input calculation-answer" maxlength="120" inputmode="text" autocomplete="off" placeholder="A number or an expression" value="${esc(draft.answer)}"><button type="submit" class="button">Run my calculation →</button></div></form>${task.type==='orbit-ratio'?`<label class="calculation-slider">Elapsed time <output data-time-value>${draft.time}T₁</output><input type="range" aria-label="Elapsed time in original orbit periods" min="0" max="16" step=".05" value="${draft.time}" data-time></label>`:''}<div data-calc-scene></div><div data-calc-feedback aria-live="polite"></div><p data-calc-status role="status"></p><p class="calculation-scope">${esc(task.scope)}</p><p class="calculation-scope">This tests one measurable part of the mission. Keep using the lesson’s reasoning and full model for the rest.</p></section>`;
 scene();
 async function run(persist=true){if(disposed||busy)return;busy=true;const button=$('button[type=submit]');button.disabled=true;const value=draft.answer,requestTask=task;try{const result=evaluateCalculation(requestTask,value);await onSupport({topicId,kind:'calculation-scene'});if(disposed||value!==draft.answer||task!==requestTask)return;outcome=result;draft.ran=true;scene();$('[data-calc-status]').textContent='';if(persist)save();}catch(e){if(!disposed&&task===requestTask){outcome=null;draft.ran=false;scene();$('[data-calc-status]').textContent=e.message;}}finally{busy=false;if(!disposed)button.disabled=false;}}
 $('form').addEventListener('submit',e=>{e.preventDefault();void run();},{signal:abort.signal});
 $('.calculation-answer').addEventListener('input',e=>{draft.answer=e.target.value;draft.ran=false;outcome=null;scene();save();},{signal:abort.signal});
 $('[data-factor]')?.addEventListener('input',e=>{draft.factor=Number(e.target.value);$('[data-factor-value]').textContent=draft.factor;draft.ran=false;outcome=null;build();$('[data-calc-prompt]').textContent=task.prompt;$('[data-calc-givens]').textContent=task.givens;scene();save();},{signal:abort.signal});
 $('[data-time]')?.addEventListener('input',e=>{draft.time=Number(e.target.value);$('[data-time-value]').textContent=fmt(draft.time)+'T₁';scene();save();},{signal:abort.signal});
 if(draft.ran&&draft.answer)void run(false);
 const dispose=()=>{disposed=true;abort.abort();host.replaceChildren();};
 dispose.updateControls=next=>{const previous={...controls},current={...next};delete previous.progress;delete current.progress;controls={...next};if(JSON.stringify(previous)===JSON.stringify(current))return;draft.ran=false;outcome=null;build();$('[data-calc-prompt]').textContent=task.prompt;$('[data-calc-givens]').textContent=task.givens;scene();save();};
 return dispose;
}
