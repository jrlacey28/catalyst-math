// Original, static SVG feedback. No network, storage, grading, or learner state.
import {parseExpression, evaluateAST, hasVariable} from './calculator-engine.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const finite = x => typeof x === 'number' && Number.isFinite(x) && Math.abs(x) <= 1e300;
const clean = (x, n=3000) => typeof x === 'string' || finite(x) ? String(x).slice(0,n) : '';
const color = {ink:'#23354b',muted:'#63758a',line:'#bac8d5',given:'#5a7dba',user:'#d17b20',checked:'#237f67',fill:'#edf2f7',purple:'#8060a7'};
const fmt = x => !finite(x) ? 'unavailable' : Object.is(x,-0)||x===0 ? '0' : Math.abs(x)>=1e6||Math.abs(x)<1e-5 ? x.toExponential(4) : Number(x.toPrecision(7)).toString();
const line = (x1,y1,x2,y2,stroke=color.line,width=2,dash='') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${width}"${dash?` stroke-dasharray="${dash}"`:''}/>`;
const text = (x,y,value,{fill=color.ink,size=13,anchor='start'}={}) => `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" text-anchor="${anchor}">${esc(value)}</text>`;
const dot = (x,y,r,fill) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="#fff" stroke-width="1.5"/>`;
const rect = (x,y,w,h,fill,stroke='none',rx=4) => `<rect x="${x}" y="${y}" width="${Math.max(0,w)}" height="${Math.max(0,h)}" rx="${rx}" fill="${fill}" stroke="${stroke}"/>`;
const svg = (body,h,label) => `<svg class="av-svg" viewBox="0 0 600 ${h}" role="img" aria-label="${esc(label)}"><title>${esc(label)}</title>${body}</svg>`;

function number(value) {
  if (finite(value)) return value;
  if (typeof value !== 'string' || value.length > 120) return null;
  const source=value.replace(/π/g,'pi').replace(/[−–]/g,'-').replace(/\*\*/g,'^');
  const names=source.replace(/(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/g,'').match(/[a-zA-Z_]+/g)||[];
  if(names.some(n=>!['pi','sqrt'].includes(n)))return null;
  try {const ast=parseExpression(source);if(hasVariable(ast))return null;const n=evaluateAST(ast);return finite(n)?n:null;}catch{return null;}
}

export function fallbackVisual(question={},result=null,{topicId=''}={}) {
  const q=question&&typeof question==='object'?question:{};
  const kind=['number','choice'].includes(q.kind)?q.kind:(result&&typeof result.answer==='number'?'number':result?'choice':'written');
  const v={version:1,phase:'problem',id:clean(q.id,160),topic_id:clean(topicId,160),kind,
    type:kind==='choice'?'choice':kind==='written'?'written':'quantity',scope:'givens',title:kind==='choice'?'Compare the claims':'Feedback after submission',
    prompt:clean(q.prompt),givens:{options:Array.isArray(q.options)?q.options.slice(0,8).map(x=>clean(x,600)):[]},
    note:'Your value will be compared after submission. No full mathematical model is inferred.'};
  if(result&&Object.hasOwn(result,'answer')&&Object.hasOwn(result,'response')&&typeof result.correct==='boolean') {
    Object.assign(v,{phase:'feedback',correct:result.correct,response:clean(result.response,1000),expected:clean(result.display_answer??result.answer,1000),
      explanation:clean(result.explanation,1800),scope:kind==='number'?'answer-comparison':'choice-comparison',title:kind==='number'?'Your value and the checked value':'Your claim and the checked claim',
      mastery_changed:false,independence_claim:false,note:kind==='number'?'A comparison on one numerical scale. It does not reconstruct the full problem or verify each written step.':'The selected statement is compared with this item’s key; this does not verify an advanced proof.'});
    if(kind==='number')Object.assign(v,{response_value:number(result.response),expected_value:finite(result.answer)?result.answer:null});
  }
  return v;
}

function normalized(raw) {
  const v=raw&&typeof raw==='object'?raw:{};
  const feedback=v.phase==='feedback'&&typeof v.correct==='boolean';
  return {...v,phase:feedback?'feedback':'problem',type:['quantity','choice','written','fractions','equivalent-fractions','balance','function','integral','accumulation','triangle','angles','vectors','points','probability'].includes(v.type)?v.type:'quantity',
    givens:v.givens&&typeof v.givens==='object'?v.givens:{},title:clean(v.title,160),prompt:clean(v.prompt),note:clean(v.note,900),
    response:feedback?clean(v.response,1000):'',expected:feedback?clean(v.expected,1000):'',explanation:feedback?clean(v.explanation,1800):'',
    response_value:feedback&&finite(v.response_value)?v.response_value:null,expected_value:feedback&&finite(v.expected_value)?v.expected_value:null,
    witness:feedback&&v.witness&&typeof v.witness==='object'?v.witness:null};
}

function problemMap(v) {
  return '';
}

function comparison(v, {left='Your value',right='Checked value',a=v.response_value,b=v.expected_value,unit=v.givens.unit||''}={}) {
  const values=[a,b].filter(finite);
  if(!values.length)return `<p class="av-unavailable">The entries are shown below; no finite number could be plotted.</p>`;
  const scale=Math.max(...values.map(Math.abs))||1;
  let lo=Math.min(0,...values.map(x=>x/scale)),hi=Math.max(0,...values.map(x=>x/scale));
  if(hi===lo){lo=-1;hi=1;}
  const pad=(hi-lo)*.12;lo-=pad;hi+=pad;
  const X=x=>42+516*(x/scale-lo)/(hi-lo);
  let body=line(42,60,558,60,color.muted,2);
  for(let i=0;i<5;i++){const z=lo+(hi-lo)*i/4,x=42+516*i/4;body+=line(x,54,x,66)+text(x,88,fmt(z*scale),{size:10,anchor:'middle',fill:color.muted});}
  if(finite(b))body+=line(X(b),33,X(b),60,color.checked,2)+dot(X(b),33,6,color.checked);
  if(finite(a))body+=line(X(a),60,X(a),108,color.user,2)+dot(X(a),108,6,color.user);
  body+=dot(52,139,5,color.user)+text(64,144,left,{size:12})+dot(325,139,5,color.checked)+text(337,144,right,{size:12});
  return svg(body,160,`${left}: ${finite(a)?fmt(a):'not plotted'}; ${right}: ${finite(b)?fmt(b):'not plotted'}${unit?' '+unit:''}. Both markers use the same numerical axis.`);
}

function fractions(v) {
  const rows=Array.isArray(v.givens.operands)?v.givens.operands.slice(0,2):[];
  if(rows.length!==2||rows.some(x=>!Array.isArray(x)||x.length!==2||!finite(x[0])||!finite(x[1])||x[1]<=0))return problemMap(v);
  const values=rows.map(([a,b])=>a/b);
  const shown=rows.map((p,i)=>({label:`Given ${i+1}: ${p[0]}/${p[1]}`,value:values[i],denominator:p[1],fill:color.given}));
  if(v.phase==='feedback'){if(finite(v.response_value))shown.push({label:'Your fraction',value:v.response_value,denominator:1,fill:color.user});if(finite(v.expected_value))shown.push({label:'Checked fraction',value:v.expected_value,denominator:1,fill:color.checked});}
  if(shown.some(x=>x.value<0||x.value>8))return `<p class="av-formula">${esc(rows[0].join('/'))} ${esc(v.givens.operation)} ${esc(rows[1].join('/'))}</p>`+(v.phase==='feedback'?comparison(v):problemMap(v));
  const wholeCount=Math.max(1,Math.ceil(Math.max(...shown.map(x=>x.value))));
  const unit=440/wholeCount;
  let body=text(150,18,'Every outlined unit is one whole',{size:11,fill:color.muted});
  shown.forEach((row,i)=>{
    const y=35+i*52;body+=text(8,y+21,row.label,{size:11});
    body+=rect(150,y,440,30,'#fff',color.line,0)+rect(150,y,unit*row.value,30,row.fill,'none',0);
    for(let w=1;w<wholeCount;w++)body+=line(150+w*unit,y,150+w*unit,y+30,color.ink,1.5);
    if(row.denominator<=32&&wholeCount*row.denominator<=96)for(let k=1;k<wholeCount*row.denominator;k++)if(k%row.denominator)body+=line(150+k*unit/row.denominator,y+3,150+k*unit/row.denominator,y+27,'#cdd7e1',.7);
  });
  return svg(body,45+shown.length*52,'Fraction bars share the same whole-unit size. Before submission only the two given fractions are shown.');
}

function equivalentFractions(v) {
  const g=v.givens,f=g.fraction,target=g.target_denominator;
  if(!Array.isArray(f)||f.length!==2||!f.every(Number.isInteger)||f[1]<1||f[1]>96||f[0]<0||f[0]>f[1]||!Number.isInteger(target)||target<1||target>96)return problemMap(v);
  const [a,b]=f,x=135,w=440,h=34,feedback=v.phase==='feedback',candidate=v.response_value;
  const partLines=(denominator,y)=>Array.from({length:denominator-1},(_,i)=>line(x+w*(i+1)/denominator,y,x+w*(i+1)/denominator,y+h,color.line,1)).join('');
  let body=text(x,18,'Both bars are one whole',{size:11,fill:color.muted});
  body+=text(12,61,`Given: ${a}/${b}`,{size:13})+rect(x,39,w,h,'#fff',color.line,0)+rect(x,39,w*a/b,h,color.given,'none',0)+partLines(b,39);
  body+=`<g data-fraction-row="target" data-parts="${target}">`+text(12,125,feedback?`Your ${finite(candidate)?fmt(candidate):'?'}/${target}`:`?/${target}`,{size:13})+rect(x,103,w,h,'#fff',color.line,0);
  if(feedback&&finite(candidate)&&candidate>=0&&candidate<=target)body+=`<rect data-numerator-fill="${candidate}" x="${x}" y="103" width="${w*candidate/target}" height="${h}" fill="${color.user}" fill-opacity=".72"/>`;
  body+=partLines(target,103)+'</g>';
  if(feedback){
    const boundary=x+w*a/b;
    body+=line(boundary,34,boundary,144,color.checked,2.5,'5 4')+dot(boundary,144,4,color.checked);
    body+=text(135,167,`Green boundary: ${v.expected}/${target} matches ${a}/${b}`,{size:12,fill:color.checked});
    if(finite(candidate)&&candidate>=0&&candidate<=target)body+=text(135,189,`Your numerator ${fmt(candidate)} shades ${fmt(candidate)}/${target} of the whole.`,{size:11,fill:color.user});
    else body+=text(135,189,finite(candidate)?'Your value lies outside this whole; compare it on the scale below.':'No finite numerator could be shaded.',{size:10,fill:color.muted});
  }else body+=text(135,161,`${target} equal parts, ready for your numerator`,{size:12,fill:color.muted});
  return svg(body,feedback?209:180,'Equivalent fractions share one whole. The given fraction is shaded; the target is empty before submission and shows the submitted numerator afterward.')+(feedback?comparison(v,{left:'Your numerator',right:'Checked numerator'}):'');
}

const pair=v=>Array.isArray(v)&&v.length===2&&v.every(x=>finite(x)&&Math.abs(x)<=1e6);
function frame(points,{width=600,height=250,pad=35,equal=true}={}) {
  const valid=points.filter(pair);if(!valid.length)return null;
  let xmin=Math.min(0,...valid.map(p=>p[0])),xmax=Math.max(0,...valid.map(p=>p[0]));
  let ymin=Math.min(0,...valid.map(p=>p[1])),ymax=Math.max(0,...valid.map(p=>p[1]));
  if(xmin===xmax){xmin-=1;xmax+=1;}if(ymin===ymax){ymin-=1;ymax+=1;}
  const dx=(xmax-xmin)*.15,dy=(ymax-ymin)*.15;xmin-=dx;xmax+=dx;ymin-=dy;ymax+=dy;
  if(equal){const unit=Math.max((xmax-xmin)/(width-2*pad),(ymax-ymin)/(height-2*pad));const cx=(xmin+xmax)/2,cy=(ymin+ymax)/2;xmin=cx-unit*(width-2*pad)/2;xmax=cx+unit*(width-2*pad)/2;ymin=cy-unit*(height-2*pad)/2;ymax=cy+unit*(height-2*pad)/2;}
  const X=x=>pad+(x-xmin)/(xmax-xmin)*(width-2*pad),Y=y=>height-pad-(y-ymin)/(ymax-ymin)*(height-2*pad);
  return {X,Y,xmin,xmax,ymin,ymax,width,height,axes:line(X(xmin),Y(0),X(xmax),Y(0))+line(X(0),Y(ymin),X(0),Y(ymax))+text(X(xmax)-5,Y(0)-6,'x',{size:11})+text(X(0)+6,Y(ymax)+8,'y',{size:11})};
}
function arrow(f,start,end,c,label='') {
  const a=[f.X(start[0]),f.Y(start[1])],b=[f.X(end[0]),f.Y(end[1])],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
  const labelX=b[0]>400?b[0]-7:b[0]+7,labelY=b[1]<24?b[1]+18:b[1]-8,anchor=b[0]>400?'end':'start';
  if(length<.1)return dot(...a,4,c)+(label?text(a[0]+8,a[1]-8,label,{fill:c,size:12}):'');
  const ux=dx/length,uy=dy/length;
  return line(...a,...b,c,3)+`<path d="M${b[0]},${b[1]} L${b[0]-9*ux+4*uy},${b[1]-9*uy-4*ux} L${b[0]-9*ux-4*uy},${b[1]-9*uy+4*ux} Z" fill="${c}"/>`+(label?text(labelX,labelY,label,{fill:c,size:12,anchor}):'');
}

function vectors(v) {
  const g=v.givens,points=(v.type==='points'?g.points:g.vectors)||[];
  if(!Array.isArray(points)||!points.length||!points.every(pair))return problemMap(v);
  const shown=points.slice(0,2).map(x=>[...x]);let resultant=null;
  if(v.phase==='feedback'&&g.task==='component'&&shown.length===2){const k=g.operation==='-'?-1:1;resultant=[shown[0][0]+k*shown[1][0],shown[0][1]+k*shown[1][1]];if(pair(resultant))shown.push(resultant);else resultant=null;}
  const f=frame(shown);if(!f)return problemMap(v);let body=f.axes;
  points.slice(0,2).forEach((p,i)=>{const x=f.X(p[0]),y=f.Y(p[1]);body+=v.type==='points'?dot(x,y,5,i?color.purple:color.given)+text(x>400?x-8:x+8,y<24?y+18:y-10,`(${fmt(p[0])}, ${fmt(p[1])})`,{size:12,anchor:x>400?'end':'start'}):arrow(f,[0,0],p,i?color.purple:color.given,`${i?'v':'u'} = (${fmt(p[0])}, ${fmt(p[1])})`);});
  if(v.type==='points'&&points.length===2)body+=line(f.X(points[0][0]),f.Y(points[0][1]),f.X(points[1][0]),f.Y(points[1][1]),color.checked,2,'5 4');
  if(resultant)body+=arrow(f,[0,0],resultant,color.checked,g.operation==='-'?'u − v':'u + v');
  body+=text(12,244,'Equal x/y units; only the requested quantity is compared below.',{size:10,fill:color.muted});
  return svg(body,255,'Given vectors or points on equally scaled coordinate axes.')+(v.phase==='feedback'?comparison(v):'');
}

function triangle(v) {
  const legs=v.givens.legs;if(!pair(legs)||legs.some(x=>x<=0))return problemMap(v);
  const [a,b]=legs,h=Math.hypot(a,b),vertices=[[0,0],[a,0],[0,b]];let end=null;
  if(v.phase==='feedback'&&finite(v.response_value)&&Math.abs(v.response_value)<=1e6){end=[a-a*v.response_value/h,b*v.response_value/h];if(!pair(end))end=null;}
  const f=frame(end?[...vertices,end]:vertices);let body='';
  body+=line(f.X(0),f.Y(0),f.X(a),f.Y(0),color.given,3)+line(f.X(0),f.Y(0),f.X(0),f.Y(b),color.given,3)+line(f.X(a),f.Y(0),f.X(0),f.Y(b),color.checked,2);
  body+=text((f.X(0)+f.X(a))/2,f.Y(0)+18,fmt(a),{anchor:'middle'})+text(f.X(0)-9,(f.Y(0)+f.Y(b))/2,fmt(b),{anchor:'end'});
  body+=`<path d="M${f.X(0)+10},${f.Y(0)} v-10 h-10" fill="none" stroke="${color.ink}"/>`;
  if(end)body+=line(f.X(a),f.Y(0),f.X(end[0]),f.Y(end[1]),color.user,4,'7 4')+dot(f.X(end[0]),f.Y(end[1]),6,color.user);
  body+=text(12,242,v.phase==='feedback'?'Your dashed length must meet the opposite vertex. Negative lengths are invalid.':'Both legs are given; the hypotenuse is the unknown length.',{size:11,fill:color.muted});
  const witness=v.witness;
  return svg(body,255,'A right triangle with equally scaled leg lengths; the submitted hypotenuse is shown along its diagonal direction.')+
    (witness&&finite(witness.leg_square_sum)&&finite(witness.proposed_square)?`<p class="av-formula">Leg squares: ${esc(fmt(witness.leg_square_sum))} · Your length squared: ${esc(fmt(witness.proposed_square))}${witness.valid_length===false?' · A length must be nonnegative.':''}</p>`:'')+(v.phase==='feedback'?comparison(v):'');
}

function balance(v) {
  const g=v.givens;if(!pair(g.left)||!pair(g.right))return problemMap(v);
  let body=line(65,62,535,62,color.ink,3)+`<path d="M300 65 L275 100 L325 100 Z" fill="${color.line}"/>`;
  body+=rect(40,15,235,40,color.fill)+rect(325,15,235,40,color.fill)+text(300,42,'=',{size:22,anchor:'middle'});
  const expression=p=>`${fmt(p[1])}x ${p[0]<0?'−':'+'} ${fmt(Math.abs(p[0]))}`;
  body+=text(157,41,expression(g.left),{anchor:'middle',size:16})+text(442,41,expression(g.right),{anchor:'middle',size:16});
  const w=v.witness;
  if(w&&finite(w.left)&&finite(w.right))return svg(body,110,'Two affine expressions must have equal values for the same input.')+`<p class="av-formula">Substitute your x = ${esc(v.response)}: left = ${esc(fmt(w.left))}, right = ${esc(fmt(w.right))}. Gap = ${esc(fmt(w.difference))}.</p>`+comparison(v,{left:'Left after your substitution',right:'Right after your substitution',a:w.left,b:w.right})+comparison(v);
  return svg(body,110,'Two affine expressions must have equal values for the same input.')+(v.phase==='feedback'?comparison(v):'');
}

function angles(v) {
  const a=v.givens.angles;if(!Array.isArray(a)||!a.length||a.length>2||!a.every(x=>finite(x)&&x>0&&x<180))return problemMap(v);
  if(v.phase!=='feedback')return svg(a.map((n,i)=>{const x=90+300*i,y=125,r=65,rad=n*Math.PI/180;return line(x,y,x+r,y,color.given)+line(x,y,x+r*Math.cos(rad),y-r*Math.sin(rad),color.given)+text(x,158,`Given angle ${i+1}: ${fmt(n)}°`,{anchor:'middle'});}).join(''),185,'Only the stated angles are drawn; the missing angle is not labeled.');
  let body=text(25,22,'Triangle or straight-angle total: 180°',{size:12}),start=25;
  a.forEach((n,i)=>{const w=550*n/180;body+=rect(start,37,w,35,i?color.purple:color.given,'#fff',0);if(w>45)body+=text(start+w/2,60,`${fmt(n)}°`,{fill:'#fff',anchor:'middle',size:12});start+=w;});
  body+=rect(start,37,Math.max(0,575-start),35,color.checked,'#fff',0);
  return svg(body,90,'The known and checked missing angles fill a total of 180 degrees.')+comparison(v);
}

function functionPlot(v) {
  const g=v.givens,p=g.coefficients;
  if(!Array.isArray(p)||!p.length||p.length>5||!p.every(finite)||!finite(g.input)||Math.abs(g.input)>1e6)return problemMap(v);
  const x0=g.input,span=Math.max(2,Math.abs(x0)*.12),xmin=x0-span,xmax=x0+span;
  const at=x=>p.reduceRight((r,a)=>r*x+a,0);
  const curve=Array.from({length:121},(_,i)=>{const x=xmin+(xmax-xmin)*i/120;return[x,at(x)];});
  if(curve.some(p=>!p.every(finite)))return v.phase==='feedback'?comparison(v):problemMap(v);
  const ys=curve.map(p=>p[1]),y0=at(x0);
  if(v.phase==='feedback'&&g.task==='value'){if(finite(v.response_value))ys.push(v.response_value);if(finite(v.expected_value))ys.push(v.expected_value);}
  let ymin=Math.min(...ys),ymax=Math.max(...ys);const size=Math.max(Math.abs(ymin),Math.abs(ymax),1e-100);
  let low=ymin/size,high=ymax/size;if(high===low){low-=1;high+=1;}const pad=(high-low)*.13;low-=pad;high+=pad;ymin=low*size;ymax=high*size;
  const X=x=>40+(x-xmin)/(xmax-xmin)*520,Y=y=>215-(y/size-low)/(high-low)*180;
  let body=line(40,215,560,215)+line(40,35,40,215)+text(560,234,'x',{anchor:'end',size:11})+text(12,30,'f(x)',{size:11});
  for(let i=0;i<3;i++){const xx=xmin+(xmax-xmin)*i/2,yy=(low+(high-low)*i/2)*size;body+=text(X(xx),234,fmt(xx),{anchor:'middle',size:10})+text(46,Y(yy)+3,fmt(yy),{anchor:'start',size:10});}
  body+=`<path d="${curve.map((p,i)=>`${i?'L':'M'}${X(p[0])},${Y(p[1])}`).join(' ')}" stroke="${color.given}" stroke-width="2.5" fill="none"/>`+line(X(x0),35,X(x0),215,color.line,1,'4 4');
  if(v.phase==='feedback') {
    if(g.task==='derivative') {
      const tangent=(slope,c)=>{if(!finite(slope))return '';let lo=xmin-x0,hi=xmax-x0;if(slope!==0){const a=(ymin-y0)/slope,b=(ymax-y0)/slope;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));}if(lo>hi)return '';return line(X(x0+lo),Y(y0+slope*lo),X(x0+hi),Y(y0+slope*hi),c,2.5,c===color.user?'6 4':'');};
      body+=tangent(v.expected_value,color.checked)+tangent(v.response_value,color.user)+dot(X(x0),Y(y0),5,color.given);
    } else {
      if(finite(v.expected_value))body+=dot(X(x0),Y(v.expected_value),6,color.checked);
      if(finite(v.response_value))body+=dot(X(x0),Y(v.response_value),4,color.user);
    }
  }
  body+=text(300,255,v.phase==='feedback'?(g.task==='derivative'?'Orange dashed: your proposed slope · Green: checked tangent':'Your output and the checked output share this input'):'The curve shows the stated rule; no checked answer is marked.',{anchor:'middle',size:11,fill:color.muted});
  return svg(body,275,g.task==='derivative'?'Graph of the stated polynomial, with submitted and checked tangent slopes only after feedback.':'Graph of the stated polynomial, with submitted and checked outputs only after feedback.')+(v.phase==='feedback'?comparison(v):'');
}

function probability(v) {
  const {red:r,blue:b}=v.givens;if(!Number.isInteger(r)||!Number.isInteger(b)||r<0||b<0||r+b<1||r+b>20000)return v.phase==='feedback'?comparison(v):problemMap(v);
  let body=rect(20,30,560*r/(r+b),36,'#c96b69','none',0)+rect(20+560*r/(r+b),30,560*b/(r+b),36,color.given,'none',0);
  body+=text(20,20,`${r} red + ${b} blue = ${r+b} balls`,{size:13})+text(20,89,'Given population proportions; draws are without replacement.',{size:11,fill:color.muted});
  return svg(body,105,'The bag composition, shown proportionally from its stated counts.')+(v.phase==='feedback'?comparison(v):'');
}

function integral(v) {
  const g=v.givens,t=g.upper,a=g.coefficient,n=g.power;
  if(!finite(t)||t<=0||t>1e6||!finite(a)||a<=0||a>1e6||!Number.isInteger(n)||n<1||n>4)return problemMap(v);
  const peak=a*t**n,mean=v.phase==='feedback'&&finite(v.response_value)?v.response_value/t:null;
  if(!finite(peak)||(mean!==null&&!finite(mean)))return v.phase==='feedback'?comparison(v):problemMap(v);
  let low=Math.min(0,mean??0),high=Math.max(peak,mean??0,1e-100),scale=Math.max(Math.abs(low),Math.abs(high));
  low/=scale;high/=scale;const span=high-low||1,X=x=>45+510*x/t,Y=y=>210-165*(y/scale-low)/span;
  const points=Array.from({length:101},(_,i)=>[X(t*i/100),Y(a*(t*i/100)**n)]);
  const zero=Y(0);
  let body=`<path d="M45 ${zero} ${points.map(p=>'L'+p.join(' ')).join(' ')} L555 ${zero} Z" fill="#dcece5"/>`+
    `<polyline points="${points.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${color.given}" stroke-width="2.5"/>`+
    line(45,zero,555,zero)+text(45,233,'0',{anchor:'middle',size:11})+text(555,233,fmt(t),{anchor:'middle',size:11})+
    text(30,25,`Given rule: ${fmt(a)}x^${n}`,{size:13})+text(565,233,'x',{size:11});
  if(mean!==null)body+=rect(45,Math.min(Y(mean),zero),510,Math.abs(Y(mean)-zero),'none',color.user,0);
  body+=text(300,257,v.phase==='feedback'?'Orange rectangle has your proposed signed area. Compare areas, not heights.':'Shaded region uses the stated rule and bounds; no area value is shown.',{anchor:'middle',size:10,fill:color.muted});
  return svg(body,280,'Integral region. After submission, an orange rectangle spans the same interval with the proposed signed area.')+(v.phase==='feedback'?comparison(v):'');
}

function accumulation(v) {
  const {rates,durations}=v.givens;
  if(!Array.isArray(rates)||!Array.isArray(durations)||rates.length!==2||durations.length!==2||!rates.every(finite)||!durations.every(x=>finite(x)&&x>0))return problemMap(v);
  const end=durations[0]+durations[1],max=Math.max(...rates.map(Math.abs),1e-100),X=x=>45+510*x/end,Y=y=>125-80*y/max;
  let at=0,body=line(45,125,555,125)+text(25,22,'Net flow (L/min)',{size:12});
  rates.forEach((r,i)=>{const x=X(at),right=X(at+durations[i]),y=Y(r);body+=rect(x,Math.min(y,125),right-x,Math.abs(y-125),i?'#f6e4ce':'#dcece5',i?color.user:color.checked,0)+text((x+right)/2,r>=0?y-8:y+16,`${fmt(r)} L/min`,{anchor:'middle',size:12});at+=durations[i];});
  [0,durations[0],end].forEach(t=>{body+=text(X(t),228,fmt(t),{anchor:'middle',size:11});});
  body+=text(570,228,'min',{size:10})+text(300,251,'Above zero adds volume; below zero removes it. Width is elapsed time.',{anchor:'middle',size:10,fill:color.muted});
  return svg(body,270,'Signed flow rectangles with widths equal to their stated durations. No total is given before submission.')+(v.phase==='feedback'?comparison(v):'');
}

function choices(v) {
  if(v.phase!=='feedback')return problemMap(v);
  return `<div class="av-choice-columns"><div class="av-your"><b>Your claim</b><p>${esc(v.response||'No choice entered')}</p></div><div class="av-checked"><b>Checked claim</b><p>${esc(v.expected)}</p></div></div>`;
}

export function renderAnswerVisual(raw) {
  const v=normalized(raw);let picture;
  if(v.phase==='problem'&&['quantity','choice','written'].includes(v.type))return '';
  try {picture=({fractions,'equivalent-fractions':equivalentFractions,balance,triangle,angles,vectors,points:vectors,function:functionPlot,integral,accumulation,probability,choice:choices,written:problemMap}[v.type]||((v)=>v.phase==='feedback'?comparison(v):problemMap(v)))(v);}catch{picture=v.phase==='feedback'?comparison(v):problemMap(v);}
  if(v.phase==='problem'&&!picture)return '';
  const numericValues=v.phase==='feedback'&&v.kind==='number'?`<div class="av-values"><div class="av-your"><b>Your value</b><span>${esc(v.response||'No value entered')}${v.givens.unit?` ${esc(v.givens.unit)}`:''}</span></div><div class="av-checked"><b>Checked value</b><span>${esc(v.expected)}${v.givens.unit?` ${esc(v.givens.unit)}`:''}</span></div></div>`:'';
  const status=v.phase==='feedback'?`<span class="av-status ${v.correct?'av-match':'av-revisit'}">${v.correct?'Matches this item':'Revisit this item'}</span>`:'';
  return `<figure class="answer-visual" data-visual-type="${v.type}" data-visual-phase="${v.phase}"><figcaption class="av-heading"><strong>${esc(v.title||'See the calculation')}</strong>${status}</figcaption>${picture}${numericValues}<p class="av-note">${esc(v.note)}</p></figure>`;
}

export function mountAnswerVisual(element, visual) {
  if(!element||typeof element.innerHTML!=='string')throw new TypeError('Choose a container for the answer visual.');
  element.innerHTML=renderAnswerVisual(visual);
  return ()=>element.replaceChildren();
}
