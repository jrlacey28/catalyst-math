// Progressive enhancement only: the original field remains the submitted answer.
import {parseExpression} from './calculator-engine.js';
import {normalizeMathText} from './step-checker.js';

const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const row=value=>`<mrow>${value}</mrow>`;
const parentheses=value=>row(`<mo>(</mo>${value}<mo>)</mo>`);
function astMath(node,top=false){
  if(node.type==='number'){
    const [coefficient,exponent]=node.raw.toLowerCase().split('e');
    return exponent===undefined?`<mn>${escape(coefficient)}</mn>`:row(`<mn>${escape(coefficient)}</mn><mo>×</mo><msup><mn>10</mn><mn>${escape(exponent)}</mn></msup>`);
  }
  if(node.type==='variable')return '<mi>x</mi>';
  if(node.type==='constant')return `<mi>${node.name==='pi'?'π':'e'}</mi>`;
  if(node.type==='unary')return row(`<mo>${node.operator==='-'?'−':'+'}</mo>${astMath(node.argument)}`);
  if(node.type==='function'){
    const argument=astMath(node.argument,true);
    if(node.name==='sqrt')return `<msqrt>${argument}</msqrt>`;
    if(node.name==='cbrt')return `<mroot>${argument}<mn>3</mn></mroot>`;
    if(node.name==='abs')return row(`<mo>|</mo>${argument}<mo>|</mo>`);
    return row(`<mi mathvariant="normal">${escape(node.name)}</mi>${parentheses(argument)}`);
  }
  if(node.type==='binary'){
    if(node.operator==='/')return `<mfrac>${astMath(node.left,true)}${astMath(node.right,true)}</mfrac>`;
    if(node.operator==='^'){
      const base=astMath(node.left),needsGroup=node.left.type==='unary'||node.left.type==='binary'&&node.left.operator==='^'||node.left.type==='number'&&/[eE]/.test(node.left.raw),wrapped=needsGroup?parentheses(base):base;
      return `<msup>${wrapped}${astMath(node.right,true)}</msup>`;
    }
    const body=astMath(node.left)+`<mo>${node.operator==='*'?'×':node.operator==='-'?'−':'+'}</mo>`+astMath(node.right);
    return top?row(body):parentheses(body);
  }
  throw new Error('This notation is displayed as text.');
}

/** A notation preview, never a calculation or correctness judgment. */
export function mathPreview(value){
  const text=String(value??'');
  if(!text.trim())return {status:'empty',text,mathML:null,message:'Type an expression to preview its notation.'};
  if(text.length>500)return {status:'text',text,mathML:null,message:'Long explanations stay as plain text. Your answer is unchanged.'};
  try{
    const sides=normalizeMathText(text).split('=');
    if(sides.length>2||sides.some(s=>!s.trim()))throw new Error();
    const body=sides.map(side=>astMath(parseExpression(side),true)).join('<mo>=</mo>');
    return {status:'math',text,mathML:`<math xmlns="http://www.w3.org/1998/Math/MathML" display="block" aria-label="${escape(text)}">${row(body)}</math>`,message:'This is a notation preview, not a checked answer.'};
  }catch{return {status:'text',text,mathML:null,message:'Plain-text preview. Unfinished notation, other variables and written explanations are kept exactly as typed.'};}
}

/** Pure insertion model, exported so selection and wrapping behavior are testable. */
export function mathInsertion(value,start,end,kind){
  value=String(value??'');start=Math.max(0,Math.min(value.length,Number.isFinite(start)?start:value.length));end=Math.max(start,Math.min(value.length,Number.isFinite(end)?end:start));
  const selected=value.slice(start,end);let insert='',offset=0,prompt='Symbol inserted.';
  if(kind==='fraction'){insert=`(${selected})/()`;offset=selected?insert.length-1:1;prompt=selected?'Type the denominator inside the empty parentheses.':'Type the numerator, then the denominator, inside the parentheses.';}
  else if(kind==='root'){insert=`sqrt(${selected})`;offset=selected?insert.length:5;prompt=selected?'Square-root notation inserted.':'Type the quantity inside the root.';}
  else if(kind==='square'){insert=`(${selected})^2`;offset=selected?insert.length:1;prompt=selected?'The selected quantity is squared.':'Type the quantity to square inside the parentheses.';}
  else if(kind==='power'){insert=`(${selected})^()`;offset=selected?insert.length-1:1;prompt=selected?'Type the exponent inside the empty parentheses.':'Type the base and then its exponent inside the parentheses.';}
  else if(kind==='parentheses'){insert=`(${selected})`;offset=selected?insert.length:1;prompt='Parentheses group a quantity.';}
  else if(kind==='pi'){insert='pi';offset=2;prompt='pi names the constant π.';}
  else if(kind==='multiply'){insert='*';offset=1;prompt='An asterisk means multiplication.';}
  else if(kind==='x'){insert='x';offset=1;prompt='Variable x inserted.';}
  else throw new Error('Unknown notation control.');
  return {value:value.slice(0,start)+insert+value.slice(end),start:start+offset,end:start+offset,insert,prompt};
}

const enhanced=new WeakMap();let serial=0;
const contextKey=c=>JSON.stringify([c?.profileId??null,c?.topicId??null,Boolean(c?.independentCheck)]);
const noop=()=>{};

export function enhanceMathInput(input,{getContext=()=>({}),onSupport,esc=escape,preview=true}={}){
  if(!input||!['INPUT','TEXTAREA'].includes(input.tagName)||input.tagName==='INPUT'&&!['text','search','tel','url',''].includes(input.type))return noop;
  if(enhanced.has(input))return enhanced.get(input);
  const doc=input.ownerDocument,wrapper=doc.createElement('div'),id=`math-notation-${++serial}`,controller=new AbortController(),listen={signal:controller.signal};
  let disposed=false,busy=false,contextVersion=0,lastContextKey='',supportGrantedKey=null;
  wrapper.className='math-input-helper';
  wrapper.innerHTML=`<p class="math-input-check-note" hidden>Math symbols are off for this check.</p><details class="math-input-details"><summary>Math symbols</summary><div class="math-input-body"><div class="math-input-symbols" role="group" aria-label="Insert mathematical notation"><button type="button" data-symbol="fraction" aria-label="Insert a fraction">a/b</button><button type="button" data-symbol="root" aria-label="Insert a square root">√</button><button type="button" data-symbol="square" aria-label="Square a quantity">a²</button><button type="button" data-symbol="power" aria-label="Insert a power">aᵇ</button><button type="button" data-symbol="parentheses" aria-label="Group with parentheses">( )</button><button type="button" data-symbol="pi" aria-label="Insert pi">π</button><button type="button" data-symbol="multiply" aria-label="Insert multiplication">×</button><button type="button" data-symbol="x" aria-label="Insert variable x">x</button></div><p class="math-input-guide">Select text to wrap it. You can also type <code>1/2</code>, <code>x^2</code> or <code>sqrt(4)</code>.</p>${preview?'<div class="math-input-preview" aria-label="Notation preview"></div><p class="math-input-preview-note"></p>':''}</div></details><p id="${id}" class="math-input-status" role="status" aria-live="polite"></p>`;
  const wrappingLabel=input.closest('label');
  (wrappingLabel||input).insertAdjacentElement('afterend',wrapper);
  const details=wrapper.querySelector('details'),summary=wrapper.querySelector('summary'),status=wrapper.querySelector('.math-input-status'),checkNote=wrapper.querySelector('.math-input-check-note'),buttons=[...wrapper.querySelectorAll('button')];
  const previewBox=wrapper.querySelector('.math-input-preview'),previewNote=wrapper.querySelector('.math-input-preview-note');
  function context(){try{return getContext()||{};}catch{return {independentCheck:true};}}
  function refresh(){
    if(disposed)return;
    const current=context(),key=contextKey(current);
    if(key!==lastContextKey){lastContextKey=key;contextVersion++;supportGrantedKey=null;details.open=false;status.textContent='';}
    const blocked=Boolean(current.independentCheck)||input.disabled||input.readOnly;
    details.hidden=blocked;checkNote.hidden=!current.independentCheck;buttons.forEach(button=>button.disabled=blocked||busy);
    if(blocked){details.open=false;return;}
    if(preview&&details.open){
      const result=mathPreview(input.value);previewBox.innerHTML=result.mathML||`<span class="math-input-plaintext">${esc(result.text||'…')}</span>`;previewNote.textContent=result.message;
    }
  }
  async function authorize(kind){
    refresh();const captured=context(),key=contextKey(captured),version=contextVersion;
    if(captured.independentCheck||input.disabled||input.readOnly||disposed||busy)return false;
    if(supportGrantedKey===key)return true;
    busy=true;summary.setAttribute('aria-busy','true');buttons.forEach(b=>b.disabled=true);status.textContent='Opening notation help…';
    try{
      if(onSupport)await onSupport({topicId:captured.topicId??null,profileId:captured.profileId??null,kind});
      if(disposed||version!==contextVersion||key!==contextKey(context())||!input.isConnected)return false;
      supportGrantedKey=key;status.textContent='';return true;
    }catch{if(!disposed)status.textContent='Help could not be recorded. Your text is unchanged; try opening it again.';return false;}
    finally{busy=false;if(!disposed){summary.removeAttribute('aria-busy');refresh();}}
  }
  summary.addEventListener('click',async event=>{
    event.preventDefault();if(details.open){details.open=false;return;}
    if(await authorize('notation_help')){details.open=true;refresh();}
  },listen);
  wrapper.addEventListener('keydown',event=>{if(event.key==='Escape'&&details.open){event.preventDefault();details.open=false;summary.focus();}},listen);
  wrapper.addEventListener('click',async event=>{
    const button=event.target.closest('button[data-symbol]');if(!button||!wrapper.contains(button))return;
    event.preventDefault();const value=input.value,start=input.selectionStart??value.length,end=input.selectionEnd??start;
    if(!await authorize('notation_insert'))return;
    if(disposed||value!==input.value||(input.selectionStart??value.length)!==start||(input.selectionEnd??start)!==end){status.textContent='Your selection changed. Choose the notation button again.';return;}
    const next=mathInsertion(value,start,end,button.dataset.symbol);
    if(input.maxLength>=0&&next.value.length>input.maxLength){status.textContent=`This field allows ${input.maxLength} characters. Shorten the text before inserting more notation.`;return;}
    input.value=next.value;input.focus();input.setSelectionRange(next.start,next.end);input.dispatchEvent(new Event('input',{bubbles:true}));status.textContent=next.prompt;refresh();
  },listen);
  input.addEventListener('input',refresh,listen);input.addEventListener('focus',refresh,listen);input.addEventListener('math-input-context',refresh,listen);
  // Native disclosure toggles can come from assistive technologies as well as clicks.
  details.addEventListener('toggle',()=>{if(details.open&&supportGrantedKey!==contextKey(context()))details.open=false;refresh();},listen);
  const dispose=()=>{if(disposed)return;disposed=true;contextVersion++;controller.abort();wrapper.remove();enhanced.delete(input);};
  enhanced.set(input,dispose);refresh();return dispose;
}

export function enhanceMathInputs(root,{selector='input.answer-input, textarea.homework-answer',filter,...options}={}){
  if(!root?.querySelectorAll)return noop;
  const inputs=[...(root.matches?.(selector)?[root]:[]),...root.querySelectorAll(selector)].filter(input=>!filter||filter(input));
  const disposers=inputs.map(input=>enhanceMathInput(input,options));return ()=>disposers.forEach(dispose=>dispose());
}
