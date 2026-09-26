// Mounted-handler regression tests with a small DOM fixture. No browser or
// learner storage is used; root integration QA verifies actual layout/history.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {mountAILearning} from '../ai-learning.js';
import {AI_STAGES} from '../ai-math.js';

const content=JSON.parse(await readFile(new URL('../ai-learning-path.json',import.meta.url),'utf8'));
let checks=0;
const equal=(a,b,message)=>{assert.deepEqual(a,b,message);checks++;};
const ok=(a,message)=>{assert.ok(a,message);checks++;};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const decode=text=>text.replace(/&(?:amp|lt|gt|quot|#39);/g,x=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'"}[x]));

class Element{
 constructor(document){this.ownerDocument=document;this.isConnected=true;this.dataset={};this.attributes={};this.listeners=new Map();this.nodes=new Map();this._html='';this._text='';this._value='';this.hidden=false;this.inert=false;this.disabled=false;this.classList={add:()=>{},remove:()=>{}};}
 set innerHTML(value){this._html=value;this._text='';this.onHTML?.(value);}
 get innerHTML(){return this._html;}
 set textContent(value){this._text=String(value);this._html=String(value);}
 get textContent(){return this._text;}
 set value(value){this._value=String(value);}
 get value(){return this._value;}
 setAttribute(key,value){this.attributes[key]=String(value);}
 removeAttribute(key){delete this.attributes[key];}
 addEventListener(type,callback,{signal}={}){if(!this.listeners.has(type))this.listeners.set(type,[]);this.listeners.get(type).push({callback,signal});}
 emit(type,extra={}){const event={target:this,preventDefault(){this.defaultPrevented=true;},...extra};for(const entry of this.listeners.get(type)||[])if(!entry.signal?.aborted)entry.callback(event);}
 querySelector(selector){return this.nodes.get(selector)||null;}
 querySelectorAll(){return [];}
 matches(selector){const key=selector.match(/^\[data-ai-(stage-select|stage|choice|action)\]$/)?.[1];return key?Object.hasOwn(this.dataset,{'stage-select':'aiStageSelect',stage:'aiStage',choice:'aiChoice',action:'aiAction'}[key]):false;}
 closest(selector){return this.matches(selector)?this:null;}
 contains(node){return node?.ownerDocument===this.ownerDocument;}
 focus(){this.ownerDocument.activeElement=this;}
 select(){}
 scrollIntoView(){}
 remove(){this.isConnected=false;}
}
function fixture(){
 const document={activeElement:null},view=new Element(document);document.defaultView=view;
 const host=new Element(document),shell=new Element(document),stage=new Element(document),nav=new Element(document),status=new Element(document),saveStatus=new Element(document),retry=new Element(document);
 host.querySelector=selector=>selector==='.ai-learning'?shell:null;
 shell.nodes.set('.ai-stage-host',stage);shell.nodes.set('.ai-stage-nav',nav);shell.nodes.set('.ai-status',status);shell.nodes.set('.ai-save-status',saveStatus);shell.nodes.set('[data-ai-action="retry"]',retry);
 for(const selector of ['.ai-copy-fallback','.ai-foundations']){const node=new Element(document);node.nodes.set('summary',new Element(document));shell.nodes.set(selector,node);}
 nav.onHTML=html=>{const select=new Element(document);select.dataset.aiStageSelect='';select.value=html.match(/<option value="([^"]+)" selected/)?.[1]||'';nav.nodes.set('[data-ai-stage-select]',select);};
 nav.querySelectorAll=selector=>selector==='button, select'?[nav.querySelector('[data-ai-stage-select]')].filter(Boolean):[];
 let inputs=[],choices=[],actions=new Map();
 stage.onHTML=html=>{
  stage.nodes.clear();inputs=[];choices=[];actions=new Map();
  if(!html.includes('class="ai-stage"'))return;
  for(const selector of ['.ai-stage-heading h1','.ai-canvas','.ai-scene-toolbar','.ai-data-details>summary','.ai-probe-label','.ai-equation','.ai-live-readout','.ai-data-table','.ai-history','.ai-training-history','.ai-update-detail','.ai-choice-feedback'])stage.nodes.set(selector,new Element(document));
  for(const match of html.matchAll(/<input\b[^>]*data-ai-control="([^"]+)"[^>]*value="([^"]+)"/g)){const input=new Element(document);input.dataset.aiControl=match[1];input.value=match[2];inputs.push(input);stage.nodes.set(`[data-ai-control="${match[1]}"]`,input);}
  for(const match of html.matchAll(/data-ai-output="([^"]+)"/g))stage.nodes.set(`[data-ai-output="${match[1]}"]`,new Element(document));
  const sample=new Element(document);sample.dataset.aiControl='sample';sample.value=html.match(/<option value="([^"]+)" selected/)?.[1]||'R1';stage.nodes.set('[data-ai-control="sample"]',sample);
  const note=new Element(document);note.dataset.aiControl='note';note.value=decode(html.match(/<textarea[^>]*data-ai-control="note"[^>]*>([\s\S]*?)<\/textarea>/)?.[1]||'');stage.nodes.set('[data-ai-control="note"]',note);
  for(const match of html.matchAll(/data-ai-choice="(\d+)"/g)){const choice=new Element(document);choice.dataset.aiChoice=match[1];choices.push(choice);}
  for(const match of html.matchAll(/data-ai-action="([^"]+)"/g)){const button=new Element(document);button.dataset.aiAction=match[1];actions.set(match[1],button);}
 };
 stage.querySelectorAll=selector=>selector==='input[data-ai-control]'?inputs:selector==='[data-ai-choice]'?choices:[];
 const action=name=>{const button=actions.get(name)||new Element(document);button.dataset.aiAction=name;return button;};
 return {host,shell,stage,nav,status,saveStatus,view,document,action,choices:()=>choices,selector:()=>nav.querySelector('[data-ai-stage-select]')};
}
function create(options={}){
 const dom=fixture(),saves=[],supports=[],stages=[],context={profileId:'qa-only'};
 const dispose=mountAILearning(dom.host,{content,getContext:()=>context,onSave:(draft,flags)=>{saves.push({draft,flags});return Promise.resolve({saved:true});},onSupport:async event=>{supports.push(event);},onStageChange:event=>stages.push(event),...options});
 return {...dom,dispose,saves,supports,stages,context};
}
const switchTo=async (ui,id)=>{const select=ui.selector();select.value=id;ui.shell.emit('change',{target:select});await tick();};
const input=async (ui,key,value)=>{const field=ui.stage.querySelector(`[data-ai-control="${key}"]`);assert.ok(field,`Missing ${key}`);field.value=value;ui.shell.emit('input',{target:field});await tick();};
const click=async (ui,name)=>{ui.shell.emit('click',{target:ui.action(name)});await tick();};

let ui=create();await tick();
equal(ui.selector().value,'features');ok(!ui.host.innerHTML.includes('ai-hero'));ok(!ui.nav.innerHTML.includes('<button'));equal((ui.nav.innerHTML.match(/<option /g)||[]).length,7);
for(const id of AI_STAGES){
 await switchTo(ui,id);const html=ui.stage.innerHTML;
 equal(ui.selector().value,id);equal(ui.stages.at(-1).stageId,id);equal((html.match(/<h1\b/g)||[]).length,1);
 ok(html.indexOf('class="ai-canvas"')<html.indexOf('class="ai-controls"'),'The diagram precedes controls');ok(!html.includes('<aside'));
 for(const cls of ['ai-worked','ai-prediction','ai-try','ai-prerequisites'])ok(html.includes(`<details class="${cls}">`),`${id}: optional ${cls}`);
 const defaultView=html.replace(/<details\b[\s\S]*?<\/details>/g,'');
 equal((defaultView.match(/type="range"/g)||[]).length,1,`${id}: one visible control`);
 equal((defaultView.match(/class="button"/g)||[]).length,1,`${id}: one primary action`);
 ok(!defaultView.includes('data-ai-choice'));ok(!defaultView.includes('data-ai-control="note"'));
 ok(ui.stage.querySelector('.ai-canvas').innerHTML.includes('<svg'));ok(ui.stage.querySelector('.ai-equation').textContent.length>10);
 ok(ui.stage.querySelector('.ai-data-table').innerHTML.includes('<table>'));equal(ui.stage.inert,false);
 equal(ui.document.activeElement,ui.stage.querySelector('.ai-stage-heading h1'),'Focus follows successful stage changes');
}
equal(ui.supports.length,7);ok(ui.supports.every(event=>event.profileId==='qa-only'&&event.topicId&&event.topicIds.length>1));
await switchTo(ui,'gradients');
const beforeEquation=ui.stage.querySelector('.ai-equation').textContent;await click(ui,'train-ten');
ok(ui.stage.querySelector('.ai-update-detail').innerHTML.includes('10 actual updates'));ok(ui.stage.querySelector('.ai-update-detail').innerHTML.includes('0.26715 → 0.04988'));ok(ui.stage.querySelector('.ai-equation').textContent!==beforeEquation);equal(ui.stage.querySelector('.ai-training-history').hidden,false);
await input(ui,'note','The gradient averages the effects on all eight rows.');
await switchTo(ui,'features');await switchTo(ui,'gradients');equal(ui.stage.querySelector('[data-ai-control="note"]').value,'The gradient averages the effects on all eight rows.');
ok(ui.stage.querySelector('.ai-live-readout').innerHTML.includes('0.04988'),'Training parameters survive stage navigation');
ui.view.emit('pagehide');await tick();
ok(ui.saves.length>0);equal(ui.saves.at(-1).flags,{flush:true,reason:'pagehide'});equal(ui.saves.at(-1).draft.notes.gradients,'The gradient averages the effects on all eight rows.');equal(ui.saves.at(-1).draft.models.linear.steps,10);
const savesBefore=ui.saves.length;ui.view.emit('pagehide');await tick();equal(ui.saves.length,savesBefore,'Repeated pagehide does not duplicate the same draft');
ui.context.independentCheck=true;ui.host.emit('ai-learning-context');ok(ui.stage.innerHTML.includes('Return to practice'));equal(ui.selector().disabled,true);ui.dispose();

// The dropdown resets after failure, and Try again can retry even the initially
// selected stage without requiring the learner to visit an unrelated one.
let fail=true,supportCount=0;
ui=create({onSupport:async()=>{supportCount++;if(fail)throw new Error('temporary <failure>');}});await tick();
ok(ui.status.innerHTML.includes('data-ai-action="retry-stage"'));ok(ui.status.innerHTML.includes('&lt;failure&gt;'));equal(ui.stage.inert,false);equal(ui.selector().value,'features');
fail=false;await click(ui,'retry-stage');equal(supportCount,2);ok(ui.stage.innerHTML.includes('Turn a patch into numbers'));equal(ui.selector().value,'features');ui.dispose();await tick();

// A delayed response from an earlier selection cannot overwrite the newer one.
const pending=new Map();
ui=create({onSupport:event=>event.stageId==='features'?Promise.resolve():new Promise((resolve,reject)=>pending.set(event.stageId,{resolve,reject}))});await tick();
await switchTo(ui,'weighted-sum');equal(ui.stage.inert,true);
await switchTo(ui,'probability');pending.get('probability').resolve();await tick();equal(ui.selector().value,'probability');ok(ui.stage.innerHTML.includes('Turn a score into a classifier probability'));equal(ui.stage.inert,false);
pending.get('weighted-sum').resolve();await tick();equal(ui.selector().value,'probability');ok(ui.stage.innerHTML.includes('Turn a score into a classifier probability'));
ui.dispose();await tick();

// A profile change while assistance permission is pending cannot reveal the
// awaited teaching in the new context or persist it as a visited stage.
let approve;
ui=create({onSupport:event=>event.stageId==='features'?Promise.resolve():new Promise(resolve=>{approve=resolve;})});await tick();
await switchTo(ui,'network');ui.context.profileId='other-qa-only';ui.host.emit('ai-learning-context');approve();await tick();
ok(ui.stage.innerHTML.includes('Return to practice'));equal(ui.stages.at(-1).stageId,'features');equal(ui.stage.inert,false,'The return link remains usable when a pending stage is interrupted');
ui.dispose();await tick();ok(ui.saves.every(item=>!item.draft.visited.includes('network')));

console.log(`AI simplified UI: ${checks} mounted-handler and markup checks passed (7 stages, compact navigation, sequential layout, training, saved notes, support races and profile guards).`);
