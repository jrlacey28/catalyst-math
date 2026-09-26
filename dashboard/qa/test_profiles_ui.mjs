// Node-only route regression. No browser, server, filesystem state or learner data.
// Run: node dashboard/qa/test_profiles_ui.mjs (from math-tutor).
import assert from 'node:assert/strict';
import {createLearningUI} from '../learning.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const decode=value=>value.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
const attr=(source,key)=>decode(source.match(new RegExp('(?:^|\\s)'+key+'="([^"]*)"'))?.[1]||'');
class Element {
 constructor(panel,attrs=''){this.panel=panel;this.id=attr(attrs,'id');this.name=attr(attrs,'name');this.value=attr(attrs,'value');this.type=attr(attrs,'type');this.disabled=/\bdisabled(?:\s|=|$)/.test(attrs);this.checked=/\bchecked(?:\s|=|$)/.test(attrs);this.textContent='';this.dataset={profile:attr(attrs,'data-profile')};this.events=new Map();this.controls=[];}
 get isConnected(){return this.connected!==false&&this.panel?.connected!==false;}
 addEventListener(type,listener,{signal}={}){const entries=this.events.get(type)||[];entries.push(listener);this.events.set(type,entries);signal?.addEventListener('abort',()=>this.events.set(type,(this.events.get(type)||[]).filter(x=>x!==listener)),{once:true});}
 async emit(type){const event={target:this,preventDefault(){}};return Promise.all((this.events.get(type)||[]).map(fn=>fn(event)));}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 querySelectorAll(selector){if(selector==='button,input,select')return this.controls;if(selector==='[data-profile]')return this.controls.filter(e=>e.dataset.profile);if(selector.startsWith('#'))return this.controls.filter(e=>e.id===selector.slice(1));const name=selector.match(/^\[name=([^\]]+)\]$/)?.[1];return name?this.controls.filter(e=>e.name===name):[];}
}
class DocumentFixture {
 constructor(){this.panel=null;this.header=new Element();this.breadcrumb=new Element();let html='';this.main={get innerHTML(){return html;},set innerHTML(value){html=value;}};const owner=this;Object.defineProperty(this.main,'innerHTML',{get(){return html;},set(value){html=value;owner.mount(value);}});}
 mount(html){
  if(this.panel)this.panel.connected=false;this.panel=null;
  if(!html.includes('id="learning-profiles"'))return;
  const panel=this.panel=new Element();panel.connected=true;panel.id='learning-profiles';
  const controls=markup=>{const result=[];for(const match of markup.matchAll(/<(button|input|select)\b([^>]*?)(?:>([\s\S]*?)<\/\1>|>)/g)){const el=new Element(panel,match[2]);el.tagName=match[1].toUpperCase();if(el.tagName==='SELECT'){const options=[...(match[3]||'').matchAll(/<option\b([^>]*)>/g)];el.value=attr((options.find(m=>/\bselected\b/.test(m[1]))||options[0]||['',''])[1],'value');}result.push(el);}return result;};
  for(const match of html.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/g)){const form=new Element(panel,match[1]);form.controls=controls(match[2]);panel.controls.push(form,...form.controls);}
  const outside=html.replace(/<form\b[^>]*>[\s\S]*?<\/form>/g,'');panel.controls.push(...controls(outside));
  for(const id of ['profile-error','preferences-status']){const note=new Element(panel);note.id=id;panel.controls.push(note);}
 }
 querySelector(selector){if(selector==='#main')return this.main;if(selector==='#profile-top')return this.header;if(selector==='#breadcrumb')return this.breadcrumb;if(selector==='#learning-profiles')return this.panel;return this.panel?.querySelector(selector)||null;}
 querySelectorAll(selector){return this.panel?.querySelectorAll(selector)||[];}
}
class FormDataFixture {
 constructor(form){this.values=new Map(form.controls.filter(e=>e.name&&(!e.disabled)&&(e.type!=='checkbox'||e.checked)).map(e=>[e.name,e.value]));}
 get(key){return this.values.get(key)??null;}
 has(key){return this.values.has(key);}
}
const defer=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const clone=value=>structuredClone(value);
const initial=id=>({profile_id:id,preferences:{starting_course:'arithmetic',pace:'explore',basic_support:false},lessons:{},topics:{},homework:{},topic_sessions:[]});

function setup(){
 const doc=new DocumentFixture();globalThis.document=doc;globalThis.FormData=FormDataFixture;globalThis.location={hash:'profiles'};
 const profiles=[{id:'alpha',name:'Alpha <learner>'},{id:'beta',name:'Beta'}],states={alpha:initial('alpha'),beta:initial('beta')};
 states.alpha.topics.fractions={check_passed:true};
 const fixture={doc,profiles,states,current:'alpha',calls:[],refreshes:0,nextRead:null,nextWrite:null};
 const api=async(path,data,profile)=>{
  fixture.calls.push({path,data:clone(data),profile});
  if(path==='roadmap')return {courses:[{id:'arithmetic',title:'Arithmetic',topics:[]},{id:'calculus-1',title:'Calculus I',topics:[]}]};
  if(path==='health')return {};
  if(path==='profiles'){if(fixture.nextRead){const wait=fixture.nextRead;fixture.nextRead=null;await wait.promise;}return {profiles:clone(profiles),current:clone(profiles.find(p=>p.id===fixture.current)),local_only:true};}
  if(fixture.nextWrite){const wait=fixture.nextWrite;fixture.nextWrite=null;await wait.promise;}
  if(path==='preferences'){if(profile!==fixture.current)throw Error('The learning space changed. Copy unsaved work, then reload.');Object.assign(states[fixture.current].preferences,data);return {preferences:clone(states[fixture.current].preferences),mastery_changed:false};}
  if(path==='profiles/create'){if(profiles.some(p=>p.id===data.id))throw Error('That learner ID is already in use.');profiles.push(clone(data));states[data.id]=initial(data.id);fixture.current=data.id;}
  else if(path==='profiles/select')fixture.current=data.id;
  else throw Error('Unexpected API path: '+path);
  return {current:clone(profiles.find(p=>p.id===fixture.current)),progress:clone(states[fixture.current]),local_only:true};
 };
 const ui=createLearningUI({api,esc,toast:message=>{throw Error('Unexpected toast: '+message);},copy:()=>{},refresh:async()=>{
  fixture.refreshes++;if(location.hash==='profiles')await ui.render('profiles',null,null,clone(states[fixture.current]));else{ui.cancel();doc.main.innerHTML='<h1>'+esc(location.hash)+'</h1>';}
 }});
 fixture.ui=ui;fixture.open=async()=>{location.hash='profiles';await ui.render('profiles',null,null,clone(states[fixture.current]));};
 fixture.form=id=>doc.querySelector('#'+id);fixture.set=(form,name,value)=>{const field=fixture.form(form).querySelector('[name='+name+']');if(field.type==='checkbox')field.checked=value;else field.value=value;};
 return fixture;
}
let checks=0;
const passed=message=>{checks++;console.log('PASS '+message);};

const f=setup();await f.ui.load();await f.open();
assert.match(f.doc.main.innerHTML,/Learners &amp; settings|Learners & settings/);
assert.match(f.doc.main.innerHTML,/Alpha &lt;learner&gt;/);assert(!f.doc.main.innerHTML.includes('Alpha <learner>'));
assert.equal(f.doc.header.textContent,'Alpha <learner>');assert.equal(f.doc.breadcrumb.textContent,'Learning spaces');
assert.equal(f.form('preferences').querySelector('[name=pace]').value,'explore');
assert.equal(f.doc.panel.querySelectorAll('[data-profile]').find(e=>e.dataset.profile==='alpha').disabled,true);
assert.equal(f.calls.filter(c=>c.data!==undefined).length,0);
passed('The real profiles route renders fresh learners and saved settings without a missing function or mutation.');

const evidence=clone(f.states.alpha.topics);f.set('preferences','starting_course','calculus-1');f.set('preferences','pace','steady');f.set('preferences','basic_support',true);
await f.form('preferences').emit('submit');
assert.deepEqual(f.calls.at(-1),{path:'preferences',data:{starting_course:'calculus-1',pace:'steady',basic_support:true},profile:'alpha'});
assert.deepEqual(f.states.alpha.topics,evidence);assert.match(f.form('preferences-status').textContent,/Saved/);
passed('Preference writes use the displayed profile and do not award or erase evidence.');

f.set('new-profile','id','gamma');f.set('new-profile','name','Gamma');const form=f.form('new-profile'),gate=defer();f.nextWrite=gate;
const creation=form.emit('submit');await form.emit('submit');assert.equal(f.calls.filter(c=>c.path==='profiles/create').length,1);gate.resolve();await creation;
assert.equal(f.current,'gamma');assert.deepEqual(f.states.gamma.topics,{});assert.deepEqual(f.states.alpha.topics,evidence);assert.equal(f.doc.header.textContent,'Gamma');assert.equal(f.refreshes,1);
passed('Creating a learner selects an empty profile and suppresses duplicate submits.');

f.set('new-profile','id','alpha');f.set('new-profile','name','Keep this name');await f.form('new-profile').emit('submit');
assert.match(f.form('profile-error').textContent,/already in use/);assert.equal(f.form('new-profile').querySelector('[name=name]').value,'Keep this name');
assert.equal(f.form('new-profile').controls.find(e=>e.tagName==='BUTTON').disabled,false);
passed('Creation errors retain entered text and restore usable controls.');

await f.doc.panel.querySelectorAll('[data-profile]').find(e=>e.dataset.profile==='alpha').emit('click');
assert.equal(f.current,'alpha');assert.equal(location.hash,'home');assert.equal(f.doc.header.textContent,'Alpha <learner>');assert.deepEqual(f.states.alpha.topics,evidence);
passed('Switching selects the requested learner and refreshes the home route.');

await f.open();f.current='beta';await f.form('preferences').emit('submit');
assert.equal(f.calls.at(-1).profile,'alpha');assert.match(f.form('preferences-status').textContent,/Not saved:.*learning space changed/);
assert.equal(f.states.beta.preferences.starting_course,'arithmetic');assert.deepEqual(f.states.alpha.topics,evidence);
passed('An old settings form remains bound to its displayed learner after another tab switches.');

const delayedRead=defer();f.nextRead=delayedRead;const opening=f.open();f.ui.cancel();f.doc.main.innerHTML='<h1>New route</h1>';delayedRead.resolve();await opening;
assert.equal(f.doc.main.innerHTML,'<h1>New route</h1>');
passed('A late profile-list response cannot replace a newer route.');

await f.open();const delayedSave=defer();f.nextWrite=delayedSave;const oldPanel=f.doc.panel,save=f.form('preferences').emit('submit');f.ui.cancel();f.doc.main.innerHTML='<h1>Another route</h1>';delayedSave.resolve();await save;
assert.equal(f.doc.main.innerHTML,'<h1>Another route</h1>');assert.equal(oldPanel.isConnected,false);
passed('A late preference save cannot write status into a new page.');

await f.open();const delayedSwitch=defer();f.nextWrite=delayedSwitch;const switching=f.doc.panel.querySelectorAll('[data-profile]').find(e=>e.dataset.profile==='gamma').emit('click');
f.ui.cancel();location.hash='applications';f.doc.main.innerHTML='<h1>applications</h1>';delayedSwitch.resolve();await switching;
assert.equal(f.current,'gamma');assert.equal(location.hash,'applications');assert.equal(f.doc.main.innerHTML,'<h1>applications</h1>');assert.equal(f.doc.header.textContent,'Gamma');
passed('A completed in-flight switch refreshes identity without redirecting a newer page.');
f.ui.cancel();
console.log(`Profiles UI: ${checks} route, creation, preference, escaping and stale-navigation checks passed.`);
