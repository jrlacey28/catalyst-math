// A small real-valued expression language. Input is data, never JavaScript.
export const LIMITS=Object.freeze({characters:500,tokens:256,nodes:256,depth:36,samples:10000,coordinate:1e6,minSpan:1e-6});
export const FUNCTIONS=Object.freeze(['sin','cos','tan','asin','acos','atan','sqrt','cbrt','abs','ln','log','exp']);
const functionSet=new Set(FUNCTIONS);

export class CalculatorError extends Error{
  constructor(message,code='syntax',position=null){super(message);this.name='CalculatorError';this.code=code;this.position=position;}
}
const fail=(message,code='syntax',position=null)=>{throw new CalculatorError(message,code,position);};
const finite=value=>{if(!Number.isFinite(value))fail('The result is outside the finite number range. Try smaller inputs.','range');return Object.is(value,-0)?0:value;};

export function tokenize(input){
  if(typeof input!=='string')fail('Enter a mathematical expression.');
  if(input.length>LIMITS.characters)fail(`Keep an expression under ${LIMITS.characters+1} characters.`,'limit');
  const source=input.replace(/[−–]/g,'-').replace(/×/g,'*').replace(/÷/g,'/').replace(/π/g,'pi');
  const tokens=[];let position=0;
  while(position<source.length){
    const ch=source[position];if(/\s/.test(ch)){position++;continue;}
    const rest=source.slice(position);
    if(/[0-9.]/.test(ch)){
      const match=rest.match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);
      if(!match)fail('A decimal point needs digits, such as 0.5.','syntax',position);
      const value=Number(match[0]);if(!Number.isFinite(value))fail('That number is too large.','range',position);
      tokens.push({type:'number',value,raw:match[0],position});position+=match[0].length;
    }else if(/[a-zA-Z_]/.test(ch)){
      const name=rest.match(/^[a-zA-Z_][a-zA-Z_0-9]*/)[0].toLowerCase();
      if(!['x','pi','e'].includes(name)&&!functionSet.has(name))fail(`Unknown name “${name}”. Use x, pi, e, or a function such as sqrt(x).`,'syntax',position);
      tokens.push({type:'name',value:name,position});position+=name.length;
    }else if('+-*/^()'.includes(ch)){tokens.push({type:ch,value:ch,position});position++;}
    else fail(`“${ch}” is not part of this calculator’s math notation.`,'syntax',position);
    if(tokens.length>LIMITS.tokens)fail('That expression has too many parts. Split it into smaller calculations.','limit');
  }
  if(!tokens.length)fail('Enter an expression first.');
  tokens.push({type:'end',position:source.length});return tokens;
}

export function parseExpression(input){
  const tokens=tokenize(input);let cursor=0,nodes=0;
  const peek=()=>tokens[cursor],take=()=>tokens[cursor++];
  const node=value=>{if(++nodes>LIMITS.nodes)fail('That expression has too many parts.','limit');return value;};
  function expression(minimum=0,depth=0){
    if(depth>LIMITS.depth)fail('There are too many nested operations. Use a smaller expression.','limit');
    const token=take();let left;
    if(token.type==='number')left=node({type:'number',value:token.value,raw:token.raw});
    else if(token.type==='name'){
      if(token.value==='x')left=node({type:'variable'});
      else if(token.value==='pi'||token.value==='e')left=node({type:'constant',name:token.value});
      else{
        if(peek().type!=='(')fail(`Write ${token.value}(...) with its input in parentheses. For a squared sine, use sin(x)^2.`,'syntax',token.position);
        take();const argument=expression(0,depth+1);
        if(peek().type!==')')fail(`Close the parentheses in ${token.value}(...).`,'syntax',peek().position);
        take();left=node({type:'function',name:token.value,argument});
      }
    }else if(token.type==='('){
      left=expression(0,depth+1);if(peek().type!==')')fail('A closing parenthesis is missing.','syntax',peek().position);take();
    }else if(token.type==='+'||token.type==='-'){
      // Power binds more tightly than a leading sign: -2^2 is -(2^2).
      left=node({type:'unary',operator:token.type,argument:expression(25,depth+1)});
    }else fail(token.type==='end'?'Finish the expression after the operator.':'Enter a number, x, or an expression inside these parentheses.','syntax',token.position);
    while(true){
      const next=peek();let operator=next.type,implicit=false;
      if(next.type==='name'||next.type==='('){operator='*';implicit=true;}
      const binding=operator==='+'||operator==='-'?10:operator==='*'||operator==='/'?20:operator==='^'?30:-1;
      if(binding<minimum||binding<0)break;
      if(!implicit)take();
      const right=expression(operator==='^'?binding:binding+1,depth+1);
      left=node({type:'binary',operator,left,right});
    }
    return left;
  }
  const ast=expression();
  if(peek().type!=='end')fail(peek().type==='number'?'Put * between separate numbers.':peek().type===')'?'There is an extra closing parenthesis.':'Check the expression near this point.','syntax',peek().position);
  return ast;
}

const gcd=(a,b)=>{a=a<0n?-a:a;b=b<0n?-b:b;while(b){const r=a%b;a=b;b=r;}return a;};
function rational(n,d=1n){
  if(d===0n)return null;if(d<0n){n=-n;d=-d;}const divisor=gcd(n,d);n/=divisor;d/=divisor;
  if(n.toString(2).length>256||d.toString(2).length>256)return null;return {n,d};
}
function decimalFraction(raw){
  if(raw.length>80)return null;
  const [coefficient,expText='0']=raw.toLowerCase().split('e'),exponent=Number(expText);
  const [whole,part='']=coefficient.split('.'),places=part.length-exponent;
  if(Math.abs(places)>76)return null;
  const digits=(whole||'0')+part;if(digits.length>78)return null;
  const n=BigInt(digits);return places>=0?rational(n,10n**BigInt(places)):rational(n*10n**BigInt(-places));
}

// This optional exact display covers finite decimal literals and rational arithmetic.
// Functions, constants, variables, and noninteger powers remain numerical results.
export function exactFraction(ast){
  if(ast.type==='number')return decimalFraction(ast.raw);
  if(ast.type==='unary'){const r=exactFraction(ast.argument);return r?rational(ast.operator==='-'?-r.n:r.n,r.d):null;}
  if(ast.type!=='binary')return null;
  const a=exactFraction(ast.left),b=exactFraction(ast.right);if(!a||!b)return null;
  if(ast.operator==='+')return rational(a.n*b.d+b.n*a.d,a.d*b.d);
  if(ast.operator==='-')return rational(a.n*b.d-b.n*a.d,a.d*b.d);
  if(ast.operator==='*')return rational(a.n*b.n,a.d*b.d);
  if(ast.operator==='/')return rational(a.n*b.d,a.d*b.n);
  if(ast.operator!=='^'||b.d!==1n||b.n>32n||b.n< -32n||a.n===0n&&b.n<=0n)return null;
  const power=b.n<0n?-b.n:b.n;
  if((a.n.toString(2).length+a.d.toString(2).length)*Number(power)>512)return null;
  return b.n<0n?rational(a.d**power,a.n**power):rational(a.n**power,a.d**power);
}

export function hasVariable(ast){return ast.type==='variable'||Boolean(ast.argument&&hasVariable(ast.argument))||Boolean(ast.left&&(hasVariable(ast.left)||hasVariable(ast.right)));}
export function evaluateAST(ast,{x=0,angleMode='radians'}={}){
  if(!Number.isFinite(x))fail('Use a finite number for x.','range');
  if(!['radians','degrees'].includes(angleMode))fail('Choose radians or degrees for the angle mode.','syntax');
  const radians=v=>angleMode==='degrees'?v*Math.PI/180:v;
  const inverseAngle=v=>angleMode==='degrees'?v*180/Math.PI:v;
  function value(n,depth=0){
    if(depth>LIMITS.nodes)fail('The expression is too deeply nested.','limit');
    if(n.type==='number')return n.value;
    if(n.type==='variable')return x;
    if(n.type==='constant')return n.name==='pi'?Math.PI:Math.E;
    if(n.type==='unary'){const a=value(n.argument,depth+1);return n.operator==='-'?-a:a;}
    if(n.type==='binary'){
      // Preserve literal rational arithmetic before converting to a display number.
      // In particular, 0.3 - 0.2 - 0.1 is exactly zero, not a tiny negative value.
      const exact=exactFraction(n);if(exact)return finite(Number(exact.n)/Number(exact.d));
      const a=value(n.left,depth+1),b=value(n.right,depth+1);let result;
      if(n.operator==='+')result=a+b;
      else if(n.operator==='-')result=a-b;
      else if(n.operator==='*')result=a*b;
      else if(n.operator==='/'){if(b===0)fail('Division by zero is undefined.','domain');result=a/b;}
      else if(n.operator==='^'){
        if(a===0&&b===0)fail('0^0 is undefined in this calculator.','domain');
        if(a===0&&b<0)fail('A negative power of zero would divide by zero.','domain');
        if(a<0&&!Number.isInteger(b)){
          const exponent=exactFraction(n.right);
          if(!exponent||exponent.d%2n===0n)fail('This power has no real value. For an odd root, use cbrt(x) or an exact fraction such as x^(1/3).','domain');
          result=(exponent.n%2n===0n?1:-1)*Math.pow(-a,b);
        }else result=Math.pow(a,b);
      }else fail('Invalid expression operator.','syntax');
      return finite(result);
    }
    if(n.type!=='function'||!functionSet.has(n.name))fail('Invalid expression tree.','syntax');
    const a=value(n.argument,depth+1);let result;
    if(n.name==='sin'||n.name==='cos'||n.name==='tan'){
      const r=radians(a);if(Math.abs(r)>1e12)fail('That angle is too large for a reliable numerical result. Use a smaller equivalent angle.','range');
      if(n.name==='tan'&&Math.abs(Math.cos(r))<1e-12)fail('Tangent is undefined at odd multiples of 90° (pi/2 radians).','domain');
      result=n.name==='sin'?Math.sin(r):n.name==='cos'?Math.cos(r):Math.tan(r);
    }else if(n.name==='asin'||n.name==='acos'){
      if(a< -1||a>1)fail('asin and acos require an input between −1 and 1.','domain');
      result=inverseAngle(n.name==='asin'?Math.asin(a):Math.acos(a));
    }else if(n.name==='atan')result=inverseAngle(Math.atan(a));
    else if(n.name==='sqrt'){if(a<0)fail('Square root needs a nonnegative input for a real result.','domain');result=Math.sqrt(a);}
    else if(n.name==='cbrt')result=Math.cbrt(a);
    else if(n.name==='abs')result=Math.abs(a);
    else if(n.name==='ln'||n.name==='log'){if(a<=0)fail('A logarithm needs a positive input.','domain');result=n.name==='ln'?Math.log(a):Math.log10(a);}
    else result=Math.exp(a);
    return finite(result);
  }
  return finite(value(ast));
}

export function formatNumber(value,digits=10){
  if(!Number.isFinite(value))return 'undefined';if(value===0)return '0';
  const rounded=Number(value.toPrecision(digits));return String(Object.is(rounded,-0)?0:rounded);
}
export function calculate(source,options={}){
  const ast=parseExpression(source),value=evaluateAST(ast,options),fraction=exactFraction(ast);
  return {ast,value,display:formatNumber(value),fraction:fraction?{numerator:String(fraction.n),denominator:String(fraction.d),display:fraction.d===1n?String(fraction.n):`${fraction.n}/${fraction.d}`}:null,hasX:hasVariable(ast)};
}
export function valueAt(ast,x,angleMode='radians'){
  try{return {defined:true,value:evaluateAST(ast,{x,angleMode})};}catch(error){if(error instanceof CalculatorError)return {defined:false,value:null,reason:error.message,code:error.code};throw error;}
}

export function validateWindow(window){
  const result={};for(const key of ['xmin','xmax','ymin','ymax']){const n=Number(window?.[key]);if(!Number.isFinite(n)||Math.abs(n)>LIMITS.coordinate)fail('Window bounds must be finite numbers between −1,000,000 and 1,000,000.','window');result[key]=n;}
  if(result.xmax-result.xmin<LIMITS.minSpan||result.ymax-result.ymin<LIMITS.minSpan)fail('Each maximum must exceed its minimum by at least 0.000001.','window');
  return result;
}
export function graphTransform(window,{left=60,top=25,width=650,height=300}={}){
  const w=validateWindow(window);if(![left,top,width,height].every(Number.isFinite)||width<=0||height<=0)fail('The graph display needs positive dimensions.','window');
  return {x:x=>left+(x-w.xmin)/(w.xmax-w.xmin)*width,y:y=>top+(w.ymax-y)/(w.ymax-w.ymin)*height,input:px=>w.xmin+(px-left)/width*(w.xmax-w.xmin),output:py=>w.ymax-(py-top)/height*(w.ymax-w.ymin),left,top,width,height};
}
export function zoomWindow(window,factor){
  const w=validateWindow(window);if(!Number.isFinite(factor)||factor<=0)fail('Use a positive zoom factor.','window');
  const cx=(w.xmin+w.xmax)/2,cy=(w.ymin+w.ymax)/2,hx=(w.xmax-w.xmin)*factor/2,hy=(w.ymax-w.ymin)*factor/2;
  return validateWindow({xmin:cx-hx,xmax:cx+hx,ymin:cy-hy,ymax:cy+hy});
}
export function graphTicks(min,max,count=6){
  const raw=(max-min)/count;if(!Number.isFinite(raw)||raw<=0||!Number.isFinite(min)||!Number.isFinite(max))return [];
  const unit=10**Math.floor(Math.log10(raw)),scaled=raw/unit,step=(scaled<=1?1:scaled<=2?2:scaled<=5?5:10)*unit;
  const ticks=[];for(let n=Math.ceil(min/step);n*step<=max+step*1e-9&&ticks.length<30;n++)ticks.push(Number((n*step).toPrecision(12)));return ticks;
}

export function clipSegment(a,b,window){
  const dx=b.x-a.x,dy=b.y-a.y;let t0=0,t1=1;
  if(![a.x,a.y,b.x,b.y,dx,dy].every(Number.isFinite))return null;
  for(const [p,q] of [[-dx,a.x-window.xmin],[dx,window.xmax-a.x],[-dy,a.y-window.ymin],[dy,window.ymax-a.y]]){
    if(p===0){if(q<0)return null;continue;}const t=q/p;
    if(p<0){if(t>t1)return null;t0=Math.max(t0,t);}else{if(t<t0)return null;t1=Math.min(t1,t);}
  }
  return [{x:a.x+t0*dx,y:a.y+t0*dy},{x:a.x+t1*dx,y:a.y+t1*dy}];
}

function affine(ast,angleMode){
  if(!hasVariable(ast)){const result=valueAt(ast,0,angleMode);return result.defined?{a:0,b:result.value}:null;}
  if(ast.type==='variable')return {a:1,b:0};
  if(ast.type==='unary'){const q=affine(ast.argument,angleMode);return q?{a:q.a*(ast.operator==='-'?-1:1),b:q.b*(ast.operator==='-'?-1:1)}:null;}
  if(ast.type!=='binary')return null;const p=affine(ast.left,angleMode),q=affine(ast.right,angleMode);if(!p||!q)return null;
  if(ast.operator==='+'||ast.operator==='-'){const s=ast.operator==='+'?1:-1;return {a:p.a+s*q.a,b:p.b+s*q.b};}
  if(ast.operator==='*'&&(p.a===0||q.a===0))return {a:p.a*q.b+q.a*p.b,b:p.b*q.b};
  if(ast.operator==='/'&&q.a===0&&q.b!==0)return {a:p.a/q.b,b:p.b/q.b};
  return null;
}

// Explicit cuts cover affine denominators/log boundaries and affine tangent poles.
// Adaptive sampling handles other gaps; this is not a symbolic domain solver.
export function detectedBreaks(ast,window,angleMode='radians'){
  const w=validateWindow(window),values=[];let limited=false;
  const add=x=>{if(Number.isFinite(x)&&x>w.xmin&&x<w.xmax){if(values.length<128)values.push(x);else limited=true;}};
  const zero=n=>{const q=affine(n,angleMode);if(q&&q.a!==0)add(-q.b/q.a);};
  function walk(n){
    if(n.type==='binary'){
      if(n.operator==='/')zero(n.right);
      if(n.operator==='^'&&!hasVariable(n.right)){const p=valueAt(n.right,0,angleMode);if(p.defined&&p.value<=0)zero(n.left);}
      walk(n.left);walk(n.right);
    }else if(n.type==='function'){
      if(n.name==='ln'||n.name==='log')zero(n.argument);
      if(n.name==='tan'){
        const q=affine(n.argument,angleMode);
        if(q&&q.a!==0){const scale=angleMode==='degrees'?Math.PI/180:1,a=q.a*scale,b=q.b*scale,lo=Math.min(a*w.xmin+b,a*w.xmax+b),hi=Math.max(a*w.xmin+b,a*w.xmax+b),first=Math.ceil((lo-Math.PI/2)/Math.PI),last=Math.floor((hi-Math.PI/2)/Math.PI);if(last-first>127)limited=true;for(let k=first;k<=last&&k<first+128;k++)add((Math.PI/2+k*Math.PI-b)/a);}
      }
      walk(n.argument);
    }else if(n.argument)walk(n.argument);
  }
  walk(ast);return {points:[...new Set(values)].sort((a,b)=>a-b),limited};
}

export function sampleGraph(ast,window,{angleMode='radians',steps=240,maxDepth=8,maxSamples=LIMITS.samples}={}){
  const w=validateWindow(window),cuts=detectedBreaks(ast,w,angleMode),cache=new Map(),segments=[];
  if(![steps,maxDepth,maxSamples].every(Number.isFinite))fail('Graph sampling settings must be finite numbers.','limit');
  const count=Math.min(800,Math.max(32,Math.floor(steps))),depthLimit=Math.min(10,Math.max(0,Math.floor(maxDepth))),budget=Math.min(LIMITS.samples,Math.max(100,Math.floor(maxSamples))),ySpan=w.ymax-w.ymin;
  let limited=cuts.limited;
  const at=x=>{if(cache.has(x))return cache.get(x);if(cache.size>=budget){limited=true;return {defined:false,value:null};}const r=cuts.points.includes(x)?{defined:false,value:null,code:'domain'}:valueAt(ast,x,angleMode);cache.set(x,r);return r;};
  function segment(ax,a,bx,b,depth){
    const mx=(ax+bx)/2,m=at(mx);
    if(!a.defined&&!b.defined&&!m.defined)return;
    const all=a.defined&&b.defined&&m.defined;
    const curvature=all?Math.abs(m.value-(a.value+b.value)/2)/ySpan:Infinity;
    const jump=all?Math.abs(a.value-b.value)/ySpan:Infinity;
    if((!all||curvature>.0015||jump>.7)&&depth<depthLimit&&cache.size<budget){segment(ax,a,mx,m,depth+1);segment(mx,m,bx,b,depth+1);return;}
    if(!all||curvature>.05&&jump>.25)return;
    const clipped=clipSegment({x:ax,y:a.value},{x:bx,y:b.value},w);if(clipped)segments.push(clipped);
  }
  const xs=[w.xmin,...Array.from({length:count-1},(_,i)=>w.xmin+(i+1)*(w.xmax-w.xmin)/count),...cuts.points,w.xmax].sort((a,b)=>a-b);
  for(let i=1;i<xs.length;i++){if(xs[i]===xs[i-1])continue;segment(xs[i-1],at(xs[i-1]),xs[i],at(xs[i]),0);}
  const holes=[];
  for(const x of cuts.points){
    const delta=Math.max((w.xmax-w.xmin)*1e-6,Math.abs(x)*1e-9),a=valueAt(ast,x-delta,angleMode),b=valueAt(ast,x+delta,angleMode);
    if(a.defined&&b.defined&&Math.abs(a.value-b.value)<ySpan*.001){const y=(a.value+b.value)/2;if(y>=w.ymin&&y<=w.ymax)holes.push({x,y});}
  }
  return {segments,holes,breaks:cuts.points,sampleCount:cache.size,limited};
}
