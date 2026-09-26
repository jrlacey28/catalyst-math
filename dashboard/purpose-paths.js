import {autosave} from './autosave.js';
import {cardArt} from './card-art.js';
import {PURPOSE_DEFAULTS,purposeModels,purposeResult,normalizePurposeDraft} from './purpose-math.js';

const escapeHTML=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const P={ink:'#294c3b',green:'#56876a',sage:'#cbdcc9',gold:'#bb8b3e',butter:'#f2dfb6',purple:'#8866a6',lavender:'#ded2eb',line:'#d9e2d4',white:'#fffef9',paper:'#f4f7ed'};
const n=x=>Math.round(x*1000)/1000;
const fmt=(x,d=2)=>Number.isFinite(x)?x.toLocaleString(undefined,{maximumFractionDigits:d}):'—';
const line=(x,y,u,v,color=P.ink,width=2,dash='')=>'<line x1="'+n(x)+'" y1="'+n(y)+'" x2="'+n(u)+'" y2="'+n(v)+'" stroke="'+color+'" stroke-width="'+width+'" stroke-linecap="round"'+(dash?' stroke-dasharray="'+dash+'"':'')+'/>';
const rect=(x,y,w,h,fill=P.sage,r=0)=>'<rect x="'+n(x)+'" y="'+n(y)+'" width="'+n(w)+'" height="'+n(h)+'" rx="'+r+'" fill="'+fill+'"/>';
const circle=(x,y,r,fill=P.purple,stroke='none')=>'<circle cx="'+n(x)+'" cy="'+n(y)+'" r="'+n(r)+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="2"/>';
const text=(x,y,t,size=13,color=P.ink,anchor='middle')=>'<text x="'+n(x)+'" y="'+n(y)+'" font-family="system-ui,Segoe UI,sans-serif" font-size="'+size+'" text-anchor="'+anchor+'" fill="'+color+'">'+escapeHTML(t)+'</text>';
const path=(pts,color=P.purple,width=3,fill='none',closed=false)=>'<path d="'+pts.map((p,i)=>(i?'L':'M')+n(p[0])+','+n(p[1])).join(' ')+(closed?' Z':'')+'" fill="'+fill+'" stroke="'+color+'" stroke-width="'+width+'" stroke-linejoin="round" stroke-linecap="round"/>';
const arrow=(x,y,u,v,color=P.green,width=3)=>{
  const a=Math.atan2(v-y,u-x),h=8;
  return line(x,y,u,v,color,width)+path([[u-h*Math.cos(a-.5),v-h*Math.sin(a-.5)],[u,v],[u-h*Math.cos(a+.5),v-h*Math.sin(a+.5)]],color,width);
};
const samples=(fn,start,end,count=64)=>Array.from({length:count+1},(_,i)=>fn(start+(end-start)*i/count));
function chart({xmin=0,xmax=8,ymax=20,xlabel='',ylabel='',left=300,top=50,width=290,height=205}={}){
  ymax=Math.max(.0001,ymax);xmax=Math.max(xmin+.0001,xmax);
  const X=x=>left+(x-xmin)/(xmax-xmin)*width,Y=y=>top+height-y/ymax*height;
  let svg='';
  for(const p of [.25,.5,.75,1])svg+=line(left,Y(p*ymax),left+width,Y(p*ymax),P.line,1);
  svg+=line(left,top,left,top+height,P.ink,1.5)+line(left,top+height,left+width,top+height,P.ink,1.5);
  for(const x of [xmin,(xmin+xmax)/2,xmax])svg+=text(X(x),top+height+21,fmt(x,1),11);
  svg+=text(left-11,top+height+4,'0',11,P.ink,'end')+text(left-11,top+4,fmt(ymax,1),11,P.ink,'end')+text(left+width/2,top+height+45,xlabel,12)+text(left,top-17,ylabel,12,P.ink,'start');
  return {X,Y,svg,plot:(fn,start=xmin,end=xmax,color=P.purple)=>path(samples(x=>[X(x),Y(fn(x))],start,end),color,3),
    point:(x,y)=>circle(X(x),Y(y),6,P.gold,P.white),
    area:(fn,end,color=P.sage)=>path([[X(xmin),Y(0)],...samples(x=>[X(x),Y(fn(x))],xmin,end),[X(end),Y(0)]],color,0,color,true)};
}
function physicsFigure(stage,m){
  const topSpeed=m.speed+8*m.acceleration,maxPosition=Math.max(1,m.positionAt(8));
  const cart=47+168*m.distance/maxPosition;
  let s=line(26,199,250,199,P.green,3)+rect(cart-17,164,42,25,P.lavender,5)+circle(cart-7,192,7,P.ink)+circle(cart+18,192,7,P.ink);
  s+=arrow(cart-10,144,cart+12+52*m.velocity/Math.max(1,topSpeed),144,P.gold,3)+text(139,117,'v = '+fmt(m.velocity)+' m/s',13)+text(139,228,'straight track',12);
  s+=text(139,255,'t = '+fmt(m.time)+' s · m = '+fmt(m.mass)+' kg',11)+text(139,277,'a = '+fmt(m.acceleration)+' m/s²',11);
  const energy=stage==='energy',velocity=stage==='velocity'||stage==='accumulation';
  const maxV=Math.max(1,12+m.acceleration*m.time);
  const ymax=energy?.5*m.mass*maxV**2:velocity?Math.max(1,topSpeed):maxPosition;
  const a=chart({xmax:energy?maxV:8,ymax,xlabel:energy?'final speed (m/s)':'time (s)',ylabel:energy?'energy (J)':velocity?'velocity (m/s)':'position (m)'});
  const f=energy?v=>.5*m.mass*v*v:velocity?m.velocityAt:m.positionAt;
  s+=a.svg;
  if(stage==='accumulation')s+=a.area(f,m.time);
  s+=a.plot(f)+a.point(energy?m.velocity:m.time,energy?m.kineticEnergy:velocity?m.velocity:m.distance);
  return s;
}
function gear(cx,cy,r,count,color,fill,phase=0){
  const pts=[];
  for(let i=0;i<count*4;i++){const a=phase+i*2*Math.PI/(count*4),radius=r+(i%4===1||i%4===2?3:-3);pts.push([cx+radius*Math.cos(a),cy+radius*Math.sin(a)]);}
  return path(pts,color,1.8,fill,true)+circle(cx,cy,Math.max(5,r*.18),P.white,color);
}
function mechanicalFigure(stage,m){
  if(stage==='spring'){
    const end=242-140*m.compression/.3,start=48;
    let s=line(37,75,37,221,P.ink,5);
    for(let y=83;y<220;y+=15)s+=line(25,y+9,37,y,P.line,2);
    const pts=[[start,146]];
    for(let i=0;i<18;i++)pts.push([start+(end-start)*(i+1)/19,146+(i%2?15:-15)]);
    pts.push([end,146]);
    s+=path(pts,P.purple,3)+rect(end,119,19,54,P.sage,3)+arrow(end+48,145,end+25,145,P.gold,3);
    const a=chart({xmax:.3,ymax:36,xlabel:'compression (m)',ylabel:'force (N)'});
    return s+a.svg+a.area(x=>m.stiffness*x,m.compression)+a.plot(x=>m.stiffness*x)+a.point(m.compression,m.springForce);
  }
  const scale=125/(m.driverTeeth+m.drivenTeeth),r1=m.driverTeeth*scale,r2=m.drivenTeeth*scale;
  const x1=64+r1,x2=x1+r1+r2;
  let s=gear(x1,155,r1,m.driverTeeth,P.green,P.sage)+gear(x2,155,r2,m.drivenTeeth,P.purple,P.lavender,Math.PI/m.drivenTeeth);
  s+=text(x1,155+r1+28,'12 teeth',12)+text(x2,155+r2+28,m.drivenTeeth+' teeth',12);
  s+=arrow(x1-r1*.5,155-r1*.65,x1+r1*.4,155-r1*.65,P.green,2.5);
  s+=arrow(x2+r2*.45,155-r2*.6,x2-r2*.45,155-r2*.6,P.purple,2.5);
  const power=stage==='power',torque=stage==='torque';
  const input=power?m.inputPower:torque?m.inputTorque:m.inputSpeed;
  const output=power?m.outputPower:torque?m.outputTorque:m.outputSpeed;
  const limit=power?210:torque?40:240,unit=power?'W':torque?'N·m':'rpm';
  s+=text(374,88,'input',12,P.ink,'start')+rect(374,100,200*input/limit,24,P.sage,5)+text(374,157,'output',12,P.ink,'start')+rect(374,169,200*output/limit,24,P.lavender,5);
  s+=text(374,224,fmt(input)+' → '+fmt(output)+' '+unit,17,P.ink,'start')+text(374,246,'ideal, lossless gears',11,P.ink,'start');
  if(power)s+=text(374,270,'T_in = '+fmt(m.inputTorque)+' N·m',11,P.ink,'start');
  return s;
}
function electricalFigure(stage,m){
  let s=line(45,75,45,125,P.ink,2)+line(45,143,45,215,P.ink,2)+line(27,125,63,125,P.purple,3)+line(34,143,56,143,P.purple,3);
  s+=line(45,75,106,75,P.ink,2)+line(188,75,235,75,P.ink,2)+line(45,215,235,215,P.ink,2);
  const zig=[[106,75]];
  for(let i=0;i<9;i++)zig.push([114+i*8,75+(i%2?9:-9)]);
  zig.push([188,75]);s+=path(zig,P.green,2.5)+text(147,53,fmt(m.resistance,0)+' Ω',12);
  if(stage==='charging'){
    s+=line(235,75,235,132,P.ink,2)+line(217,132,253,132,P.purple,3)+line(217,148,253,148,P.purple,3)+line(235,148,235,215,P.ink,2);
    s+=text(183,169,fmt(m.capacitanceMicrofarads,0)+' µF',11)+text(140,253,'RC = '+fmt(m.tau)+' s',12);
  }else s+=line(235,75,235,215,P.ink,2)+arrow(223,118,223,170,P.gold,3)+text(140,253,'resistor circuit',12);
  s+=text(42,171,fmt(m.voltage)+' V',12)+text(70,120,'+',12);
  const charge=stage==='charging',power=stage==='power';
  const a=chart({xmin:power?100:0,xmax:charge?10:power?2000:12,
    ymax:charge?m.voltage:power?m.voltage**2/100:12000/m.resistance,
    xlabel:charge?'time (s)':power?'resistance (Ω)':'voltage (V)',
    ylabel:charge?'capacitor voltage (V)':power?'power (W)':'current (mA)'});
  const f=charge?m.voltageAt:power?r=>m.voltage**2/r:v=>1000*v/m.resistance;
  const x=charge?m.time:power?m.resistance:m.voltage;
  s+=a.svg+a.plot(f)+a.point(x,f(x));
  if(charge)s+=line(a.X(0),a.Y(m.voltage),a.X(10),a.Y(m.voltage),P.gold,1.5,'4 4');
  return s;
}
function architectureFigure(stage,m){
  const length=42*m.span,left=225-length/2,mid=225,y=129,thickness=50*m.depth;
  const bent=stage==='stiffness',amplitude=bent?68*Math.log1p(m.deflectionMillimeters)/Math.log(81):0;
  let s='';
  const curve=samples(x=>[left+x/m.span*length,y+(m.deflection?amplitude*m.deflectionAt(x)/m.deflection:0)],0,m.span);
  s+=line(left,y,left+length,y,P.line,1.4,'5 5')+path(curve,P.purple,thickness);
  for(const x of [left,left+length]){
    s+=path([[x,y+thickness/2],[x-17,y+thickness/2+26],[x+17,y+thickness/2+26]],P.green,2,P.sage,true)+line(x-24,y+thickness/2+33,x+24,y+thickness/2+33,P.ink,2);
    if(stage==='balance')s+=arrow(x,y+83,x,y+39,P.green,3);
  }
  if(stage!=='volume')s+=arrow(mid,36,mid,y+amplitude-thickness/2-10,P.gold,4)+text(mid,25,fmt(m.loadKilonewtons)+' kN',15);
  s+=line(left,257,left+length,257,P.ink,1.2)+line(left,251,left,263,P.ink,1.2)+line(left+length,251,left+length,263,P.ink,1.2)+text(mid,281,fmt(m.span)+' m span',13);
  s+=rect(507,88,m.width*180,m.depth*180,P.lavender,2)+text(535,75,'cross-section',12);
  s+=text(539,109+m.depth*180,fmt(m.width)+' m wide',11)+text(537,137+m.depth*180,fmt(m.depth)+' m deep',11);
  if(bent)s+=text(224,309,'bend exaggerated · ideal beam',11);
  return s;
}
function financeFigure(stage,m){
  const max=Math.max(m.balance,m.contributed,1)*1.1;
  const a=chart({xmax:Math.max(1,m.years),ymax:max,xlabel:'year',ylabel:stage==='buying-power'?'dollars and purchasing power':'dollars',left:73,top:45,width:515,height:207});
  const pts=key=>m.history.map(p=>[a.X(p.year),a.Y(p[key])]);
  let s=a.svg+path(pts('contributed'),P.green,2)+path(pts('balance'),P.purple,3.5);
  if(stage==='buying-power')s+=path(pts('real'),P.gold,3)+a.point(m.years,m.purchasingPower);
  else s+=a.point(m.years,m.balance);
  s+=line(258,17,276,17,P.purple,3)+text(283,21,'balance',11,P.ink,'start')+line(371,17,389,17,P.green,3)+text(395,21,'deposits',11,P.ink,'start');
  if(stage==='buying-power')s+=line(484,17,502,17,P.gold,3)+text(509,21,'buying power',11,P.ink,'start');
  s+=text(332,317,fmt(m.rate*100)+'% growth · $'+fmt(m.contribution,0)+' each year · $1000 start',11);
  return s;
}
const drawers={physics:physicsFigure,mechanical:mechanicalFigure,electrical:electricalFigure,architecture:architectureFigure,finance:financeFigure};
let figureSerial=0;
export function purposeFigure(fieldId,stageId,controls={},title='',{preview=false}={}){
  if(!drawers[fieldId])return cardArt({id:'ai-ml',kind:'path',title:'Math behind AI'});
  const result=purposeResult(fieldId,stageId,controls),id='purpose-figure-'+(++figureSerial);
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 320" role="img" aria-labelledby="'+id+'-title '+id+'-desc" focusable="false">'+
    '<title id="'+id+'-title">'+escapeHTML(title||fieldId+' model')+'</title><desc id="'+id+'-desc">'+escapeHTML(result.label+': '+fmt(result.value,3)+' '+result.unit+'. '+(preview?'A preview of the model in this path.':'The diagram responds to the control below.'))+'</desc>'+
    rect(0,0,640,320,P.paper,18)+drawers[fieldId](stageId,result.model)+'</svg>';
}
export const purposeFields=Object.freeze([
  {id:'physics',title:'Physics',subtitle:'Push a cart. Connect motion, rates and energy.',href:'#applications/physics',first:'distance'},
  {id:'mechanical',title:'Mechanical engineering',subtitle:'Trade speed for torque. Store work in a spring.',href:'#applications/mechanical',first:'gears'},
  {id:'electrical',title:'Electrical engineering',subtitle:'Control current. Charge a tiny energy store.',href:'#applications/electrical',first:'current'},
  {id:'architecture',title:'Architecture & civil engineering',subtitle:'Span a gap. Balance loads. Explore stiffness.',href:'#applications/architecture',first:'volume'},
  {id:'finance',title:'Finance',subtitle:'Grow a savings plan. Separate dollars from buying power.',href:'#applications/finance',first:'time'},
  {id:'ai-ml',title:'AI & machine learning',subtitle:'Train a tiny model. Follow the mathematics inside.',href:'#ai-math',first:''}
].map(Object.freeze));
export function purposeDirectoryCards({esc=escapeHTML,compact=false}={}){
  return '<div class="purpose-cards'+(compact?' purpose-cards--compact':'')+'">'+purposeFields.map(f=>'<a class="purpose-card purpose-'+f.id+'" href="'+f.href+'"><div class="purpose-card-visual">'+purposeFigure(f.id,f.first,PURPOSE_DEFAULTS[f.id],f.title,{preview:true})+'</div><h2>'+esc(f.title)+'</h2><p>'+esc(f.subtitle)+'</p><span>Try it <b aria-hidden="true">→</b></span></a>').join('')+'</div>';
}
let contentPromise;
export async function loadPurposePaths(api){
  if(!contentPromise)contentPromise=Promise.resolve().then(()=>api?api('purpose-paths'):fetch('/api/purpose-paths').then(r=>{if(!r.ok)throw new Error('Could not load application paths');return r.json();})).catch(e=>{contentPromise=null;throw e;});
  return contentPromise;
}
function identity(value){return typeof value==='string'?value:value?.profile_id??value?.id??null;}
/**
 * content: public purpose-paths.json; initialDraft: this field's profile draft.
 * onSupport({topicIds}) must resolve before a model stage is revealed.
 * onDraft(draft,{flush}) persists one profile/field; no mastery is inferred here.
 * onStageChange({fieldId,stageId,title,topicIds,question,controls}) updates a coach.
 * Returns a synchronous disposer, including a final flush; no learner API is called.
 */
export function mountPurposePaths(host,options={}){
  const esc=options.esc||escapeHTML,profile=identity(options.getContext?.()),serial=++figureSerial;
  let dead=false,field=null,draft=null,content=null,generation=0;
  const current=()=>{
    const ctx=options.getContext?.();
    return !dead&&host.isConnected!==false&&!ctx?.independentCheck&&(profile===null||identity(ctx)===profile);
  };
  const stage=()=>field?.stages[draft?.stage||0];
  const snapshot=()=>draft?{version:1,stage:draft.stage,controls:{...draft.controls},predictions:{...draft.predictions}}:null;
  function persist(flush=false){
    const data=snapshot();if(!data||!options.onDraft)return Promise.resolve();
    return Promise.resolve().then(()=>options.onDraft(data,{flush})).then(()=>{
      const status=host.querySelector('[data-purpose-save]');if(current()&&status)status.textContent='Saved · explanation awaits review';
    }).catch(error=>{const status=host.querySelector('[data-purpose-save]');if(current()&&status)status.textContent='Not saved: '+error.message;options.onError?.(error);});
  }
  function announce(){
    const s=stage();options.onStageChange?.({fieldId:field.id,stageId:s.id,title:field.title+' — '+s.title,
      topicIds:[...s.topic_ids],question:s.question,controls:{...draft.controls}});
  }
  function updateModel({keepNumber=false}={}){
    if(!current())return;
    const s=stage(),r=purposeResult(field.id,s.id,draft.controls),spec=field.controls[s.control],value=draft.controls[s.control];
    host.querySelector('[data-purpose-figure]').innerHTML=purposeFigure(field.id,s.id,draft.controls,s.headline);
    host.querySelector('[data-purpose-result]').textContent=(r.unit==='$'?'$':'')+fmt(r.value,r.unit==='$'?0:r.value<1?3:2)+(r.unit==='$'?'':' '+r.unit);
    host.querySelector('[data-purpose-result-label]').textContent=r.label;
    if(!keepNumber)host.querySelector('[data-purpose-number]').value=value;
    const slider=host.querySelector('[data-purpose-range]');slider.value=value;slider.setAttribute('aria-valuetext',fmt(value,3)+' '+spec.unit);
    announce();
  }
  function draw(){
    if(!current())return;
    const s=stage(),spec=field.controls[s.control],inputId='purpose-control-'+serial,notesId='purpose-note-'+serial;
    const links=s.topic_ids.map(id=>{const t=options.topic?.(id);return '<a href="#watch/'+encodeURIComponent(id)+'">'+esc(t?.title||id.split('.').pop().replace(/-/g,' '))+' →</a>';}).join('');
    const sources=(s.source_ids||[]).map(id=>content.sources.find(x=>x.id===id)).filter(Boolean);
    host.innerHTML='<section class="purpose-workbench"><a class="backlink" href="#applications">← Math for…</a><header class="purpose-heading"><div><span class="eyebrow">'+esc(field.title)+'</span><h1>'+esc(s.headline)+'</h1></div><span class="purpose-count">'+(draft.stage+1)+' / '+field.stages.length+'</span></header>'+
      '<nav class="purpose-stages" aria-label="Application stages">'+field.stages.map((x,i)=>'<button type="button" data-purpose-stage="'+i+'" aria-current="'+(i===draft.stage?'step':'false')+'">'+esc(x.title)+'</button>').join('')+'</nav>'+
      '<p class="purpose-action">'+esc(s.action)+'</p><div class="purpose-live"><div class="purpose-figure" data-purpose-figure></div><div class="purpose-control-result"><div class="purpose-control"><label for="'+inputId+'">'+esc(spec.label)+' <span>('+esc(spec.unit)+')</span></label><div class="purpose-slider-row"><input type="range" id="'+inputId+'" data-purpose-range min="'+spec.min+'" max="'+spec.max+'" step="'+spec.step+'" value="'+draft.controls[s.control]+'"><input type="number" data-purpose-number aria-label="'+esc(spec.label)+' in '+esc(spec.unit)+'" min="'+spec.min+'" max="'+spec.max+'" step="'+spec.step+'" value="'+draft.controls[s.control]+'"></div></div><output class="purpose-result" aria-live="polite" aria-atomic="true"><small data-purpose-result-label></small><strong data-purpose-result></strong></output></div></div>'+
      '<div class="purpose-underneath"><details class="purpose-math"><summary>Show the math</summary><p class="purpose-formula">'+esc(s.formula)+'</p><p>'+esc(s.why)+'</p><div class="purpose-prerequisites">'+links+'</div><details><summary>Model assumptions & sources</summary><ul>'+field.assumptions.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>'+sources.map(x=>'<a href="'+esc(x.url)+'" target="_blank" rel="noopener noreferrer">'+esc(x.title)+' ↗</a>').join('')+'</details></details>'+
      '<details class="purpose-notes"><summary>Predict & explain</summary><label for="'+notesId+'">'+esc(s.question)+'</label><textarea id="'+notesId+'" data-purpose-note rows="3" maxlength="1200" placeholder="My prediction, what changed, and why…">'+esc(draft.predictions[s.id]||'')+'</textarea><small data-purpose-save>'+ (options.onDraft?'Saves with your learning space · not a graded check':'Notes remain on this page')+'</small></details></div>'+
      '<div class="purpose-footer"><button type="button" class="review-text-button" data-purpose-reset>Reset this control</button>'+(draft.stage<field.stages.length-1?'<button type="button" class="button" data-purpose-next>Next idea →</button>':'<a class="button secondary" href="#applications">Explore another field →</a>')+'</div></section>';
    host.querySelectorAll('[data-purpose-stage]').forEach(b=>b.addEventListener('click',()=>activate(Number(b.dataset.purposeStage))));
    host.querySelector('[data-purpose-next]')?.addEventListener('click',()=>activate(draft.stage+1));
    const change=(value,keepNumber=false)=>{
      if(!current()||!Number.isFinite(Number(value)))return;
      draft=normalizePurposeDraft(field,{...draft,controls:{...draft.controls,[s.control]:Number(value)}});
      updateModel({keepNumber});persist();
    };
    host.querySelector('[data-purpose-range]').addEventListener('input',e=>change(e.target.value));
    const number=host.querySelector('[data-purpose-number]');
    number.addEventListener('input',e=>{
      const value=e.target.value.trim(),n=Number(value),steps=(n-spec.min)/spec.step;
      if(value&&Number.isFinite(n)&&n>=spec.min&&n<=spec.max&&Math.abs(steps-Math.round(steps))<1e-7)change(n,true);
    });
    number.addEventListener('change',e=>{if(e.target.value.trim())change(e.target.value);else updateModel();});
    host.querySelector('[data-purpose-reset]').addEventListener('click',()=>change(spec.default));
    host.querySelector('[data-purpose-note]').addEventListener('input',e=>{if(current()){draft.predictions[s.id]=e.target.value.slice(0,1200);persist();}});
    updateModel();
  }
  async function activate(index){
    if(!current()||!field.stages[index])return;
    const token=++generation,next=field.stages[index];
    host.innerHTML='<p class="purpose-loading" role="status">Opening '+esc(next.title)+'…</p>';
    try{
      await options.onSupport?.({topicIds:[...next.topic_ids]});
      if(!current()||token!==generation)return;
      draft.stage=index;draw();persist();
    }catch(error){
      if(!current()||token!==generation)return;
      host.innerHTML='<div class="error" role="alert">'+esc(error.message||'Could not open this stage.')+'</div><button type="button" class="button secondary" data-purpose-retry>Try again</button>';
      host.querySelector('[data-purpose-retry]').addEventListener('click',()=>activate(index));
    }
  }
  async function start(){
    if(!options.fieldId){
      host.innerHTML='<section class="purpose-directory"><div class="intro"><div><span class="eyebrow">FOLLOW YOUR CURIOSITY</span><h1>Math for…</h1><p>Choose what you want to understand.</p></div></div>'+purposeDirectoryCards({esc})+'<a class="purpose-project-link" href="#projects">Build a longer project →</a></section>';
      return;
    }
    host.innerHTML='<p class="purpose-loading" role="status">Preparing your model…</p>';
    try{
      content=options.content||await loadPurposePaths(options.api);
      if(!current())return;
      field=content.fields.find(f=>f.id===options.fieldId);
      if(!field){host.innerHTML='<div class="empty-state"><h1>Choose a field to explore.</h1><a class="button" href="#applications">Math for…</a></div>';return;}
      if(field.kind==='link'){host.innerHTML='<section class="purpose-directory"><h1>'+esc(field.title)+'</h1><p>'+esc(field.subtitle)+'</p><a class="button" href="'+esc(field.href)+'">Open this path →</a></section>';return;}
      draft=normalizePurposeDraft(field,options.initialDraft);await activate(draft.stage);
    }catch(error){if(current())host.innerHTML='<p class="error" role="alert">'+esc(error.message)+'</p>';options.onError?.(error);}
  }
  const flush=()=>persist(true);
  const unregister=autosave.register(()=>current()?flush():undefined);
  if(typeof window!=='undefined')window.addEventListener('pagehide',flush);
  start();
  return ()=>{if(dead)return;unregister();flush();dead=true;generation++;if(typeof window!=='undefined')window.removeEventListener('pagehide',flush);};
}
