// Exact, deliberately bounded algebra. No floating-point evaluation certifies a step.
import {parseExpression} from './calculator-engine.js';

export const STEP_LIMITS=Object.freeze({lines:12,characters:500,degree:12,workingDegree:24,exponent:12,bits:512,operations:60000,conditions:24});
export const STEP_SCOPE='Exact rational arithmetic, polynomials and rational expressions in x, and equations that reduce to affine linear sides. Roots, trig, logarithms, other variables and nonlinear equations need review.';
class StepError extends Error{constructor(message,code='unsupported',prerequisiteId=null){super(message);this.code=code;this.prerequisiteId=prerequisiteId;}}
const stop=(message,code,prerequisiteId)=>{throw new StepError(message,code,prerequisiteId);};
const abs=n=>n<0n?-n:n;
const gcd=(a,b)=>{a=abs(a);b=abs(b);while(b){const r=a%b;a=b;b=r;}return a;};
function Q(n,d=1n){
  if(d===0n)stop('Division by an identically zero expression is undefined.','undefined','arithmetic.fractions');
  if(d<0n){n=-n;d=-d;}const g=gcd(n,d);n/=g;d/=g;
  if(abs(n).toString(2).length>STEP_LIMITS.bits||d.toString(2).length>STEP_LIMITS.bits)stop('The exact coefficients became too large for this checker. Split the work into smaller steps.','limit');
  return {n,d};
}
const zero=()=>Q(0n),one=()=>Q(1n),qadd=(a,b)=>Q(a.n*b.d+b.n*a.d,a.d*b.d),qneg=a=>Q(-a.n,a.d),qsub=(a,b)=>qadd(a,qneg(b)),qmul=(a,b)=>Q(a.n*b.n,a.d*b.d),qdiv=(a,b)=>Q(a.n*b.d,a.d*b.n),qeq=(a,b)=>a.n===b.n&&a.d===b.d;
const qs=a=>a.d===1n?String(a.n):`${a.n}/${a.d}`;
function literal(raw){
  const [coefficient,exponentText='0']=raw.toLowerCase().split('e'),exponent=Number(exponentText),[whole,part='']=coefficient.split('.'),digits=(whole||'0')+part,places=part.length-exponent;
  if(digits.length>100||!Number.isInteger(places)||Math.abs(places)>100)stop('This literal exceeds the exact-number limit. Use a smaller number.','limit');
  return places>=0?Q(BigInt(digits),10n**BigInt(places)):Q(BigInt(digits)*10n**BigInt(-places));
}
export function normalizeMathText(value){return String(value??'').replace(/[−–]/g,'-').replace(/[×·]/g,'*').replace(/÷/g,'/').replace(/²/g,'^2').replace(/³/g,'^3').replace(/√\s*\(/g,'sqrt(');}

function algebra(){
  let operations=0;
  const tick=(n=1)=>{operations+=n;if(operations>STEP_LIMITS.operations)stop('This calculation reached the exact-work limit. Split it into smaller steps.','limit');};
  const trim=p=>{while(p.length>1&&p.at(-1).n===0n)p.pop();return p;};
  const isZero=p=>p.length===1&&p[0].n===0n;
  const add=(a,b)=>{tick(Math.max(a.length,b.length));return trim(Array.from({length:Math.max(a.length,b.length)},(_,i)=>qadd(a[i]||zero(),b[i]||zero())));};
  const scale=(p,q)=>{tick(p.length);return trim(p.map(a=>qmul(a,q)));};
  const sub=(a,b)=>add(a,scale(b,Q(-1n)));
  function mul(a,b){
    if(isZero(a)||isZero(b))return [zero()];
    if(a.length+b.length-2>STEP_LIMITS.workingDegree)stop('The polynomial degree exceeds the checker’s working limit.','limit','arithmetic.exponents');
    const p=Array.from({length:a.length+b.length-1},zero);tick(a.length*b.length);
    for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++)p[i+j]=qadd(p[i+j],qmul(a[i],b[j]));return trim(p);
  }
  function divrem(a,b){
    if(isZero(b))stop('An exact polynomial division had a zero divisor.','undefined');
    let r=a.slice();const q=Array.from({length:Math.max(1,a.length-b.length+1)},zero);
    while(!isZero(r)&&r.length>=b.length){tick(r.length*b.length);const shift=r.length-b.length,c=qdiv(r.at(-1),b.at(-1));q[shift]=qadd(q[shift],c);for(let i=0;i<b.length;i++)r[i+shift]=qsub(r[i+shift],qmul(c,b[i]));r=trim(r);}
    return {q:trim(q),r};
  }
  const monic=p=>isZero(p)?p:scale(p,qdiv(one(),p.at(-1)));
  function pgcd(a,b){while(!isZero(b)){const r=divrem(a,b).r;a=b;b=r;}return monic(a);}
  const derivative=p=>p.length===1?[zero()]:p.slice(1).map((c,i)=>qmul(c,Q(BigInt(i+1))));
  const squarefree=p=>p.length===1?[one()]:monic(divrem(p,pgcd(p,derivative(p))).q);
  const evaluate=(p,x)=>{let result=zero();for(let i=p.length-1;i>=0;i--){tick();result=qadd(qmul(result,x),p[i]);}return result;};
  const key=p=>monic(p).map(qs).join(',');
  // Sturm's theorem determines existence of real zeros exactly. Complex-only
  // factors such as x^2+1 do not create exclusions from a real domain.
  function realRootCount(p){
    if(p.length===1)return 0;
    const sequence=[squarefree(p)];sequence.push(derivative(sequence[0]));
    while(!isZero(sequence.at(-1))){const r=scale(divrem(sequence.at(-2),sequence.at(-1)).r,Q(-1n));if(isZero(r))break;sequence.push(r);}
    const changes=negative=>{const signs=sequence.map(s=>{let sign=s.at(-1).n<0n?-1:1;if(negative&&(s.length-1)%2)sign=-sign;return sign;});return signs.slice(1).reduce((n,s,i)=>n+(s!==signs[i]?1:0),0);};
    return changes(true)-changes(false);
  }
  function conditions(list){
    const result=[],seen=new Set();
    for(const raw of list){
      if(isZero(raw))stop('A denominator or nonpositive-power base is identically zero, so this line has no allowed real inputs.','undefined','algebra-2.rational-functions');
      if(raw.length===1)continue;const p=squarefree(raw),id=key(p);if(seen.has(id))continue;seen.add(id);
      if(realRootCount(p)===0)continue;result.push(p);
      if(result.length>STEP_LIMITS.conditions)stop('There are too many domain conditions to verify safely in one line.','limit');
    }
    return result;
  }
  function make(num,den=[one()],domain=[]){
    if(isZero(den))stop('This line divides by an identically zero expression.','undefined','arithmetic.fractions');
    const g=pgcd(num,den);num=divrem(num,g).q;den=divrem(den,g).q;
    const lead=den.at(-1);num=scale(num,qdiv(one(),lead));den=scale(den,qdiv(one(),lead));
    if(Math.max(num.length,den.length)-1>STEP_LIMITS.degree)stop(`This checker supports degree at most ${STEP_LIMITS.degree}.`,'limit','arithmetic.exponents');
    return {num,den,domain};
  }
  function power(p,n){let r=[one()];while(n>0){if(n%2)r=mul(r,p);n=Math.floor(n/2);if(n)p=mul(p,p);}return r;}
  function compile(ast){
    tick();
    if(ast.type==='number')return make([literal(ast.raw)]);
    if(ast.type==='variable')return make([zero(),one()]);
    if(ast.type==='constant')stop('Constants pi and e need a broader symbolic checker. This tool does not replace them with decimal guesses.','unsupported','algebra-1.functions');
    if(ast.type==='function')stop(`The function ${ast.name}(…) needs review. This checker does not certify root, absolute-value, trig or logarithm identities.`,'unsupported',ast.name==='sqrt'||ast.name==='cbrt'?'arithmetic.roots':'algebra-1.functions');
    if(ast.type==='unary'){const a=compile(ast.argument);return make(ast.operator==='-'?scale(a.num,Q(-1n)):a.num,a.den,a.domain);}
    if(ast.type!=='binary')stop('This notation needs review.','unsupported');
    const a=compile(ast.left),b=compile(ast.right),domain=[...a.domain,...b.domain];
    if(ast.operator==='+')return make(add(mul(a.num,b.den),mul(b.num,a.den)),mul(a.den,b.den),domain);
    if(ast.operator==='-')return make(sub(mul(a.num,b.den),mul(b.num,a.den)),mul(a.den,b.den),domain);
    if(ast.operator==='*')return make(mul(a.num,b.num),mul(a.den,b.den),domain);
    if(ast.operator==='/')return make(mul(a.num,b.den),mul(a.den,b.num),[...domain,b.num]);
    if(ast.operator==='^'){
      if(b.num.length!==1||b.den.length!==1||b.domain.length)stop('Use a constant integer exponent in this checker; variable or fractional exponents need review.','unsupported','arithmetic.exponents');
      const exponent=qdiv(b.num[0],b.den[0]);if(exponent.d!==1n||abs(exponent.n)>BigInt(STEP_LIMITS.exponent))stop(`Only integer powers from −${STEP_LIMITS.exponent} to ${STEP_LIMITS.exponent} are checked.`,'unsupported','arithmetic.exponents');
      const n=Number(exponent.n);if(n<=0)domain.push(a.num);
      return n<0?make(power(a.den,-n),power(a.num,-n),domain):make(power(a.num,n),power(a.den,n),domain);
    }
    stop('This operator needs review.','unsupported');
  }
  function format(p){
    const parts=[];for(let i=p.length-1;i>=0;i--){const c=p[i];if(!c.n)continue;const negative=c.n<0n,magnitude=Q(abs(c.n),c.d),unit=magnitude.n===magnitude.d,coefficient=i>0&&unit?'':qs(magnitude),term=coefficient+(i>0?(coefficient?'*':'')+'x'+(i>1?'^'+i:''):'');parts.push((parts.length?(negative?' − ':' + '):(negative?'−':''))+term);}return parts.join('')||'0';
  }
  const formatRF=r=>r.den.length===1?format(r.num):`(${format(r.num)})/(${format(r.den)})`;
  function label(p){if(p.length===2)return 'x ≠ '+qs(qdiv(qneg(p[0]),p[1]));return `(${format(p)}) ≠ 0`;}
  const combined=domain=>domain.reduce((p,q)=>squarefree(mul(p,q)),[one()]);
  const extraRoots=(candidate,carried)=>{const p=combined(candidate),q=combined(carried),remaining=divrem(p,pgcd(p,q)).q;return realRootCount(remaining)>0;};
  const allowed=(domain,x)=>domain.every(p=>evaluate(p,x).n!==0n);
  function solution(line,domain){
    const a=line.left,b=line.right;
    if(a.den.length!==1||b.den.length!==1||a.num.length>2||b.num.length>2)stop('This is not an affine linear equation after exact simplification. Nonlinear and general rational equations need review.','unsupported','pre-algebra.multi-step-equations');
    const p=sub(a.num,b.num),constant=p[0],coefficient=p[1]||zero();
    if(!coefficient.n)return {kind:constant.n?'none':'all'};
    const value=qdiv(qneg(constant),coefficient);return allowed(domain,value)?{kind:'one',value}:{kind:'none'};
  }
  function parseLine(source){
    if(typeof source!=='string'||source.length>STEP_LIMITS.characters)stop('Use a line of at most 500 characters.','limit');
    const clean=normalizeMathText(source).trim();if(!clean)stop('Enter a mathematical line first.','syntax');
    if(/[<>!≠≤≥]/.test(clean))stop('Put domain exclusions in the domain field. Inequalities and logical statements need review.','unsupported','pre-algebra.inequalities');
    const sides=clean.split('=');if(sides.length>2||sides.some(s=>!s.trim()))stop('Use one expression, or one equation with exactly one equals sign and two sides.','syntax','algebra-1.functions');
    const parse=s=>{try{return compile(parseExpression(s));}catch(e){if(e instanceof StepError)throw e;const names=s.match(/[a-zA-Z_][a-zA-Z_0-9]*/g)||[];if(names.some(n=>!['x','e','pi','sqrt','abs','sin','cos','tan','ln','log','exp','cbrt','asin','acos','atan'].includes(n.toLowerCase())))stop('This checker uses the variable x only. Other variables and function definitions need review.','unsupported','algebra-1.functions');stop(e.message,e.code==='limit'||e.code==='range'?'limit':'syntax');}};
    const left=parse(sides[0]),right=sides.length===2?parse(sides[1]):null,domain=conditions([...left.domain,...right?.domain||[]]);
    const line={kind:right?'equation':'expression',left,right,domain,canonical:formatRF(left)+(right?' = '+formatRF(right):'')};
    if(right)solution(line,domain);return line;
  }
  function assumptions(source){
    const s=normalizeMathText(source||'').trim();if(!s)return {conditions:[],allReal:false};
    if(/^(?:all real(?: x| numbers)?|x (?:in|∈) (?:R|ℝ))\.?$/i.test(s))return {conditions:[],allReal:true};
    if(s.length>500)stop('Keep domain notes below 501 characters.','limit');
    const parts=s.replace(/\band\b/gi,',').split(/[,;\n]/).map(p=>p.trim()).filter(Boolean);if(parts.length>12)stop('Use at most twelve explicit domain exclusions.','limit');
    const list=[];
    for(const p of parts){const match=p.match(/^(.+?)(?:!=|≠)(.+)$/);if(!match)stop('Domain notes need review. Supported exclusions look like x != 1 or x^2 − 2 != 0; other assumptions are not automatically verified.','unsupported','algebra-2.rational-functions');
      const a=parseLine(match[1]),b=parseLine(match[2]);if(a.kind!=='expression'||b.kind!=='expression')stop('Use an expression on each side of a domain exclusion.','syntax');
      list.push(...a.domain,...b.domain,sub(mul(a.left.num,b.left.den),mul(b.left.num,a.left.den)));
    }
    return {conditions:conditions(list),allReal:false};
  }
  function witness(a,b,domain){
    for(const n of [0,1,-1,2,-2,3,-3,4,-4,5,-5]){const x=Q(BigInt(n));if(!allowed(domain,x)||!allowed(b.domain,x))continue;const av=qdiv(evaluate(a.left.num,x),evaluate(a.left.den,x)),bv=qdiv(evaluate(b.left.num,x),evaluate(b.left.den,x));if(!qeq(av,bv))return {x:String(n),before:qs(av),after:qs(bv)};}
    return null;
  }
  return {parseLine,assumptions,conditions,formatRF,format,label,extraRoots,solution,allowed,evaluate,sub,mul,isZero,witness};
}

function ruleFor(before,after,equation=false){
  const text=normalizeMathText(before+' '+after);
  if(equation)return {id:'balance',title:'Keep the same solution set',prerequisiteId:'pre-algebra.multi-step-equations',why:'Add or subtract the same expression on both sides; multiply or divide both sides by the same nonzero constant. A zero multiplier can lose the equation’s information.'};
  if(text.includes('/'))return {id:'fractions',title:'Change whole fractions, then cancel factors',prerequisiteId:'arithmetic.fractions',why:'Use a common denominator for addition. Cancellation divides an entire numerator and denominator by the same nonzero factor; it cannot remove a term from a sum.'};
  if(text.includes('^'))return {id:'powers',title:'Apply the power to the intended quantity',prerequisiteId:'arithmetic.exponents',why:'Parentheses decide what is raised to a power. A sum squared includes both cross-products; a leading minus outside parentheses is not squared.'};
  if(text.includes('('))return {id:'distribution',title:'Multiply every term inside the group',prerequisiteId:'pre-algebra.expressions',why:'Distribution multiplies every term in a parenthesized sum, including its sign. Only like terms can be collected afterward.'};
  return {id:'like_terms',title:'Combine like terms',prerequisiteId:'pre-algebra.expressions',why:'Combine coefficients only when the variable part is the same. Keep the signs with the terms they belong to.'};
}
const publicSolution=s=>s.kind==='one'?'x = '+qs(s.value):s.kind==='none'?'No solutions':'Every input allowed by the carried domain';
function compareParsed(a,b,carry,before,after,A){
  if(a.kind!==b.kind)return {status:'needs_review',code:'mixed_forms',title:'Expression or equation?',explanation:'One line is an expression and the other is an equation. State the equation you are solving, or keep every line as a rewrite of one expression.',prerequisiteId:'algebra-1.functions',restrictions:carry.map(A.label)};
  const rule=ruleFor(before,after,a.kind==='equation'),base={rule:rule.id,title:rule.title,prerequisiteId:rule.prerequisiteId,beforeCanonical:a.canonical,afterCanonical:b.canonical,restrictions:carry.map(A.label)};
  const nextDomain=A.conditions([...carry,...b.domain]);
  if(a.kind==='equation'){
    const sa=A.solution(a,carry),sb=A.solution(b,nextDomain);let equivalent=sa.kind===sb.kind;
    if(equivalent&&sa.kind==='one')equivalent=qeq(sa.value,sb.value);
    if(equivalent&&sa.kind==='all')equivalent=!A.extraRoots(b.domain,carry);
    if(!equivalent)return {...base,status:'invalid',code:'solutions_changed',explanation:rule.why+' These lines have different exact solution sets on the stated domain.',beforeSolutions:publicSolution(sa),afterSolutions:publicSolution(sb)};
    const naturalSolution=A.solution(b,b.domain),rejected=naturalSolution.kind==='one'&&sb.kind==='none';
    return {...base,status:nextDomain.length?'conditional':'valid',code:rejected?'excluded_candidate':'same_solutions',title:rejected?'The candidate fails the original domain':base.title,explanation:rejected?`The algebra produces x = ${qs(naturalSolution.value)}, but that input is excluded by the carried domain. Both equations have no admissible solution. This candidate cannot be your final solution.`:'Both lines have the same exact linear-equation solution set. '+rule.why+(nextDomain.length?' Keep the listed exclusions; this result is not permission to restore an excluded input.':''),restrictions:nextDomain.map(A.label),beforeSolutions:publicSolution(sa),afterSolutions:publicSolution(sb),carry:nextDomain};
  }
  const difference=A.sub(A.mul(a.left.num,b.left.den),A.mul(b.left.num,a.left.den));
  if(!A.isZero(difference))return {...base,status:'invalid',code:'value_changed',explanation:rule.why+' Exact polynomial expansion shows different values; the expressions are not identical on the original domain.',counterexample:A.witness(a,b,carry)};
  if(A.extraRoots(b.domain,carry))return {...base,status:'invalid',code:'domain_narrowed',title:'This line introduces a new excluded input',prerequisiteId:'algebra-2.rational-functions',explanation:'The formulas agree where both are defined, but the new denominator or nonpositive power removes real inputs allowed before. State and justify an additional assumption before using this rewrite.',newRestrictions:b.domain.map(A.label)};
  const restored=A.extraRoots(carry,b.domain);
  return {...base,status:carry.length?'conditional':'valid',code:restored?'carry_domain':'same_expression',sameNaturalDomain:!restored,explanation:restored?'The values agree only on the carried domain. The shorter formula would have a wider natural domain, so these are not the same unrestricted function. Keep every original exclusion.':rule.why+' Exact rational-polynomial comparison confirms the same values on the carried domain.',carry};
}
function problem(error,index){return {status:error.code==='undefined'||error.code==='syntax'?'input_error':'needs_review',code:error.code||'unsupported',title:error.code==='undefined'?'This line is undefined':error.code==='syntax'?'Check the notation':'This part needs review',explanation:error.message,prerequisiteId:error.prerequisiteId||null,index,lineNumber:index+1};}
export function checkSteps(lines,{assumptions=''}={}){
  const supplied=typeof lines==='string'?lines.split(/\r?\n/):lines;
  if(!Array.isArray(supplied)||supplied.length>STEP_LIMITS.lines)return {status:'needs_review',items:[],firstIssue:{index:0,lineNumber:1,status:'needs_review',explanation:'Use at most twelve lines of work.'},firstInvalidIndex:null,restrictions:[],scope:STEP_SCOPE};
  const entries=supplied.map((text,index)=>({text,index})).filter(e=>typeof e.text!=='string'||e.text.trim());
  if(!entries.length)return {status:'incomplete',items:[],firstIssue:null,firstInvalidIndex:null,restrictions:[],message:'Enter the original expression or equation, then its next line.',scope:STEP_SCOPE};
  const A=algebra(),items=[];let carry=[],a,assumed;
  try{assumed=A.assumptions(assumptions);a=A.parseLine(entries[0].text);carry=A.conditions([...assumed.conditions,...a.domain]);if(assumed.allReal&&a.domain.length)stop('“All real x” conflicts with the original denominator or nonpositive-power exclusions. Keep its original domain restrictions.','domain_claim','algebra-2.rational-functions');}
  catch(error){const issue=problem(error,entries[0].index);return {status:issue.status,items,firstIssue:issue,firstInvalidIndex:null,restrictions:carry.map(A.label),scope:STEP_SCOPE};}
  if(entries.length<2)return {status:'incomplete',items,firstIssue:null,firstInvalidIndex:null,restrictions:carry.map(A.label),message:'Add the next line to compare a transformation.',scope:STEP_SCOPE};
  for(let i=1;i<entries.length;i++){
    const entry=entries[i];let result,b;
    try{b=A.parseLine(entry.text);result=compareParsed(a,b,carry,entries[i-1].text,entry.text,A);}
    catch(error){result=problem(error,entry.index);}
    result={...result,fromIndex:entries[i-1].index,index:entry.index,lineNumber:entry.index+1};
    const nextCarry=result.carry;delete result.carry;items.push(result);
    if(!['valid','conditional'].includes(result.status))return {status:result.status,items,firstIssue:result,firstInvalidIndex:result.status==='invalid'?entry.index:null,restrictions:carry.map(A.label),scope:STEP_SCOPE};
    carry=nextCarry||carry;a=b;
  }
  return {status:carry.length?'conditional':'valid',items,firstIssue:null,firstInvalidIndex:null,restrictions:carry.map(A.label),scope:STEP_SCOPE,message:'The supported transitions agree exactly. This checks the written lines, not an unstated method or the full solution to an unseen problem.'};
}
export function compareSteps(before,after,options={}){const result=checkSteps([before,after],options);return result.items[0]||result.firstIssue||{status:result.status,explanation:result.message,restrictions:result.restrictions};}
