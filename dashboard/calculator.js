import {CalculatorError,parseExpression,calculate,valueAt,hasVariable,formatNumber,sampleGraph,validateWindow,graphTransform,graphTicks,zoomWindow} from './calculator-engine.js';

const colors=['#176a89','#8b4ba3','#965914'];
const defaultWindow=()=>({xmin:-10,xmax:10,ymin:-6,ymax:6});
const initialWork=()=>({tab:'calculate',expression:'',calcX:'1',angleMode:'radians',result:null,error:'',graphInputs:['','',''],curves:[],graphErrors:[],graphDirty:false,window:defaultWindow(),probeX:1});
const defaultEscape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let serial=0;

export function createCalculator({esc=defaultEscape,onSupport}={}){
  const uid=`catalyst-calculator-${++serial}`,dialog=document.createElement('dialog');
  dialog.className='calc-drawer';dialog.id=uid;dialog.setAttribute('aria-labelledby',uid+'-heading');
  document.body.append(dialog);
  let work=initialWork(),context={topicId:null,title:'Math calculator',profileId:null,independentCheck:false,practiceHref:'#lab'},contextVersion=0,events=new AbortController(),lastInput=null,returnFocus=null,destroyed=false,supportPromise=null,resizeObserver=null;
  const $=selector=>dialog.querySelector(selector),on=(node,event,fn)=>node?.addEventListener(event,fn,{signal:events.signal});
  const fmt=(n,d=8)=>formatNumber(n,d),clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  function status(message='',isError=false){const node=$('[data-calc-status]');if(node){node.textContent=message;node.classList.toggle('is-error',isError);}}
  async function support(kind,action){
    if(destroyed||context.independentCheck){status('Return to practice to use calculator help.',true);return;}
    const version=contextVersion,supportContext={topicId:context.topicId,profileId:context.profileId,kind};
    try{
      supportPromise=Promise.resolve().then(()=>onSupport?.(supportContext));
      await supportPromise;if(destroyed||version!==contextVersion||context.independentCheck)return;
      status('');action();
    }catch(error){if(version!==contextVersion||destroyed)return;supportPromise=null;const mode=$('[data-calc-angle]');if(mode)mode.value=work.angleMode;status(error.message||'Calculator help could not be opened. Please try again.',true);}
  }

  function render(){
    events.abort();events=new AbortController();lastInput=null;resizeObserver?.disconnect();
    dialog.innerHTML=`<div class="calc-header"><div><span class="calc-kicker">BUILT-IN TOOL</span><h2 id="${uid}-heading">Math calculator</h2><p>${esc(context.title==='Math calculator'?'Calculate, graph, and inspect an input.':context.title)}</p></div><button type="button" class="calc-close" data-calc-close aria-label="Close calculator">×</button></div>${context.independentCheck?`<div class="calc-body"><section class="calc-check-message"><h3>Use the calculator in practice.</h3><p>This independent check asks for unaided work. Return to practice to calculate or explore a graph.</p><p>Your existing calculator expressions are kept for this learning space.</p><a class="button" href="${esc(context.practiceHref)}" data-calc-practice>Return to practice →</a></section></div>`:`<div class="calc-body"><div class="calc-toolbar"><div class="calc-tabs" role="tablist" aria-label="Calculator view"><button role="tab" id="${uid}-calculate-tab" aria-controls="${uid}-calculate" data-calc-tab="calculate">Calculate</button><button role="tab" id="${uid}-graph-tab" aria-controls="${uid}-graph" data-calc-tab="graph">Graph</button></div><label class="calc-angle">Angle mode<select data-calc-angle aria-label="Angle mode"><option value="radians" ${work.angleMode==='radians'?'selected':''}>Radians</option><option value="degrees" ${work.angleMode==='degrees'?'selected':''}>Degrees</option></select></label></div><div data-calc-status class="calc-status" role="status" aria-live="polite"></div><section id="${uid}-calculate" data-calc-panel="calculate" role="tabpanel" aria-labelledby="${uid}-calculate-tab"><form data-calc-form><label class="calc-field">Expression<input type="text" data-calc-expression value="${esc(work.expression)}" maxlength="500" placeholder="2/3 + 1/4" autocomplete="off" spellcheck="false" autocapitalize="off"></label><div class="calc-inline"><label class="calc-field calc-x-field">If using x, set x =<input type="number" data-calc-x value="${esc(work.calcX)}" step="any"></label><button type="submit" class="button">Calculate =</button></div></form><div class="calc-insert" aria-label="Insert math notation">${[['/','Fraction /'],['^','Power ^'],['(','('],[')',')'],['x','x'],['pi','π'],['sqrt(','sqrt('],['sin(','sin(']].map(([value,label])=>`<button type="button" data-calc-insert="${esc(value)}" aria-label="Insert ${esc(label)}">${esc(label)}</button>`).join('')}</div><div class="calc-result" data-calc-result aria-live="polite"></div></section><section id="${uid}-graph" data-calc-panel="graph" role="tabpanel" aria-labelledby="${uid}-graph-tab"><form data-calc-graph-form><div class="calc-graph-inputs">${work.graphInputs.map((expression,i)=>`<label class="calc-graph-field"><span style="color:${colors[i]}">y${['₁','₂','₃'][i]} =</span><input type="text" data-calc-graph-expression="${i}" aria-label="Graph expression ${i+1}" value="${esc(expression)}" maxlength="500" placeholder="${['x^2','sin(x)','1/x'][i]}" autocomplete="off" spellcheck="false" autocapitalize="off"></label>`).join('')}</div><p class="calc-hint">Enter the expression after y =. Leave unused lines empty.</p><div class="calc-graph-actions"><button type="submit" class="button">Plot graphs</button><button type="button" class="button secondary small" data-calc-clear-graphs>Clear graphs</button><span data-calc-graph-dirty class="calc-hint"></span></div></form><div class="calc-graph-errors" data-calc-graph-errors role="status" aria-live="polite"></div><div class="calc-legend" data-calc-legend></div><div class="calc-canvas" data-calc-canvas><svg role="img" aria-label="Graph window. Plot an expression to begin."></svg></div><div class="calc-zoom" aria-label="Graph window controls"><button type="button" data-calc-zoom="0.5" aria-label="Zoom in">+ Zoom in</button><button type="button" data-calc-zoom="2" aria-label="Zoom out">− Zoom out</button><button type="button" data-calc-reset-view>Reset view</button></div><details class="calc-window"><summary>Set the graph window</summary><form data-calc-window-form><div class="calc-window-inputs">${['xmin','xmax','ymin','ymax'].map(key=>`<label>${key[0]} ${key.endsWith('min')?'minimum':'maximum'}<input type="number" step="any" name="${key}" value="${work.window[key]}" required min="-1000000" max="1000000"></label>`).join('')}</div><button class="button secondary small" type="submit">Apply window</button></form></details><section class="calc-probe"><h3>Inspect an input</h3><p>Click the graph or move x below. Read each output in the table.</p><label class="calc-probe-label">Probe x<input type="number" step="any" data-calc-probe-number value="${work.probeX}" min="${work.window.xmin}" max="${work.window.xmax}"></label><input type="range" data-calc-probe-range aria-label="Probe input x slider" min="${work.window.xmin}" max="${work.window.xmax}" step="${(work.window.xmax-work.window.xmin)/400}" value="${work.probeX}"><div class="calc-probe-values" data-calc-probe-values aria-live="polite"></div><div class="calc-table-scroll" tabindex="0" aria-label="Graph input and output table"><table data-calc-table></table></div></section><p class="calc-graph-note" data-calc-graph-note>Graphs use numerical samples. Undefined real outputs leave gaps; zoom in to inspect a small feature.</p></section><details class="calc-guide" data-calc-guide><summary>How to use this calculator</summary><ol><li>Use <code>/</code> for a fraction and <code>^</code> for a power. Group a whole denominator: <code>1/(x + 1)</code>.</li><li>Use <code>*</code> to multiply, or write <code>2x</code> and <code>3(x + 1)</code>. Type <code>pi</code> or <code>π</code> for π.</li><li>Powers happen before a leading minus: <code>-2^2</code> means −4. To square the negative number, enter <code>(-2)^2</code>.</li><li><code>sin</code>, <code>cos</code>, and <code>tan</code> use the selected angle mode. <code>ln(x)</code> is natural log; <code>log(x)</code> is base 10.</li><li>For a graph, enter up to three expressions and choose <strong>Plot graphs</strong>. Use the x probe to connect the curve with numerical values.</li></ol><div class="calc-examples"><button type="button" data-calc-example="fraction"><code>2/3 + 1/4</code><span>Load a fraction calculation</span></button><button type="button" data-calc-example="square"><code>x^2</code><span>Load a parabola in graph line 1</span></button><button type="button" data-calc-example="sine"><code>sin(x)</code><span>Load a sine graph in radians</span></button></div><p>Also available: <code>sqrt(x)</code>, <code>cbrt(x)</code>, <code>abs(x)</code>, <code>exp(x)</code>, <code>asin(x)</code>, <code>acos(x)</code>, <code>atan(x)</code>, and <code>e</code>. Inverse trig outputs use the selected angle mode.</p><p>This calculator evaluates real numbers and draws sampled graphs. Written explanations and algebraic solutions still need mathematical reasoning.</p></details></div>`}`;
    on($('[data-calc-close]'),'click',close);on($('[data-calc-practice]'),'click',close);
    if(context.independentCheck)return;
    bind();showTab(work.tab);renderNumeric();drawGraph();
    if(typeof ResizeObserver!=='undefined'){resizeObserver=new ResizeObserver(()=>{if(dialog.open&&!context.independentCheck)drawGraph();});resizeObserver.observe($('[data-calc-canvas]'));}
  }

  function showTab(tab){
    work.tab=tab==='graph'?'graph':'calculate';
    dialog.querySelectorAll('[data-calc-tab]').forEach(button=>{const selected=button.dataset.calcTab===work.tab;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;});
    dialog.querySelectorAll('[data-calc-panel]').forEach(panel=>panel.hidden=panel.dataset.calcPanel!==work.tab);
    if(work.tab==='graph')drawGraph();
  }
  function bind(){
    dialog.querySelectorAll('[data-calc-tab]').forEach(button=>{on(button,'click',()=>showTab(button.dataset.calcTab));on(button,'keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();showTab(event.key==='Home'?'calculate':event.key==='End'?'graph':work.tab==='graph'?'calculate':'graph');$(`[data-calc-tab="${work.tab}"]`).focus();}});});
    on($('[data-calc-expression]'),'input',event=>{work.expression=event.target.value;});
    on($('[data-calc-x]'),'input',event=>{work.calcX=event.target.value;});
    dialog.querySelectorAll('[data-calc-expression],[data-calc-graph-expression]').forEach(input=>on(input,'focus',()=>lastInput=input));
    on($('[data-calc-form]'),'submit',event=>{event.preventDefault();const source=work.expression,xText=work.calcX;support('calculate',()=>numeric(source,xText));});
    dialog.querySelectorAll('[data-calc-insert]').forEach(button=>on(button,'click',()=>{
      const input=lastInput?.isConnected?lastInput:$('[data-calc-expression]');
      const value=button.dataset.calcInsert;input.setRangeText(value,input.selectionStart??input.value.length,input.selectionEnd??input.value.length,'end');input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();
    }));
    dialog.querySelectorAll('[data-calc-graph-expression]').forEach(input=>on(input,'input',()=>{work.graphInputs[Number(input.dataset.calcGraphExpression)]=input.value;work.graphDirty=true;dirtyStatus();}));
    on($('[data-calc-graph-form]'),'submit',event=>{event.preventDefault();const sources=[...work.graphInputs];support('graph',()=>plot(sources));});
    on($('[data-calc-clear-graphs]'),'click',()=>{work.graphInputs=['','',''];work.curves=[];work.graphErrors=[];work.graphDirty=false;dialog.querySelectorAll('[data-calc-graph-expression]').forEach(input=>input.value='');drawGraph();dirtyStatus();});
    on($('[data-calc-angle]'),'change',event=>{const mode=event.target.value;support('angle_mode',()=>{work.angleMode=mode;if(work.result&&work.result.source===work.expression)numeric(work.expression,work.calcX);resample();drawGraph();});});
    dialog.querySelectorAll('[data-calc-zoom]').forEach(button=>on(button,'click',()=>support('graph_window',()=>changeWindow(zoomWindow(work.window,Number(button.dataset.calcZoom))))));
    on($('[data-calc-reset-view]'),'click',()=>support('graph_window',()=>{work.probeX=1;changeWindow(defaultWindow());}));
    on($('[data-calc-window-form]'),'submit',event=>{event.preventDefault();const fields=new FormData(event.target),bounds=Object.fromEntries([...fields.entries()].map(([key,value])=>[key,Number(value)]));support('graph_window',()=>changeWindow(validateWindow(bounds)));});
    const probe=value=>support('graph_probe',()=>{work.probeX=clamp(value,work.window.xmin,work.window.xmax);drawGraph();});
    on($('[data-calc-probe-number]'),'input',event=>{if(event.target.value!==''&&Number.isFinite(event.target.valueAsNumber))probe(event.target.valueAsNumber);});
    on($('[data-calc-probe-number]'),'change',event=>{if(event.target.value!==''&&Number.isFinite(event.target.valueAsNumber)){const x=clamp(event.target.valueAsNumber,work.window.xmin,work.window.xmax);event.target.value=x;probe(x);}else event.target.value=work.probeX;});
    on($('[data-calc-probe-range]'),'input',event=>probe(event.target.valueAsNumber));
    on($('[data-calc-canvas] svg'),'pointerdown',event=>{
      if(!work.curves.length)return;const svg=event.currentTarget,rect=svg.getBoundingClientRect(),size=geometry(),px=(event.clientX-rect.left)/rect.width*size.svgWidth;
      if(px<size.left||px>size.left+size.width)return;probe(graphTransform(work.window,size).input(px));
    });
    on($('[data-calc-guide]'),'toggle',event=>{if(event.target.open)support('how_to',()=>{});});
    dialog.querySelectorAll('[data-calc-example]').forEach(button=>on(button,'click',()=>support('example',()=>{
      if(button.dataset.calcExample==='fraction'){work.expression='2/3 + 1/4';$('[data-calc-expression]').value=work.expression;work.result=null;work.error='';showTab('calculate');renderNumeric();$('[data-calc-expression]').focus();status('Example loaded. Choose Calculate = to evaluate it.');}
      else{work.graphInputs[0]=button.dataset.calcExample==='square'?'x^2':'sin(x)';$('[data-calc-graph-expression="0"]').value=work.graphInputs[0];work.graphDirty=true;if(button.dataset.calcExample==='sine'){work.angleMode='radians';$('[data-calc-angle]').value='radians';resample();}showTab('graph');dirtyStatus();$('[data-calc-graph-expression="0"]').focus();status('Example loaded into line 1. Choose Plot graphs to draw it.');}
    })));
  }

  function numeric(source,xText){
    try{
      const ast=parseExpression(source),usesX=hasVariable(ast),x=usesX&&String(xText).trim()===''?NaN:Number(xText||0);
      if(!Number.isFinite(x))throw new CalculatorError('Enter a finite value for x.','range');
      const result=calculate(source,{x,angleMode:work.angleMode});work.result={...result,source,x,angleMode:work.angleMode};work.error='';
    }catch(error){work.result=null;work.error=error.message||'This expression could not be evaluated.';}
    renderNumeric();
  }
  function renderNumeric(){
    const target=$('[data-calc-result]');if(!target)return;
    const r=work.result;
    target.innerHTML=work.error?`<p class="calc-error">${esc(work.error)}</p>`:r?`<div><span class="calc-kicker">${r.fraction?'RESULT':'NUMERICAL RESULT'}</span><p class="calc-result-source">${esc(r.source)}${r.hasX?` at x = ${esc(fmt(r.x))}`:''}</p><strong class="calc-result-value">${r.fraction?.denominator!=='1'?'≈ ':''}${esc(r.display)}</strong>${r.fraction&&r.fraction.display!==r.display?`<p class="calc-exact">Exact arithmetic: <strong>${esc(r.fraction.display)}</strong></p>`:''}<p class="calc-hint">${esc(r.angleMode==='degrees'?'Degree':'Radian')} angle mode · decimal output is rounded.</p></div>`:`<p class="calc-empty">Enter a calculation, then choose <strong>Calculate =</strong>. You can use fractions, powers, parentheses, and functions.</p>`;
  }
  function plot(sources){
    work.curves=[];work.graphErrors=[];
    sources.forEach((source,i)=>{
      if(!source.trim())return;
      try{const ast=parseExpression(source);work.curves.push({source,index:i,ast,plot:sampleGraph(ast,work.window,{angleMode:work.angleMode})});}
      catch(error){work.graphErrors.push(`Line ${i+1}: ${error.message}`);}
    });
    if(!sources.some(source=>source.trim()))work.graphErrors.push('Enter at least one expression, such as x^2.');
    work.graphDirty=sources.some((source,i)=>source!==work.graphInputs[i]);drawGraph();dirtyStatus();
  }
  function resample(){for(const curve of work.curves)curve.plot=sampleGraph(curve.ast,work.window,{angleMode:work.angleMode});}
  function changeWindow(window){
    work.window=validateWindow(window);work.probeX=clamp(work.probeX,window.xmin,window.xmax);resample();
    for(const key of ['xmin','xmax','ymin','ymax']){const input=$(`[data-calc-window-form] [name="${key}"]`);if(input)input.value=window[key];}
    drawGraph();
  }
  function dirtyStatus(){const node=$('[data-calc-graph-dirty]');if(node)node.textContent=work.graphDirty?'Unplotted changes':'';}
  function geometry(){
    const svgWidth=Math.max(280,$('[data-calc-canvas]')?.clientWidth||500);
    return {svgWidth,svgHeight:300,left:48,top:20,width:svgWidth-66,height:230};
  }
  function drawGraph(){
    if(context.independentCheck||!$('[data-calc-canvas]'))return;
    const size=geometry(),t=graphTransform(work.window,size),w=work.window,svg=$('[data-calc-canvas] svg');
    svg.setAttribute('viewBox',`0 0 ${size.svgWidth} ${size.svgHeight}`);
    const text=(x,y,value,fill='#738270',anchor='middle',fontSize=11)=>`<text x="${x}" y="${y}" fill="${fill}" text-anchor="${anchor}" font-size="${fontSize}" font-family="Segoe UI,system-ui,sans-serif">${esc(value)}</text>`;
    let drawing=`<title>Graphs in ${esc(work.angleMode)} angle mode</title><desc>${esc(work.curves.length?work.curves.map(c=>`Line ${c.index+1}: ${c.source}`).join('. '):'Plot an expression to draw its graph.')} Inputs from ${fmt(w.xmin)} to ${fmt(w.xmax)}; outputs from ${fmt(w.ymin)} to ${fmt(w.ymax)}.</desc><defs><clipPath id="${uid}-clip"><rect x="${size.left}" y="${size.top}" width="${size.width}" height="${size.height}"/></clipPath></defs>`;
    for(const x of graphTicks(w.xmin,w.xmax,size.svgWidth<400?4:6)){const px=t.x(x);drawing+=`<line x1="${px}" y1="${size.top}" x2="${px}" y2="${size.top+size.height}" stroke="${x===0?'#aabb9c':'#e4ebde'}" stroke-width="${x===0?1.5:1}"/>`+text(px,size.top+size.height+21,fmt(x,5));}
    for(const y of graphTicks(w.ymin,w.ymax,5)){const py=t.y(y);drawing+=`<line x1="${size.left}" y1="${py}" x2="${size.left+size.width}" y2="${py}" stroke="${y===0?'#aabb9c':'#e4ebde'}" stroke-width="${y===0?1.5:1}"/>`+text(size.left-9,py+4,fmt(y,5),'#738270','end');}
    drawing+=`<rect x="${size.left}" y="${size.top}" width="${size.width}" height="${size.height}" fill="none" stroke="#c9d5bf"/>`+text(size.left+size.width,size.svgHeight-13,'x','#4f6c44','end',12)+text(16,14,'y','#4f6c44','start',12);
    if(!work.curves.length)drawing+=text(size.left+size.width/2,size.top+size.height/2,'Plot an expression to begin.','#87917e','middle',12);
    const trace=[];
    drawing+=`<g clip-path="url(#${uid}-clip)">`;
    for(const curve of work.curves){
      const d=curve.plot.segments.map(([a,b])=>`M${t.x(a.x).toFixed(2)},${t.y(a.y).toFixed(2)}L${t.x(b.x).toFixed(2)},${t.y(b.y).toFixed(2)}`).join('');
      drawing+=`<path d="${d}" fill="none" stroke="${colors[curve.index]}" stroke-width="2.4" ${curve.index===1?'stroke-dasharray="7 3"':curve.index===2?'stroke-dasharray="2 3"':''} stroke-linecap="round"/>`;
      for(const hole of curve.plot.holes)drawing+=`<circle cx="${t.x(hole.x)}" cy="${t.y(hole.y)}" r="4.7" fill="#fbfdf8" stroke="${colors[curve.index]}" stroke-width="2"/>`;
      const value=valueAt(curve.ast,work.probeX,work.angleMode);trace.push({...value,curve});
    }
    if(work.curves.length)drawing+=`<line x1="${t.x(work.probeX)}" y1="${size.top}" x2="${t.x(work.probeX)}" y2="${size.top+size.height}" stroke="#405d38" stroke-dasharray="4 4" stroke-width="1"/>`;
    for(const item of trace)if(item.defined&&item.value>=w.ymin&&item.value<=w.ymax)drawing+=`<circle cx="${t.x(work.probeX)}" cy="${t.y(item.value)}" r="4" fill="white" stroke="${colors[item.curve.index]}" stroke-width="2.5"/>`;
    drawing+='</g>';svg.innerHTML=drawing;svg.setAttribute('aria-label',`Graph window in ${work.angleMode}. ${work.curves.length?trace.map(item=>`Line ${item.curve.index+1} at x ${fmt(work.probeX)}: ${item.defined?fmt(item.value):'undefined'}`).join('. '):'No graphs plotted yet.'}`);
    $('[data-calc-legend]').innerHTML=work.curves.map(curve=>`<div><span class="calc-line-key calc-line-${curve.index}" style="--calc-line:${colors[curve.index]}" aria-hidden="true"></span><span><strong>y${['₁','₂','₃'][curve.index]} =</strong> ${esc(curve.source)}</span></div>`).join('');
    $('[data-calc-graph-errors]').innerHTML=work.graphErrors.map(error=>`<p>${esc(error)}</p>`).join('');
    $('[data-calc-probe-values]').innerHTML=trace.map(item=>`<p><strong style="color:${colors[item.curve.index]}">y${['₁','₂','₃'][item.curve.index]}</strong><span>${item.defined?esc(fmt(item.value)):esc(item.reason||'undefined')}</span></p>`).join('');
    for(const selector of ['[data-calc-probe-number]','[data-calc-probe-range]']){const input=$(selector);input.min=w.xmin;input.max=w.xmax;if(input.type==='range')input.step=(w.xmax-w.xmin)/400;if(document.activeElement!==input)input.value=work.probeX;}
    const step=(w.xmax-w.xmin)/20,xs=[...new Set([-2,-1,0,1,2].map(k=>Number(clamp(work.probeX+k*step,w.xmin,w.xmax).toPrecision(12))))];
    $('[data-calc-table]').innerHTML=work.curves.length?`<caption>Sample outputs near x = ${esc(fmt(work.probeX))}</caption><thead><tr><th scope="col">x</th>${work.curves.map(curve=>`<th scope="col">y${['₁','₂','₃'][curve.index]}</th>`).join('')}</tr></thead><tbody>${xs.map(x=>`<tr ${Math.abs(x-work.probeX)<step*1e-8?'class="calc-current-row"':''}><th scope="row">${esc(fmt(x))}</th>${work.curves.map(curve=>{const result=valueAt(curve.ast,x,work.angleMode);return `<td ${!result.defined?`title="${esc(result.reason||'undefined')}"`:''}>${result.defined?esc(fmt(result.value)):'undefined'}</td>`;}).join('')}</tr>`).join('')}</tbody>`:'';
    $('[data-calc-graph-note]').textContent=(work.curves.some(curve=>curve.plot.limited)?'This expression reached the graph detail limit. Narrow the window to inspect it. ':'')+'Graphs use numerical samples; small features can be missed. Undefined real outputs leave gaps. Readouts are rounded.';
    dirtyStatus();
  }

  function setContext(next={}){
    if(destroyed)return;
    const profileId=next.profileId===undefined?context.profileId:next.profileId??null;
    if(profileId!==context.profileId)work=initialWork();
    const topicId=typeof next.topicId==='string'&&next.topicId?next.topicId:null;
    const suppliedHref=typeof next.practiceHref==='string'&&next.practiceHref.startsWith('#')?next.practiceHref:null;
    context={topicId,title:typeof next.title==='string'&&next.title?next.title:'Math calculator',profileId,independentCheck:next.independentCheck===true,practiceHref:suppliedHref||(topicId?'#watch/'+encodeURIComponent(topicId)+'/practice':'#lab')};
    contextVersion++;supportPromise=null;render();
  }
  function open(next){
    if(destroyed)return;if(next)setContext(next);else if(!dialog.childElementCount)render();
    if(!dialog.open){returnFocus=document.activeElement;dialog.showModal();}
    if(!context.independentCheck){drawGraph();(work.tab==='graph'?$('[data-calc-graph-expression="0"]'):$('[data-calc-expression]'))?.focus();}else $('[data-calc-practice]')?.focus();
  }
  function close(){if(!dialog.open)return;dialog.close();if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});}
  function destroy(){if(destroyed)return;destroyed=true;contextVersion++;resizeObserver?.disconnect();events.abort();if(dialog.open)dialog.close();dialog.remove();work=initialWork();}
  return {open,close,setContext,destroy};
}
