import {mountParametricMotion} from './parametric-motion.js';
import {cardArt} from './card-art.js';
import {mountMissionCalculation} from './mission-calculations.js';
import {missionModels,orbitElements,lunarDistancePreset,NETWORK_NODES,clamp} from './mission-math.js';

let cachedContent = null, pendingContent = null, serial = 0;
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = (n,d=2) => Number.isFinite(n) ? n.toLocaleString(undefined,{maximumFractionDigits:d}) : '—';
const durationLabel = seconds => seconds>=172800?fmt(seconds/86400,2)+' days':seconds>=3600?fmt(seconds/3600,2)+' h':fmt(seconds/60,2)+' min';
const C = {ink:'#254538',muted:'#566f64',line:'#d6e1d8',blue:'#246f9b',green:'#337957',gold:'#975f15',purple:'#7856a6',red:'#b44b42'};
export async function loadMissionContent(api) {
  if(cachedContent)return cachedContent;
  if(!pendingContent)pendingContent=(async()=>{
    const data=api?await api('missions'):await fetch('/api/missions').then(r=>{if(!r.ok)throw new Error('Mission content unavailable');return r.json();});
    if(!Array.isArray(data?.missions)||!Array.isArray(data?.models))throw new Error('Invalid mission content');
    cachedContent=data;return data;
  })().finally(()=>{pendingContent=null;});
  return pendingContent;
}
export function relatedMission(topicId,content=cachedContent) {
  const m=content?.missions?.find(item=>item.topic_id===topicId);
  return m?{title:m.title,brief:m.brief,modelId:m.model_id,topic_id:m.topic_id,extension:m.extension}:null;
}
const defaults={
  orbit:{body:'moon',altitudeKm:100,speedKmS:1.7,progress:0},
  rocket:{dryMass:2000,propellant:6000,flow:100,exhaust:3000,progress:50},
  supply:{crew:3,days:4,perPerson:2.5},signal:{frequency:220,harmonic:2,mix:.5,phase:0},
  camera:{angle:30,sx:1.5,sy:1,pan:0},energy:{peak:4,capacity:12,load:1},
  network:{ridge:4,crater:6,failure:10,packets:20},
};
const controls={
  orbit:[['altitudeKm','Starting altitude','km',10,20000,10],['speedKmS','Tangential starting speed','km/s',.02,12,.005],['progress','Time through displayed path','%',0,100,.25]],
  rocket:[['dryMass','Dry mass','kg',500,10000,100],['propellant','Initial propellant','kg',0,20000,250],['flow','Propellant flow','kg/s',5,500,5],['exhaust','Effective exhaust speed','m/s',1000,4500,100],['progress','Burn progress','%',0,100,1]],
  supply:[['crew','Crew','people',1,8,1],['days','Stay','days',1,14,1],['perPerson','Water per person per day','L',.5,4,.25]],
  signal:[['frequency','Base frequency','Hz',80,440,1],['harmonic','Second harmonic','× base',1,6,1],['mix','Second amplitude','relative',0,1,.05],['phase','Second phase','degrees',0,360,5]],
  camera:[['angle','Counterclockwise turn','degrees',-180,180,5],['sx','Horizontal scale','×',-2.5,2.5,.1],['sy','Vertical scale','×',-2.5,2.5,.1],['pan','Horizontal translation','map units',-2,2,.1]],
  energy:[['peak','Peak solar production','kW',0,10,.25],['capacity','Battery capacity','kWh',0,24,.5],['load','Constant stage load','kW',0,3,.1]],
  network:[['ridge','Base–Ridge delay','ms',1,15,1],['crater','Crater–Relay delay','ms',1,15,1],['failure','Failure per edge per packet','%',0,40,1],['packets','Packets sent','packets',1,100,1]],
};
function text(x,y,value,size=13,color=C.ink,anchor='start') {return '<text x="'+x+'" y="'+y+'" font-size="'+size+'" fill="'+color+'" text-anchor="'+anchor+'">'+escapeHTML(value)+'</text>';}
const line=(x1,y1,x2,y2,color=C.line,width=1,dash='')=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+color+'" stroke-width="'+width+'"'+(dash?' stroke-dasharray="'+dash+'"':'')+'/>';
const circle=(x,y,r,fill,stroke='none')=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+fill+'" stroke="'+stroke+'"/>';
const path=(points,color,width=3,fill='none')=>'<path d="'+points.map((p,i)=>(i?'L':'M')+p[0].toFixed(3)+','+p[1].toFixed(3)).join(' ')+'" fill="'+fill+'" stroke="'+color+'" stroke-width="'+width+'" stroke-linejoin="round"/>';
function arrow(x,y,dx,dy,color) {
  const a=Math.atan2(dy,dx),tip=[x+dx,y+dy];
  return line(x,y,...tip,color,2.5)+path([[tip[0]-8*Math.cos(a-.45),tip[1]-8*Math.sin(a-.45)],tip,[tip[0]-8*Math.cos(a+.45),tip[1]-8*Math.sin(a+.45)]],color,2.5);
}
function axes({xmin=0,xmax=1,ymin=0,ymax=1,x=65,y=65,w=610,h=235,xlabel='',ylabel='',ticks=4}={}) {
  const X=v=>x+(v-xmin)/(xmax-xmin)*w,Y=v=>y+h-(v-ymin)/(ymax-ymin)*h;
  let svg=text(x,y-15,ylabel,12,C.muted)+text(x+w,y+h+42,xlabel,12,C.muted,'end');
  for(let i=0;i<=ticks;i++) {
    const vx=xmin+(xmax-xmin)*i/ticks,vy=ymin+(ymax-ymin)*i/ticks;
    svg+=line(X(vx),y,X(vx),y+h,C.line,1)+text(X(vx),y+h+21,fmt(vx,2),11,C.muted,'middle');
    svg+=line(x,Y(vy),x+w,Y(vy),C.line,1)+text(x-9,Y(vy)+4,fmt(vy,2),11,C.muted,'end');
  }
  return {X,Y,svg};
}
function displayOrbit(r) {
  const extent=Math.max(r.primary.radiusKm,...r.points.flatMap(p=>[Math.abs(p.x),Math.abs(p.y)]))*1.12;
  const scale=146/extent,X=x=>360+x*scale,Y=y=>185-y*scale;
  let svg=text(26,30,r.body==='moon'?'Spacecraft around the Moon':'Earth–Moon relative orbit',18)+
    text(26,54,r.kind,13,r.collision?C.red:C.muted)+line(70,185,650,185,C.line,1)+line(360,30,360,340,C.line,1);
  svg+=path(r.points.map(p=>[X(p.x),Y(p.y)]),r.collision?C.red:C.purple,2.7);
  for(const p of r.dots)svg+=circle(X(p.x),Y(p.y),3.1,C.gold);
  svg+=circle(X(0),Y(0),r.primary.radiusKm*scale,r.body==='moon'?'#d4ddd0':'#91c4d1',C.muted);
  svg+=text(X(0),Y(0)+r.primary.radiusKm*scale+17,r.primary.name,12,C.muted,'middle');
  const p=r.current;svg+=circle(X(p.x),Y(p.y),6,p.impact?C.red:C.blue,'#fff');
  const v=Math.hypot(p.vx,p.vy),a=Math.hypot(p.ax,p.ay);
  svg+=arrow(X(p.x),Y(p.y),p.vx/v*42,-p.vy/v*42,C.blue);
  svg+=arrow(X(p.x),Y(p.y),p.ax/a*29,-p.ay/a*29,C.green);
  svg+=text(25,365,'Gold dots: equal time • Blue: velocity • Green: gravity',12,C.muted);
  svg+=text(695,365,'Equal x/y scale',11,C.muted,'end');
  const period=r.collision?'No complete orbit':r.periodSeconds?durationLabel(r.periodSeconds):'No closed period';
  return {svg,stats:[[r.body==='earth-moon'?'Moon center above Earth surface':'Current altitude',fmt(p.altitudeKm)+' km'],['Current speed',fmt(p.speed,4)+' km/s'],['Orbit period',period],
    ['Eccentricity',fmt(r.eccentricity,5)],['Circular start speed',fmt(r.circularSpeed,4)+' km/s'],['Escape start speed',fmt(r.escapeSpeed,4)+' km/s']],
    summary:r.kind+'. '+durationLabel(p.t)+' after the tangential start. '+(p.impact?'Stopped at contact. ':'')+
      (r.bound&&!r.completePath?'Only part of this long period is drawn. ':'')+
      'Arrow lengths and the moving marker are enlarged; directions and equal-time positions follow the two-body model.',
    equations:['r″ = −μr / ‖r‖³;  ε = v²/2 − μ/r','Bound motion: v² = μ(2/r − 1/a); T = 2π√(a³/μ)'],
    rows:[['Starting center distance',fmt(r.r0)+' km'],['Current center distance',fmt(p.radius)+' km'],['Current position (x, y)',fmt(p.x,4)+', '+fmt(p.y,4)+' km'],['Closest center distance',fmt(r.periapsisKm)+' km'],['Farthest center distance',r.apoapsisKm?fmt(r.apoapsisKm)+' km':'Unbounded'],['Specific energy ε',fmt(r.energy,5)+' km²/s²'],['Velocity components',fmt(p.vx,4)+', '+fmt(p.vy,4)+' km/s'],['Acceleration magnitude',fmt(Math.hypot(p.ax,p.ay)*1000,5)+' m/s²']]};
}
function displayRocket(r) {
  const f=axes({xmax:Math.max(1,r.burnSeconds),ymax:Math.max(1,r.deltaV*1.08),xlabel:'Burn time (s)',ylabel:'Velocity gain (m/s)',h:220});
  let svg=f.svg+path(r.points.map(p=>[f.X(p.seconds),f.Y(p.velocity)]),C.blue);
  svg+=line(f.X(r.current.seconds),f.Y(0),f.X(r.current.seconds),f.Y(r.current.velocity),C.gold,2,'4 4')+circle(f.X(r.current.seconds),f.Y(r.current.velocity),6,C.gold);
  svg+='<rect x="65" y="340" width="610" height="15" rx="6" fill="#e4eadd"/><rect x="65" y="340" width="'+610*r.current.mass/r.initialMass+'" height="15" rx="6" fill="#648a6b"/>';
  svg+=text(65,380,'Remaining mass: dry hardware + unspent propellant',12,C.muted);
  return {svg,stats:[['Velocity gain',fmt(r.current.velocity)+' m/s'],['Acceleration',fmt(r.current.acceleration)+' m/s²'],['Remaining mass',fmt(r.current.mass)+' kg'],
    ['Elapsed time',fmt(r.current.seconds)+' s'],['Total ideal delta-v',fmt(r.deltaV)+' m/s'],['Distance during burn',fmt(r.current.distance/1000)+' km']],
    summary:'A straight ideal burn, with no gravity or drag. At full burn the acceleration is the limit just before shutoff; this is not a launch trajectory.',
    equations:['m(t) = m₀ − qt; v(t) = vₑ ln(m₀/m(t))','a(t) = vₑq/m(t), while burning; dry mass stays positive'],
    rows:r.points.filter((_,i)=>i%30===0).map(p=>[fmt(p.seconds)+' s',fmt(p.velocity)+' m/s; '+fmt(p.mass)+' kg'])};
}
function displaySupply(r) {
  let svg=text(30,32,r.crew+' crew × '+r.days+' days × '+fmt(r.perPerson)+' L',20)+text(30,56,'Each outlined tank holds 5 L. Blue is required water.',13,C.muted);
  for(let i=0;i<r.tanks;i++) {
    const x=36+(i%15)*44,y=85+Math.floor(i/15)*43,fill=Math.min(5,Math.max(0,r.total-i*5))/5;
    svg+='<rect x="'+x+'" y="'+y+'" width="32" height="30" rx="5" fill="#fff" stroke="#7399aa"/>';
    svg+='<rect x="'+(x+3)+'" y="'+(y+27-24*fill)+'" width="26" height="'+24*fill+'" rx="2" fill="#a4d6e5"/>';
    svg+=text(x+16,y+21,i+1,11,C.ink,'middle');
  }
  svg+=text(30,373,'Containers are whole; water amounts can be fractional.',13,C.muted);
  return {svg,stats:[['Required water',fmt(r.total)+' L'],['Whole tanks',String(r.tanks)],['Unused capacity',fmt(r.unusedCapacity)+' L']],
    summary:'This invented plan uses '+fmt(r.daily)+' L each day. Pack '+r.tanks+' tanks with at least '+fmt(r.total)+' L total capacity. No recycling or reserve is included.',
    equations:['Water = crew × days × liters per person per day','Tanks = ceiling(required liters / 5)'],
    rows:[['One day',fmt(r.daily)+' L'],['Full stay',fmt(r.total)+' L'],['Packed capacity',fmt(r.tanks*5)+' L']]};
}
function displaySignal(r) {
  const f=axes({xmax:2000/r.frequency,ymin:-2.2,ymax:2.2,xlabel:'Time (milliseconds)',ylabel:'Relative signal amplitude',h:235});
  let svg=f.svg;
  for(const [key,color,width] of [['first',C.blue,1.4],['second',C.gold,1.4],['y',C.purple,3]])svg+=path(r.points.map(p=>[f.X(p.t*1000),f.Y(p[key])]),color,width);
  svg+=text(65,367,'Blue: base sine • Gold: second component • Purple: sum',12,C.muted);
  return {svg,stats:[['Base frequency',fmt(r.frequency)+' Hz'],['Base period',fmt(1000/r.frequency,3)+' ms'],['Signal RMS',fmt(r.rms,4)]],
    summary:'Two base periods are shown. The second frequency is '+fmt(r.harmonic*r.frequency)+' Hz. Amplitudes add algebraically; RMS measures a full-period square mean, not perceived loudness.',
    equations:['y(t) = sin(2πft) + b sin(2πnft + φ)','RMS = √(mean of y² over one base period)'],
    rows:[['Second harmonic',String(r.harmonic)],['Second amplitude',fmt(r.mix)],['Second phase',fmt(r.phase)+'° = '+fmt(r.phase*Math.PI/180,4)+' rad']]};
}
function displayCamera(r) {
  const f=axes({xmin:-6,xmax:6,ymin:-6,ymax:6,x:205,y:47,w:290,h:290,xlabel:'x (map units)',ylabel:'y (map units)',ticks:4});
  const closed=arr=>[...arr,arr[0]].map(p=>[f.X(p[0]),f.Y(p[1])]);
  let svg=f.svg+path(closed(r.ship),C.muted,1.5,'#e4eadf')+path(closed(r.image),C.purple,2.5,'#ded2ed');
  svg+=arrow(f.X(r.origin[0]),f.Y(r.origin[1]),(r.unitX[0]-r.origin[0])*290/12,-(r.unitX[1]-r.origin[1])*290/12,C.blue);
  svg+=arrow(f.X(r.origin[0]),f.Y(r.origin[1]),(r.unitY[0]-r.origin[0])*290/12,-(r.unitY[1]-r.origin[1])*290/12,C.gold);
  svg+=text(25,108,'Scale',15)+text(25,134,'('+fmt(r.sx)+', '+fmt(r.sy)+')',17,C.purple)+text(25,184,'Then rotate',15)+text(25,210,fmt(r.angle)+'°',17,C.blue);
  svg+=text(527,108,'Then translate',15)+text(527,134,fmt(r.pan)+' in x',16,C.green);
  svg+=text(527,201,'Basis directions',13,C.muted)+text(527,228,'Blue: x',13,C.blue)+text(527,251,'Gold: y',13,C.gold);
  return {svg,stats:[['Signed determinant',fmt(r.det,4)],['Area scale',fmt(Math.abs(r.det),4)],['Can undo uniquely?',r.invertible?'Yes':'No — dimension lost']],
    summary:'Scale, then rotate, then translate. '+(r.pan===0?'The map is linear.':'The full map is affine because translation moves the origin.')+' Equal coordinate scales keep geometric comparisons honest.',
    equations:['p′ = R(θ) diag(sx, sy) p + (pan, 0)','det(linear part) = sx · sy'],
    rows:[['Matrix row 1',r.matrix[0].map(x=>fmt(x,4)).join(', ')],['Matrix row 2',r.matrix[1].map(x=>fmt(x,4)).join(', ')],['Image of origin',r.origin.map(x=>fmt(x)).join(', ')],...r.image.map((p,i)=>['Vertex '+(i+1),p.map(x=>fmt(x,4)).join(', ')])]};
}
function displayEnergy(r) {
  const f=axes({xmax:24,ymax:Math.max(1,r.peak,r.load)*1.1,y:52,h:111,xlabel:'Time of day (h)',ylabel:'Solar power and constant load (kW)',ticks:4});
  const g=axes({xmax:24,ymax:Math.max(1,r.capacity),y:243,h:96,xlabel:'Time of day (h)',ylabel:'Stored energy (kWh)',ticks:4});
  let svg=f.svg+g.svg+path(r.points.map(p=>[f.X(p.hour),f.Y(p.power)]),C.green,2.5);
  svg+=line(f.X(0),f.Y(r.load),f.X(24),f.Y(r.load),C.gold,2,'5 4');
  svg+=path(r.points.map(p=>[g.X(p.hour),g.Y(p.stored)]),C.purple,2.5);
  return {svg,stats:[['Generated',fmt(r.produced)+' kWh'],['Unserved demand',fmt(r.unserved,3)+' kWh'],['Spilled surplus',fmt(r.spill,3)+' kWh']],
    summary:'Green: solar production. Dashed gold: load. Purple: stored energy. '+fmt(r.served)+' of '+fmt(r.demand)+' kWh demand is supplied, with '+fmt(r.stored)+' kWh stored at midnight.',
    equations:['P(t) = peak · sin(π(t−6)/12), for 6≤t≤18; otherwise 0','Initial + generated = served + final storage + spilled'],
    rows:[['Initial battery',fmt(r.initial)+' kWh'],['Demand',fmt(r.demand)+' kWh'],['Served demand',fmt(r.served)+' kWh'],['Final battery',fmt(r.stored)+' kWh']]};
}
function displayNetwork(r) {
  const coords={A:[60,192],B:[260,65],C:[240,318],D:[452,192],E:[652,192]};
  const selected=new Set(r.best.nodes.slice(1).map((n,i)=>[r.best.nodes[i],n].sort().join('')));
  let svg='';
  for(const [a,b,w] of r.edges) {
    const p=coords[a],q=coords[b],active=selected.has([a,b].sort().join(''));
    svg+=line(...p,...q,active?C.purple:C.line,active?4:2);
    const x=(p[0]+q[0])/2,y=(p[1]+q[1])/2;
    svg+='<rect x="'+(x-19)+'" y="'+(y-11)+'" width="38" height="22" rx="6" fill="#f7f9f4"/>'+text(x,y+4,fmt(w),12,C.ink,'middle');
  }
  for(const n of NETWORK_NODES){const p=coords[n.id];svg+=circle(...p,18,'#e0ecd8',C.green)+text(p[0],p[1]+5,n.id,15,C.ink,'middle')+text(p[0],p[1]+37,n.name,12,C.muted,'middle');}
  svg+=text(25,25,'Edge labels: delay in ms; purple: a fastest route',13,C.muted)+text(25,380,'Network layout is schematic, not a map to scale.',12,C.muted);
  return {svg,stats:[['Selected route',r.best.nodes.join(' → ')],['Total delay',fmt(r.best.cost)+' ms'],['Delivery probability',fmt(100*r.best.reliability,2)+'%']],
    summary:r.routes.length+' simple routes. '+r.ties.length+' fastest route'+(r.ties.length===1?'':'s')+'. Expected delivered packets on the selected route: '+fmt(r.best.expected,3)+' of '+r.packets+'; not a guaranteed count.',
    equations:['Route delay = sum of edge delays','For k independent edges: P(delivery) = (1−p)^k'],
    rows:r.routes.map(route=>[route.nodes.join(' → '),fmt(route.cost)+' ms; '+route.hops+' hops; '+fmt(100*route.reliability,2)+'% delivery'])};
}
const displays={orbit:displayOrbit,rocket:displayRocket,supply:displaySupply,signal:displaySignal,camera:displayCamera,energy:displayEnergy,network:displayNetwork};

function mountModel(element,model,options) {
  const esc=options.esc,prefix='mission-controls-'+(++serial),abort=new AbortController();
  let state={...defaults[model.id]},disposed=false,frame=0,lastTime=null,playing=false,audio=null,audioVersion=0,result=null;
  for(const [key,, ,min,max] of controls[model.id])if(Number.isFinite(options.initialControls?.[key]))state[key]=clamp(options.initialControls[key],min,max,state[key]);
  if(model.id==='orbit'&&options.initialControls?.body==='earth-moon'){state.body='earth-moon';state.altitudeKm=clamp(options.initialControls.altitudeKm,2000,600000,384400);}
  Object.assign(state,options.lockedControls||{});
  const $=selector=>element.querySelector(selector);
  const primary={orbit:'speedKmS',rocket:'progress',supply:'crew',signal:'frequency',camera:'sx',energy:'peak',network:'ridge'}[model.id];
  const controlHTML=([key,label,unit,min,max,step])=>'<div class="mission-control"><label for="'+prefix+'-'+key+'">'+esc(label)+' <small>'+esc(unit)+'</small></label><input type="number" id="'+prefix+'-'+key+'" data-control="'+key+'" min="'+min+'" max="'+max+'" step="'+step+'" value="'+state[key]+'"><input type="range" aria-label="'+esc(label)+' slider ('+esc(unit)+')" data-control="'+key+'" min="'+min+'" max="'+max+'" step="'+step+'" value="'+state[key]+'"></div>';
  element.innerHTML='<div class="mission-model-grid"><figure class="mission-figure" aria-label="'+esc(model.title)+' diagram"><svg viewBox="0 0 720 395" role="img" aria-label="'+esc(model.title)+'"></svg></figure><div class="mission-controls">'+
    controls[model.id].filter(c=>c[0]===primary).map(controlHTML).join('')+
    '<details class="mission-model-detail"><summary>More controls</summary>'+
    (model.id==='orbit'?'<div class="mission-presets"><button type="button" data-preset="moon">Lunar spacecraft</button><button type="button" data-preset="earth-moon">Earth–Moon</button><button type="button" data-preset="circular">Circular</button><button type="button" data-preset="ellipse">Ellipse</button><button type="button" data-preset="escape">Escape</button><button type="button" data-preset="collision">Surface path</button></div>':'')+
    controls[model.id].filter(c=>c[0]!==primary).map(controlHTML).join('')+'</details>'+
    '<div class="mission-model-actions"><button class="button secondary small" type="button" data-reset>Reset</button>'+(model.id==='orbit'?'<button class="button small" type="button" data-play aria-pressed="false">Play orbit</button>':'')+(model.id==='signal'?'<button class="button small" type="button" data-sound>Hear 1 second</button>':'')+'</div><p class="mission-audio-status" data-audio-status role="status"></p></div></div><details class="mission-model-detail"><summary>See the math &amp; measurements</summary><p data-model-summary></p><div class="mission-readouts" data-stats></div><div class="mission-equations" data-equations></div><div class="mission-data"><table data-values><caption>Model values; displayed decimals are rounded</caption></table></div></details>';
  function draw(announce=false) {
    Object.assign(state,options.lockedControls||{});
    result=missionModels[model.id](state);const view=displays[model.id](result);
    $('svg').innerHTML='<title>'+esc(model.title)+'</title><desc>'+esc(view.summary)+'</desc>'+view.svg;
    $('[data-model-summary]').textContent=view.summary;
    $('[data-stats]').innerHTML=view.stats.map(([label,value])=>'<div><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong></div>').join('');
    $('[data-equations]').innerHTML=view.equations.map(value=>'<p>'+esc(value)+'</p>').join('');
    $('[data-values]').innerHTML='<caption>Model values; displayed decimals are rounded</caption><tbody>'+view.rows.map(([label,value])=>'<tr><th scope="row">'+esc(label)+'</th><td>'+esc(value)+'</td></tr>').join('')+'</tbody>';
    element.querySelectorAll('[data-control]').forEach(input=>{
      const key=input.dataset.control;
      if(key==='altitudeKm'){input.min=state.body==='earth-moon'?2000:10;input.max=state.body==='earth-moon'?600000:20000;input.step=state.body==='earth-moon'?100:10;}
      if(input!==document.activeElement)input.value=state[key];
    });
    if(announce)options.announce(view.summary);
    options.onChange?.({...state});
  }
  function stop(){playing=false;lastTime=null;cancelAnimationFrame(frame);const b=$('[data-play]');if(b){b.textContent='Play orbit';b.setAttribute('aria-pressed','false');}}
  function tick(now){if(disposed||!playing)return;if(lastTime!==null)state.progress=Math.min(100,state.progress+(now-lastTime)/200);lastTime=now;draw();if(state.progress>=100)stop();else frame=requestAnimationFrame(tick);}
  element.querySelectorAll('[data-control]').forEach(input=>{
    if(Object.hasOwn(options.lockedControls||{},input.dataset.control)){input.step='any';input.value=String(state[input.dataset.control]);input.disabled=true;input.title='Carried from your earlier project decision';}
    input.addEventListener('input',()=>{
      if(input.value===''||!Number.isFinite(input.valueAsNumber))return;
      stop();const key=input.dataset.control;state[key]=clamp(input.valueAsNumber,Number(input.min),Number(input.max),state[key]);
      if(['crew','days','harmonic','packets'].includes(key))state[key]=Math.round(state[key]);
      options.support('model');draw();
    },{signal:abort.signal});
    input.addEventListener('change',()=>{input.value=state[input.dataset.control];draw(true);},{signal:abort.signal});
  });
  element.querySelectorAll('[data-preset]').forEach(button=>button.addEventListener('click',()=>{
    stop();const preset=button.dataset.preset;
    if(preset==='moon')state={...defaults.orbit};else if(preset==='earth-moon')state=lunarDistancePreset();
    else {const e=orbitElements(state);state.speedKmS=preset==='circular'?e.circularSpeed:preset==='ellipse'?1.15*e.circularSpeed:preset==='escape'?e.escapeSpeed:.7*e.circularSpeed;state.progress=0;}
    options.support('model');draw(true);
  },{signal:abort.signal}));
  $('[data-reset]').addEventListener('click',()=>{stop();state={...defaults[model.id]};draw(true);},{signal:abort.signal});
  $('[data-play]')?.addEventListener('click',()=>{if(playing){stop();return;}if(state.progress>=100)state.progress=0;playing=true;options.support('model');$('[data-play]').textContent='Pause orbit';$('[data-play]').setAttribute('aria-pressed','true');frame=requestAnimationFrame(tick);},{signal:abort.signal});
  $('[data-sound]')?.addEventListener('click',async()=>{
    const status=$('[data-audio-status]');const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;
    if(!Audio){status.textContent='Audio is unavailable; the waveform and numbers still work.';return;}
    const request=++audioVersion,wave=result;
    try{
      if(audio)await audio.close();if(disposed||request!==audioVersion)return;
      const context=new Audio();audio=context;await context.resume();
      if(disposed||request!==audioVersion){await context.close();return;}
      const buffer=context.createBuffer(1,context.sampleRate,context.sampleRate),channel=buffer.getChannelData(0);
      for(let i=0;i<channel.length;i++){const t=i/context.sampleRate,envelope=Math.min(1,t/.025,(1-t)/.04);channel[i]=wave.sample(t).y*.08*Math.max(0,envelope);}
      const source=context.createBufferSource();source.buffer=buffer;source.connect(context.destination);source.start();
      source.onended=()=>{if(!disposed&&request===audioVersion)status.textContent='Preview finished.';};
      status.textContent='Playing a quiet, one-second synthetic preview.';options.support('model');
    }catch{if(!disposed&&request===audioVersion)status.textContent='Audio could not start. You can still inspect the waveform.';}
  },{signal:abort.signal});
  draw();
  const pause=()=>{stop();audioVersion++;if(audio){void audio.close().catch(()=>{});audio=null;}};
  const dispose=()=>{disposed=true;pause();abort.abort();element.replaceChildren();};
  dispose.pause=pause;
  return dispose;
}

// Reuse the same verified models in longer projects with saved controls.
export function mountMissionModel(container,{modelId,content,esc=escapeHTML,initialControls={},lockedControls={},onChange,onSupport=()=>{}}={}){
  const model=content?.models?.find(m=>m.id===modelId);
  if(!model){container.textContent='This model is unavailable.';return()=>container.replaceChildren();}
  const announce=document.createElement('p');announce.className='sr-only';announce.setAttribute('role','status');container.append(announce);
  const inner=document.createElement('div');container.append(inner);
  const cleanup=mountModel(inner,model,{esc,initialControls,lockedControls,onChange,support:kind=>{Promise.resolve(onSupport(kind)).catch(()=>{announce.textContent='Support could not be recorded. Reload before continuing an independent check.';});},announce:value=>{announce.textContent=value;}});
  return()=>{cleanup();container.replaceChildren();};
}

export function mountMission(container,{topicId,esc=escapeHTML,api,content,onSupport,onDraft,onDesign,initialDraft={},initialDesign={}}={}) {
  let disposed=false,cleanup=null,calculationCleanup=null;const abort=new AbortController(),id='lesson-mission-'+(++serial);
  container.innerHTML='<p class="mission-loading" role="status">Opening the activity…</p>';
  function render(data) {
    if(disposed)return;cachedContent=data;
    const mission=data.missions.find(m=>m.topic_id===topicId),model=data.models.find(m=>m.id===mission?.model_id);
    if(!mission||!model){container.innerHTML='<p class="mission-empty">This activity is unavailable. <a href="#missions">Browse activities.</a></p>';return;}
    let design={version:1,modelId:model.id,controls:{...defaults[model.id],...initialDesign.controls},calculation:{answer:'',factor:4,time:1,ran:false,...initialDesign.calculation},stage:Math.max(0,Math.min(2,Number(initialDesign.stage)||0))};
    const saveDesign=()=>onDesign?.(structuredClone(design));
    if(topicId==='precalculus.parametric-equations'){
      design.activity=initialDesign.activity||{};
      cleanup=mountParametricMotion(container,{esc,initialDraft:design.activity,onSupport:()=>onSupport?.({topicId,kind:'parametric-motion'}),onDraft:activity=>{design.activity=activity;return saveDesign();}});return;
    }
    const titleMap=new Map(data.missions.map(m=>[m.topic_id,m.topic_title||m.topic_id.split('.').at(-1).replaceAll('-',' ')]));
    const prerequisites=[...new Set(mission.prerequisite_ids||[])].filter(t=>t!==topicId&&titleMap.has(t));
    const sources=(model.source_ids||[]).map(key=>data.sources?.find(s=>s.id===key)).filter(Boolean);
    const preview=displays[model.id](missionModels[model.id](design.controls));
    container.innerHTML='<section class="lesson-mission mission-world-'+esc(model.id)+'" aria-labelledby="'+id+'-title"><header class="mission-intro"><span class="mission-eyebrow">'+esc(mission.topic_title||'APPLY THE MATH')+'</span><h2 id="'+id+'-title">'+esc(mission.title)+'</h2><p>'+esc(mission.connection)+'</p></header>'+
      '<div class="mission-step-heading"><h3 data-stage-heading tabindex="-1"></h3><span data-stage-count></span></div>'+
      '<section class="mission-stage" data-stage="0"><figure class="mission-figure"><svg viewBox="0 0 720 395" role="img" aria-label="'+esc(preview.summary)+'">'+preview.svg+'</svg></figure><div class="mission-task"><label for="'+id+'-prediction">'+esc(mission.prediction)+'</label><textarea id="'+id+'-prediction" data-draft="prediction" rows="2" placeholder="My prediction…">'+esc(initialDraft.prediction||'')+'</textarea></div></section>'+
      '<section class="mission-stage" data-stage="1" hidden><p class="mission-action">'+esc(mission.manipulate)+'</p><div data-model-host></div></section>'+
      '<section class="mission-stage" data-stage="2" hidden><div class="mission-task"><label for="'+id+'-explanation">'+esc(mission.decision)+'</label><textarea id="'+id+'-explanation" data-draft="explanation" rows="3" placeholder="What I noticed, and why…">'+esc(initialDraft.explanation||'')+'</textarea></div><p class="mission-save-note">'+(onDraft?'Your notes save in My homework.':'These scratch notes stay here until you leave. Copy them to keep them.')+'</p>'+
      '<details class="mission-detail" data-calculation-detail><summary>Extra calculation in this model</summary><p>Try one numerical example using '+esc(model.title.toLowerCase())+'.</p><div data-calculation-host></div></details></section>'+
      '<details class="mission-detail" data-clue><summary>I need a starting hint</summary><p>'+esc(mission.clue)+'</p></details>'+
      '<div class="mission-step-footer"><button class="button secondary small" data-stage-back>← Back</button><button class="button" data-stage-next>Explore →</button><a class="button secondary" data-stage-done href="#watch/'+encodeURIComponent(topicId)+'/practice" hidden>Back to lesson practice →</a></div>'+
      '<p class="mission-status" data-status role="status" aria-live="polite"></p>'+
      '<details class="mission-detail"><summary>Foundations &amp; model details</summary>'+
      (prerequisites.length?'<div class="mission-prereqs">'+prerequisites.map(t=>'<a href="#watch/'+encodeURIComponent(t)+'">'+esc(titleMap.get(t))+' →</a>').join('')+'</div>':'')+
      (mission.extension?'<p>This is a conceptual extension. The picture illustrates part of the task; a full calculation or proof needs the linked foundations.</p>':'')+
      '<ul>'+model.assumptions.map(a=>'<li>'+esc(a)+'</li>').join('')+'</ul>'+
      (sources.length?'<p class="mission-sources">'+sources.map(s=>'<a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(s.title)+'</a>').join(' · ')+'</p>':'')+
      '<p>Exploration is practice. Use the separate lesson check to earn a star.</p></details></section>';
    const $=selector=>container.querySelector(selector),supported=new Set();
    const announce=value=>{if(!disposed)$('[data-status]').textContent=value;};
    const support=kind=>{if(supported.has(kind)||disposed)return;supported.add(kind);Promise.resolve(onSupport?.({topicId,missionId:topicId,modelId:model.id,kind})).catch(()=>{supported.delete(kind);announce('Help status could not save. Keep this work marked as supported.');});};
    function openCalculation(){if(calculationCleanup)return;calculationCleanup=mountMissionCalculation($('[data-calculation-host]'),{topicId,modelId:model.id,initialControls:design.controls,initialDraft:design.calculation,onSupport:()=>onSupport?.({topicId,kind:'calculation-scene'}),onDraft:draft=>{design.calculation=draft;return saveDesign();}});}
    function stage(focus=false){
      container.querySelectorAll('[data-stage]').forEach(el=>el.hidden=Number(el.dataset.stage)!==design.stage);
      $('[data-stage-heading]').textContent=['Make a prediction','Try the model','Explain what changed'][design.stage];$('[data-stage-count]').textContent='Step '+(design.stage+1)+' of 3';
      $('[data-stage-back]').disabled=design.stage===0;$('[data-stage-next]').hidden=design.stage===2;$('[data-stage-done]').hidden=design.stage!==2;$('[data-stage-next]').textContent=design.stage===0?'Explore →':'What did you find? →';
      if(design.stage===1&&!cleanup){support('model-open');cleanup=mountModel($('[data-model-host]'),model,{esc,support,announce,initialControls:design.controls,onChange:values=>{design.controls=values;calculationCleanup?.updateControls(values);saveDesign();}});}else if(design.stage!==1)cleanup?.pause?.();
      if(focus)$('[data-stage-heading]').focus({preventScroll:true});
    }
    $('[data-stage-back]').onclick=()=>{design.stage=Math.max(0,design.stage-1);stage(true);saveDesign();};
    $('[data-stage-next]').onclick=()=>{design.stage=Math.min(2,design.stage+1);stage(true);saveDesign();};
    $('[data-clue]').addEventListener('toggle',e=>{if(e.target.open)support('clue');},{signal:abort.signal});
    $('[data-calculation-detail]').addEventListener('toggle',e=>{if(e.target.open)openCalculation();},{signal:abort.signal});
    container.querySelectorAll('[data-draft]').forEach(field=>field.addEventListener('input',()=>{
      const draft=Object.fromEntries([...container.querySelectorAll('[data-draft]')].map(f=>[f.dataset.draft,f.value]));
      Promise.resolve(onDraft?.({topicId,...draft})).catch(()=>announce('These notes could not save. Copy them before leaving.'));
    },{signal:abort.signal}));
    stage();
  }
  if(content)render(content);else loadMissionContent(api).then(render).catch(()=>{if(!disposed)container.innerHTML='<p class="mission-empty">Could not open this activity. Reopen it to retry.</p>';});
  return ()=>{disposed=true;abort.abort();cleanup?.();calculationCleanup?.();container.replaceChildren();};
}

export function mountMissionDirectory(container,{esc=escapeHTML,api,content,onSelect,defaultModel='all'}={}) {
  let disposed=false;const abort=new AbortController(),id='mission-directory-'+(++serial);
  function render(data) {
    if(disposed)return;cachedContent=data;let world=data.models.some(m=>m.id===defaultModel)?defaultModel:'all',course='all',query='',limit=12;
    container.innerHTML='<section class="mission-directory" aria-labelledby="'+id+'-title"><header><span class="mission-eyebrow">MATH WITH A PURPOSE</span><h2 id="'+id+'-title">Explore lesson activities</h2><p>Choose a concept, make a prediction, and try it in a model.</p></header>'+
      '<div class="mission-worlds" role="group" aria-label="Mission context"><button type="button" data-world="all">All worlds</button>'+data.models.map(m=>'<button type="button" data-world="'+esc(m.id)+'">'+esc(m.title)+'</button>').join('')+'</div>'+
      '<div class="mission-directory-filters"><label for="'+id+'-search">Find a concept<input type="search" id="'+id+'-search" placeholder="Try calculus, fuel, sound…"></label><label for="'+id+'-course">Course<select id="'+id+'-course"><option value="all">Every course</option>'+(data.courses||[]).map(c=>'<option value="'+esc(c.id)+'">'+esc(c.title)+'</option>').join('')+'</select></label></div><p class="mission-count" role="status" aria-live="polite" data-count></p><div class="mission-cards" data-cards></div><button type="button" class="button secondary small" data-more>Show more missions</button></section>';
    const $=s=>container.querySelector(s),courseNames=new Map((data.courses||[]).map(c=>[c.id,c.title]));
    function draw() {
      const list=data.missions.filter(m=>(world==='all'||m.model_id===world)&&(course==='all'||m.course_id===course)&&[m.title,m.brief,m.topic_id,courseNames.get(m.course_id)].join(' ').toLowerCase().includes(query.toLowerCase()));
      $('[data-count]').textContent=list.length+' mission'+(list.length===1?'':'s')+' · '+Math.min(limit,list.length)+' shown';
      $('[data-cards]').innerHTML=list.length?list.slice(0,limit).map(m=>'<a class="mission-card mission-world-'+esc(m.model_id)+'" href="#mission/'+encodeURIComponent(m.topic_id)+'" data-topic="'+esc(m.topic_id)+'">'+cardArt({id:m.topic_id,kind:'mission',modelId:m.model_id,title:m.title})+'<span>'+esc(courseNames.get(m.course_id)||m.course_id)+(m.extension?' · Extension':'')+'</span><h3>'+esc(m.title)+'</h3><p>'+esc(m.brief)+'</p><strong>Try this mission →</strong></a>').join(''):'<p class="mission-empty">No matching missions. Try All worlds or a broader search.</p>';
      $('[data-more]').hidden=list.length<=limit;
      container.querySelectorAll('[data-world]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.world===world)));
    }
    container.querySelectorAll('[data-world]').forEach(b=>b.addEventListener('click',()=>{world=b.dataset.world;limit=12;draw();},{signal:abort.signal}));
    $('#'+id+'-search').addEventListener('input',e=>{query=e.target.value;limit=12;draw();},{signal:abort.signal});
    $('#'+id+'-course').addEventListener('change',e=>{course=e.target.value;limit=12;draw();},{signal:abort.signal});
    $('[data-more]').addEventListener('click',()=>{limit+=12;draw();},{signal:abort.signal});
    if(onSelect)$('[data-cards]').addEventListener('click',event=>{const card=event.target.closest('[data-topic]');if(card){event.preventDefault();onSelect(card.dataset.topic);}},{signal:abort.signal});
    draw();
  }
  if(content)render(content);else loadMissionContent(api).then(render).catch(()=>{if(!disposed)container.innerHTML='<p class="mission-empty">The mission directory could not load. Reopen it to retry.</p>';});
  return ()=>{disposed=true;abort.abort();container.replaceChildren();};
}
