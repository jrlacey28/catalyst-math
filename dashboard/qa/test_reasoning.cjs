/* Node-only regression tests: no browser, learner API, or student state.
 * The small DOM fixture exercises real mounted handlers, not visual layout.
 * Root integration QA covers actual keyboard focus, history and mobile layout.
 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
let checks=0;
const equal=(a,b,message)=>{assert.deepEqual(a,b,message);checks++;};
const ok=(value,message)=>{assert.ok(value,message);checks++;};
const close=(a,b,tolerance=1e-10)=>ok(Number.isFinite(a)&&Math.abs(a-b)<tolerance,`${a} != ${b}`);
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const source=fs.readFileSync(path.join(__dirname,'../reasoning.js'),'utf8');
const testedSource=source+'\nexport {reasoningView,createFlow,changeFlow,directoryHTML,flowHTML,guideHTML,liveHTML};';
const codeURL='data:text/javascript;base64,'+Buffer.from(testedSource).toString('base64');

class NodeFixture{
 constructor(html='',attrs={}){this.attrs=attrs;this.dataset={};this.listeners=new Map();this._html=html;this._value='';this.textContent='';this.disabled=false;this.classes=new Set();this.classList={toggle:(name,value)=>value?this.classes.add(name):this.classes.delete(name)};}
 set innerHTML(html){this._html=html;this.onHTML?.(html);}
 get innerHTML(){return this._html;}
 set value(value){this._value=String(value);}
 get value(){return this._value;}
 setAttribute(key,value){this.attrs[key]=String(value);}
 addEventListener(type,callback,{signal}={}){const entry={callback,signal};if(!this.listeners.has(type))this.listeners.set(type,[]);this.listeners.get(type).push(entry);}
 emit(type,extra={}){if(type==='click'&&this.disabled)return;const event={target:this,key:'',shiftKey:false,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},...extra};for(const entry of this.listeners.get(type)||[])if(!entry.signal?.aborted)entry.callback(event);return event;}
 focus(){global.document.activeElement=this;}
 closest(selector){return selector==='[data-rw-handle]'&&this.dataset.rwHandle?this:null;}
}
function mountedHost(){
 const host=new NodeFixture(),base=new Map(),flow=new Map();let choices=[],links=[],inputs=[];
 const nodeFor=(map,key)=>{const n=new NodeFixture();map.set(key,n);return n;};
 const button=(html,attribute,map)=>{
  const re=new RegExp('<button\\b([^>]*\\b'+attribute+'(?:=[^ >]*)?[^>]*)>');
  const match=html.match(re);if(!match)return null;const node=nodeFor(map,'['+attribute+']');node.disabled=/\sdisabled(?:\s|$)/.test(match[1]);return node;
 };
 host.onHTML=html=>{
  base.clear();flow.clear();links=[];choices=[];inputs=[];
  if(html.includes('rw-directory'))for(const match of html.matchAll(/data-rw-path="([^"]+)" href="([^"]+)"/g)){const n=new NodeFixture();n.dataset.rwPath=match[1];n.attrs.href=match[2];links.push(n);}
  if(html.includes('rw-guide')){
   for(const attr of ['data-rw-example','data-rw-goal','data-rw-help','data-rw-copy-status','data-rw-copy'])nodeFor(base,'['+attr+']');
   nodeFor(base,'[data-rw-flow]').onHTML=screen=>{
    flow.clear();choices=[];nodeFor(flow,'[data-rw-focus]');
    for(const attr of ['data-rw-next','data-rw-previous','data-rw-restart','data-rw-next-example'])button(screen,attr,flow);
    if(screen.includes('data-rw-feedback'))nodeFor(flow,'[data-rw-feedback]');
    for(const match of screen.matchAll(/data-rw-answer="(\d+)"[^>]*aria-pressed="(true|false)"/g)){const n=new NodeFixture();n.dataset.rwAnswer=match[1];n.attrs['aria-pressed']=match[2];choices.push(n);}
   };
  }
  if(html.includes('rw-comparison')){
   for(const attr of ['data-rw-hole','data-rw-live-equation','data-rw-original','data-rw-extended','data-rw-live-status'])nodeFor(base,'['+attr+']');
   const board=nodeFor(base,'.rw-live-board svg');board.setPointerCapture=()=>{};
   board.onHTML=graph=>{for(const match of graph.matchAll(/aria-valuenow="([^"]+)" data-rw-handle="(x|a)"/g)){const n=nodeFor(base,`[data-rw-handle="${match[2]}"]`);n.dataset.rwHandle=match[2];n.attrs['aria-valuenow']=match[1];}};
   for(const key of ['a','x'])for(const kind of ['number','range']){const n=new NodeFixture();n.dataset.rwLive=key;n.kind=kind;n.min=key==='a'?'-2':'-4';n.max=key==='a'?'2':'4';n.value=key==='a'?'1':'3';inputs.push(n);}
  }
 };
 host.querySelector=selector=>base.get(selector)||flow.get(selector)||null;
 host.querySelectorAll=selector=>selector==='[data-rw-path]'?links:selector==='[data-rw-answer]'?choices:selector==='[data-rw-live]'?inputs:[];
 host.replaceChildren=()=>{host.innerHTML='';};
 return host;
}
(async()=>{
 global.document={activeElement:null};
 const {reasoningCatalog:catalog,reasoningPaths,mountReasoning,reasoningView,createFlow,changeFlow,directoryHTML,flowHTML,guideHTML,liveHTML}=await import(codeURL);
 equal(typeof mountReasoning,'function');equal(catalog.length,9);equal(catalog.reduce((n,p)=>n+p.examples.length,0),19);
 equal(Object.keys(reasoningPaths),catalog.map(p=>p.id));
 equal(reasoningView().kind,'directory');equal(reasoningView({path:''}).kind,'directory');equal(reasoningView({path:'not-a-guide'}).kind,'directory');
 equal(reasoningView({path:'fractions'}).kind,'guide');equal(reasoningView({section:'live'}).path.id,'cancel');
 const directory=directoryHTML();equal((directory.match(/data-rw-path=/g)||[]).length,9);
 ok(!directory.includes('data-rw-expression'));ok(!directory.includes('data-rw-answer'));ok(!directory.includes('<svg'));
 for(const p of catalog)ok(directory.includes(`href="#reasoning/${p.id}"`));
 ok(directoryHTML(true).includes('That guide is not available'));
 let authoredSteps=0;
 for(const p of catalog){
  equal(createFlow(p,Infinity).exampleIndex,0);equal(createFlow(p,-2).exampleIndex,0);equal(createFlow(p,1e5).exampleIndex,p.examples.length-1);
  ok(p.topicId&&p.topicIds.includes(p.topicId));ok(p.prerequisites.length>=2);
  for(const q of [...p.examples.map(e=>e.prediction),p.trap]){
   equal(q.answers.length,3);equal(q.feedback.length,3);ok(q.correct>=0&&q.correct<3);ok(q.feedback.every(f=>f.length>30));
  }
  p.examples.forEach((ex,index)=>{
   let state=createFlow(p,index),previous;
   const shell=guideHTML(p,state,'<script>bad</script>');
   ok(shell.includes('href="#reasoning">← All step guides'));ok(shell.includes('<select'));ok(!shell.includes('class="rw-paths"'));ok(!shell.includes('class="rw-live"'));
   ok(shell.includes('&lt;script&gt;bad&lt;/script&gt;'));ok(!shell.includes('<script>bad'));
   for(const prerequisite of p.prerequisites)ok(shell.includes(`href="#topic/${prerequisite.id}"`));
   for(let i=0;i<ex.steps.length;i++){
    equal(state.phase,'steps');equal(state.step,i);ok(ex.steps[i].why.length>30);ok(ex.steps[i].domain.length>0);
    const html=flowHTML(p,state);equal((html.match(/data-rw-expression/g)||[]).length,1);ok(html.includes('data-rw-domain'));ok(!html.includes('data-rw-answer'));ok(!html.includes('<svg'));ok(!html.includes('rw-paths'));authoredSteps++;
    equal(changeFlow(p,state,{type:'answer',value:0}),state,'A question cannot be answered before it appears');
    previous=JSON.stringify(state);const next=changeFlow(p,state,{type:'next'});equal(JSON.stringify(state),previous,'A transition must not mutate its previous state');state=next;
   }
   equal(state.phase,'prediction');equal(state.step,ex.steps.length-1);
   for(const kind of ['prediction','misconception']){
    equal(state.phase,kind);const q=kind==='prediction'?ex.prediction:p.trap;
    const html=flowHTML(p,state);equal((html.match(/data-rw-answer=/g)||[]).length,3);equal((html.match(/data-rw-feedback=/g)||[]).length,1);ok(!html.includes('data-rw-expression'));
    equal(changeFlow(p,state,{type:'next'}).phase,kind,'The next question waits for an answer');
    for(const bad of [-1,3,NaN,'1',.5])equal(changeFlow(p,state,{type:'answer',value:bad}),state);
    const wrong=(q.correct+1)%3;
    state=changeFlow(p,state,{type:'answer',value:wrong});ok(flowHTML(p,state).includes('Take another look.'));ok(!flowHTML(p,state).includes('rw-answer correct'));
    state=changeFlow(p,state,{type:'answer',value:q.correct});ok(flowHTML(p,state).includes('rw-answer correct'));
    state=changeFlow(p,state,{type:'next'});
   }
   equal(state.phase,'complete');ok(flowHTML(p,state).includes('does not change your lesson-check results'));ok(!flowHTML(p,state).includes('data-rw-answer'));
   equal(changeFlow(p,state,{type:'previous'}).phase,'misconception');
   let reverse=changeFlow(p,changeFlow(p,state,{type:'previous'}),{type:'previous'});equal(reverse.phase,'prediction');
   reverse=changeFlow(p,reverse,{type:'previous'});equal(reverse.phase,'steps');equal(reverse.step,ex.steps.length-1);
   state=changeFlow(p,state,{type:'restart'});equal(state.phase,'steps');equal(state.step,0);
   const reset=changeFlow(p,state,{type:'example',index:0});equal(reset.prediction,null);equal(reset.misconception,null);equal(reset.step,0);
  });
 }
 // Domains remain authored for every applicable line, not only the first card.
 const get=id=>catalog.find(p=>p.id===id);
 ok(get('cancel').examples[0].steps.every(s=>/3/.test(s.domain)));
 ok(get('cancel').examples[1].steps.every(s=>/−2/.test(s.domain)&&/1/.test(s.domain)));
 ok(get('rationalize').examples[1].steps.every(s=>/−1/.test(s.domain)&&/0/.test(s.domain)));
 ok(get('roots').examples[2].steps.every(s=>s.domain.includes('x > 0')));
 ok(get('trig').examples.every(e=>e.steps.every(s=>s.domain.includes('kπ'))));
 ok(get('difference-quotient').examples.every(e=>e.steps.slice(0,-1).every(s=>s.domain.includes('h ≠ 0'))));
 ok(get('chain-rule').examples[1].steps.at(-1).why.includes('x = 0 stays allowed'));
 ok(get('product-rule').examples[1].steps.at(-1).why.includes('x = 0 remains allowed'));
 // Directory mounting is read-only and does not silently teach fractions.
 let notices=[],navigated=[];const directoryHost=mountedHost();
 let dispose=mountReasoning(directoryHost,{onEvent:e=>notices.push(e),onPathChange:id=>navigated.push(id)});
 equal(notices,[]);const fractionLink=directoryHost.querySelectorAll('[data-rw-path]')[0];const navEvent=fractionLink.emit('click');equal(navEvent.defaultPrevented,false);equal(navigated,['fractions']);
 dispose();equal(directoryHost.innerHTML,'');fractionLink.emit('click');equal(navigated,['fractions'],'Disposed links do not call the former host');
 dispose=mountReasoning(directoryHost,{path:'missing',onEvent:e=>notices.push(e)});equal(notices,[]);dispose();
 // Real mounted flow handlers: reveal, answer, back, example switch and copy.
 const host=mountedHost(),copied=[];notices=[];
 dispose=mountReasoning(host,{path:'fractions',onEvent:e=>notices.push(e),onCopy:message=>copied.push(message)});
 const $=selector=>host.querySelector(selector),html=()=> $('[data-rw-flow]').innerHTML;
 equal(notices.map(e=>e.type),['open']);ok(html().includes('Name the pieces'));equal(host.querySelectorAll('[data-rw-answer]').length,0);
 const retiredNext=$('[data-rw-next]');retiredNext.emit('click');ok(html().includes('Multiply by one'));retiredNext.emit('click');ok(html().includes('Multiply by one'),'Retired handler is aborted');
 $('[data-rw-previous]').emit('click');ok(html().includes('Name the pieces'));
 for(let i=0;i<4;i++)$('[data-rw-next]').emit('click');ok(html().includes('Question 1 of 2'));equal($('[data-rw-next]').disabled,true);
 const before=html();$('[data-rw-next]').emit('click');equal(html(),before);
 const wrong=(get('fractions').examples[0].prediction.correct+1)%3;
 host.querySelectorAll('[data-rw-answer]')[wrong].emit('click');ok($('[data-rw-feedback]').innerHTML.includes('Take another look.'));equal($('[data-rw-next]').disabled,false);
 $('[data-rw-help]').value='Why can we multiply by one?';$('[data-rw-help]').emit('input');$('[data-rw-copy]').emit('click');await tick();
 ok(copied[0].includes('Why can we multiply by one?'));ok(copied[0].includes('Current question:'));ok(copied[0].includes('My choice:'));ok(copied[0].includes('Allowed inputs:'));
 $('[data-rw-next]').emit('click');ok(html().includes('Question 2 of 2'));equal(host.querySelectorAll('[data-rw-answer]').length,3);
 host.querySelectorAll('[data-rw-answer]')[get('fractions').trap.correct].emit('click');$('[data-rw-next]').emit('click');ok(html().includes('Example finished'));
 $('[data-rw-next-example]').emit('click');ok(html().includes('Record the restrictions'));equal($('[data-rw-example]').value,'1');equal($('[data-rw-help]').value,'');
 $('[data-rw-example]').value='0';$('[data-rw-example]').emit('change');equal($('[data-rw-help]').value,'Why can we multiply by one?');ok(html().includes('Name the pieces'));
 for(const kind of ['open','reveal','prediction','misconception'])ok(notices.some(e=>e.type===kind));ok(notices.every(e=>e.assisted===true&&e.topicId&&Array.isArray(e.topicIds)));
 const retiredCopy=$('[data-rw-copy]');dispose();equal(host.innerHTML,'');retiredCopy.emit('click');equal(copied.length,1);
 // A late clipboard response cannot update a different step or a disposed view.
 let finishCopy;dispose=mountReasoning(host,{path:'cancel',onCopy:()=>new Promise(resolve=>{finishCopy=resolve;})});
 $('[data-rw-copy]').emit('click');$('[data-rw-next]').emit('click');finishCopy();await tick();equal($('[data-rw-copy-status]').textContent,'');dispose();
 dispose=mountReasoning(host,{path:'cancel',onCopy:()=>Promise.reject(new Error('No clipboard'))});$('[data-rw-help]').value='<img src=x onerror=bad>'; $('[data-rw-help]').emit('input');$('[data-rw-copy]').emit('click');await tick();ok($('[data-rw-copy-status]').innerHTML.includes('&lt;img'));ok(!$('[data-rw-copy-status]').innerHTML.includes('<img'));dispose();
 // The separate comparison remains live, correctly scoped, and keyboard-controlled.
 equal((liveHTML().match(/<svg/g)||[]).length,1);ok(!liveHTML().includes('data-rw-answer'));ok(!liveHTML().includes('class="rw-paths"'));
 notices=[];dispose=mountReasoning(host,{section:'live',onEvent:e=>notices.push(e)});
 equal(notices[0].topicId,'algebra-2.rational-functions');equal($('[data-rw-original]').textContent,'4');equal($('[data-rw-extended]').textContent,'4');
 $('[data-rw-hole]').emit('click');equal($('[data-rw-original]').textContent,'undefined');equal($('[data-rw-extended]').textContent,'2');ok($('[data-rw-live-status]').classes.has('excluded'));
 const board=$('.rw-live-board svg');board.emit('keydown',{key:'ArrowRight',target:$('[data-rw-handle="x"]')});equal($('[data-rw-original]').textContent,'2.1');equal($('[data-rw-extended]').textContent,'2.1');
 equal(global.document.activeElement,$('[data-rw-handle="x"]'));
 board.emit('keydown',{key:'End',target:$('[data-rw-handle="a"]')});equal($('[data-rw-handle="a"]').attrs['aria-valuenow'],'2');
 board.emit('keydown',{key:'Home',target:$('[data-rw-handle="x"]')});equal($('[data-rw-original]').textContent,'-2');
 const aInput=host.querySelectorAll('[data-rw-live]').find(n=>n.kind==='number'&&n.dataset.rwLive==='a');aInput.value='200';aInput.emit('input');equal(aInput.value,'2');
 aInput.value='-2';aInput.emit('input');$('[data-rw-hole]').emit('click');equal($('[data-rw-original]').textContent,'undefined');equal($('[data-rw-extended]').textContent,'-4');
 ok(notices.some(e=>e.type==='explore'));ok(notices.every(e=>e.topicId==='algebra-2.rational-functions'&&e.topicIds.includes('algebra-1.factoring')));dispose();
 // Numeric regressions for curated formulas; these checks are not learner grading.
 for(const x of [-4,-2,-.5,0,.5,2,4]){
  close((x+2)**2,x*x+4*x+4);
  if(x!==3)close((x*x-9)/(x-3),x+3);
  if(x!==-2&&x!==1)close((x*x+5*x+6)/(x*x+x-2),(x+3)/(x-1));
  close(Math.sqrt(x*x*(x-1)**2),Math.abs(x)*Math.abs(x-1));
  if(x>=-1&&x!==0)close((Math.sqrt(x+1)-1)/x,1/(Math.sqrt(x+1)+1));
  close(3*x*x*(x*x+1)**4+8*x**4*(x*x+1)**3,x*x*(x*x+1)**3*(11*x*x+3),1e-8);
 }
 for(const t of [-2,-1,.5,1,2])close((1-Math.cos(t))/Math.sin(t),Math.sin(t)/(1+Math.cos(t)));
 for(const h of [-.1,-.01,.01,.1]){close(((2+h)**2-4)/h,4+h);close((1/(2+h)-1/2)/h,-1/(2*(2+h)));}
 console.log(JSON.stringify({checks,guides:catalog.length,examples:19,workedSteps:authoredSteps,predictions:19,invalidStepQuestions:9,directoryIsReadOnly:true,sequentialQuestions:true,domainRestrictions:true,assistanceCallbacks:true,liveComparisonKeyboardHandlers:true,browserLayout:'Root integration QA; not simulated here'}));
})().catch(error=>{console.error(error);process.exitCode=1;});
