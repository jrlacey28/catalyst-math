const fmt=(v,d=2)=>Number.isFinite(v)?String(Number(v.toFixed(d))):'undefined';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ink='#425e44',blue='#6d99b4',gold='#d5a656',pink='#aa83a9';
const line=(x1,y1,x2,y2,c=ink,w=2,extra='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" ${extra}/>`;
const text=(x,y,t,c='#91a080',size=12,anchor='middle')=>`<text x="${x}" y="${y}" fill="${c}" font-size="${size}" text-anchor="${anchor}" font-family="Segoe UI, sans-serif">${t}</text>`;
const handle=(x,y,id,label,c=ink)=>`<circle cx="${x}" cy="${y}" r="16" fill="${c}" opacity=".08" pointer-events="none"/><circle class="handle" tabindex="0" role="button" aria-label="${label}. Use arrow keys to move." data-handle="${id}" cx="${x}" cy="${y}" r="7" fill="white" stroke="${c}" stroke-width="3"/>`;
const path=(d,c=ink,w=3)=>`<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const configs={
 functions:{title:'Functions in motion',note:'Drag the outlined points. Edit a parameter to move the graph. Arrow keys also move a focused point.',task:'Move the vertex to (2, −1). Make the parabola open upward. What stays unchanged when you only move the vertex?',prediction:'For y = a(x − h)² + k, increasing h moves the vertex…',options:['Right','Left','Up'],answer:0,why:'The vertex is (h, k). Increasing h moves its x-coordinate right.'},
 angles:{title:'Angles are turns',note:'Drag the endpoint around the semicircle, or adjust the angle below.',task:'Make the blue angle 65°. Predict the other angle before reading its value.',prediction:'If one angle in a straight pair increases by 10°, the other…',options:['Decreases by 10°','Increases by 10°','Stays the same'],answer:0,why:'Their total remains 180°, so the second angle must decrease by the same amount.'},
 triangle:{title:'Base, height, and area',note:'Drag the triangle’s top vertex. The height is always perpendicular to the base.',task:'Keep the height fixed and slide the top vertex left and right. Does the area change?',prediction:'Moving the top vertex sideways, with base and height fixed, makes area…',options:['Stay the same','Increase','Decrease'],answer:0,why:'Area is ½ × base × perpendicular height. Horizontal shearing changes neither factor.'},
 circles:{title:'A circle, one sector',note:'Drag the outer handle to change the radius. Change the angle to compare an arc with a sector.',task:'Double the radius. Compare the change in arc length with the change in sector area.',prediction:'At the same angle, doubling radius multiplies sector area by…',options:['4','2','8'],answer:0,why:'The angle fraction is unchanged, while πr² grows by 2² = 4.'},
 data:{title:'Move the data',note:'Each outlined dot is one observation. Drag horizontally. Repeated values stack vertically.',task:'Move just the largest value far to the right. Compare the mean, median, and standard deviation.',prediction:'Which measure of center is usually less sensitive to one extreme value?',options:['Median','Mean','Both respond identically'],answer:0,why:'The median depends on the middle ordered position, while the mean uses every value’s magnitude.'},
 probability:{title:'Two draws, no replacement',note:'Adjust the bag. The second-draw denominator is one smaller because the first ball stays out.',task:'Try 3 red and 2 blue. Explain why “at least one red” is easier to find using two blues.',prediction:'The complement of “at least one red in two draws” is…',options:['Two blue','Exactly one red','Two red'],answer:0,why:'No red means both draws are blue. Subtract that probability from 1.'},
 complex:{title:'A quarter-turn with i',note:'Drag z. The gold point is iz. Both axes use equal scales, so rotation preserves the drawn length.',task:'Move z into each quadrant. Predict which quadrant iz will land in before dragging.',prediction:'Multiplying 2 + 3i by i gives…',options:['−3 + 2i','3 + 2i','2 − 3i'],answer:0,why:'i(2 + 3i) = 2i + 3i² = −3 + 2i.'}
};
export const labNames=Object.fromEntries(Object.entries(configs).map(([k,v])=>[k,v.title]));
export function labFor(slug){
 if(['angles','triangles','congruence','similarity','area','volume','proof'].includes(slug))return slug==='angles'?'angles':'triangle';
 if(slug==='circles')return 'circles';if(['center','variance','standard-deviation','distributions','correlation'].includes(slug))return 'data';if(slug==='probability')return 'probability';if(slug==='complex-numbers')return 'complex';return 'functions';
}
export function mountLab(target,kind='functions',slug='quadratics'){
 const conf=configs[kind]||configs.functions;let state={model:({ 'coordinate-geometry':'linear','polynomials':'cubic','rational-functions':'rational','radicals':'radical','exponentials':'exponential','logarithms':'logarithm','sequences':'linear','series':'exponential'})[slug]||'quadratic',a:1,b:0,h:0,k:0,t:1,angle:55,r:2,tx:0,ty:3,values:[1,2,2,3,7],red:3,blue:2,zx:2,zy:1};
 if(state.model==='exponential'){state.a=2;state.b=1.5}if(state.model==='logarithm')state.b=2;
 let dragging=null,svg,controlDefs=[];
 const select=kind==='functions'?`<label class="control">Function family<select id="function-model" style="width:100%;padding:8px;margin-top:6px;border:1px solid #dce5d5;border-radius:6px;background:white">${['linear','quadratic','cubic','exponential','logarithm','rational','radical'].map(m=>`<option value="${m}" ${m===state.model?'selected':''}>${m[0].toUpperCase()+m.slice(1)}</option>`).join('')}</select></label>`:'';
 target.innerHTML=`<div class="lab-frame"><div class="lab-canvas"><svg id="math-board" viewBox="0 0 660 450" role="group" aria-label="${conf.title}. ${conf.note}"></svg></div><div class="lab-controls"><h3>${conf.title}</h3>${select}<div class="lab-equation" id="lab-equation"></div><div class="controls" id="lab-control-inputs"></div><div class="lab-note">${conf.note}</div><button class="button secondary small" id="lab-reset" style="margin-top:15px">Reset exploration ↺</button></div></div><div class="lab-stats" id="lab-stats" aria-live="polite"></div><div class="exploration"><p><strong>Try this.</strong> ${conf.task}</p></div><div class="prediction"><p><strong>Pause &amp; predict.</strong> ${conf.prediction}</p><div class="options">${conf.options.map((s,i)=>`<button class="button secondary small" data-predict="${i}">${s}</button>`).join('')}</div><div id="prediction-feedback" role="status"></div></div>`;
 svg=target.querySelector('svg');
 const X=x=>55+(x+6)/12*550,Y=y=>390-(y+6)/12*330;
 const inv=(x,y)=>[(x-55)/550*12-6,(390-y)/330*12-6];
 function grid(equal=false){let out=`<defs><clipPath id="plot-clip"><rect x="55" y="60" width="550" height="330"/></clipPath></defs>`;for(let i=-6;i<=6;i++){out+=line(X(i),60,X(i),390,i===0?'#c5d3bc':'#edf1e7',i===0?1.3:1);out+=line(55,Y(i),605,Y(i),i===0?'#c5d3bc':'#edf1e7',i===0?1.3:1);if(i!==0)out+=text(X(i),Y(0)+18,i,undefined,10)+text(X(0)-13,Y(i)+3,i,undefined,10)}return out+text(618,Y(0)+4,'x',ink,12)+text(X(0)+3,47,'y',ink,12)}
 function plot(f,c=ink){let d='',last=null;for(let i=0;i<=660;i++){const x=-6+12*i/660,y=f(x);if(!Number.isFinite(y)||Math.abs(y)>30){last=null;continue}d+=(last===null||Math.abs(y-last)>3?'M':'L')+X(x)+','+Y(y)+' ';last=y}return `<g clip-path="url(#plot-clip)">${path(d,c)}</g>`}
 function equation(){const s=state,sign=v=>v<0?' − '+fmt(-v):' + '+fmt(v),shift=s.h===0?'x':`(x${sign(-s.h)})`;
 if(s.model==='linear')return `y = ${fmt(s.a)}x${sign(s.b)}`;
 if(s.model==='quadratic')return `y = ${fmt(s.a)}${shift}²${sign(s.k)}`;
 if(s.model==='cubic')return `y = ${fmt(s.a)}${shift}³${sign(s.k)}`;
 if(s.model==='exponential')return `y = ${fmt(s.a)} · ${fmt(s.b)}ˣ`;
 if(s.model==='logarithm')return `y = log${s.b===2?'₂':s.b===10?'₁₀':'['+fmt(s.b)+']'}(x)`;
 if(s.model==='rational')return `y = ${fmt(s.a)} / ${shift}${sign(s.k)}`;
 return `y = √${shift}${sign(s.k)}`;
 }
 function fn(x){const s=state;switch(s.model){case 'linear':return s.a*x+s.b;case 'quadratic':return s.a*(x-s.h)**2+s.k;case 'cubic':return s.a*(x-s.h)**3+s.k;case 'exponential':return s.a*s.b**x;case 'logarithm':return x>0?Math.log(x)/Math.log(s.b):NaN;case 'rational':return Math.abs(x-s.h)<1e-8?NaN:s.a/(x-s.h)+s.k;default:return x>=s.h?Math.sqrt(x-s.h)+s.k:NaN}}
 function controls(){
 const D=(key,label,min,max,step=.1)=>({key,label,min,max,step});
 if(kind==='functions'){
  const model=state.model;
  controlDefs=model==='linear'?[D('a','Slope · m',-3,3),D('b','Intercept · b',-4,4)]:['quadratic','cubic'].includes(model)?[D('a','Scale · a',-2,2),D('h','Horizontal shift · h',-3,3),D('k','Vertical shift · k',-3,3)]:model==='exponential'?[D('a','Initial value · a',.2,4),D('b','Growth factor · b',.2,3)]:model==='logarithm'?[D('b','Base · b',1.1,5)]:model==='rational'?[D('a','Scale · a',-3,3),D('h','Excluded input · h',-3,3),D('k','Vertical shift · k',-3,3)]:[D('h','Domain starts at h',-3,3),D('k','Vertical shift · k',-3,3)];controlDefs.push(D('t','Probe input · x',-5,5));
 }else if(kind==='angles')controlDefs=[D('angle','Angle α · degrees',5,175,1)];
 else if(kind==='triangle')controlDefs=[D('tx','Top vertex · horizontal',-4,4),D('ty','Perpendicular height',.5,5)];
 else if(kind==='circles')controlDefs=[D('r','Radius',.5,4),D('angle','Sector angle · degrees',5,355,1)];
 else if(kind==='probability')controlDefs=[D('red','Red balls',1,10,1),D('blue','Blue balls',1,10,1)];
 else if(kind==='complex')controlDefs=[D('zx','Real part',-4,4),D('zy','Imaginary part',-4,4)];
 else controlDefs=state.values.map((v,i)=>D('value'+i,'Observation '+(i+1),0,12,.5));
 target.querySelector('#lab-control-inputs').innerHTML=controlDefs.map(d=>`<label class="control"><span class="control-row">${d.label}<input aria-label="${d.label}" class="control-number" type="number" data-key="${d.key}" min="${d.min}" max="${d.max}" step="${d.step}" value="${get(d.key)}"></span><input aria-label="${d.label} slider" type="range" data-key="${d.key}" min="${d.min}" max="${d.max}" step="${d.step}" value="${get(d.key)}"></label>`).join('');
 target.querySelectorAll('[data-key]').forEach(input=>input.addEventListener('input',()=>{if(input.value===''||!Number.isFinite(Number(input.value)))return;const d=controlDefs.find(x=>x.key===input.dataset.key),v=clamp(Number(input.value),d.min,d.max);if(v!==Number(input.value))input.value=v;set(d.key,v);draw()}));
 if(kind==='functions'){
  const prompts={linear:['Set the slope to 2 and intercept to −1. Probe x = 3, then predict the output before reading it.','Which parameter moves a line up without changing its slope?',['The intercept b','The slope m','The probe input x'],'Adding to b shifts every output equally.'],quadratic:[conf.task,conf.prediction,conf.options,conf.why],cubic:['Move the central handle horizontally and vertically. Then reverse the sign of a.','A negative a in y = a(x − h)³ + k reverses…',['The direction of rise','Only the domain','Only the probe input'],'Multiplying by a negative number reverses the vertical direction.'],exponential:['Compare factors below 1, equal to 1, and above 1. Keep the initial value fixed.','With a positive initial value, a factor between 0 and 1 gives…',['Decay','Growth','A vertical line'],'Each step multiplies the amount by a positive fraction.'],logarithm:['Change the base. Notice which point stays fixed on the graph. Probe a negative input too.','For any valid real logarithm base, log(1) equals…',['0','1','The base'],'Every valid base raised to the zero power equals 1.'],rational:['Move the excluded input h. Try a = 0 and compare the hole with a vertical asymptote.','Does a = 0 restore x = h in a/(x − h)?',['No','Yes','Only when h is positive'],'The original denominator is still zero at x = h.'],radical:['Move h and k. Find the first allowed input, then probe just to its left.','For √(x − h), real inputs must satisfy…',['x ≥ h','x > 0','x ≠ h'],'The radicand x − h must be nonnegative.']};
  const [task,prompt,options,why]=prompts[state.model];target.querySelector('.exploration p').innerHTML='<strong>Try this.</strong> '+task;target.querySelector('.prediction p').innerHTML='<strong>Pause &amp; predict.</strong> '+prompt;target.querySelector('.prediction .options').innerHTML=options.map((v,i)=>`<button class="button secondary small" data-predict="${i}">${v}</button>`).join('');target.querySelector('#prediction-feedback').innerHTML='';target.querySelectorAll('[data-predict]').forEach(b=>b.onclick=()=>{const correct=Number(b.dataset.predict)===0;target.querySelector('#prediction-feedback').innerHTML=`<div class="feedback ${correct?'correct':''}"><strong>${correct?'That’s right.':'Try changing one quantity at a time.'}</strong>${correct?why:'Compare the equation and the graph again.'}</div>`});
 }
 }
 function get(key){return key.startsWith('value')?state.values[Number(key.slice(5))]:state[key]}
 function set(key,v){if(key.startsWith('value'))state.values[Number(key.slice(5))]=v;else state[key]=v}
 function stats(items){target.querySelector('#lab-stats').innerHTML=items.map(([label,value])=>`<div class="stat-tile"><small>${label}</small><strong>${value}</strong></div>`).join('')}
 function draw(){let out='',eq='';
 if(kind==='functions'){
  out=grid()+plot(fn);eq=equation();const s=state;
  if(s.model==='linear')out+=handle(X(0),Y(s.b),'origin','Intercept '+fmt(s.b),blue)+handle(X(1),Y(s.a+s.b),'scale','Slope '+fmt(s.a),gold);
  if(['quadratic','cubic','radical'].includes(s.model))out+=handle(X(s.h),Y(s.k),'origin','Origin '+fmt(s.h)+', '+fmt(s.k),blue);
  if(['quadratic','cubic'].includes(s.model))out+=handle(X(s.h+1),Y(s.k+s.a),'scale','Scale '+fmt(s.a),gold);
  if(s.model==='exponential')out+=handle(X(0),Y(s.a),'origin','Initial value '+fmt(s.a),blue)+handle(X(1),Y(s.a*s.b),'scale','Factor '+fmt(s.b),gold);
  if(s.model==='logarithm')out+=handle(X(s.b),Y(1),'scale','Base '+fmt(s.b),gold);
  if(s.model==='rational')out+=(s.a===0?`<circle cx="${X(s.h)}" cy="${Y(s.k)}" r="5" fill="white" stroke="${pink}" stroke-width="2"/>`:line(X(s.h),60,X(s.h),390,pink,1.5,'stroke-dasharray="5 5"'))+handle(X(s.h+1),Y(s.a+s.k),'scale','Scale '+fmt(s.a),gold);
  const output=fn(s.t);if(Number.isFinite(output)&&Math.abs(output)<=6)out+=line(X(s.t),Y(0),X(s.t),Y(output),gold,1.5,'stroke-dasharray="4 4"')+`<circle cx="${X(s.t)}" cy="${Y(output)}" r="4" fill="${gold}"/>`;
  stats([['INPUT x',fmt(s.t)],['OUTPUT f(x)',fmt(output)],['RELATIONSHIP',s.model==='linear'?'Δy / Δx = '+fmt(s.a):s.model==='quadratic'?(s.a===0?'Constant function':'Vertex '+fmt(s.h)+', '+fmt(s.k)):s.model==='logarithm'?'x > 0':s.model==='rational'?'x ≠ '+fmt(s.h):s.model==='radical'?'x ≥ '+fmt(s.h):'Live graph']]);
 }else if(kind==='angles'){
  const rad=state.angle*Math.PI/180,o=[330,325],r=205,px=o[0]+r*Math.cos(rad),py=o[1]-r*Math.sin(rad),ax=o[0]+70*Math.cos(rad),ay=o[1]-70*Math.sin(rad);
  out=line(90,325,570,325,'#b8c8ab')+line(...o,px,py,blue,3)+path(`M 400 325 A 70 70 0 0 0 ${ax} ${ay}`,blue,3)+path(`M ${330+93*Math.cos(rad)} ${325-93*Math.sin(rad)} A 93 93 0 0 0 237 325`,gold,3)+handle(px,py,'angle','Angle '+fmt(state.angle)+' degrees',blue)+text(430,375,`α = ${fmt(state.angle)}°`,blue,18)+text(224,375,`β = ${fmt(180-state.angle)}°`,gold,18)+text(330,70,'A straight turn always totals 180°',ink,16);eq='α + β = 180°';stats([['ANGLE α',fmt(state.angle)+'°'],['ANGLE β',fmt(180-state.angle)+'°'],['TOTAL','180°']]);
 }else if(kind==='triangle'){
  const x=330+state.tx*45,y=350-state.ty*45;out=`<polygon points="150,350 510,350 ${x},${y}" fill="#e9f0df" stroke="${ink}" stroke-width="2.5"/>`+line(x,350,x,y,gold,2,'stroke-dasharray="5 5"')+line(Math.min(x,150),350,Math.max(x,510),350,'#adc398',1,'stroke-dasharray="4 4"')+path(`M ${x} 337 L ${x+13} 337 L ${x+13} 350`,gold,1.5)+handle(x,y,'vertex','Triangle top vertex',blue)+text(330,381,'base = 8',ink,16)+text(x+25,(350+y)/2,'h = '+fmt(state.ty),gold,14,'start');eq='A = ½ × b × h';stats([['BASE','8'],['HEIGHT',fmt(state.ty)],['AREA',fmt(4*state.ty)]])
 }else if(kind==='circles'){
  const r=state.r*42,angle=state.angle*Math.PI/180,x=330+r*Math.cos(angle),y=235-r*Math.sin(angle),large=state.angle>180?1:0;
  out=`<circle cx="330" cy="235" r="${r}" fill="#f2f6ed" stroke="${ink}" stroke-width="2"/><path d="M 330 235 L ${330+r} 235 A ${r} ${r} 0 ${large} 0 ${x} ${y} Z" fill="#ecdcab" fill-opacity=".6" stroke="${gold}" stroke-width="2"/>`+line(330,235,330+r,235,ink,2)+handle(330+r,235,'radius','Radius '+fmt(state.r),blue)+text(330,45,'The same fraction of a boundary and a disk',ink,16)+text(330+r/2,258,'r = '+fmt(state.r),ink,14);eq='θ / 360° of a circle';stats([['ARC LENGTH',fmt(state.angle/360*2*Math.PI*state.r)],['SECTOR AREA',fmt(state.angle/360*Math.PI*state.r**2)],['FRACTION OF CIRCLE',fmt(state.angle/360,3)]]);
 }else if(kind==='data'){
  const vals=state.values,mean=vals.reduce((a,b)=>a+b,0)/5,sorted=[...vals].sort((a,b)=>a-b),median=sorted[2],variance=vals.reduce((a,v)=>a+(v-mean)**2,0)/5,px=v=>70+v/12*520;
  out=text(330,55,'Drag an observation. Watch the summaries respond.',ink,16)+line(70,240,590,240,'#bfd0ae');for(let i=0;i<=12;i++)out+=line(px(i),234,px(i),246,'#b4c7a1',1)+text(px(i),267,i,undefined,11);
  vals.forEach((v,i)=>{const repeats=vals.slice(0,i).filter(x=>Math.abs(x-v)<.12).length;out+=handle(px(v),220-repeats*24,'data'+i,'Observation '+(i+1)+': '+fmt(v),blue)});
  out+=line(px(mean),285,px(mean),330,gold,2)+text(px(mean),353,'mean '+fmt(mean),gold,15)+line(px(median),130,px(median),176,pink,2)+text(px(median),110,'median '+fmt(median),pink,15);eq='σ = √(Σ(x − μ)² / N)';stats([['MEAN',fmt(mean)],['MEDIAN',fmt(median)],['POPULATION SD',fmt(Math.sqrt(variance))]]);
 }else if(kind==='probability'){
  const r=state.red,b=state.blue,n=r+b,rr=r/n*(r-1)/(n-1),bb=b/n*(b-1)/(n-1),top=[330,90],left=[180,215],right=[480,215],leaves=[[100,355],[260,355],[400,355],[560,355]];
  out=text(330,35,`${r} red · ${b} blue · without replacement`,ink,16)+line(...top,...left,pink,2)+line(...top,...right,blue,2)+text(224,137,`${r}/${n}`,pink,17)+text(439,137,`${b}/${n}`,blue,17)+text(160,210,'R',pink,16)+text(500,210,'B',blue,16);
  [[left,leaves[0],`${r-1}/${n-1}`,'RR',pink],[left,leaves[1],`${b}/${n-1}`,'RB',blue],[right,leaves[2],`${r}/${n-1}`,'BR',pink],[right,leaves[3],`${b-1}/${n-1}`,'BB',blue]].forEach(([p,q,prob,label,c])=>{out+=line(...p,...q,c,2)+text((p[0]+q[0])/2+12,(p[1]+q[1])/2,prob,c,15)+text(q[0],q[1]+29,label,c,16)});eq='P(at least one R) = 1 − P(BB)';stats([['TWO RED',fmt(100*rr)+'%'],['TWO BLUE',fmt(100*bb)+'%'],['AT LEAST ONE RED',fmt(100*(1-bb))+'%']]);
 }else{
  const s=state,x=v=>330+v*35,y=v=>230-v*35;
  for(let i=-5;i<=5;i++){out+=line(x(i),55,x(i),405,i===0?'#bdcbb3':'#edf1e7',1)+line(155,y(i),505,y(i),i===0?'#bdcbb3':'#edf1e7',1);if(i!==0)out+=text(x(i),y(0)+17,i,undefined,10)+text(x(0)-13,y(i)+3,i,undefined,10)}
  const len=Math.hypot(s.zx,s.zy)*35;out+=`<circle cx="330" cy="230" r="${len}" fill="none" stroke="#e4eade" stroke-dasharray="4 5"/>`+line(330,230,x(s.zx),y(s.zy),blue,3)+line(330,230,x(-s.zy),y(s.zx),gold,3)+handle(x(s.zx),y(s.zy),'complex','Complex z '+fmt(s.zx)+', '+fmt(s.zy),blue)+`<circle cx="${x(-s.zy)}" cy="${y(s.zx)}" r="5" fill="${gold}"/>`+text(x(-s.zy)+13,y(s.zx)-12,'iz',gold,17)+text(x(s.zx)+13,y(s.zy)-12,'z',blue,17)+text(534,235,'real',ink,11)+text(330,33,'imaginary',ink,11);eq='(a + bi)i = −b + ai';stats([['z',fmt(s.zx)+(s.zy<0?' − ':' + ')+fmt(Math.abs(s.zy))+'i'],['iz',fmt(-s.zy)+(s.zx<0?' − ':' + ')+fmt(Math.abs(s.zx))+'i'],['LENGTH |z|',fmt(Math.hypot(s.zx,s.zy))]]);
 }
 svg.innerHTML=out;target.querySelector('#lab-equation').textContent=eq;
 target.querySelectorAll('[data-key]').forEach(i=>{if(document.activeElement!==i)i.value=get(i.dataset.key)});
 }
 function move(id,x,y){const s=state,[gx,gy]=inv(x,y);if(kind==='functions'){
  if(id==='origin'){if(s.model==='linear')s.b=clamp(gy,-4,4);else if(s.model==='exponential')s.a=clamp(gy,.2,4);else{s.h=clamp(gx,-3,3);s.k=clamp(gy,-3,3)}}
  if(id==='scale'){if(s.model==='linear')s.a=clamp(gy-s.b,-3,3);else if(s.model==='exponential')s.b=clamp(gy/s.a,.2,3);else if(s.model==='logarithm')s.b=clamp(gx,1.1,5);else s.a=clamp(gy-s.k,s.model==='rational'?-3:-2,s.model==='rational'?3:2)}
 }else if(kind==='angles')s.angle=clamp(Math.atan2(325-y,x-330)*180/Math.PI,5,175);
 else if(kind==='triangle'){s.tx=clamp((x-330)/45,-4,4);s.ty=clamp((350-y)/45,.5,5)}
 else if(kind==='circles')s.r=clamp((x-330)/42,.5,4);
 else if(kind==='data')s.values[Number(id.slice(4))]=Math.round(clamp((x-70)/520*12,0,12)*2)/2;
 else if(kind==='complex'){s.zx=clamp((x-330)/35,-4,4);s.zy=clamp((230-y)/35,-4,4)}
 for(const key of ['a','b','h','k','r','tx','ty','zx','zy','angle'])s[key]=Math.round(s[key]*10)/10;draw();
 }
 svg.addEventListener('pointerdown',e=>{const id=e.target.dataset.handle;if(!id)return;dragging=id;svg.setPointerCapture(e.pointerId);e.preventDefault()});
 svg.addEventListener('pointermove',e=>{if(!dragging)return;const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse());move(dragging,p.x,p.y)});
 svg.addEventListener('pointerup',()=>dragging=null);svg.addEventListener('pointercancel',()=>dragging=null);
 svg.addEventListener('keydown',e=>{const id=e.target.dataset.handle;if(!id||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const x=Number(e.target.getAttribute('cx'))+(e.key==='ArrowRight'?5:e.key==='ArrowLeft'?-5:0),y=Number(e.target.getAttribute('cy'))+(e.key==='ArrowDown'?5:e.key==='ArrowUp'?-5:0);move(id,x,y);svg.querySelector(`[data-handle="${id}"]`)?.focus()});
 target.querySelector('#function-model')?.addEventListener('change',e=>{state.model=e.target.value;state.a=1;state.b=['exponential','logarithm'].includes(state.model)?2:0;state.h=0;state.k=0;controls();draw()});
 target.querySelector('#lab-reset').onclick=()=>mountLab(target,kind,slug);
 target.querySelectorAll('[data-predict]').forEach(b=>b.onclick=()=>{const good=Number(b.dataset.predict)===conf.answer;target.querySelector('#prediction-feedback').innerHTML=`<div class="feedback ${good?'correct':''}"><strong>${good?'That’s right.':'Try reasoning from the relationship.'}</strong>${good?conf.why:'Change one quantity at a time in the diagram and watch what stays fixed.'}</div>`});
 controls();draw();window.mathLab={getState:()=>JSON.parse(JSON.stringify(state)),fn,kind};return()=>{if(window.mathLab?.kind===kind)delete window.mathLab};
}

