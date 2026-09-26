// Curated mathematical models for the application studios. No learner API or scoring.
const COLORS = Object.freeze({
  ink: '#31594a', muted: '#65766c', green: '#537e55', blue: '#628eb0',
  gold: '#c58f36', purple: '#987ab1', pink: '#b86e83', grid: '#e6ede3',
  pale: '#f4f8ef', white: '#ffffff', border: '#ccd9c5', red: '#a75e48'
});
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const finite = (value, fallback) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const fmt = (value, digits = 2) => Number.isFinite(value) ? String(Number(value.toFixed(digits))) : 'undefined';
const signed = value => value < 0 ? `− ${fmt(-value)}` : `+ ${fmt(value)}`;
const control = (key, label, min, max, step, unit = '') => ({key, label, min, max, step, unit});
const stat = (label, value, unit = '') => ({label, value: String(value), unit});

function defineModel(spec) {
  const normalize = raw => {
    const values = Object.fromEntries(spec.controls.map(c => {
    const value = clamp(finite(raw?.[c.key], spec.defaults[c.key]), c.min, c.max);
    const rounded = c.min + Math.round((value - c.min) / c.step) * c.step;
    return [c.key, Number(clamp(rounded, c.min, c.max).toFixed(8))];
    }));
    return spec.constrain ? spec.constrain(values) : values;
  };
  return Object.freeze({...spec, normalize, compute(raw = spec.defaults) {
    const inputs = normalize(raw);
    return {inputs, ...spec.calculate(inputs)};
  }});
}

const txt = (x, y, value, size = 14, color = COLORS.ink, anchor = 'start', weight = 400) =>
  `<text x="${x}" y="${y}" fill="${color}" font-size="${size}" text-anchor="${anchor}" font-weight="${weight}" font-family="Segoe UI,system-ui,sans-serif">${escapeHTML(value)}</text>`;
const ln = (x1, y1, x2, y2, color = COLORS.ink, width = 2, dash = '') =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
const box = (x, y, width, height, fill = COLORS.pale, stroke = 'none', radius = 8) =>
  `<rect x="${x}" y="${y}" width="${Math.max(0, width)}" height="${Math.max(0, height)}" rx="${radius}" fill="${fill}" stroke="${stroke}"/>`;
const dot = (x, y, color = COLORS.green, r = 5, fill = COLORS.white) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${color}" stroke-width="2.5"/>`;
const poly = (points, fill, stroke = COLORS.ink, width = 2) =>
  `<polygon points="${points.map(p => p.join(',')).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"/>`;
function arrow(x1, y1, x2, y2, color = COLORS.ink, width = 3) {
  const angle = Math.atan2(y2 - y1, x2 - x1), length = Math.hypot(x2 - x1, y2 - y1);
  if (length < 1) return dot(x1, y1, color, 3, color);
  const head = Math.min(10, length / 2), spread = .48;
  return ln(x1, y1, x2, y2, color, width) + poly([[x2,y2],
    [x2-head*Math.cos(angle-spread),y2-head*Math.sin(angle-spread)],
    [x2-head*Math.cos(angle+spread),y2-head*Math.sin(angle+spread)]], color, color, 1);
}
function legend(x, y, items) {
  let result = '';
  for (const item of items) {
    result += ln(x, y - 4, x + 20, y - 4, item.color, 3) + txt(x + 28, y, item.label, 13, COLORS.muted);
    x += item.width || 180;
  }
  return result;
}
function frame({id, x = 70, y = 66, w = 580, h = 286, xmin = 0, xmax = 10, ymin = 0, ymax = 10,
  xticks = [], yticks = [], xlabel = 'x', ylabel = 'y'}) {
  const X = v => x + (v - xmin) / (xmax - xmin) * w;
  const Y = v => y + h - (v - ymin) / (ymax - ymin) * h;
  let svg = `<defs><clipPath id="${id}">${box(x,y,w,h,'white','none',0)}</clipPath></defs>`;
  for (const v of xticks) if (v >= xmin && v <= xmax) svg += ln(X(v),y,X(v),y+h,COLORS.grid,1) + txt(X(v),y+h+23,fmt(v),12,COLORS.muted,'middle');
  for (const v of yticks) if (v >= ymin && v <= ymax) svg += ln(x,Y(v),x+w,Y(v),COLORS.grid,1) + txt(x-11,Y(v)+4,fmt(v),12,COLORS.muted,'end');
  svg += ln(x,Y(clamp(0,ymin,ymax)),x+w,Y(clamp(0,ymin,ymax)),COLORS.border,1.5);
  svg += ln(X(clamp(0,xmin,xmax)),y,X(clamp(0,xmin,xmax)),y+h,COLORS.border,1.5);
  svg += txt(x,y-18,ylabel,13,COLORS.muted) + txt(x+w,y+h+48,xlabel,13,COLORS.muted,'end');
  return {id,X,Y,x,y,w,h,xmin,xmax,ymin,ymax,svg};
}
function curve(f, fn, color = COLORS.green, width = 3, from = f.xmin, to = f.xmax) {
  let d = '', last = false;
  for (let i=0;i<=180;i++) {
    const x=from+(to-from)*i/180, y=fn(x);
    if (!Number.isFinite(y)) { last=false;continue; }
    d += `${last?'L':'M'}${f.X(x).toFixed(3)},${f.Y(y).toFixed(3)} `;last=true;
  }
  return `<path clip-path="url(#${f.id})" d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
}
const clipped = (f, svg) => `<g clip-path="url(#${f.id})">${svg}</g>`;
const ticks = (max, count = 4) => Array.from({length:count+1}, (_, i) => max*i/count);
const title = (main, sub) => txt(28,29,main,17,COLORS.ink,'start',650) + (sub ? txt(28,51,sub,12,COLORS.muted) : '');

// Model definitions and diagrams follow. All representations use each model's compute result.

const recipe = defineModel({
  title:'Keep the recipe in proportion',
  defaults:{servings:6},
  controls:[control('servings','Servings',1,16,.5)],
  calculate({servings}) {
    const factor=servings/4, flour=1.5*factor, water=factor;
    return {factor,flour,water,total:flour+water,
      equations:[`Scale factor = ${fmt(servings)} ÷ 4 = ${fmt(factor,3)}`,`Flour = 1.5 × ${fmt(factor,3)} = ${fmt(flour,4)} cups; water = 1 × ${fmt(factor,3)} = ${fmt(water,3)} cups`],
      stats:[stat('FLOUR',fmt(flour,4),'cups'),stat('WATER',fmt(water,3),'cups'),stat('FLOUR : WATER','3 : 2')],
      domain:'Explore 1–16 servings. Half servings are allowed. The base recipe serves 4.',
      summary:`For ${fmt(servings)} servings, multiply both ingredients by ${fmt(factor,3)}: ${fmt(flour,4)} cups flour and ${fmt(water,3)} cups water. The ratio stays 3:2.`,
      table:{caption:'One rule connects servings, cups, and volume units.',columns:['Quantity','Base: 4 servings',`Target: ${fmt(servings)} servings`],rows:[['Flour (cups)','1.5',fmt(flour,4)],['Water (cups)','1',fmt(water,3)],['Flour measure (mL)','360',fmt(flour*240)],['Water measure (mL)','240',fmt(water*240)]]},
      note:'This model uses a 240 mL measuring cup. Ingredient measures are compared separately; the strips do not predict the final mixed volume.'};
  },
  draw(r,id) {
    const s=r.inputs.servings, maximum=Math.ceil(Math.max(2.5,r.total)), X=v=>65+v/maximum*575;
    let out=title('Same recipe, a different number of servings','Both ingredient amounts scale by the same factor.');
    const strip=(y,flour,water,label)=>{
      let svg=txt(65,y-13,label,14,COLORS.ink,'start',600);
      svg+=box(65,y,X(flour)-65,43,COLORS.blue,'none',0)+box(X(flour),y,X(flour+water)-X(flour),43,COLORS.gold,'none',0);
      svg+=txt(65,y+64,`${fmt(flour,4)} cups flour`,13,COLORS.blue)+txt(330,y+64,`${fmt(water,3)} cups water`,13,COLORS.gold);
      return svg;
    };
    out+=strip(97,1.5,1,'Base · 4 servings')+strip(208,r.flour,r.water,`Your recipe · ${fmt(s)} servings`);
    const markStep=maximum<=6?1:2,marks=[];for(let v=0;v<=maximum;v+=markStep)marks.push(v);if(marks.at(-1)!==maximum)marks.push(maximum);
    for(const v of marks)out+=ln(X(v),292,X(v),298,COLORS.border,1)+txt(X(v),316,fmt(v),12,COLORS.muted,'middle');
    out+=ln(65,292,640,292,COLORS.border,1)+txt(640,338,'Ingredient measures (cups)',13,COLORS.muted,'end');
    out+=box(64,360,576,48,COLORS.pale,COLORS.border)+txt(352,390,`1 serving → 0.375 cups flour + 0.25 cups water`,15,COLORS.ink,'middle');
    return out;
  }
});

const plans = defineModel({
  title:'Compare two equipment hire plans',
  defaults:{hours:8,feeA:8,feeB:20},
  controls:[control('hours','Hire time',0,16,.25,'hours'),control('feeA','Plan A fixed fee',0,40,1,'$'),control('feeB','Plan B fixed fee',0,40,1,'$')],
  calculate({hours,feeA,feeB}) {
    const costA=feeA+3*hours,costB=feeB+hours,crossing=(feeB-feeA)/2,difference=costA-costB;
    const comparison=Math.abs(difference)<1e-9?'Both plans cost the same.':`Plan ${difference>0?'B':'A'} costs $${fmt(Math.abs(difference))} less.`;
    return {costA,costB,crossing,difference,
      equations:[`A(h) = ${feeA} + 3h; B(h) = ${feeB} + h`,`Equal cost: 2h = ${feeB} − ${feeA} → h = ${fmt(crossing)}${crossing<0?' (outside h ≥ 0)':''}`],
      stats:[stat('PLAN A',`$${fmt(costA)}`),stat('PLAN B',`$${fmt(costB)}`),stat('EQUAL COST',crossing<0?'No h ≥ 0':fmt(crossing),crossing<0?'':'hours')],
      domain:'Time h ≥ 0; this display covers 0–16 hours. Fractional hours are billed proportionally. Rates stay $3/h and $1/h.',
      summary:`At ${fmt(hours)} hours, A costs $${fmt(costA)} and B costs $${fmt(costB)}. ${comparison}${crossing>16?' Their equal-cost point is beyond the displayed time range.':''}`,
      table:{caption:'The fee sets the start; the hourly rate sets the change.',columns:['Time (hours)','A cost ($)','B cost ($)'],rows:[...new Set([0,4,hours,12,16])].sort((a,b)=>a-b).map(h=>[fmt(h),fmt(feeA+3*h),fmt(feeB+h)])},
      note:'These are invented equipment-hire plans. Taxes, deposits, minimum booking time, and rounding charges are excluded from this model.'};
  },
  draw(r,id) {
    const {hours,feeA,feeB}=r.inputs, ymax=Math.ceil(Math.max(feeA+48,feeB+16)/20)*20;
    const f=frame({id:id+'-plans',x:70,y:124,w:578,h:238,xmax:16,ymax,xticks:[0,4,8,12,16],yticks:ticks(ymax),xlabel:'Hire time h (hours)',ylabel:'Total cost ($)'});
    let out=title('The crossing changes which plan is cheaper','Move time along both lines; change a fixed fee to shift one line.')+f.svg;
    out+=curve(f,h=>feeA+3*h,COLORS.blue)+curve(f,h=>feeB+h,COLORS.gold);
    out+=ln(f.X(hours),f.Y(0),f.X(hours),f.Y(Math.max(r.costA,r.costB)),COLORS.purple,1.5,'5 5')+dot(f.X(hours),f.Y(r.costA),COLORS.blue)+dot(f.X(hours),f.Y(r.costB),COLORS.gold);
    if(r.crossing>=0&&r.crossing<=16) out+=dot(f.X(r.crossing),f.Y(feeA+3*r.crossing),COLORS.purple,6,COLORS.purple);
    out+=legend(77,78,[{label:'Plan A · $3/hour',color:COLORS.blue,width:235},{label:'Plan B · $1/hour',color:COLORS.gold}]);
    return out;
  }
});

const garden = defineModel({
  title:'Design a garden with a fixed fence',
  defaults:{perimeter:24,width:4},
  controls:[control('perimeter','Available fence',8,48,2,'m'),control('width','Width',0,24,.25,'m')],
  constrain:s=>({...s,width:Math.min(s.width,s.perimeter/2)}),
  bounds:s=>({width:{max:s.perimeter/2}}),
  calculate({perimeter,width}) {
    const length=perimeter/2-width,area=width*length,bestWidth=perimeter/4,bestArea=bestWidth**2;
    return {length,area,bestWidth,bestArea,
      equations:[`2w + 2L = ${perimeter} → L = ${perimeter/2} − w`,`A(w) = w(${perimeter/2} − w) = ${fmt(bestArea)} − (w − ${fmt(bestWidth)})²`],
      stats:[stat('LENGTH',fmt(length),'m'),stat('AREA',fmt(area),'m²'),stat('BEST POSSIBLE',fmt(bestArea),'m²')],
      domain:`0 ≤ w ≤ ${perimeter/2} m. A usable rectangle needs 0 < w < ${perimeter/2}; endpoints are flattened boundary cases.`,
      summary:`With ${perimeter} m of fence, a width of ${fmt(width)} m leaves a length of ${fmt(length)} m and an area of ${fmt(area)} m². The square ${fmt(bestWidth)} m by ${fmt(bestWidth)} m gives ${fmt(bestArea)} m².`,
      table:{caption:'Changing one side forces the other side to change.',columns:['Width (m)','Length (m)','Area (m²)'],rows:[...new Set([0,width,bestWidth,perimeter/2])].sort((a,b)=>a-b).map(w=>[fmt(w),fmt(perimeter/2-w),fmt(w*(perimeter/2-w))])},
      note:'All four sides use the same fence. No wall, gate, walkway, or minimum side length is included. The geometry uses equal units horizontally and vertically.'};
  },
  draw(r,id) {
    const {perimeter,width}=r.inputs, scale=240/(perimeter/2), rw=r.length*scale,rh=width*scale,cx=168,cy=242;
    const f=frame({id:id+'-garden',x:389,y:120,w:273,h:244,xmax:perimeter/2,ymax:r.bestArea*1.15,xticks:[0,r.bestWidth,perimeter/2],yticks:[0,r.bestArea/2,r.bestArea],xlabel:'Width w (m)',ylabel:'Area (m²)'});
    let out=title('What changes when the fence stays fixed?','The rectangle and the point on the curve describe the same design.');
    out+=box(cx-rw/2,cy-rh/2,rw,rh,'#e6efdb',COLORS.green,0);
    if(rw===0)out+=ln(cx,cy-rh/2,cx,cy+rh/2,COLORS.green,3);
    if(rh===0)out+=ln(cx-rw/2,cy,cx+rw/2,cy,COLORS.green,3);
    out+=txt(cx,cy-rh/2-16,`L = ${fmt(r.length)} m`,14,COLORS.green,'middle',600);
    const sideX=cx-rw/2-12;
    out+=ln(sideX,cy-rh/2,sideX,cy+rh/2,COLORS.blue,1.5)+ln(sideX-4,cy-rh/2,sideX+4,cy-rh/2,COLORS.blue,1.5)+ln(sideX-4,cy+rh/2,sideX+4,cy+rh/2,COLORS.blue,1.5);
    out+=`<text transform="translate(${sideX-9} ${cy}) rotate(-90)" fill="${COLORS.blue}" font-size="13" font-weight="600" text-anchor="middle" font-family="Segoe UI,system-ui,sans-serif">${escapeHTML(`w = ${fmt(width)} m`)}</text>`;
    if(rw>50&&rh>35) out+=txt(cx,cy+6,`${fmt(r.area)} m²`,16,COLORS.green,'middle',650);
    out+=txt(167,89,`Fence used: ${perimeter} m`,14,COLORS.muted,'middle')+f.svg+curve(f,w=>w*(perimeter/2-w),COLORS.green);
    out+=ln(f.X(width),f.Y(0),f.X(width),f.Y(r.area),COLORS.gold,1.5,'4 4')+dot(f.X(width),f.Y(r.area),COLORS.gold,6);
    out+=dot(f.X(r.bestWidth),f.Y(r.bestArea),COLORS.purple,5,COLORS.purple);
    return out;
  }
});

const position = t => t*t-4*t+3;
const velocity = t => 2*t-4;
const distance = t => t<=2 ? 4*t-t*t : t*t-4*t+8;
const motion = defineModel({
  title:'Follow a cart that changes direction',
  defaults:{time:3,h:-.5},
  controls:[control('time','Time t',0,3,.05,'s'),control('h','Time change h',-1,1,.05,'s')],
  calculate({time,h}) {
    const s=position(time),v=velocity(time),end=time+h,secantDefined=Math.abs(h)>1e-9&&end>=-1e-9&&end<=3+1e-9;
    const secant=secantDefined?2*time+h-4:null,displacement=s-3,travelled=distance(time);
    const secantNote=h===0?'At h = 0 the difference quotient is undefined; the limiting instantaneous velocity is still shown.':secantDefined?`The secant over h = ${fmt(h)} s has slope ${fmt(secant)} m/s.`:'The second time lies outside the displayed trip; choose h so 0 ≤ t + h ≤ 3.';
    return {s,v,end,secantDefined,secant,displacement,travelled,
      equations:['s(t) = t² − 4t + 3; v(t) = 2t − 4','[s(t + h) − s(t)] / h = h(2t + h − 4) / h = 2t + h − 4, for h ≠ 0'],
      stats:[stat('DISPLACEMENT',fmt(displacement),'m'),stat('DISTANCE',fmt(travelled),'m'),stat('VELOCITY',fmt(v),'m/s')],
      domain:'Trip window: 0 ≤ t ≤ 3 s. A secant needs h ≠ 0 and 0 ≤ t + h ≤ 3. At h = 0 use a limit, not division.',
      summary:`At t = ${fmt(time)} s, position is ${fmt(s)} m, displacement from the start is ${fmt(displacement)} m, and distance travelled is ${fmt(travelled)} m. Velocity is ${fmt(v)} m/s. ${secantNote}`,
      table:{caption:'Position, rate, and accumulated distance describe one trip.',columns:['Time (s)','Position (m)','Velocity (m/s)','Distance (m)'],rows:[...new Set([0,1,2,time,3])].sort((a,b)=>a-b).map(t=>[fmt(t),fmt(position(t)),fmt(velocity(t)),fmt(distance(t))])},
      note:'The cart moves on a straight line and turns at t = 2 s. Signed area under velocity gives displacement; adding the magnitudes of those areas gives distance. The endpoint velocity agrees with the one-sided limit in this trip.'};
  },
  draw(r,id) {
    const {time,h}=r.inputs, trackX=s=>113+(s+1)/4*482;
    let out=title('One trip, three connected views','Gold is a secant; purple is the instantaneous tangent.');
    out+=ln(100,99,607,99,COLORS.border,3);
    for(const s of [-1,0,1,2,3])out+=ln(trackX(s),95,trackX(s),104,COLORS.muted,1)+txt(trackX(s),124,`${s} m`,12,COLORS.muted,'middle');
    out+=box(trackX(r.s)-18,75,36,20,COLORS.green,'none',4)+dot(trackX(r.s)-10,98,COLORS.green,4,COLORS.green)+dot(trackX(r.s)+10,98,COLORS.green,4,COLORS.green);
    if(Math.abs(r.v)>1e-8)out+=arrow(trackX(r.s),69,trackX(r.s)+Math.sign(r.v)*34,69,COLORS.purple,2);
    const f=frame({id:id+'-position',x:62,y:181,w:278,h:183,xmax:3,ymin:-2,ymax:4,xticks:[0,1,2,3],yticks:[-2,0,2,4],xlabel:'Time t (s)',ylabel:'Position s (m)'});
    const g=frame({id:id+'-velocity',x:427,y:181,w:232,h:183,xmax:3,ymin:-4.5,ymax:2.5,xticks:[0,1,2,3],yticks:[-4,-2,0,2],xlabel:'Time t (s)',ylabel:'Velocity v (m/s)'});
    out+=f.svg+g.svg;
    const negEnd=Math.min(2,time);
    if(negEnd>0)out+=clipped(g,poly([[g.X(0),g.Y(0)],[g.X(0),g.Y(-4)],[g.X(negEnd),g.Y(velocity(negEnd))],[g.X(negEnd),g.Y(0)]],'#efdae2','none'));
    if(time>2)out+=clipped(g,poly([[g.X(2),g.Y(0)],[g.X(time),g.Y(velocity(time))],[g.X(time),g.Y(0)]],'#e0edda','none'));
    out+=curve(f,position,COLORS.green)+curve(f,x=>r.s+r.v*(x-time),COLORS.purple,2)+curve(g,velocity,COLORS.blue);
    if(r.secantDefined){out+=curve(f,x=>r.s+r.secant*(x-time),COLORS.gold,2)+dot(f.X(r.end),f.Y(position(r.end)),COLORS.gold,4);}
    out+=dot(f.X(time),f.Y(r.s),COLORS.green,5)+dot(g.X(time),g.Y(r.v),COLORS.blue,5);
    out+=txt(62,434,h===0?'h = 0: quotient undefined; tangent from the limit':r.secantDefined?`Secant slope: ${fmt(r.secant)} m/s`:'Secant unavailable outside the trip',12,COLORS.gold);
    out+=txt(658,434,`Signed area: ${fmt(r.displacement)} m`,12,COLORS.blue,'end');
    return out;
  }
});

const chain = defineModel({
  title:'Connect time, radius, and growing area',
  defaults:{a:2,b:1,time:3},
  controls:[control('a','Radius growth a',0,3,.25,'cm/s'),control('b','Starting radius b',0,3,.25,'cm'),control('time','Time t',0,4,.25,'s')],
  calculate({a,b,time}) {
    const radius=a*time+b,area=Math.PI*radius**2,rate=2*Math.PI*radius*a,dr=.1*a,areaChange=Math.PI*((radius+dr)**2-radius**2);
    return {radius,area,rate,dr,areaChange,
      equations:[`r(t) = ${fmt(a)}t + ${fmt(b)}; A(r) = πr²`,`dA/dt = (2πr)(dr/dt) = 2π(${fmt(radius,4)})(${fmt(a)}) = ${fmt(2*radius*a,6)}π cm²/s`],
      stats:[stat('RADIUS',fmt(radius,4),'cm'),stat('AREA',`${fmt(radius**2,8)}π`,'cm²'),stat('AREA GROWTH',`${fmt(2*radius*a,6)}π`,'cm²/s')],
      domain:'a, b, t ≥ 0, so the radius is nonnegative. Controls show 0–4 seconds. Changing a alters the rate; changing b alters the starting radius.',
      summary:`At ${fmt(time)} s, radius is ${fmt(radius,4)} cm and area is about ${fmt(area)} cm². The local area change per centimetre of radius is about ${fmt(2*Math.PI*radius)} cm²/cm; the radius grows ${fmt(a)} cm each second. Multiplying gives about ${fmt(rate)} cm²/s.`,
      table:{caption:'A composition carries the same input through two functions. Area and rate decimals are rounded.',columns:['Time (s)','Radius (cm)','Area (cm²)','Area rate (cm²/s)'],rows:[...new Set([0,1,time,4])].sort((x,y)=>x-y).map(t=>{const r=a*t+b;return[fmt(t),fmt(r,4),fmt(Math.PI*r*r),fmt(2*Math.PI*r*a)]})},
      note:`The outer ring is the exact added area over the next 0.1 s: ${fmt(areaChange)} cm². Its average rate ${fmt(areaChange/.1)} cm²/s need not equal the instantaneous rate. This idealized circular patch remains a circle.`};
  },
  draw(r,id) {
    const {a,b,time}=r.inputs;
    let out=title('Change inside, then change outside','The two local rates multiply; their units connect.');
    for(const [x,label,value,color] of [[28,'Time',`${fmt(time)} s`,COLORS.blue],[263,'Radius',`${fmt(r.radius,4)} cm`,COLORS.green],[506,'Area',`${fmt(r.radius**2,8)}π cm²`,COLORS.purple]])out+=box(x,75,185,62,COLORS.pale,COLORS.border)+txt(x+15,97,label,12,COLORS.muted)+txt(x+15,124,value,value.length>15?15:19,color,'start',650);
    out+=arrow(220,102,255,102,COLORS.green,2)+arrow(455,102,495,102,COLORS.purple,2);
    out+=txt(241,157,`dr/dt = ${fmt(a)} cm/s`,12,COLORS.green,'middle')+txt(482,157,`dA/dr = ${fmt(2*r.radius,4)}π cm`,12,COLORS.purple,'middle');
    const cx=164,cy=288,scale=7.4,rr=r.radius*scale,outer=(r.radius+r.dr)*scale;
    out+=`<circle cx="${cx}" cy="${cy}" r="${outer}" fill="#efdbae" stroke="${COLORS.gold}" stroke-width="1.5"/><circle cx="${cx}" cy="${cy}" r="${rr}" fill="#e6efdb" stroke="${COLORS.green}" stroke-width="2"/>`;
    if(rr===0)out+=dot(cx,cy,COLORS.green,3,COLORS.green);
    out+=ln(cx,cy,cx+rr,cy,COLORS.green,2)+txt(cx,cy-9,`r = ${fmt(r.radius,4)} cm`,13,COLORS.green,'middle');
    out+=txt(164,423,`Ring: Δr = ${fmt(r.dr,3)} cm in 0.1 s`,12,COLORS.gold,'middle');
    const maxArea=Math.max(1,Math.PI*(4*a+b)**2),f=frame({id:id+'-chain',x:381,y:219,w:279,h:156,xmax:4,ymax:maxArea*1.08,xticks:[0,1,2,3,4],yticks:[0,maxArea/2,maxArea],xlabel:'Time t (s)',ylabel:'Area A (cm²)'});
    out+=f.svg+curve(f,t=>Math.PI*(a*t+b)**2,COLORS.purple)+curve(f,t=>r.area+r.rate*(t-time),COLORS.gold,2)+dot(f.X(time),f.Y(r.area),COLORS.purple,5);
    return out;
  }
});

const bayes = defineModel({
  title:'What does an inspection flag actually mean?',
  defaults:{prevalence:10,sensitivity:80,falsePositive:10},
  controls:[control('prevalence','Defective items',0,100,1,'%'),control('sensitivity','Flagged if defective',0,100,1,'%'),control('falsePositive','Flagged if good',0,100,1,'%')],
  calculate({prevalence,sensitivity,falsePositive}) {
    const p=prevalence/100,s=sensitivity/100,f=falsePositive/100,defective=1000*p,good=1000-defective;
    const truePositive=defective*s,falseFlag=good*f,missed=defective-truePositive,unflaggedGood=good-falseFlag,flagged=truePositive+falseFlag;
    const posterior=flagged>1e-10?truePositive/flagged:null;
    const posteriorText=posterior===null?'Undefined (no flags)':`${fmt(posterior*100)}%`;
    return {p,s,f,defective,good,truePositive,falseFlag,missed,unflaggedGood,flagged,posterior,
      equations:['P(defective | flag) = P(defective)P(flag | defective) / P(flag)',`P(flag) = p·s + (1 − p)·f; selected result = ${fmt(truePositive,3)} / ${fmt(flagged,3)}${posterior===null?' (undefined)':` ≈ ${posteriorText}`}`],
      stats:[stat('DEFECTIVE + FLAG',fmt(truePositive,3),'items'),stat('GOOD + FLAG',fmt(falseFlag,3),'items'),stat('DEFECTIVE AMONG FLAGS',posteriorText)],
      domain:'All three rates are 0–100%. Conditional probability requires a positive probability of a flag; otherwise it is undefined.',
      summary:`Out of 1,000 modeled items, ${fmt(truePositive,3)} defective items and ${fmt(falseFlag,3)} good items are expected to be flagged. ${posterior===null?'With no expected flags, the conditional probability is undefined.':`Among the ${fmt(flagged,3)} expected flags, ${fmt(posterior*100)}% are defective.`}`,
      table:{caption:'Expected counts in an idealized batch of 1,000 items.',columns:['Actual condition','Flagged','Not flagged','Total'],rows:[['Defective',fmt(truePositive,3),fmt(missed,3),fmt(defective,3)],['Good',fmt(falseFlag,3),fmt(unflaggedGood,3),fmt(good,3)],['Total',fmt(flagged,3),fmt(1000-flagged,3),'1000']]},
      note:'These are expected counts from specified rates, so fractional items represent averages across batches. Conditioning changes the denominator to all flags; it does not change the inspection sensitivity.'};
  },
  draw(r,id) {
    const x=48,y=111,w=623,h=179,dw=w*r.p,gw=w-dw,th=h*r.s,fh=h*r.f;
    let out=title('Start with the whole batch, then keep only flags','The rectangle represents 1,000 expected items. Area represents count.');
    out+=txt(x,y-18,`Defective: ${fmt(r.defective)} items`,13,COLORS.blue)+txt(x+w,y-18,`Good: ${fmt(r.good)} items`,13,COLORS.gold,'end');
    out+=box(x,y,dw,h,'#e1eaf0','none',0)+box(x+dw,y,gw,h,'#f0eee8','none',0);
    out+=box(x,y,dw,th,COLORS.blue,'none',0)+box(x+dw,y,gw,fh,COLORS.gold,'none',0);
    out+=box(x,y,w,h,'none',COLORS.border,0);
    if(dw>0&&gw>0)out+=ln(x+dw,y,x+dw,y+h,COLORS.white,2);
    if(dw>90&&th>30)out+=txt(x+dw/2,y+th/2+5,`${fmt(r.truePositive)} flagged`,14,COLORS.white,'middle',600);
    if(gw>90&&fh>30)out+=txt(x+dw+gw/2,y+fh/2+5,`${fmt(r.falseFlag)} flagged`,14,'#302f29','middle',600);
    if(dw>95&&h-th>38)out+=txt(x+dw/2,y+th+(h-th)/2+5,'Not flagged',12,COLORS.muted,'middle');
    if(gw>95&&h-fh>38)out+=txt(x+dw+gw/2,y+fh+(h-fh)/2+5,'Not flagged',12,COLORS.muted,'middle');
    out+=txt(48,326,'Now condition on flagged items only',15,COLORS.ink,'start',600);
    if(r.posterior===null)out+=box(48,344,w,33,COLORS.pale,COLORS.border)+txt(359,366,'No flagged items: there is no conditional group.',13,COLORS.muted,'middle');
    else {
      out+=box(48,344,w*r.posterior,33,COLORS.blue,'none',0)+box(48+w*r.posterior,344,w*(1-r.posterior),33,COLORS.gold,'none',0);
      out+=txt(48,403,`${fmt(r.truePositive,3)} defective flags`,13,COLORS.blue)+txt(671,403,`${fmt(r.falseFlag,3)} good flags`,13,COLORS.gold,'end');
    }
    out+=txt(359,433,r.posterior===null?'P(defective | flag) is undefined':`Defective share of flags = ${fmt(r.posterior*100)}%`,14,COLORS.ink,'middle',600);
    return out;
  }
});

function rotateVector(v, degrees) {
  const angle=degrees*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
  return [c*v[0]-s*v[1],s*v[0]+c*v[1]];
}
const pair = v => `(${fmt(v[0])}, ${fmt(v[1])})`;
const graphics = defineModel({
  title:'Order matters when transforming a map',
  defaults:{sx:2,sy:1,angle:90,x:1,y:2},
  controls:[control('sx','Horizontal scale',-2,3,.25),control('sy','Vertical scale',-2,3,.25),control('angle','Counterclockwise turn',0,360,15,'°'),control('x','Point x',-2,2,.5,'map units'),control('y','Point y',-2,2,.5,'map units')],
  calculate({sx,sy,angle,x,y}) {
    const v=[x,y],av=[sx*x,sy*y],rv=rotateVector(v,angle),ra=rotateVector(av,angle),ar=[sx*rv[0],sy*rv[1]],det=sx*sy;
    return {v,av,rv,ra,ar,det,areaScale:Math.abs(det),same:Math.hypot(ra[0]-ar[0],ra[1]-ar[1])<1e-9,
      equations:[`A = diag(${fmt(sx)}, ${fmt(sy)}); R = rotation ${angle}° counterclockwise`,`RAv ≈ ${pair(ra)}; ARv ≈ ${pair(ar)}; det(A) = ${fmt(det,4)}`],
      stats:[stat('STRETCH, THEN TURN',pair(ra)),stat('TURN, THEN STRETCH',pair(ar)),stat('AREA SCALE',fmt(Math.abs(det)))],
      domain:'Point coordinates and scales are real. Scale 0 flattens a direction; a negative scale reflects it. These diagrams use equal coordinate scales.',
      summary:`Starting from ${pair(v)}, stretching by (${fmt(sx)}, ${fmt(sy)}) then turning ${angle}° gives ${pair(ra)}. Reversing the order gives ${pair(ar)}. ${Math.abs(det)<1e-9?'The transform is singular: area collapses and information is lost.':`Area is multiplied by ${fmt(Math.abs(det))}; ${det<0?'orientation reverses':'orientation is preserved'}.`}`,
      table:{caption:'Matrix multiplication applies the right-hand transform first.',columns:['Stage','A then R','R then A'],rows:[['Start',pair(v),pair(v)],['After first transform',pair(av),pair(rv)],['Final point',pair(ra),pair(ar)]]},
      note:'The pale polygons are two images of the same unit square. Agreement at one selected point does not prove the two transformations agree everywhere. Uniform scaling commutes with rotation; nonuniform scaling generally does not.'};
  },
  draw(r,id) {
    const {sx,sy,angle}=r.inputs,max=Math.max(2,...r.v.map(Math.abs),...r.ra.map(Math.abs),...r.ar.map(Math.abs),Math.abs(sx)+Math.abs(sy));
    const extent=Math.ceil(max/2)*2+2,gridticks=[-extent,-extent/2,0,extent/2,extent];
    const f=frame({id:id+'-graphics',x:204,y:86,w:302,h:302,xmin:-extent,xmax:extent,ymin:-extent,ymax:extent,xticks:gridticks,yticks:gridticks,xlabel:'x (map units)',ylabel:'y (map units)'});
    let out=title('Apply the same operations in two orders','Each colored shape starts as the unit square; arrows show transformed v.')+f.svg;
    const square=[[0,0],[1,0],[1,1],[0,1]],raMap=v=>rotateVector([sx*v[0],sy*v[1]],angle),arMap=v=>{const q=rotateVector(v,angle);return[sx*q[0],sy*q[1]]};
    const points=fn=>square.map(v=>fn(v)).map(v=>[f.X(v[0]),f.Y(v[1])]);
    out+=poly(points(raMap),'#dceaf1',COLORS.blue)+poly(points(arMap),'#ebdfef',COLORS.purple);
    out+=ln(f.X(0),f.Y(0),f.X(r.v[0]),f.Y(r.v[1]),COLORS.muted,2,'4 4')+dot(f.X(r.v[0]),f.Y(r.v[1]),COLORS.muted,4);
    out+=arrow(f.X(0),f.Y(0),f.X(r.ra[0]),f.Y(r.ra[1]),COLORS.blue,3)+arrow(f.X(0),f.Y(0),f.X(r.ar[0]),f.Y(r.ar[1]),COLORS.purple,3);
    out+=txt(25,119,'Stretch A',14,COLORS.ink,'start',650)+txt(25,146,`x → ${fmt(sx)}x`,15,COLORS.green)+txt(25,170,`y → ${fmt(sy)}y`,15,COLORS.green);
    out+=txt(25,224,'Turn R',14,COLORS.ink,'start',650)+txt(25,251,`${angle}° CCW`,15,COLORS.gold);
    out+=txt(539,144,'A, then R',13,COLORS.blue,'start',650)+txt(539,169,pair(r.ra),18,COLORS.blue);
    out+=txt(539,226,'R, then A',13,COLORS.purple,'start',650)+txt(539,251,pair(r.ar),18,COLORS.purple);
    out+=txt(539,309,'Original v',12,COLORS.muted)+txt(539,332,pair(r.v),15,COLORS.muted);
    return out;
  }
});

const POPULATION = Object.freeze([2,4,4,6,8,12]);
function subsets(n) {
  const result=[];
  function next(start,selected) {
    if(selected.length===n){result.push(selected);return;}
    for(let i=start;i<=POPULATION.length-(n-selected.length);i++)next(i+1,[...selected,i]);
  }
  next(0,[]);return result;
}
const SAMPLE_SETS=Object.fromEntries([1,2,3,4,5,6].map(n=>[n,subsets(n)]));
const mean=values=>values.reduce((sum,v)=>sum+v,0)/values.length;
const sampling = defineModel({
  title:'See how a sample can miss the population',
  defaults:{n:3,sample:1},
  controls:[control('n','Sample size',1,6,1,'people'),control('sample','Sample number',1,20,1)],
  constrain:s=>({...s,sample:Math.min(s.sample,SAMPLE_SETS[s.n].length)}),
  bounds:s=>({sample:{max:SAMPLE_SETS[s.n].length}}),
  calculate({n,sample}) {
    const combinations=SAMPLE_SETS[n],indices=combinations[sample-1],values=indices.map(i=>POPULATION[i]);
    const sampleMean=mean(values),populationMean=mean(POPULATION),means=combinations.map(c=>mean(c.map(i=>POPULATION[i])));
    return {population:[...POPULATION],populationMean,sampleMean,indices,values,means,sampleCount:combinations.length,difference:sampleMean-populationMean,
      equations:[`Population mean = (2 + 4 + 4 + 6 + 8 + 12) / 6 = 6 min`,`Sample mean = (${values.join(' + ')}) / ${n} ≈ ${fmt(sampleMean,3)} min`],
      stats:[stat('POPULATION MEAN','6','min'),stat('SAMPLE MEAN',fmt(sampleMean,3),'min'),stat('DIFFERENCE',fmt(sampleMean-populationMean,3),'min')],
      domain:`Choose ${n} distinct people from 6. This size has ${combinations.length} possible unordered sample${combinations.length===1?'':'s'}. No person appears twice in one sample.`,
      summary:`Sample ${sample} of ${combinations.length} contains wait times ${values.join(', ')} minutes. Its mean is ${fmt(sampleMean,3)} minutes, compared with the population mean of 6 minutes. This is a chosen sample, not a random draw.`,
      table:{caption:'Synthetic queue waits; repeated values belong to different people.',columns:['Person','Wait (min)','In this sample?'],rows:POPULATION.map((v,i)=>[`Person ${i+1}`,String(v),indices.includes(i)?'Yes':'No'])},
      note:'The lower plot enumerates every possible sample mean without replacement. Each dot is equally likely only under simple random sampling of people; distinct samples can share a mean. Increasing n does not guarantee that every particular sample is closer to 6.'};
  },
  draw(r,id) {
    let out=title('One population, many possible samples','Select different groups. The people stay fixed; the estimate changes.');
    for(let i=0;i<6;i++){
      const x=29+i*111,selected=r.indices.includes(i);
      out+=box(x,86,98,83,selected?'#e4eedb':COLORS.pale,selected?COLORS.green:COLORS.border);
      out+=txt(x+49,108,`Person ${i+1}`,11,COLORS.muted,'middle')+txt(x+49,139,`${POPULATION[i]} min`,20,selected?COLORS.green:COLORS.muted,'middle',600);
      out+=txt(x+49,158,selected?'Selected':'',10,COLORS.green,'middle');
    }
    out+=txt(29,209,`${r.sampleCount} possible groups of ${r.inputs.n}; each dot below is one group's mean`,14,COLORS.ink);
    const x=v=>61+(v-2)/10*600,baseline=322;
    out+=ln(x(2),baseline,x(12),baseline,COLORS.border,2);
    for(let v=2;v<=12;v+=2)out+=ln(x(v),baseline-5,x(v),baseline+5,COLORS.border,1)+txt(x(v),baseline+25,v,12,COLORS.muted,'middle');
    const counts=new Map(),points=r.means.map((m,i)=>{const key=m.toFixed(8),stack=counts.get(key)||0;counts.set(key,stack+1);return{x:x(m),y:baseline-15-stack*15,i,m}});
    for(const p of points)out+=dot(p.x,p.y,p.i===r.inputs.sample-1?COLORS.gold:COLORS.blue,5,p.i===r.inputs.sample-1?COLORS.gold:'#dce8ee');
    out+=ln(x(6),237,x(6),baseline+3,COLORS.green,2,'4 4')+txt(x(6),228,'Population mean: 6',13,COLORS.green,'middle');
    out+=txt(660,375,'Possible sample mean (minutes)',13,COLORS.muted,'end');
    out+=box(61,391,600,35,COLORS.pale,COLORS.border)+txt(361,413,`Chosen sample ${r.inputs.sample} → ${fmt(r.sampleMean,3)} min · enumeration, not random`,13,COLORS.ink,'middle');
    return out;
  }
});

export const studioModels = Object.freeze({recipe,plans,garden,motion,chain,bayes,graphics,sampling});

let mountSerial = 0;
export function mountStudioLab(element, id, options = {}) {
  const model = studioModels[id];
  if (!model) throw new Error(`Unknown studio model: ${id}`);
  const esc = typeof options.esc === 'function' ? options.esc : escapeHTML;
  const prefix = `studio-model-${++mountSerial}`;
  const listeners = new AbortController();
  let disposed = false, state = model.normalize(options.initial || model.defaults);
  element.innerHTML = `<div class="studio-lab" data-studio-model="${id}">
    <p class="studio-lab-scroll-hint">Scroll the diagram sideways for detail.</p>
    <div class="lab-frame">
      <div class="lab-canvas"><svg viewBox="0 0 720 440" role="img" aria-label="${esc(model.title)}" style="width:100%;height:auto;min-height:0;touch-action:auto"></svg></div>
      <div class="lab-controls"><h3>Change the model</h3><div class="controls">${model.controls.map(c => {
        const label = `${c.label}${c.unit ? ` · ${c.unit}` : ''}`;
        return `<div class="control"><label class="control-row" for="${prefix}-${c.key}"><span>${esc(label)}</span><input class="control-number" id="${prefix}-${c.key}" data-studio-input="${c.key}" aria-label="${esc(label)}" type="number" min="${c.min}" max="${c.max}" step="${c.step}" value="${state[c.key]}"></label><input data-studio-input="${c.key}" aria-label="${esc(label)} slider" type="range" min="${c.min}" max="${c.max}" step="${c.step}" value="${state[c.key]}"></div>`;
      }).join('')}</div><button type="button" class="button secondary small" data-studio-reset>Reset model</button><p class="studio-lab-domain lab-note" data-studio-domain></p></div>
    </div>
    <div class="studio-lab-equations" data-studio-equations></div>
    <div class="lab-stats" data-studio-stats></div>
    <p class="studio-lab-caption lab-note" role="status" aria-live="polite" aria-atomic="true" data-studio-summary></p>
    <details class="studio-lab-data" open><summary>Compare the quantities</summary><table class="table-values" data-studio-table></table></details>
    <p class="lab-note" data-studio-note></p>
  </div>`;
  const $ = selector => element.querySelector(selector);
  function draw() {
    const result = model.compute(state);
    state = result.inputs;
    const svg = $('svg');
    svg.setAttribute('aria-label', `${model.title}. ${result.summary}`);
    svg.innerHTML = `<title>${esc(model.title)}</title><desc>${esc(result.summary)}</desc>${model.draw(result, prefix)}`;
    $('[data-studio-equations]').innerHTML = result.equations.map(e => `<p class="lab-equation">${esc(e)}</p>`).join('');
    $('[data-studio-domain]').textContent = result.domain;
    $('[data-studio-summary]').textContent = result.summary;
    $('[data-studio-note]').textContent = `${result.note} Decimal readouts are rounded when necessary.`;
    $('[data-studio-stats]').innerHTML = result.stats.map(s => `<div class="stat-tile"><small>${esc(s.label)}</small><strong>${esc(s.value)}${s.unit ? ` <span>${esc(s.unit)}</span>` : ''}</strong></div>`).join('');
    $('[data-studio-table]').innerHTML = `<caption>${esc(result.table.caption)}</caption><thead><tr>${result.table.columns.map(c => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead><tbody>${result.table.rows.map(row => `<tr>${row.map((cell,i) => i === 0 ? `<th scope="row">${esc(cell)}</th>` : `<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody>`;
    element.querySelectorAll('[data-studio-input]').forEach(input => {
      const bounds = model.bounds?.(state)?.[input.dataset.studioInput];
      if (bounds?.min !== undefined) input.min = bounds.min;
      if (bounds?.max !== undefined) input.max = bounds.max;
      if (input !== document.activeElement) input.value = state[input.dataset.studioInput];
    });
    return result;
  }
  function notify(result) {
    if (disposed || typeof options.onChange !== 'function') return;
    const pending = options.onChange({inputs:{...state}, summary:result.summary});
    pending?.catch?.(() => {}); // The host owns persistence errors; the model stays usable.
  }
  element.querySelectorAll('[data-studio-input]').forEach(input => {
    input.addEventListener('input', () => {
      if (input.value === '' || !Number.isFinite(input.valueAsNumber)) return;
      state = model.normalize({...state, [input.dataset.studioInput]:input.valueAsNumber});
      const result = draw();
      notify(result);
    }, {signal:listeners.signal});
    input.addEventListener('change', () => {input.value = state[input.dataset.studioInput];}, {signal:listeners.signal});
  });
  $('[data-studio-reset]').addEventListener('click', () => {
    state = model.normalize(model.defaults); const result = draw(); notify(result);
  }, {signal:listeners.signal});
  draw();
  return () => { if (disposed) return; disposed = true; listeners.abort(); element.replaceChildren(); };
}
