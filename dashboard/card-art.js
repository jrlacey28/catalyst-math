/**
 * Original, dependency-free mathematical previews for Catalyst discovery cards.
 * Usage: cardArt({id: topic.id, kind: 'lesson', title: topic.title})
 * Kinds: course, lesson/video/topic, studio/application, project, playground,
 * function, mission, path. Pass compact:true for a dense row thumbnail.
 * The helper fetches nothing, has no interactive controls, and does not read state.
 * cardArtInfo() and cardArtCoverage expose semantic coverage for integration QA.
 */
const P={ink:'#274d3c',green:'#56876a',sage:'#cbdcc9',gold:'#ba883c',butter:'#f1dfb4',
  purple:'#8866a6',lavender:'#ded2eb',blue:'#528aa3',sky:'#cce4ea',red:'#ba6d61',
  rose:'#efd8cd',paper:'#f4f7ed',line:'#d6e0d3',white:'#fffef8',muted:'#64816b'};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>Math.round(v*1000)/1000;
const circle=(x,y,r,fill=P.purple,stroke='none',w=1)=>'<circle cx="'+num(x)+'" cy="'+num(y)+'" r="'+num(r)+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+w+'"/>';
const rect=(x,y,w,h,fill=P.sage,stroke='none',radius=0)=>'<rect x="'+num(x)+'" y="'+num(y)+'" width="'+num(w)+'" height="'+num(h)+'" rx="'+radius+'" fill="'+fill+'" stroke="'+stroke+'"/>';
const line=(x,y,a,b,color=P.ink,w=2,dash='')=>'<line x1="'+num(x)+'" y1="'+num(y)+'" x2="'+num(a)+'" y2="'+num(b)+'" stroke="'+color+'" stroke-width="'+w+'" stroke-linecap="round"'+(dash?' stroke-dasharray="'+dash+'"':'')+'/>';
const path=(points,color=P.purple,w=3,fill='none',close=false)=>'<path d="'+points.map((p,i)=>(i?'L':'M')+num(p[0])+','+num(p[1])).join(' ')+(close?' Z':'')+'" fill="'+fill+'" stroke="'+color+'" stroke-width="'+w+'" stroke-linejoin="round" stroke-linecap="round"/>';
const text=(x,y,value,size=12,color=P.ink,anchor='middle')=>'<text x="'+x+'" y="'+y+'" font-size="'+size+'" fill="'+color+'" text-anchor="'+anchor+'" font-family="system-ui,Segoe UI,sans-serif">'+esc(value)+'</text>';
const arrow=(x,y,a,b,color=P.green,w=2.4)=>{
  const angle=Math.atan2(b-y,a-x),head=6;
  return line(x,y,a,b,color,w)+path([[a-head*Math.cos(angle-.5),b-head*Math.sin(angle-.5)],[a,b],[a-head*Math.cos(angle+.5),b-head*Math.sin(angle+.5)]],color,w);
};
const ellipse=(x,y,rx,ry,color=P.purple,w=2.5,fill='none')=>'<ellipse cx="'+x+'" cy="'+y+'" rx="'+rx+'" ry="'+ry+'" stroke="'+color+'" stroke-width="'+w+'" fill="'+fill+'"/>';
const curve=(fn,start,end,n=80)=>Array.from({length:n+1},(_,i)=>fn(start+(end-start)*i/n));
const arc=(cx,cy,r,a,b,color=P.gold,w=3)=>path(curve(t=>[cx+r*Math.cos(t),cy-r*Math.sin(t)],a,b,36),color,w);
const bracket=(x,y,h,side=1)=>path([[x+side*7,y],[x,y],[x,y+h],[x+side*7,y+h]],P.ink,2);
const axes=(xmin=-3,xmax=3,ymin=-2,ymax=4,options={})=>{
  const unit=Math.min(232/(xmax-xmin),104/(ymax-ymin));
  const w=options.equal?unit*(xmax-xmin):232,h=options.equal?unit*(ymax-ymin):104,left=48+(232-w)/2,top=24+(104-h)/2;
  const X=x=>left+(x-xmin)/(xmax-xmin)*w,Y=y=>top+h-(y-ymin)/(ymax-ymin)*h;
  let svg='';
  for(let x=Math.ceil(xmin);x<=xmax;x++)svg+=line(X(x),top,X(x),top+h,P.line,.8);
  for(let y=Math.ceil(ymin);y<=ymax;y++)svg+=line(left,Y(y),left+w,Y(y),P.line,.8);
  if(ymin<=0&&ymax>=0)svg+=arrow(left-5,Y(0),left+w+6,Y(0),P.muted,1.3);
  if(xmin<=0&&xmax>=0)svg+=arrow(X(0),top+h+4,X(0),top-5,P.muted,1.3);
  return {X,Y,svg,plot:(f,a=xmin,b=xmax,color=P.purple,w=3)=>path(curve(x=>[X(x),Y(f(x))],a,b).filter(p=>p[1]>=16&&p[1]<=136),color,w),
    point:(x,y,fill=P.purple,open=false)=>circle(X(x),Y(y),4,open?P.white:fill,fill,2)};
};

function arithmeticArt(mode){
  let s='';
  if(mode==='count'||mode==='multiply'||mode==='combine'){
    const rows=mode==='count'?2:3,cols=mode==='multiply'?5:4;
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)s+=circle(97+c*36,51+r*29,10,c<2?P.green:P.gold);
    s+=mode==='multiply'?text(160,145,'3 × 5',14):mode==='combine'?line(148,30,148,127,P.purple,2,'4 4')+text(160,145,'6 + 6',13):text(160,126,'8',20);
  }else if(mode==='place'){
    for(let c=0;c<3;c++){const x=98+c*63,n=[2,3,4][c];s+=line(x,31,x,113,P.line,3);for(let j=0;j<n;j++)s+=rect(x-18,100-j*17,36,12,[P.green,P.gold,P.purple][c],'none',5);s+=text(x,140,['100','10','1'][c],12);}
  }else if(mode==='fraction'||mode==='decimal'||mode==='percent'||mode==='ratio'){
    const rows=mode==='percent'?5:mode==='decimal'?2:2,cols=mode==='percent'?10:mode==='decimal'?5:mode==='ratio'?5:3;
    const filled=mode==='percent'?15:mode==='decimal'?7:mode==='ratio'?4:4,size=mode==='percent'?17:mode==='decimal'?26:34,gap=4;
    const start=160-(cols*(size+gap)-gap)/2,top=80-(rows*(size+gap)-gap)/2;
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const k=r*cols+c;s+=rect(start+c*(size+gap),top+r*(size+gap),size,size,k<filled?(mode==='ratio'?P.gold:P.green):P.white,P.line,3);}
    s+=text(160,145,mode==='percent'?'30%':mode==='decimal'?'0.7':mode==='ratio'?'2 : 3':'4 / 6',14);
  }else if(mode==='powers'){
    for(let r=0;r<4;r++){const count=2**r,y=31+r*29;for(let j=0;j<count;j++){const x=70+180*(j+.5)/count;
      if(r<3){const a=70+180*(2*j+.5)/(count*2),b=70+180*(2*j+1.5)/(count*2);s+=line(x,y,a,y+29,P.line,1.5)+line(x,y,b,y+29,P.line,1.5);}
      s+=circle(x,y,r===3?5:7,r%2?P.gold:P.green);}}
    s+=text(284,124,'2³',17);
  }else if(mode==='root'){
    for(let r=0;r<3;r++)for(let c=0;c<3;c++)s+=rect(117+c*29,32+r*29,27,27,r===c?P.gold:P.sage,P.white,3);
    s+=text(160,146,'√9 = 3',14);
  }else{
    const labels=mode==='order'?['×','+','2','3','4']:['=','+','x','3','7'];
    s+=line(160,34,112,78,P.line,2)+line(160,34,223,111,P.line,2)+line(112,78,79,121,P.line,2)+line(112,78,141,121,P.line,2);
    [[160,32,labels[0]],[112,76,labels[1]],[79,120,labels[2]],[141,120,labels[3]],[223,110,labels[4]]].forEach(([x,y,t],i)=>{s+=circle(x,y,17,i<2?P.lavender:P.butter)+text(x,y+5,t,16);});
  }
  return s;
}

function numberlineArt(mode){
  if(mode==='sequence'){
    const X=x=>68+190*x;
    let s=arrow(50,91,284,91,P.muted,1.8);
    [0,.5,1].forEach(x=>{s+=line(X(x),86,X(x),97,P.muted,1.2)+text(X(x),116,x,11,P.muted);});
    [1,1/2,1/3,1/4,1/6,1/10].forEach((x,i)=>{s+=circle(X(x),65,5,[P.gold,P.purple][i%2])+line(X(x),72,X(x),89,P.line,1);});
    return s+line(X(0),34,X(0),91,P.green,2,'4 4')+text(171,139,'1 / n → 0',12);
  }
  const X=x=>160+22*x;let s=arrow(35,91,289,91,P.muted,1.8);
  for(let i=-5;i<=5;i++)s+=line(X(i),86,X(i),97,P.muted,1.2)+(i%2===0?text(X(i),116,i,11,P.muted):'');
  if(mode==='estimate')s+=rect(X(0),67,44,20,P.butter,'none',7)+circle(X(1.6),77,5,P.purple)+arc(X(2),70,14,.2,2.8,P.gold,2)+text(198,43,'≈ 2',15);
  else if(mode==='interval'||mode==='inequality')s+=line(X(-1),72,X(4),72,P.purple,6)+circle(X(-1),72,6,mode==='interval'?P.white:P.purple,P.purple,2)+circle(X(4),72,6,P.purple)+text(186,42,mode==='interval'?'−1 < x ≤ 4':'x ≥ −1',13)+(mode==='inequality'?arrow(X(4),72,285,72,P.purple,2):'');
  else if(mode==='real')s+=circle(X(Math.SQRT2),72,6,P.purple)+text(X(Math.SQRT2),45,'√2',16)+line(X(Math.SQRT2),78,X(Math.SQRT2),90,P.purple,1.5);
  else {const negative=mode==='negative';s+=arrow(X(negative?2:-3),58,X(negative?-2:2),58,negative?P.purple:P.green,3)+circle(X(negative?2:-3),91,5,P.gold)+circle(X(negative?-2:2),91,5,P.purple)+text(160,38,negative?'2 − 4':'−3 + 5',15);}
  return s;
}

function equationArt(mode){
  if(mode==='product'){
    const x=78,y=28,u=102,v=60,du=47,dv=30;
    return rect(x,y,u,v,P.sage,P.white,2)+rect(x+u,y,du,v,P.butter,P.white,2)+
      rect(x,y+v,u,dv,P.lavender,P.white,2)+rect(x+u,y+v,du,dv,P.rose,P.white,2)+
      text(x+u/2,y+v/2+6,'uv',20)+text(x+u+du/2,y+v/2+4,'vΔu',12)+
      text(x+u/2,y+v+dv/2+4,'uΔv',12)+text(x+u+du/2,y+v+dv/2+4,'ΔuΔv',10)+
      text(160,146,'Δ(uv) = vΔu + uΔv + ΔuΔv',12);
  }
  if(mode==='conjugate'){
    return rect(88,29,103,103,P.sage,P.green,2)+rect(151,29,40,40,P.white,P.purple,2)+text(126,94,'a²',18)+text(171,54,'b²',14,P.purple)+text(236,70,'a − b',13)+text(236,97,'a + b',13)+text(159,151,'a² − b²',13);
  }
  if(mode==='tiles'||mode==='factor'){
    const x=99,y=29,a=67,b=29;
    let s=rect(x,y,a,a,P.sage,P.white,2)+rect(x+a,y,b,a,P.butter,P.white,2)+rect(x,y+a,a,b,P.lavender,P.white,2)+rect(x+a,y+a,b,b,P.rose,P.white,2);
    s+=text(x+a/2,y+a/2+5,'x²',17)+text(x+a+b/2,y+a/2+4,'x',12)+text(x+a/2,y+a+b/2+4,'x',12)+text(x+a+b/2,y+a+b/2+4,'1',12);
    s+=text(148,148,mode==='factor'?'(x + 1)²':'x² + 2x + 1',13);
    return s;
  }
  let s=line(69,53,251,53,P.ink,3)+path([[151,111],[160,67],[169,111]],P.ink,2,P.lavender,true)+line(133,113,187,113,P.ink,3);
  for(const x of [91,229])s+=line(x,53,x-28,90,P.line,2)+line(x,53,x+28,90,P.line,2)+path([[x-31,91],[x-23,104],[x+23,104],[x+31,91]],P.muted,2,P.sage);
  if(mode==='multi-step'){
    s+=rect(60,69,14,18,P.purple,'none',3)+rect(78,69,14,18,P.purple,'none',3);
    for(let i=0;i<3;i++)s+=circle(99+i*11,80,4.5,P.gold);
    for(let i=0;i<7;i++)s+=circle(209+(i%4)*13,73+Math.floor(i/4)*13,4.5,i<4?P.green:P.gold);
  }else{
    s+=rect(72,69,19,19,P.purple,'none',3)+circle(99,80,7,P.gold)+circle(116,80,7,P.gold);
    for(let i=0;i<4;i++)s+=circle(209+i*14,81,6,i<2?P.green:P.gold);
  }
  s+=text(160,144,mode==='one-step'?'x + 2 = 4':mode==='multi-step'?'2x + 3 = 7':mode==='system'?'same pair · two rules':'balance both sides',12);
  return s;
}

function machineArt(mode){
  const chain=mode==='compose'||mode==='chain',names=chain?['g','f']:mode==='inverse'?['f','f⁻¹']:['f'];
  let s='';
  if(names.length===1)s+=circle(58,80,19,P.butter)+text(58,85,'3',15)+arrow(79,80,120,80,P.gold)+rect(125,50,70,60,P.lavender,'none',13)+text(160,87,'f(x)',20)+arrow(201,80,242,80,P.purple)+circle(265,80,20,P.sage)+text(265,85,'7',15);
  else{
    s+=circle(42,81,10,P.gold)+arrow(56,81,81,81,P.gold)+rect(86,50,60,60,P.sage,'none',12)+text(116,87,names[0],22)+arrow(151,81,179,81,P.green)+rect(184,50,60,60,P.lavender,'none',12)+text(214,87,names[1],20)+arrow(249,81,277,81,P.purple)+circle(286,81,8,P.purple);
    if(mode==='inverse')s+=path([[116,119],[116,135],[214,135],[214,118]],P.gold,1.8)+text(165,149,'undo',10);
    if(mode==='chain')s+=text(162,141,'rate × rate',12);
    if(mode==='compose')s+=text(160,141,'f(g(x))',13);
  }
  return s;
}

function graphArt(mode){
  const cubic=mode==='cubic'||mode==='polynomial';
  const a=axes(cubic?-2:-3,cubic?2:3,cubic?-4:-2,cubic?4:4);let s=a.svg;
  if(['linear','slope','system','regression-line','inequality-line','proportion'].includes(mode)){
    const f=x=>mode==='proportion'?.7*x:.7*x+1;
    if(mode==='inequality-line')s+=path([[a.X(-3),a.Y(f(-3))],[a.X(3),a.Y(f(3))],[a.X(3),a.Y(-2)],[a.X(-3),a.Y(-2)]],P.sage,0,P.sage,true);
    s+=a.plot(f);
    if(mode==='system')s+=a.plot(x=>-x+1,-3,3,P.gold);
    if(mode==='slope')s+=line(a.X(-1),a.Y(f(-1)),a.X(1),a.Y(f(-1)),P.gold,2)+line(a.X(1),a.Y(f(-1)),a.X(1),a.Y(f(1)),P.gold,2)+a.point(-1,f(-1))+a.point(1,f(1));
    else [mode==='proportion'?0:-1,2].forEach(x=>s+=a.point(x,f(x)));
  }else if(mode==='exponential'||mode==='logarithm'){
    s+=mode==='exponential'?a.plot(x=>Math.exp(.45*x),-3,2.9):a.plot(x=>Math.log(x),.16,3);
    s+=mode==='exponential'?a.point(0,1):a.point(1,0);
    s+=text(251,41,mode==='exponential'?'bˣ':'log x',13);
  }else if(mode==='rational'){
    s+=a.plot(x=>1/x,-3,-.51)+a.plot(x=>1/x,.26,3)+line(a.X(0),24,a.X(0),128,P.gold,1.6,'4 4');
  }else if(mode==='radical'){
    const b=axes(-1,5,-1,3);return b.svg+b.plot(x=>Math.sqrt(x),0,5)+b.point(0,0)+text(253,39,'√x',14);
  }else if(mode==='limit'||mode==='cancel'){
    s+=a.plot(x=>.6*x+1,-3,.95)+a.plot(x=>.6*x+1,1.05,3)+a.point(1,1.6,P.purple,true)+arrow(a.X(-1),a.Y(.4)-14,a.X(.65),a.Y(1.39)-14,P.gold,1.8)+text(244,137,'x ≠ a',11);
  }else if(mode==='continuity'){
    s+=a.plot(x=>.5*x,-3,0)+a.plot(x=>.5*x+1.5,0,3)+a.point(0,0,P.purple,true)+a.point(0,1.5,P.gold);
  }else if(mode==='derivative'||mode==='secant'||mode==='implicit'){
    if(mode==='implicit'){
      const px=164+76/Math.SQRT2,py=80-42/Math.SQRT2;
      s+=ellipse(164,80,76,42,P.purple,3)+line(px-45,py-45*42/76,px+45,py+45*42/76,P.gold,2.5)+circle(px,py,5,P.gold);
    }else{
      const f=x=>.32*x*x;
      s+=a.plot(f)+a.plot(x=>mode==='secant'?.32*(.7+2.3)*x-.32*.7*2.3:.96*x-.72,-.3,3,P.gold,2.2);
      if(mode==='secant')s+=a.point(.7,f(.7),P.gold)+a.point(2.3,f(2.3),P.gold);
      else s+=a.point(1.5,f(1.5),P.gold);
    }
  }else if(mode==='inverse'){
    s+=a.plot(x=>2*x+1,-1.4,1.5)+a.plot(x=>(x-1)/2,-3,3,P.gold)+a.plot(x=>x,-2,3,P.line,1.6);
  }else if(mode==='transform'){
    s+=a.plot(x=>.45*x*x,-2.9,2.9,P.sage,2.6)+a.plot(x=>.45*(x-1)**2+1,-1.5,3,P.purple,3)+arrow(a.X(0),a.Y(0),a.X(1),a.Y(1),P.gold);
  }else if(mode==='taylor'){
    const b=axes(-3,3,-2,2);return b.svg+b.plot(Math.sin,-3,3)+b.plot(x=>x-x**3/6,-2.8,2.8,P.gold,2)+b.point(0,0);
  }else{
    const f=cubic?x=>.42*x**3:mode==='optimization'?x=>3-.5*x*x:mode==='convex'?x=>.4*x*x:x=>.5*x*x-.8;
    s+=a.plot(f);
    if(mode==='optimization')s+=a.point(0,3,P.gold)+line(a.X(0),a.Y(0),a.X(0),a.Y(3),P.gold,1.4,'3 3');
    if(mode==='quadratic')s+=a.point(-Math.sqrt(1.6),0,P.gold)+a.point(Math.sqrt(1.6),0,P.gold);
    if(mode==='convex')s+=line(a.X(-2),a.Y(f(-2)),a.X(2.4),a.Y(f(2.4)),P.gold,2)+a.point(0,0);
    if(mode==='polynomial')s+=a.point(-1,f(-1),P.gold)+a.point(1,f(1),P.green);
  }
  return s;
}

function geometryArt(mode){
  let s='';
  if(['angle','radian','sector','circle','unit-circle','polar','related'].includes(mode)){
    const cx=153,cy=81,r=51,t=mode==='radian'?1:Math.PI/3;
    if(mode==='related')return circle(cx,cy,51,P.lavender,P.purple,2.5)+circle(cx,cy,35,P.white,P.green,2.5)+arrow(cx,cy,cx+35,cy,P.green)+arrow(cx+39,cy,cx+51,cy,P.gold)+text(224,86,'Δr',12);
    if(mode!=='angle')s+=circle(cx,cy,r,P.white,P.line,1.5);
    if(mode==='sector')s+=path([[cx,cy],...curve(a=>[cx+r*Math.cos(a),cy-r*Math.sin(a)],0,t)],P.gold,1,P.butter,true);
    s+=line(cx,cy,cx+r+15,cy,P.muted,1.6)+line(cx,cy,cx+r*Math.cos(t),cy-r*Math.sin(t),P.green,3);
    if(mode==='angle')s+=line(cx,cy,cx+85,cy,P.purple,3)+arc(cx,cy,26,0,t,P.gold,3)+text(cx+38,cy-8,'θ',14);
    else if(mode==='unit-circle'||mode==='polar'){
      s+=line(cx-r-12,cy,cx+r+12,cy,P.line)+line(cx,cy-r-12,cx,cy+r+12,P.line)+line(cx+r*Math.cos(t),cy,cx+r*Math.cos(t),cy-r*Math.sin(t),P.gold,2,'3 3')+circle(cx+r*Math.cos(t),cy-r*Math.sin(t),5,P.purple);
      s+=text(cx+85,cy-29,mode==='polar'?'(r, θ)':'(cos θ, sin θ)',11);
    }else s+=arc(cx,cy,r,0,t,P.gold,4)+text(232,55,mode==='radian'?'s = rθ':mode==='circle'?'2πr':'½r²θ',14);
  }else if(mode==='congruence'||mode==='similarity'){
    const base=[[58,115],[126,115],[91,45]],scale=mode==='similarity'?1.28:1;
    s+=path(base,P.green,2.5,P.sage,true)+path(base.map(([x,y])=>[174+(x-58)*scale,115+(y-115)*scale]),P.purple,2.5,P.lavender,true);
    s+=text(160,84,mode==='similarity'?'× k':'≅',18);
  }else if(mode==='volume'||mode==='cube'){
    const front=[[115,58],[177,58],[177,120],[115,120]],back=front.map(([x,y])=>[x+37,y-29]);
    s+=path([front[0],front[1],back[1],back[0]],P.green,2,P.sage,true)+path([front[1],front[2],back[2],back[1]],P.purple,2,P.lavender,true)+path(front,P.ink,2,P.white,true);
    front.forEach((p,i)=>s+=line(...p,...back[i],P.ink,1.7));s+=path(back,P.ink,1.7,'none',true)+text(237,114,mode==='cube'?'x · y · z':'V = lwh',12);
  }else{
    const tri=[[66,119],[249,119],[mode==='trig'?249:mode==='triangle'?178:mode==='proof-triangle'?157.5:136,33]];
    const corner=mode==='trig'?-10:10;
    s+=path(tri,P.green,2.6,P.sage,true)+line(tri[2][0],33,tri[2][0],119,P.purple,2,'4 4')+path([[tri[2][0],109],[tri[2][0]+corner,109],[tri[2][0]+corner,119]],P.purple,1.4);
    if(mode==='trig')s+=arc(66,119,31,0,Math.atan2(86,183),P.gold,3)+text(111,111,'θ',12)+text(161,66,'h',12);
    else s+=text(156,143,'b',12)+text(tri[2][0]+13,78,'h',12);
    if(mode==='coordinate')s+=line(49,133,271,133,P.line,1.5)+line(49,133,49,27,P.line,1.5)+text(281,137,'x',10)+text(49,21,'y',10)+tri.map(([x,y])=>circle(x,y,4,P.purple)).join('');
    if(mode==='proof-triangle')s+=arc(66,119,26,0,Math.atan2(86,tri[2][0]-66),P.gold,3)+arc(249,119,26,Math.PI-Math.atan2(86,249-tri[2][0]),Math.PI,P.gold,3);
  }
  return s;
}

function waveArt(mode){
  const a=axes(-Math.PI,Math.PI,-1.8,1.8);let s=a.svg;
  if(mode==='tangent'){
    for(const [l,r] of [[-3.14,-2.1],[-1.0,1.0],[2.1,3.14]])s+=a.plot(Math.tan,l,r);
    for(const x of [-Math.PI/2,Math.PI/2])s+=line(a.X(x),24,a.X(x),128,P.gold,1.4,'4 4');
  }else{
    const f=x=>mode==='sound'?Math.sin(x)+.32*Math.sin(3*x):Math.sin(mode==='trig-graph'?2*x:x);
    if(mode==='identity')s+=a.plot(Math.cos,-Math.PI,Math.PI,P.gold,2.3);
    if(mode==='sound')s+=a.plot(Math.sin,-Math.PI,Math.PI,P.sage,2);
    s+=a.plot(f,-Math.PI,Math.PI);
    if(mode==='trig-equation'){const y=.5;s+=line(a.X(-Math.PI),a.Y(y),a.X(Math.PI),a.Y(y),P.gold,1.8,'4 4');for(const x of [Math.PI/6,5*Math.PI/6])s+=a.point(x,y,P.gold);}
    if(mode==='trig-graph')s+=line(a.X(0),142,a.X(Math.PI),142,P.gold,2)+text(a.X(Math.PI/2),153,'period',10);
    if(mode==='sound')s+=text(269,35,'Σ waves',11);
  }
  return s;
}

function calculusArt(mode){
  if(['derivative','secant','implicit','limit','continuity','taylor','optimization'].includes(mode))return graphArt(mode);
  if(mode==='chain')return machineArt('chain');
  if(mode==='product')return equationArt('product');
  if(mode==='related')return geometryArt('related');
  const a=axes(0,5,0,4),f=x=>mode==='improper'?3/(x+1):.11*(x-1)**2+1.1;let s=a.svg;
  const n=mode==='quadrature'?6:mode==='integral'?7:10,start=mode==='improper'?.2:.4,end=mode==='ftc'?3.1:4.7,dx=(end-start)/n;
  for(let i=0;i<n;i++){
    const x=start+i*dx,y=f(x+dx/2);
    if(mode==='quadrature')s+=path([[a.X(x),a.Y(0)],[a.X(x),a.Y(f(x))],[a.X(x+dx),a.Y(f(x+dx))],[a.X(x+dx),a.Y(0)]],P.white,1,i%2?P.lavender:P.sage,true);
    else s+=rect(a.X(x),a.Y(y),a.X(x+dx)-a.X(x)-1,a.Y(0)-a.Y(y),i%2?P.lavender:P.sage,P.white);
  }
  s+=a.plot(f,.2,4.85);
  if(mode==='ftc')s+=line(a.X(end),a.Y(0),a.X(end),a.Y(f(end)),P.gold,3)+text(a.X(end),148,'t',12);
  else if(mode==='improper')s+=arrow(272,115,300,115,P.gold)+text(291,142,'∞',17);
  else s+=text(261,37,mode==='parts'?'∫ u dv':'∫',24);
  return s;
}

function statsArt(mode){
  const values=mode==='sample'?[2,5,7,11,13,16]:[2,4,5,7,8,10,14],X=x=>57+x*13;let s='';
  if(['center','variance','spread','sample'].includes(mode)){
    const mean=values.reduce((a,b)=>a+b,0)/values.length;
    s+=line(44,107,283,107,P.line,2);
    values.forEach((v,i)=>{s+=circle(X(v),91,7,mode==='sample'&&i%2?P.gold:P.green);if(mode==='variance')s+=rect(X(v)-3,84-Math.abs(v-mean)*5,6,Math.abs(v-mean)*5,P.lavender);});
    s+=line(X(mean),56,X(mean),121,P.purple,2.4)+text(X(mean),42,'mean',11);
    if(mode==='spread')s+=path([[X(mean-3),130],[X(mean-3),140],[X(mean+3),140],[X(mean+3),130]],P.gold,2)+text(X(mean),155,'spread',10);
    if(mode==='sample')s+=path([[80,57],[111,29],[207,29],[237,57]],P.gold,2)+text(160,23,'sample',11);
  }else if(mode==='correlation'||mode==='regression'){
    const a=axes(0,8,0,6);s=a.svg;
    const xy=[[.7,1.2],[1.5,1],[2.2,2.2],[3.1,2.1],[4.3,3.4],[5.2,3.3],[6,4.6],[7.2,4.8]];
    xy.forEach(([x,y])=>{if(mode==='regression')s+=line(a.X(x),a.Y(y),a.X(x),a.Y(.6*x+.5),P.gold,1.6);s+=a.point(x,y,P.green);});
    s+=a.plot(x=>.6*x+.5,0,8,P.purple,2.5);
  }else if(mode==='intervals'){
    for(let i=0;i<5;i++){const mid=[157,171,148,182,140][i],w=[41,35,28,34,23][i],y=35+i*23;s+=line(mid-w,y,mid+w,y,i===3?P.gold:P.green,4)+circle(mid,y,4,P.ink);}
    s+=line(160,20,160,143,P.purple,1.5,'3 4')+text(264,142,'estimate',10);
  }else if(mode==='histogram'||mode==='distribution'){
    const bars=[1,3,6,9,11,9,6,3,1];bars.forEach((n,i)=>s+=rect(60+i*23,125-n*8,20,n*8,i===4?P.gold:P.sage,'none',3));s+=line(50,126,280,126,P.muted,1.3);
    if(mode==='distribution')s+=path(curve(x=>[x,124-92*Math.exp(-(((x-163)/49)**2)/2)],48,280),P.purple,2.8);
  }else{
    const a=axes(-3,3,0,1.2),f=x=>Math.exp(-x*x/2);
    s=a.svg+path([[a.X(1.2),a.Y(0)],...curve(x=>[a.X(x),a.Y(f(x))],1.2,3),[a.X(3),a.Y(0)]],P.butter,0,P.butter,true)+a.plot(f)+line(a.X(1.2),a.Y(0),a.X(1.2),a.Y(f(1.2)),P.gold,2)+text(259,39,'tail',11);
  }
  return s;
}

function treeArt(mode){
  let s='';
  if(mode==='bayes'){
    for(let j=0;j<10;j++)for(let i=0;i<10;i++){const k=j*10+i;const color=k<8?P.purple:k<17?P.gold:P.line;s+=circle(91+i*15,21+j*13,4.8,color);}
    s+=text(265,68,'true',10,P.purple)+text(265,90,'false',10,P.gold)+text(160,156,'among the flags',10);
  }else if(mode==='venn'||mode==='conditional'){
    s+=rect(50,25,227,115,P.white,P.line,12)+circle(132,81,43,P.sage,P.green,2)+circle(190,81,43,P.lavender,P.purple,2);
    const h=Math.sqrt(43**2-29**2);
    s+='<path d="M 161 '+num(81-h)+' A 43 43 0 0 1 161 '+num(81+h)+' A 43 43 0 0 1 161 '+num(81-h)+' Z" fill="'+P.butter+'"/>';
    s+=text(110,84,'A',14)+text(211,84,'B',14);
    if(mode==='conditional')s+=circle(190,81,47,'none',P.gold,2)+text(231,153,'given B',10);
  }else{
    const nodes=[[65,81],[152,43],[152,120],[246,23],[246,64],[246,100],[246,139]];
    [[0,1],[0,2],[1,3],[1,4],[2,5],[2,6]].forEach(([i,j])=>s+=line(...nodes[i],...nodes[j],j%2?P.green:P.purple,2.3));
    nodes.forEach(([x,y],i)=>s+=circle(x,y,i?8:12,i%2?P.green:P.purple));
    s+=text(104,50,mode==='counting'?'×':'p',12)+text(192,22,mode==='counting'?'2':'q',12);
    if(mode==='expectation')s+=text(292,70,'Σ p·x',12)+line(266,26,266,137,P.gold,2);
    if(mode==='random-variable')s+=text(283,31,'0',11)+text(283,67,'1',11)+text(283,104,'1',11)+text(283,143,'2',11);
  }
  return s;
}

function vectorArt(mode){
  const a=axes(-2,4,-1,4,{equal:true});let s=a.svg;
  if(mode==='matrix'||mode==='eigen'||mode==='eigenvectors'){
    const original=[[0,0],[1,0],[1,1],[0,1]],image=mode==='eigen'?[[0,0],[2.6,0],[2.6,1.6],[0,1.6]]:[[0,0],[2,1],[3,3],[1,2]];
    s+=path(original.map(([x,y])=>[a.X(x),a.Y(y)]),P.green,2,P.sage,true)+path(image.map(([x,y])=>[a.X(x),a.Y(y)]),P.purple,2,P.lavender,true);
    s+=arrow(a.X(0),a.Y(0),a.X(image[1][0]),a.Y(image[1][1]),P.gold,3)+arrow(a.X(0),a.Y(0),a.X(image[3][0]),a.Y(image[3][1]),P.purple,3);
    if(mode==='eigen')s+=text(245,42,'λv',15);
    if(mode==='eigenvectors')s+=line(a.X(-.4),a.Y(-.4),a.X(3.4),a.Y(3.4),P.gold,2,'4 4');
    if(mode==='matrix')s+=bracket(55,25,30)+text(71,38,'2  1',10)+text(71,52,'1  2',10)+bracket(89,25,30,-1);
  }else if(mode==='projection'||mode==='hilbert'){
    s+=arrow(a.X(0),a.Y(0),a.X(2.5),a.Y(3),P.purple,3)+arrow(a.X(0),a.Y(0),a.X(2.5),a.Y(0),P.green,3)+line(a.X(2.5),a.Y(3),a.X(2.5),a.Y(0),P.gold,2,'4 4')+text(a.X(1.6),147,'projection',11);
  }else if(mode==='space'){
    s+=path([[a.X(-1),a.Y(0)],[a.X(1),a.Y(2.5)],[a.X(4),a.Y(3)],[a.X(2),a.Y(.5)]],P.green,1.5,P.sage,true)+arrow(a.X(0),a.Y(1),a.X(1.1),a.Y(2.1),P.purple)+arrow(a.X(0),a.Y(1),a.X(2.4),a.Y(1.4),P.gold);
  }else{
    s+=arrow(a.X(0),a.Y(0),a.X(2),a.Y(1),P.green,3)+arrow(a.X(2),a.Y(1),a.X(3),a.Y(3),P.gold,3)+arrow(a.X(0),a.Y(0),a.X(3),a.Y(3),P.purple,3)+text(a.X(1.1),a.Y(2.3),'u + v',13);
  }
  return s;
}

function surfaceArt(mode){
  const project=(x,y,z)=>[160+39*(x-y),96+16*(x+y)-31*z];
  const f=(x,y)=>mode==='plane'?.35*x+.2*y:mode==='pde'?.65*Math.sin(1.3*x-y):.75-.24*x*x-.24*y*y;
  let s='';
  for(const v of [-1.5,-1,-.5,0,.5,1,1.5]){
    s+=path(curve(t=>project(v,t,f(v,t)),-1.5,1.5),P.green,1.2)+path(curve(t=>project(t,v,f(t,v)),-1.5,1.5),P.green,1.2);
  }
  if(mode==='partial')s+=path(curve(t=>project(t,0,f(t,0)),-1.5,1.5),P.purple,4)+text(258,39,'y fixed',11);
  else if(mode==='flux')for(const [x,y] of [[-1,0],[0,0],[1,0]]){const z=f(x,y),p=project(x,y,z),q=project(x+.48*x*.65,y+.48*y*.65,z+.65);s+=arrow(...p,...q,P.purple,2.4);}
  else if(mode==='volume-integral')for(const [x,y] of [[0,-1],[0,0],[1,0]]){const p=project(x,y,f(x,y)),q=project(x,y,-.8);s+=line(...p,...q,P.gold,5);}
  else s+=arrow(160,121,160,31,P.purple,2)+text(174,29,'z',11);
  return s;
}

function fieldArt(mode){
  const a=axes(-2,2,-2,2);let s='';
  for(let x=-1.5;x<=1.5;x+=.75)for(let y=-1.5;y<=1.5;y+=.75){
    const vx=mode==='gradient'?-x:-y,vy=mode==='gradient'?-y:x,len=Math.hypot(vx,vy)||1;
    s+=arrow(a.X(x),a.Y(y),a.X(x)+vx/len*12,a.Y(y)-vy/len*12,P.green,1.3);
  }
  if(mode==='line-integral')s+=ellipse(164,78,65,40,P.purple,3)+arrow(164,38,190,41,P.gold,2.5);
  else if(mode==='ode'){
    const b=axes(0,4,0,2.4);s=b.svg;
    for(let x=.25;x<4;x+=.5)for(let y=.3;y<2.4;y+=.5){const cx=b.X(x),cy=b.Y(y),dy=-7*(1-y)*(104/2.4)/(232/4);s+=line(cx-7,cy-dy,cx+7,cy+dy,P.green,1.5);}
    s+=b.plot(x=>1-.85*Math.exp(-x),0,4,P.purple,3);
  }else s+=circle(164,77,5,P.gold);
  return s;
}

function networkArt(mode){
  const pts=[[63,81],[128,36],[130,126],[213,52],[264,112]];
  const edges=[[0,1],[0,2],[1,2],[1,3],[2,3],[2,4],[3,4]];let s='';
  edges.forEach(([i,j],k)=>s+=line(...pts[i],...pts[j],k===0||k===3||k===6?P.purple:P.line,k===0||k===3||k===6?3:1.7));
  if(mode==='algorithm')s+=text(87,43,'2',11)+text(176,36,'3',11)+text(251,75,'1',11);
  pts.forEach(([x,y],i)=>s+=circle(x,y,10,i===0?P.gold:i===4?P.purple:P.green));
  if(mode==='combinatorics')s+=text(164,155,'count paths',11);
  if(mode==='logic')s+=text(164,155,'if … then …',11);
  return s;
}

function proofArt(mode){
  let s='';
  if(mode==='relations'){
    const ps=[[88,50,'a'],[88,114,'b'],[232,50,'1'],[232,114,'2']];
    s+=arrow(109,50,212,50,P.green,2.5)+arrow(109,114,212,114,P.purple,2.5)+arrow(110,61,212,103,P.gold,2);
    ps.forEach(([x,y,t],i)=>{s+=rect(x-26,y-18,52,36,i<2?P.sage:P.lavender,'none',10)+text(x,y+5,t,15);});
    return s;
  }
  const labels=mode==='logic'?['P','Q','¬Q','¬P']:mode==='relations'?['a','b','1','2']:mode==='induction'?['1','n','n+1']:['given','reason','claim'];
  if(labels.length===4){
    const ps=[[88,50],[232,50],[232,114],[88,114]];
    s+=arrow(109,50,212,50,P.green,2.5)+arrow(211,114,108,114,P.purple,2.5);
    ps.forEach(([x,y],i)=>{s+=rect(x-26,y-18,52,36,i<2?P.sage:P.lavender,'none',10)+text(x,y+5,labels[i],15);});
    if(mode==='relations')s+=line(105,62,211,106,P.gold,2);
  }else{
    [65,159,253].forEach((x,i)=>{if(i<2)s+=arrow(x+25,80,x+65,80,P.gold,2.5);s+=rect(x-27,54,54,52,[P.sage,P.butter,P.lavender][i],'none',12)+text(x,85,labels[i],mode==='induction'?15:11);});
    if(mode==='induction')s+=path([[149,112],[149,137],[263,137],[263,112]],P.purple,1.8);
  }
  return s;
}

function seriesArt(mode){
  const base=mode==='alternating'?80:124;
  let s=line(52,base,277,base,P.line,2);
  const ratio=mode==='alternating'?-1/2:1/2;
  for(let i=0;i<7;i++){const h=(mode==='alternating'?50:86)*Math.abs(ratio)**i;s+=rect(59+i*30,mode==='alternating'&&i%2?base:base-h,23,h,i%2?P.lavender:P.sage,'none',2);}
  if(mode==='sequence')s+=path([[60,38],[90,81],[120,103],[150,113],[180,119],[210,121],[240,123]],P.gold,2);
  else s+=text(244,34,mode==='alternating'?'±':'Σ',24);
  return s;
}

function complexArt(mode){
  if(mode==='contour'||mode==='residue'){
    let s=ellipse(157,82,71,45,P.purple,3)+arrow(192,42,214,56,P.purple,2.5)+circle(150,85,6,P.gold)+text(151,112,'pole',10);
    if(mode==='residue')s+=circle(150,85,25,'none',P.gold,1.5)+text(250,78,'∮',27);
    else s+=text(75,28,'C',14);
    return s;
  }
  if(mode==='holomorphic'){
    const A=(x,y)=>[164+44*(x*x-y*y),80-40*(2*x*y)];
    let s='';
    for(const k of [-.8,-.4,0,.4,.8])s+=path(curve(t=>A(k,t),-.8,.8),P.green,1.5)+path(curve(t=>A(t,k),-.8,.8),P.purple,1.5);
    return s+text(260,135,'z ↦ z²',13);
  }
  const a=axes(-2,2,-2,2,{equal:true});return a.svg+arrow(a.X(0),a.Y(0),a.X(1.3),a.Y(.6),P.green,3)+arrow(a.X(0),a.Y(0),a.X(-.6),a.Y(1.3),P.purple,3)+arc(a.X(0),a.Y(0),26,Math.atan2(.6,1.3),Math.atan2(1.3,-.6),P.gold,2.5)+text(254,144,'× i',14);
}

function algebraArt(mode){
  if(mode==='clock'||mode==='group'||mode==='field'){
    const n=mode==='group'?6:5,cx=159,cy=80,r=51;let s=circle(cx,cy,r,'none',P.line,1.5);
    for(let i=0;i<n;i++){const a=Math.PI/2-i*2*Math.PI/n,x=cx+r*Math.cos(a),y=cy-r*Math.sin(a);s+=circle(x,y,11,i===2?P.purple:P.sage)+text(x,y+4,i,11);}
    s+=arc(cx,cy,31,Math.PI/2-4*Math.PI/n,Math.PI/2,P.gold,3)+text(261,140,mode==='field'?'mod 5':mode==='group'?'compose':'wrap',11);
    return s;
  }
  if(mode==='lattice'){
    const a=axes(0,6,0,4);let s=a.svg+a.plot(x=>(12-2*x)/3,0,6);
    for(let x=0;x<=6;x++)for(let y=0;y<=4;y++)s+=circle(a.X(x),a.Y(y),2.4,P.line);
    for(const [x,y] of [[0,4],[3,2],[6,0]])s+=a.point(x,y,P.gold);
    return s;
  }
  if(mode==='ring')return bracket(40,50,56)+text(72,73,'1  0',16)+text(72,98,'0  0',16)+bracket(104,50,56,-1)+text(123,83,'×',17)+bracket(143,50,56)+text(175,73,'0  0',16)+text(175,98,'0  1',16)+bracket(207,50,56,-1)+text(230,83,'=',17)+text(267,85,'0',24)+text(157,139,'nonzero factors',11);
  let s=rect(86,38,147,84,P.sage,P.green,2);
  s+=rect(86,38,84,84,P.lavender,P.white,2)+rect(170,38,63,63,P.butter,P.white,2)+rect(170,101,21,21,P.lavender,P.white,1)+rect(191,101,21,21,P.lavender,P.white,1)+rect(212,101,21,21,P.lavender,P.white,1);
  return s+text(160,145,mode==='divisors'?'divide · remainder':'factor',12);
}

function advancedArt(mode){
  if(mode==='constraint'||mode==='unconstrained'){
    let s='';for(let r=1;r<=4;r++)s+=ellipse(160,84,25*r,13*r,P.line,1.7);
    s+=arrow(235,124,214,110,P.green,2.5)+arrow(208,108,190,99,P.green,2.5)+arrow(187,98,172,91,P.green,2.5)+circle(160,84,5,P.purple);
    if(mode==='constraint')s+=line(82,135,231,26,P.gold,3)+circle(187,58,5,P.purple);
    return s;
  }
  if(mode==='root-find'){
    const a=axes(-2,3,-2,3);let s=a.svg+a.plot(x=>.35*x*x-.7,-2,3);
    for(const [x,c] of [[0,P.green],[2,P.purple],[1,P.gold],[1.5,P.gold]])s+=line(a.X(x),a.Y(-1.5),a.X(x),a.Y(.35*x*x-.7),c,1.6,'3 3')+circle(a.X(x),a.Y(0),4,c);
    return s+text(242,35,'halve',11);
  }
  if(mode==='error'){
    const a=axes(-2,2,-1,3);return a.svg+a.plot(x=>.4*x*x+.2)+a.plot(x=>.4*x*x+.55,-2,2,P.gold,2)+line(a.X(1.2),a.Y(.4*1.2**2+.2),a.X(1.2),a.Y(.4*1.2**2+.55),P.red,3);
  }
  if(mode==='euler'){
    const a=axes(0,4,0,4),f=x=>.18*x*x+.4;let s=a.svg+a.plot(f);
    let y=.4;const pts=[[a.X(0),a.Y(y)]];
    for(let i=0;i<5;i++){y+=.8*.36*(i*.8);pts.push([a.X((i+1)*.8),a.Y(y)]);}
    s+=path(pts,P.gold,2.5);return s;
  }
  if(mode==='cover'||mode==='connected'||mode==='metric'){
    let s='';
    const centers=mode==='connected'?[[89,78],[127,68],[218,91],[251,71]]:[[91,80],[131,65],[179,81],[225,67]];
    centers.forEach(([x,y],i)=>s+=circle(x,y,mode==='metric'?31:28,'none',i%2?P.purple:P.green,2));
    if(mode==='metric')s+=circle(179,81,4,P.gold)+line(179,81,208,81,P.gold,2)+text(193,71,'ε',12);
    else s+=path(mode==='connected'?[[61,88],[90,89],[130,73]]:[[63,91],[101,94],[144,65],[185,93],[249,56]],P.gold,3);
    return s;
  }
  if(mode==='quotient'){
    let s=rect(111,35,98,93,P.white,P.line,1);
    s+=arrow(116,35,205,35,P.green,3)+arrow(116,128,205,128,P.green,3)+arrow(111,122,111,42,P.purple,3)+arrow(209,122,209,42,P.purple,3)+text(259,91,'glue',12);
    return s;
  }
  if(mode==='surface'||mode==='manifold'||mode==='geodesic'){
    let s=ellipse(158,80,64,51,P.green,2,P.sage)+ellipse(158,80,64,17,P.white,1.4)+ellipse(158,80,25,51,P.white,1.4);
    if(mode==='manifold')s+=path([[145,40],[182,44],[199,72],[159,69]],P.purple,2,P.lavender,true)+arrow(207,68,260,56,P.gold)+rect(265,31,31,30,P.lavender,'none',3);
    else if(mode==='geodesic')s+=path(curve(t=>[158+64*Math.cos(t),80+17*Math.sin(t)],.05,2.7),P.purple,4);
    else s+=path(curve(t=>[158+62*Math.cos(t),80+25*Math.sin(t)],0,Math.PI),P.purple,3);
    return s;
  }
  if(mode==='measure'||mode==='lebesgue'||mode==='lp'){
    let s='';
    if(mode==='measure'){[[55,249],[81,228],[116,204],[139,184]].forEach(([l,r],i)=>s+=line(l,39+i*29,r,39+i*29,i%2?P.purple:P.green,8)+circle(l,39+i*29,4,P.white));}
    else {const a=axes(0,5,0,4);s=a.svg;for(let i=0;i<5;i++){const h=[1,2.4,3.2,2,1.3][i];s+=rect(a.X(i+.1),a.Y(h),a.X(i+.9)-a.X(i+.1),a.Y(0)-a.Y(h),i%2?P.lavender:P.sage);}
      if(mode==='lebesgue')for(const y of [1,2,3])s+=line(48,a.Y(y),280,a.Y(y),P.gold,1.4,'4 3');
      if(mode==='lp')s+=text(248,35,'‖f‖ₚ',16);
    }return s;
  }
  if(mode==='markov'){
    let s=circle(100,79,25,P.sage,P.green,2)+circle(222,79,25,P.lavender,P.purple,2);
    s+=path([[120,59],[141,35],[184,35],[203,57]],P.gold,2.5)+arrow(191,43,203,57,P.gold)+path([[204,102],[183,125],[141,125],[119,102]],P.purple,2.5)+arrow(131,115,119,102,P.purple)+text(161,28,'0.3',11)+text(161,143,'0.6',11)+text(100,85,'A',17)+text(222,85,'B',17);
    s+=arc(79,60,26,.8,5.2,P.green,2)+arc(244,98,26,-2.3,2.2,P.purple,2);return s;
  }
  if(mode==='poisson'){
    let s=arrow(41,106,286,106,P.muted,1.8);[64,98,110,173,221,250].forEach((x,i)=>s+=line(x,102,x,51+(i%3)*9,i%2?P.green:P.purple,3)+circle(x,48+(i%3)*9,5,P.gold));
    return s+path([[110,126],[110,137],[173,137],[173,126]],P.gold,2)+text(141,153,'waiting time',10);
  }
  if(mode==='brownian'){
    const a=axes(0,10,-3,3),ys=[0,.7,.2,1.1,.5,-.2,.3,-.6,-1.1,-.3,-.9,.1,.8,.2,1.3,.5,.9,.4,1.5,.8,1.1];
    return a.svg+path(ys.map((y,i)=>[a.X(i/2),a.Y(y)]),P.purple,2.5)+a.point(0,0,P.gold);
  }
  if(mode==='operator')return machineArt('compose')+text(160,27,'linear operator',11);
  if(mode==='spectrum'){
    let s=line(52,86,278,86,P.muted,1.8);[67,113,175,208,258].forEach((x,i)=>s+=circle(x,86,5+i%3,i===2?P.gold:P.purple)+line(x,68-i*3,x,80,P.line,1.3));
    return s+text(163,134,'eigenvalues',13);
  }
  return vectorArt('hilbert');
}

function applicationArt(mode){
  if(mode==='recipe'){
    let s='';
    for(const [x,scale,c] of [[77,.6,P.gold],[178,1,P.green]]){
      s+=path([[x,34],[x+60,34],[x+55,121],[x+5,121]],P.muted,2,P.white,true)+path([[x+4,121-72*scale],[x+56,121-72*scale],[x+53,117],[x+7,117]],c,0,c,true);
      for(let i=0;i<4;i++)s+=line(x+45,54+i*17,x+56,54+i*17,P.line,1.5);
    }return s+arrow(148,77,170,77,P.purple)+text(159,147,'same ratio',11);
  }
  if(mode==='garden'){
    let s=rect(79,46,156,76,P.sage,P.green,2.8);
    for(let x=85;x<235;x+=16)s+=line(x,42,x,50,P.gold,2)+line(x,118,x,126,P.gold,2);
    for(let y=51;y<121;y+=16)s+=line(75,y,83,y,P.gold,2)+line(231,y,239,y,P.gold,2);
    s+=text(155,36,'l',14)+text(249,85,'w',14)+text(156,146,'fixed fence',11);return s;
  }
  if(mode==='rocket'){
    let s=path([[77,124],[104,59],[137,95]],P.purple,3,P.lavender,true)+path([[104,59],[142,25],[160,76],[137,95]],P.green,2,P.sage,true)+circle(136,57,10,P.white,P.green,2);
    s+=path([[77,124],[74,142],[95,130]],P.gold,2,P.butter,true)+path([[125,119],[157,106],[190,79],[220,35]],P.gold,2.5)+text(244,103,'v(t)',17);return s;
  }
  if(mode==='orbit'){
    const a=100,b=62,cx=167,cy=80,focus=cx-Math.sqrt(a*a-b*b),theta=Math.PI/3;
    const x=cx+a*Math.cos(theta),y=cy-b*Math.sin(theta),dx=26,dy=dx*b*Math.cos(theta)/(a*Math.sin(theta));
    return ellipse(cx,cy,a,b,P.purple,2.5)+circle(focus,cy,15,P.sage,P.green,1.5)+circle(x,y,7,P.gold)+arrow(x,y,x+dx,y+dy,P.green)+line(focus,cy,x,y,P.line,1.5)+text(num(focus),118,'Moon',10);
  }
  if(mode==='energy'){
    let s=rect(64,74,67,54,P.lavender,P.purple,2);
    for(let i=1;i<4;i++)s+=line(64+i*67/4,74,64+i*67/4,128,P.white,1.5);
    s+=line(64,101,131,101,P.white,1.5)+circle(93,36,15,P.butter,P.gold,2);
    s+=arrow(141,101,180,101,P.gold)+rect(189,63,65,66,P.white,P.green,2)+rect(209,57,25,6,P.green)+rect(196,91,51,31,P.sage,'none',2)+text(221,84,'+',17,P.green);
    return s;
  }
  if(mode==='game'){
    let s=rect(46,29,226,112,P.white,P.line,12);
    for(const [x,y,w] of [[62,119,61],[142,100,55],[218,71,37]])s+=rect(x,y,w,9,P.green,'none',2);
    s+=path([[91,114],[147,63],[192,91]],P.gold,2.5)+rect(83,99,15,18,P.purple,'none',3)+circle(228,56,7,P.gold);
    return s+arrow(176,55,210,55,P.purple);
  }
  if(mode==='ai'||mode==='features'||mode==='training'){
    let s='';const layers=[[61,[53,105]],[158,[30,80,131]],[260,[80]]];
    for(let k=0;k<2;k++)for(const y of layers[k][1])for(const z of layers[k+1][1])s+=line(layers[k][0],y,layers[k+1][0],z,(y+z)%3?P.line:P.gold,1.5);
    layers.forEach(([x,ys],k)=>ys.forEach(y=>s+=circle(x,y,k===1?12:15,[P.green,P.purple,P.gold][k])));
    if(mode==='training')s+=arrow(245,139,82,139,P.gold,1.8)+text(161,155,'learn from error',10);
    if(mode==='features')s+=text(48,27,'x₁',11)+text(47,137,'x₂',11);
    return s;
  }
  return graphArt(mode==='plans'?'system':mode==='motion'?'derivative':'optimization');
}

const drawers={arithmetic:arithmeticArt,numberline:numberlineArt,equation:equationArt,machine:machineArt,
  graph:graphArt,geometry:geometryArt,wave:waveArt,calculus:calculusArt,stats:statsArt,
  tree:treeArt,vector:vectorArt,surface:surfaceArt,field:fieldArt,network:networkArt,
  proof:proofArt,series:seriesArt,complex:complexArt,algebra:algebraArt,advanced:advancedArt,application:applicationArt};

// The explicit registry follows the canonical curriculum. Descriptions are part
// of accessibility, and name what the picture actually depicts, not mastery.
const topicRows={
  'number-sense':[
    ['counting','arithmetic','count','Eight dots arranged in two rows.'],
    ['place-value','arithmetic','place','Two hundreds, three tens and four ones on place-value rods.'],
    ['addition-subtraction','numberline','add','A move from negative three to positive two along a number line.'],
    ['multiplication-division','arithmetic','multiply','Three equal rows of five dots form a multiplication array.'],
    ['order-of-operations','arithmetic','order','A calculation tree groups addition before multiplication.'],
    ['estimation','numberline','estimate','A point between whole numbers is rounded toward two.']],
  arithmetic:[
    ['fractions','arithmetic','fraction','Four of six equal parts are shaded.'],
    ['decimals','arithmetic','decimal','Seven tenths are shaded on a ten-part grid.'],
    ['percentages','arithmetic','percent','Fifteen of fifty cells illustrate thirty percent.'],
    ['ratios','arithmetic','ratio','Four shaded and six unshaded cells illustrate a two-to-three ratio.'],
    ['proportions','graph','proportion','A straight line through the origin shows a constant ratio.'],
    ['negative-numbers','numberline','negative','A leftward subtraction crosses zero on the number line.'],
    ['exponents','arithmetic','powers','Three branching doublings produce eight endpoints.'],
    ['roots','arithmetic','root','Nine square cells form a three-by-three square.']],
  'pre-algebra':[
    ['variables','arithmetic','variables','A calculation tree uses a variable in an equality.'],
    ['expressions','equation','tiles','Four algebra tiles represent a squared binomial.'],
    ['one-step-equations','equation','one-step','A balance compares an unknown plus two with four.'],
    ['multi-step-equations','equation','multi-step','A balance illustrates preserving equality through several operations.'],
    ['inequalities','numberline','inequality','An included boundary extends toward larger values.'],
    ['coordinate-plane','vector','sum','Coordinate arrows combine horizontal and vertical displacements.'],
    ['basic-functions','machine','function','One input travels through a function rule to one output.'],
    ['word-problems','application','plans','Two cost lines connect fixed amounts, rates and their intersection.']],
  'algebra-1':[
    ['linear-equations','graph','linear','Two points lie on a line with a nonzero intercept.'],
    ['linear-inequalities','graph','inequality-line','A shaded half-plane lies below a boundary line.'],
    ['systems','graph','system','Two different lines meet at their common solution.'],
    ['functions','machine','function','A function connects a named input with an output.'],
    ['slope','graph','slope','A rise-and-run triangle measures the rate along a line.'],
    ['graphing','geometry','coordinate','Labeled coordinate axes locate a geometric triangle.'],
    ['polynomials','graph','polynomial','A cubic curve passes through points with changing slope.'],
    ['factoring','equation','factor','An area model arranges a polynomial as a squared binomial.'],
    ['quadratics','graph','quadratic','A parabola has two marked horizontal-axis crossings.'],
    ['exponential-functions','graph','exponential','An exponential curve grows by repeated proportional change.']],
  geometry:[
    ['angles','geometry','angle','Two rays and an arc mark a chosen angle.'],
    ['triangles','geometry','triangle','A triangle shows its base and perpendicular height.'],
    ['congruence','geometry','congruence','Two triangles retain the same shape and size.'],
    ['similarity','geometry','similarity','A scaled triangle retains its angles while lengths change.'],
    ['circles','geometry','circle','A radius and a highlighted arc describe a circle.'],
    ['area','geometry','area','A triangle highlights base and perpendicular height for area.'],
    ['volume','geometry','volume','A rectangular solid shows three independent dimensions.'],
    ['coordinate-geometry','geometry','coordinate','Triangle vertices are located relative to coordinate axes.'],
    ['proof-basics','geometry','proof-triangle','Matching angle arcs provide geometric evidence in a triangle.']],
  'statistics-basics':[
    ['center','stats','center','A mean marker balances a small set of observations.'],
    ['variance','stats','variance','Observation deviations extend away from the mean.'],
    ['standard-deviation','stats','spread','A data strip compares a center with its spread.'],
    ['distributions','stats','distribution','A bell-shaped density overlays a distribution of values.'],
    ['correlation','stats','correlation','Paired observations follow a positive association.'],
    ['basic-probability','tree','probability','A probability tree separates sequential outcomes.']],
  'algebra-2':[
    ['advanced-quadratics','graph','transform','A shifted parabola is compared with its original shape.'],
    ['polynomial-functions','graph','cubic','A cubic graph changes slope on either side of its center.'],
    ['rational-functions','graph','rational','Two reciprocal branches approach an excluded vertical line.'],
    ['radicals','graph','radical','A square-root curve begins at its allowed domain endpoint.'],
    ['complex-numbers','complex','rotation','Multiplication by i rotates a vector through a quarter-turn.'],
    ['exponentials','graph','exponential','A growing exponential passes through its initial value.'],
    ['logarithms','graph','logarithm','A logarithmic curve exists only for positive inputs.'],
    ['sequences','series','sequence','Terms decrease toward zero along an ordered index.'],
    ['series','series','sum','Decreasing geometric contributions are gathered into a sum.']],
  trigonometry:[
    ['right-triangle-trig','geometry','trig','An acute angle relates a right triangle’s legs and hypotenuse.'],
    ['sin-cos-tan','wave','tangent','Tangent branches are separated by excluded angles.'],
    ['unit-circle','geometry','unit-circle','A unit-circle point has cosine and sine components.'],
    ['radians','geometry','radian','Arc length is radius multiplied by a radian angle.'],
    ['trig-graphs','wave','trig-graph','A sine wave completes a marked repeating period.'],
    ['identities','wave','identity','Sine and cosine are compared over the same angle interval.'],
    ['trig-equations','wave','trig-equation','Two sine crossings satisfy the same output condition.']],
  precalculus:[
    ['function-transformations','graph','transform','An input and output shift relocate a parabola.'],
    ['composite-functions','machine','compose','An output from g becomes an input to f.'],
    ['inverse-functions','graph','inverse','A function and its inverse reflect across the diagonal.'],
    ['advanced-exponentials-logs','machine','inverse','A function is reversed by its inverse operation.'],
    ['parametric-equations','application','orbit','A moving point follows a parameterized elliptical path.'],
    ['polar-coordinates','geometry','polar','A radial distance and angle locate a point.'],
    ['sequences-series','series','alternating','Alternating geometric terms decrease in magnitude.'],
    ['introduction-to-limits','graph','limit','Nearby values approach a hole without defining the excluded input.']],
  'calculus-1':[
    ['limits','graph','limit','A graph approaches an excluded point from nearby inputs.'],
    ['continuity','graph','continuity','Two branches have different one-sided outputs at a boundary.'],
    ['derivatives','calculus','derivative','A tangent line touches a curve at a chosen input.'],
    ['product-quotient-rule','calculus','product','Three added regions show the exact product change before taking a derivative.'],
    ['chain-rule','calculus','chain','Two linked function stages contribute two multiplied rates.'],
    ['implicit-differentiation','calculus','implicit','A tangent is located on an implicitly defined ellipse.'],
    ['optimization','calculus','optimization','The top of a downward parabola marks a maximum.'],
    ['related-rates','calculus','related','A small radius change grows a circular boundary.']],
  'calculus-2':[
    ['integrals','calculus','integral','Narrow rectangles approximate accumulated area under a curve.'],
    ['fundamental-theorem','calculus','ftc','A moving upper boundary links accumulated area to a current value.'],
    ['integration-techniques','calculus','parts','An area calculation is labeled as an integration-by-parts problem.'],
    ['applications-of-integration','calculus','quadrature','A changing quantity is accumulated by strip areas.'],
    ['improper-integrals','calculus','improper','A positive tail extends toward an unbounded input.'],
    ['infinite-sequences','numberline','sequence','Terms one over n approach zero on a number line.'],
    ['infinite-series','series','sum','Successively smaller contributions form a geometric sum.'],
    ['taylor-series','graph','taylor','A cubic approximation tracks a sine curve near the origin.']],
  multivariable:[
    ['vectors','vector','sum','Vector components combine to create a resultant displacement.'],
    ['3d-geometry','surface','plane','Two coordinates parameterize a tilted plane in space.'],
    ['partial-derivatives','surface','partial','One highlighted slice holds a surface coordinate fixed.'],
    ['multiple-integrals','surface','volume-integral','Vertical columns accumulate volume beneath a surface.'],
    ['vector-fields','field','rotation','An array of vectors assigns directions across the plane.'],
    ['line-integrals','field','line-integral','A closed path passes through a vector field.'],
    ['surface-integrals','surface','flux','Normal arrows cross a curved surface patch.']],
  'linear-algebra':[
    ['vectors','vector','sum','Head-to-tail arrows illustrate vector addition.'],
    ['matrices','vector','matrix','A matrix turns a unit square into a parallelogram.'],
    ['linear-systems','graph','system','Intersecting linear constraints share one solution.'],
    ['vector-spaces','vector','space','Two basis directions span a plane.'],
    ['eigenvalues','vector','eigen','Basis directions retain their lines under different stretch factors.'],
    ['eigenvectors','vector','eigenvectors','An invariant diagonal direction is highlighted through a transformation.']],
  'discrete-math':[
    ['logic','proof','logic','An implication is paired with its contrapositive.'],
    ['sets','tree','venn','Two sets share an explicitly shaded intersection.'],
    ['proofs','proof','induction','A base case connects to a general next-step argument.'],
    ['combinatorics','tree','counting','A branching choice tree produces distinct outcomes.'],
    ['graph-theory','network','graph','Vertices are connected by edges and a highlighted route.'],
    ['algorithms','network','algorithm','A highlighted route compares weighted edges.']],
  probability:[
    ['counting','network','combinatorics','A small network supports a count of distinct routes.'],
    ['conditional-probability','tree','conditional','A marked reference set changes the probability denominator.'],
    ['bayes-theorem','tree','bayes','True and false flags are compared within the flagged population.'],
    ['random-variables','tree','random-variable','Tree outcomes map to numerical values.'],
    ['distributions','stats','histogram','Bars display different outcome frequencies.'],
    ['expectation','tree','expectation','Outcome values combine with their branch probabilities.']],
  statistics:[
    ['sampling','stats','sample','Selected observations form a sample within a larger collection.'],
    ['estimation','stats','intervals','Several point estimates are shown with uncertainty intervals.'],
    ['hypothesis-testing','stats','tail','A tail region is compared with a reference distribution.'],
    ['regression','stats','regression','Residual segments connect observed points with a fitted line.'],
    ['confidence-intervals','stats','intervals','Repeated intervals vary around a fixed reference value.'],
    ['statistical-inference','tree','conditional','Observed groups and their overlap support a conditional comparison.']],
  'proof-foundations':[
    ['mathematical-language','proof','logic','Named propositions are connected by implication and negation.'],
    ['proof-strategies','proof','proof','A claim follows from a given fact through a stated reason.'],
    ['relations-functions','proof','relations','A diagram compares pairings between two collections.']],
  'real-analysis':[
    ['real-numbers','numberline','real','The number square root of two lies on the real line.'],
    ['sequences-limits','numberline','sequence','A sequence of positive values approaches zero.'],
    ['continuity-differentiation','calculus','secant','A secant joins two nearby points on a curved graph.'],
    ['integration','calculus','integral','Partition rectangles approximate a definite integral.'],
    ['function-sequences','graph','taylor','Two whole function graphs are compared near a chosen region.']],
  'complex-analysis':[
    ['holomorphic-functions','complex','holomorphic','The map z to z squared bends a coordinate grid.'],
    ['contour-integrals','complex','contour','An oriented closed contour surrounds a marked point.'],
    ['power-series-residues','complex','residue','Nested contours surround a pole of a complex function.']],
  'abstract-algebra':[
    ['groups','algebra','group','Cyclic positions illustrate composition around a six-element group.'],
    ['rings','algebra','ring','A zero-divisor motif contrasts a nonzero matrix with a zero product.'],
    ['fields','algebra','field','Five modular positions illustrate arithmetic in a finite field.']],
  'number-theory':[
    ['divisibility','algebra','divisors','A rectangular tiling reveals divisors and successive remainders.'],
    ['modular-arithmetic','algebra','clock','A five-position clock wraps integer arithmetic.'],
    ['diophantine-equations','algebra','lattice','Integer lattice points lie on a linear equation.']],
  'differential-equations':[
    ['odes','field','ode','A solution curve follows a slope field.'],
    ['pdes','surface','pde','A wave varies across two independent coordinates.']],
  optimization:[
    ['convexity','graph','convex','A convex graph lies below a chord between two points.'],
    ['unconstrained','advanced','unconstrained','Descent arrows approach the center of nested contours.'],
    ['constrained','advanced','constraint','A constraint line limits the available points on a contour map.']],
  'numerical-analysis':[
    ['error-stability','advanced','error','A visible discrepancy separates two approximate curves.'],
    ['root-finding','advanced','root-find','Nested trial points narrow a bracket around a root.'],
    ['approximation-integration','calculus','quadrature','Trapezoid strips approximate area under a curve.'],
    ['linear-ode-methods','advanced','euler','A stepped approximation is compared with a smooth trajectory.']],
  topology:[
    ['metric-topological-spaces','advanced','metric','An epsilon neighborhood marks points close to a center.'],
    ['compactness-connectedness','advanced','connected','Separated covered pieces contrast local coverage with connectedness.'],
    ['quotient-product-spaces','advanced','quotient','Matching boundary arrows indicate identified opposite edges.']],
  'differential-geometry':[
    ['curves-surfaces','advanced','surface','A curve lies on a curved surface.'],
    ['manifolds','advanced','manifold','A surface patch corresponds to a flat coordinate chart.'],
    ['curvature-geodesics','advanced','geodesic','A highlighted route follows a curved surface.']],
  'measure-theory':[
    ['measures','advanced','measure','Nested intervals represent sets with changing size.'],
    ['lebesgue-integration','advanced','lebesgue','Horizontal levels partition a stepped nonnegative function.'],
    ['lp-spaces','advanced','lp','A function profile is compared through an Lp norm.']],
  'stochastic-processes':[
    ['markov-chains','advanced','markov','State transitions have labeled cross-state probabilities.'],
    ['poisson-renewal','advanced','poisson','Events on a time axis are separated by waiting intervals.'],
    ['martingales-brownian','advanced','brownian','A jagged illustrative path shows changing increments over time.']],
  'functional-analysis':[
    ['banach-hilbert','vector','hilbert','A vector decomposes into a projection and a perpendicular remainder.'],
    ['operators-duality','advanced','operator','A linear operator transforms one mathematical input into another.'],
    ['spectral-theory','advanced','spectrum','Marked spectral values lie along a scalar axis.']]
};

const topics=new Map();
for(const [course,rows] of Object.entries(topicRows))for(const [slug,family,mode,description] of rows)
  topics.set(course+'.'+slug,Object.freeze({key:course+'.'+slug,course,family,mode,description}));
const courses=new Map(Object.entries(topicRows).map(([id,rows])=>{
  const courseModes={
    'number-sense':['arithmetic','place'],'arithmetic':['arithmetic','fraction'],'pre-algebra':['equation','one-step'],
    'algebra-1':['graph','system'],geometry:['geometry','similarity'],'statistics-basics':['stats','distribution'],
    'algebra-2':['graph','polynomial'],trigonometry:['geometry','unit-circle'],precalculus:['graph','transform'],
    'calculus-1':['calculus','derivative'],'calculus-2':['calculus','integral'],multivariable:['surface','partial'],
    'linear-algebra':['vector','matrix'],'discrete-math':['network','graph'],probability:['tree','probability'],
    statistics:['stats','regression'],'proof-foundations':['proof','proof'],'real-analysis':['numberline','sequence'],
    'complex-analysis':['complex','holomorphic'],'abstract-algebra':['algebra','group'],'number-theory':['algebra','lattice'],
    'differential-equations':['field','ode'],optimization:['advanced','constraint'],'numerical-analysis':['advanced','root-find'],
    topology:['advanced','cover'],'differential-geometry':['advanced','manifold'],'measure-theory':['advanced','lebesgue'],
    'stochastic-processes':['advanced','markov'],'functional-analysis':['vector','hilbert']
  };
  const [family,mode]=courseModes[id],specific=rows.find(r=>r[1]===family&&r[2]===mode)?.[3];
  const extra={probability:'A branching tree separates possible outcomes and their conditional probabilities.',topology:'Overlapping neighborhoods cover a continuous path.'};
  return [id,Object.freeze({key:id,family,mode,description:specific||extra[id]||'A visual introduction to the mathematical relationships in this course.'})];
}));
const entry=(key,family,mode,description)=>Object.freeze({key,family,mode,description});
const studios=new Map([
  ['recipe',entry('recipe','application','recipe','Two measuring cups preserve an ingredient ratio while the batch grows.')],
  ['plans',entry('plans','graph','system','Two cost lines meet where their fixed fees and rates balance.')],
  ['garden',entry('garden','application','garden','A rectangle changes shape within a fixed amount of fence.')],
  ['motion',entry('motion','calculus','secant','A position curve compares an average rate with its changing slope.')],
  ['chain',entry('chain','calculus','related','A radius change grows an area through linked quantities.')],
  ['bayes',entry('bayes','tree','bayes','True and false inspection flags are compared in one population.')],
  ['graphics',entry('graphics','vector','matrix','A unit square becomes a transformed parallelogram.')],
  ['sampling',entry('sampling','stats','sample','A selected group of observations is compared with the full population.')],
]);
const projects=new Map([
  ['lunar-expedition',entry('lunar-expedition','application','orbit','An elliptical path, a central body and a velocity arrow introduce a lunar expedition.')],
  ['game-world',entry('game-world','application','game','A game character moves between platforms along a curved path.')],
  ['sound-studio',entry('sound-studio','wave','sound','A fundamental sine and its harmonics combine into a waveform.')],
  ['solar-event',entry('solar-event','application','energy','A solar panel supplies a battery for an event.')],
]);
const playground=new Map([
  ['compare',topics.get('algebra-2.rational-functions')],['functions',topics.get('algebra-1.functions')],
  ['angles',topics.get('geometry.angles')],['triangle',topics.get('geometry.area')],['circles',topics.get('geometry.circles')],
  ['data',topics.get('statistics-basics.center')],['probability',topics.get('statistics-basics.basic-probability')],
  ['complex',topics.get('algebra-2.complex-numbers')],['fractions',topics.get('arithmetic.fractions')],
  ['distribute',topics.get('algebra-1.factoring')],['cancel',entry('cancel','graph','cancel','Factoring preserves a hole at an excluded input.')],
  ['rationalize',entry('rationalize','equation','conjugate','A difference of square areas is rewritten through conjugate factors.')],['roots',topics.get('arithmetic.roots')],['trig',topics.get('trigonometry.identities')],
  ['difference-quotient',entry('difference-quotient','calculus','secant','A secant joins two nearby curve points before taking a limiting slope.')],
  ['chain-rule',topics.get('calculus-1.chain-rule')],['product-rule',topics.get('calculus-1.product-quotient-rule')],
  ...studios,
]);
const functions=new Map([['linear','linear'],['quadratic','quadratic'],['cubic','cubic'],['exponential','exponential'],['logarithm','logarithm'],['rational','rational'],['radical','radical']].map(([id,mode])=>[id,entry(id,'graph',mode,'A preview of the '+id+' function family and its geometric shape.')]));
const missions=new Map([
  ['orbit',projects.get('lunar-expedition')],['rocket',entry('rocket','application','rocket','An ideal rocket burn links changing mass with velocity over time.')],
  ['supply',topics.get('arithmetic.ratios')],['signal',projects.get('sound-studio')],['camera',studios.get('graphics')],
  ['energy',projects.get('solar-event')],['network',topics.get('discrete-math.graph-theory')],
]);
const ai=entry('ai-ml','application','ai','Connected input, hidden and output units introduce a mathematical model that learns from data.');
const paths=new Map(['ai-ml','machine-learning','artificial-intelligence','ai-math','ai-ml-path'].map(id=>[id,ai]));
const legacy=new Map([
  ...topicRows.geometry.map((r,i)=>['4A-'+String(i+1).padStart(2,'0'),'geometry.'+r[0]]),
  ...topicRows['statistics-basics'].map((r,i)=>['4B-'+String(i+1).padStart(2,'0'),'statistics-basics.'+r[0]]),
  ...topicRows['algebra-2'].map((r,i)=>['5-'+String(i+1).padStart(2,'0'),'algebra-2.'+r[0]])
]);
const fallback=entry('generic','graph','linear','A graph compares coordinates and a mathematical relationship.');
const normalizeKind=k=>{const aliases={video:'lesson',topic:'lesson',application:'studio',journey:'project',lab:'playground',family:'function'};return Object.hasOwn(aliases,k)?aliases[k]:k;};
const resolve=({id='',kind='lesson',topicId,courseId,modelId}={})=>{
  const requested=String(topicId||id),key=legacy.get(requested.toUpperCase())||requested,k=normalizeKind(kind);
  const maps={course:courses,lesson:topics,studio:studios,project:projects,playground,function:functions,mission:missions,path:paths};
  const map=Object.hasOwn(maps,k)?maps[k]:null;
  let found=map?.get(k==='course'?({'4a':'geometry','4b':'statistics-basics','5':'algebra-2'})[key.toLowerCase()]||key:key);
  if(k==='mission'&&missions.has(String(modelId))){const scene=missions.get(String(modelId)),inset=topics.get(key);found={...scene,key:String(modelId)+':'+key,inset,description:scene.description+(inset?' The inset previews the related idea: '+inset.description:'')};}
  if(!found&&topics.has(key))found=topics.get(key);
  if(!found&&paths.has(key))found=paths.get(key);
  if(!found&&courseId)found=courses.get(String(courseId));
  return {spec:found||fallback,mapped:!!found,requested,kind:k};
};
export function cardArtInfo(options={}){const {spec,mapped,requested,kind}=resolve(options||{});return Object.freeze({...spec,mapped,requested,kind});}
export const cardArtCoverage=Object.freeze({
  topics:Object.freeze([...topics.keys()]),courses:Object.freeze([...courses.keys()]),
  studios:Object.freeze([...studios.keys()]),projects:Object.freeze([...projects.keys()]),
  playground:Object.freeze([...playground.keys()]),functions:Object.freeze([...functions.keys()]),
  missions:Object.freeze([...missions.keys()]),paths:Object.freeze([...paths.keys()]),
  legacy:Object.freeze([...legacy.keys()])
});
let serial=0;
export function cardArt(options={}){
  options=options||{};
  const info=cardArtInfo(options),{family,mode,description}=info;
  const title=String(options.title||info.requested||'Explore mathematics');
  const uid='catalyst-card-art-'+(++serial);
  let body=drawers[family](mode);
  if(info.inset)body='<g transform="translate(0 7) scale(.85)">'+body+'</g>'+rect(214,90,99,60,P.white,P.line,8)+'<g transform="translate(216 94) scale(.3)">'+drawers[info.inset.family](info.inset.mode)+'</g>';
  return '<div class="card-art card-art--'+family+(options.compact?' card-art--compact':'')+'" data-card-art="'+esc(info.key)+'" data-art-mapped="'+info.mapped+'">'+
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 160" role="img" aria-labelledby="'+uid+'-title '+uid+'-desc" focusable="false">'+
    '<title id="'+uid+'-title">'+esc(title)+' — mathematical preview</title><desc id="'+uid+'-desc">'+esc(description)+'</desc>'+
    rect(0,0,320,160,P.paper,'none',15)+body+'</svg></div>';
}
