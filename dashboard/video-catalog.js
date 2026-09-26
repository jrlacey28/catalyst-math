// Complete video library and the deliberately small home page.
import {autosave} from './autosave.js';
import {cardArt} from './card-art.js';
import {renderAnswerVisual,fallbackVisual} from './answer-visuals.js';
export function createVideoCatalogUI({api,esc,toast,copy,learning,mountLegacyPractice,mountLegacyHomework,legacyLesson,onCalculator,onHelp,mountApplication,mountScaffold,mountTools,warmup}) {
 let data={lessons:[],courses:[]},byId={},progress={},dispose=null,viewVersion=0;
 const $=s=>document.querySelector(s);
 const course=id=>data.courses.find(c=>c.id===id);
 const items=id=>data.lessons.filter(l=>l.course_id===id);
 const minutes=l=>Math.max(1,Math.ceil(l.duration_seconds/60));
 const watched=l=>(progress.topics?.[l.id]?.video_seconds||progress.lessons?.[l.existing_lesson_id]?.video_seconds||0)>2;
 const href=l=>'#watch/'+l.id;
 const group=c=>['number-sense','arithmetic','pre-algebra'].includes(c.id)?'basics':['algebra-1','geometry','statistics-basics','algebra-2','trigonometry','precalculus'].includes(c.id)?'school':'college';
 async function load(){data=await api('video-catalog');byId=Object.fromEntries(data.lessons.map(l=>[l.id,l]));}
 function nextLesson(){
  const recent=Object.entries(progress.topics||{}).filter(([id,p])=>byId[id]&&p.video_updated_at&&p.video_seconds<byId[id].duration_seconds-2).sort((a,b)=>b[1].video_updated_at.localeCompare(a[1].video_updated_at));
  if(recent.length)return byId[recent[0][0]];
  const selected=progress.preferences?.starting_course;
  if(selected){const list=items(selected);return list.find(l=>!progress.topics?.[l.id]?.check_passed&&!progress.lessons?.[l.existing_lesson_id]?.check_passed)||list[0];}
  const legacy=data.lessons.find(l=>l.existing_lesson_id&&watched(l)&&!progress.lessons?.[l.existing_lesson_id]?.check_passed);
  if(legacy)return legacy;
  const assessed=progress.placement?.recommendation?.topic_id;
  if(assessed&&byId[assessed])return byId[assessed];
  const chosen=learning.selectedStart();
  if(chosen){const match=data.lessons.find(l=>chosen.url?.includes(l.id)||l.existing_lesson_id&&chosen.url?.includes(l.existing_lesson_id));if(match)return match;}
  return byId['geometry.angles']||data.lessons[0];
 }
 function placementBanner(p){const s=p.placement||{};const done=s.status==='complete',active=s.status==='in_progress';return `<section class="placement-banner"><div><h2>${done?'Your suggested starting point':active?'Your placement is saved':'Not sure where to begin?'}</h2><p>${done?esc(s.recommendation.topic_title):active?`${s.answered} of 25 questions completed. Pick up where you left off.`:'Take 25 adaptive questions to find your strengths and the next thing to work on.'}</p></div><a class="button" href="#placement">${done?'View my starting map':active?'Resume placement':'Find my level'} →</a></section>`;}
 function home(p){progress=p;const l=nextLesson();return `<div class="simple-home"><div class="home-welcome"><span class="eyebrow">LEARN AT YOUR OWN PACE</span><h1>One idea at a time.</h1><p>Watch it. Try it. Make it make sense.</p><a class="home-tour-link" href="#tour">New here? Watch the guided tour →</a></div>${warmup?.()||''}${placementBanner(p)}${l?`<section class="next-lesson"><div class="next-copy"><span class="eyebrow">${watched(l)?'PICK UP WHERE YOU LEFT OFF':'YOUR NEXT LESSON'} · ${esc(l.course)}</span><h2>${esc(l.title)}</h2><p>${esc(l.objective)}</p><a class="button" href="${href(l)}">${watched(l)?'Continue lesson':'Start lesson'} <span aria-hidden="true">→</span></a><span class="next-note">${minutes(l)} min video · three problems to try</span></div><a class="next-preview" href="${href(l)}" aria-label="Watch ${esc(l.title)}">${cardArt({id:l.id,kind:'lesson',title:l.title})}<span class="play-symbol" aria-hidden="true">▶</span></a></section>`:''}<div class="home-section-title"><h2>Find your starting point</h2><a href="#videos">All courses →</a></div><div class="home-starting-points"><a href="#videos/basics" class="start-card start-gold">${cardArt({id:'arithmetic.fractions',kind:'lesson',title:'Start with the basics'})}<div><h3>Start with the basics</h3><p>Numbers, fractions & first equations</p></div><span aria-hidden="true">→</span></a><a href="#videos/school" class="start-card start-green">${cardArt({id:'algebra-1.quadratics',kind:'lesson',title:'Build your foundations'})}<div><h3>Build your foundations</h3><p>Algebra, geometry & trigonometry</p></div><span aria-hidden="true">→</span></a><a href="#videos/college" class="start-card start-purple">${cardArt({id:'calculus-2.integrals',kind:'lesson',title:'Explore college math'})}<div><h3>Explore college math</h3><p>Calculus, proofs & advanced ideas</p></div><span aria-hidden="true">→</span></a></div><a class="home-tree-entry" href="#progress"><span aria-hidden="true">✧</span><div><strong>My math skill tree</strong><span>Explore the branches. Earn golden stars for independent checks.</span></div><b aria-hidden="true">→</b></a><div class="home-shortcuts"><a href="#session"><span aria-hidden="true">↻</span><strong>Keep what I learn</strong><span>→</span></a><a href="#homework"><span aria-hidden="true">▤</span><strong>My saved work</strong><span>→</span></a><a href="#reasoning"><span aria-hidden="true">⇄</span><strong>Help with a confusing step</strong><span>→</span></a><a href="#studio"><span aria-hidden="true">✧</span><strong>Use math in a real situation</strong><span>→</span></a></div></div>`;}
 function card(c){const ls=items(c.id);return `<a class="video-course-card" href="#videos/${c.id}" style="--course-color:${/^#[0-9a-f]{6}$/i.test(c.color)?c.color:'#94bfa3'}">${cardArt({id:c.id,kind:'course',title:c.title})}<div><h2>${esc(c.title)}</h2><small>${ls.length} lessons</small></div><span class="course-arrow" aria-hidden="true">→</span></a>`;}
 function library(id='all'){
  const c=course(id);
  if(c){const ls=items(id),profile=progress.profile_id;$('#main').innerHTML=`<a class="backlink" href="#videos">← All courses</a><div class="intro video-course-heading"><div><h1>${esc(c.title)}</h1><p>${ls.length} lessons</p></div><button class="button secondary" id="select-video-path">Make this my course</button></div><div class="video-course-list">${ls.map(l=>`<a class="video-lesson-row" href="${href(l)}"><span class="video-order" aria-hidden="true">${String(l.index).padStart(2,'0')}</span><div><h2>${esc(l.title)}</h2>${l.objective?`<p>${esc(l.objective)}</p>`:''}</div><span class="watch-arrow">${watched(l)?'Continue':l.video_available===false?'Open':'Play'} <span aria-hidden="true">→</span></span></a>`).join('')}</div><details class="video-course-details"><summary>About this course & prerequisites</summary><p>${esc(c.description)}</p><a href="#path/${c.id}">Explore prerequisites →</a></details>`;const button=$('#select-video-path');button.onclick=async()=>{try{await api('preferences',{starting_course:id},profile);if(button.isConnected&&progress.profile_id===profile)toast('Your course is saved.');}catch(e){if(button.isConnected&&progress.profile_id===profile)toast(e.message)}};return;}
  const filter=['basics','school','college'].includes(id)?id:'all';
  $('#main').innerHTML=`<div class="intro video-library-heading"><h1>Courses</h1></div><div class="video-library-tools"><label class="video-search"><span class="sr-only">Search courses and lesson topics</span><input id="video-search" type="search" placeholder="Search a course or topic…" autocomplete="off"></label><nav class="video-filters" aria-label="Course level">${[['all','All courses'],['basics','Basics'],['school','Algebra & geometry'],['college','College & advanced']].map(([k,v])=>`<a class="tab ${filter===k?'active':''}" href="#videos/${k}">${v}</a>`).join('')}</nav></div><div id="video-course-results" class="video-course-grid"></div><p id="video-search-status" class="coverage-note" aria-live="polite"></p>`;
  const update=()=>{const query=$('#video-search').value.trim().toLowerCase();const cs=data.courses.filter(c=>items(c.id).length>0&&(filter==='all'||group(c)===filter)&&(!query||[c.title,c.description,...items(c.id).map(l=>l.title)].join(' ').toLowerCase().includes(query)));$('#video-course-results').innerHTML=cs.map(card).join('')||'<div class="empty-state"><h2>No matching course</h2><p>Try a shorter topic name or choose another level.</p></div>';$('#video-search-status').textContent=cs.length+' course'+(cs.length===1?'':'s');};$('#video-search').oninput=update;update();
 }

 function written(l){const saved=progress.topics?.[l.id]?.homework||{};return `<div class="video-written"><p class="lesson-support-note">Write your answer and reasoning for tutor review.</p>${(l.practice||[]).map((q,i)=>`<div class="question"><label class="question-title" for="video-work-${i}"><span class="question-num">${i+1}</span><span>${esc(q.prompt)}</span></label>${renderAnswerVisual(q.visual||fallbackVisual(q,null,{topicId:l.id}))}<textarea class="homework-answer" id="video-work-${i}" data-video-work="${esc(q.id)}" placeholder="My answer and why each step works…">${esc(saved[q.id]||'')}</textarea></div>`).join('')}<div class="batch-footer"><span class="autosave" id="video-work-status" role="status">Saved as you write</span><button class="button secondary small" id="copy-video-work">Help with my work</button></div></div>`;}
 async function watch(id,tab='video'){
  const version=++viewVersion,l=byId[id],profile=progress.profile_id;
  if(!l){$('#main').innerHTML='<div class="empty-state"><h1>Lesson not found</h1><a class="button" href="#videos">Browse courses</a></div>';return;}
  const list=items(l.course_id),next=list[list.indexOf(l)+1],legacy=l.existing_lesson_id?legacyLesson?.(l.existing_lesson_id):null;
  const guide=learning.topic(id)?.lesson||learning.topic(id)?.scaffold,hasGuide=learning.hasGuide(id),checkHref=legacy?'#lesson/'+legacy.id+'/check':hasGuide?'#topic/'+id+'/check':null;
  $('#main').innerHTML=`<article class="unified-lesson" data-lesson-topic="${id}">
   <header class="lesson-flow-heading"><div><a class="backlink" href="#videos/${l.course_id}">← ${esc(l.course)}</a><h1>${esc(l.title)}</h1></div><span class="lesson-counter">Lesson ${l.index} / ${l.total}</span></header>
   ${l.video_available?`<div class="video-panel catalog-video"><video id="catalog-player" controls playsinline preload="metadata" poster="${l.poster}" src="/${l.video_path}/final.mp4">${!legacy?`<track kind="captions" src="/${l.video_path}/captions.vtt" srclang="en" label="English">`:''}</video></div>`:'<p class="lesson-source-note">This copy has no video. <button type="button" class="review-text-button" id="lesson-read-transcript">Read the transcript</button></p>'}
   <section class="lesson-practice" id="lesson-practice" aria-labelledby="practice-heading"><div class="lesson-section-heading"><h2 id="practice-heading">Try three problems</h2><div class="lesson-practice-actions">${guide?'<button type="button" class="review-text-button" id="lesson-open-example">See an example</button>':''}<button type="button" class="review-text-button" id="lesson-practice-calculator">Calculator</button></div></div><div id="inline-practice-host">${legacy?'<div id="activity-panel" class="inline-legacy-practice"></div>':hasGuide?'<div class="loading">Preparing your problems…</div>':written(l)}</div></section>
   <details class="lesson-disclosure lesson-application" id="lesson-application"><summary>Apply this idea</summary><div class="lesson-disclosure-body" id="lesson-mission-host"></div></details>
   <div class="lesson-extras" aria-label="More ways to work with this lesson">
    ${guide?'<details class="lesson-disclosure lesson-example" id="lesson-example"><summary>Worked examples</summary><div class="lesson-disclosure-body"><button type="button" class="review-text-button lesson-example-return" id="lesson-example-return">← Back to my problems</button><div id="lesson-scaffold-host"></div></div></details>':''}
    <details class="lesson-disclosure lesson-transcript" id="lesson-transcript"><summary>Transcript</summary><div class="lesson-disclosure-body" id="lesson-transcript-host"></div></details>
    ${legacy?'<details class="lesson-disclosure lesson-written-extra" id="legacy-written-extra"><summary>Written work</summary><div class="lesson-disclosure-body" id="homework-panel"></div></details>':hasGuide?'<details class="lesson-disclosure lesson-written-extra" id="video-written-extra"><summary>Written work</summary><div class="lesson-disclosure-body" id="video-written-host"></div></details>':''}
    <details class="lesson-disclosure lesson-tools" id="lesson-tools"><summary>Math tools</summary><div class="lesson-disclosure-body"><button type="button" class="button secondary small calculator-entry" id="lesson-calculator">Calculator &amp; graph</button><div id="lesson-tools-host"></div></div></details>
   </div>
   <section class="lesson-finish">${checkHref?`<a class="button" href="${checkHref}">Try an independent check →</a><span>Fresh questions, without hints.</span>`:'<button type="button" class="button secondary" id="lesson-explain-help">Talk through my reasoning</button><span>Written arguments need tutor review.</span>'}</section>
   <nav class="lesson-next" aria-label="Continue learning"><a href="#progress">My math tree</a>${next?`<a href="${href(next)}">Next: ${esc(next.title)} →</a>`:'<a href="#videos">Explore another course →</a>'}</nav>
  </article>`;
  const article=$('.unified-lesson'),query=s=>article.querySelector(s),host=query('#inline-practice-host');
  const controller=new AbortController(),listen={signal:controller.signal},cleanups=[];let dead=false,videoDispose=null;
  const current=()=>!dead&&version===viewVersion&&article.isConnected&&profile===progress.profile_id;
  const scroll=element=>element?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  dispose=()=>{if(dead)return;dead=true;viewVersion++;controller.abort();videoDispose?.();for(const stop of cleanups)stop?.();};

  // A closed supplement has no mounted model, draft inputs or tool listeners.
  // Once opened, its DOM remains intact across close/reopen, preserving work.
  const panels=new Map();
  function lazyPanel(selector,mount,{help=false}={}){
   const section=query(selector);if(!section)return;
   let mounted=false,pending=false;
   const open=async()=>{
    if(!section.open||!current()||pending)return;
    pending=true;
    try{
     if(help)await api('topic/help',{topic_id:id},profile);
     if(!current()||!section.open||mounted)return;
     const stop=await mount();
     if(!current()){if(typeof stop==='function')stop();return;}
     if(typeof stop==='function')cleanups.push(stop);
     mounted=true;
    }catch(e){if(current())toast(e.message);}
    finally{pending=false;}
   };
   section.addEventListener('toggle',()=>{if(section.open)void open();},listen);
   panels.set(selector,()=>{section.open=true;void open();scroll(section);});
  }
  function bindWritten(panel){
   let revision=Math.max(Date.now(),progress.topics?.[id]?.homework_revision||0),pending=Promise.resolve();
   const answers={...progress.topics?.[id]?.homework},status=panel.querySelector('#video-work-status');
   for(const field of panel.querySelectorAll('[data-video-work]'))field.addEventListener('input',()=>{
    answers[field.dataset.videoWork]=field.value;const request={topic_id:id,answers:{...answers},revision:++revision};
    pending=api('topic/homework',request,profile).then(()=>{if(current()&&request.revision===revision&&status)status.textContent='✓ Saved for tutor review';}).catch(e=>{if(current()&&request.revision===revision&&status)status.textContent='Not saved: '+e.message;});
   },listen);
   panel.querySelector('#copy-video-work')?.addEventListener('click',async()=>{await pending;if(current())onHelp?.();},listen);
  }
  lazyPanel('#lesson-example',()=>mountScaffold?.(query('#lesson-scaffold-host'),id),{help:true});
  lazyPanel('#lesson-application',()=>mountApplication?.(query('#lesson-mission-host'),id),{help:true});
  lazyPanel('#lesson-transcript',()=>{query('#lesson-transcript-host').textContent=(l.transcript||legacy?.transcript||'Transcript unavailable in this copy.').replace(/phase_\d\n/g,'');});
  lazyPanel('#lesson-tools',()=>mountTools?.(query('#lesson-tools-host'),id,tab));
  if(legacy)lazyPanel('#legacy-written-extra',()=>mountLegacyHomework?.(legacy));
  else if(hasGuide)lazyPanel('#video-written-extra',()=>{const panel=query('#video-written-host');panel.innerHTML=written(l);bindWritten(panel);});
  else bindWritten(query('.video-written'));
  const openGuide=()=>panels.get('#lesson-example')?.()||(!guide&&onHelp?.());
  query('#lesson-open-example')?.addEventListener('click',openGuide,listen);
  query('#lesson-practice-calculator').addEventListener('click',()=>onCalculator?.(),listen);
  query('#lesson-example-return')?.addEventListener('click',()=>{
   if(!current())return;
   query('#lesson-example').open=false;
   const firstAnswer=host.querySelector('.question input:not(:disabled),.question textarea:not(:disabled)');
   const target=firstAnswer||query('#practice-heading');
   if(!firstAnswer)target.tabIndex=-1;
   target.focus({preventScroll:true});scroll(query('#lesson-practice'));
  },listen);
  query('#lesson-read-transcript')?.addEventListener('click',()=>panels.get('#lesson-transcript')?.(),listen);
  query('#lesson-calculator').addEventListener('click',()=>onCalculator?.(),listen);
  query('#lesson-explain-help')?.addEventListener('click',()=>onHelp?.(),listen);

  const video=query('#catalog-player');
  if(video){
   let lastSaved=-1,revision=Math.max(Date.now(),progress.topics?.[id]?.video_revision||0);
   const savedSeconds=progress.topics?.[id]?.video_seconds||progress.lessons?.[l.existing_lesson_id]?.video_seconds||0;
   const save=()=>{const seconds=video.currentTime;if(!Number.isFinite(seconds)||seconds<.5||Math.abs(seconds-lastSaved)<.5)return;lastSaved=seconds;api('topic/video',{topic_id:id,seconds,revision:++revision},profile).catch(e=>toast(e.message));};
   video.addEventListener('loadedmetadata',()=>{if(current()&&savedSeconds>2&&savedSeconds<video.duration-2)video.currentTime=savedSeconds;},listen);
   cleanups.push(autosave.register(save));
   video.addEventListener('pause',save,listen);video.addEventListener('ended',save,listen);
   video.addEventListener('timeupdate',()=>{if(Math.abs(video.currentTime-lastSaved)>10)save();},listen);
   videoDispose=()=>{save();video.pause();};
  }
  try{
   await api('topic/help',{topic_id:id},profile);if(!current())return;
   if(legacy)await mountLegacyPractice?.(legacy.id);
   else if(hasGuide)await learning.mountInlinePractice(host,id,progress,{onGuide:openGuide,onHelp:()=>onHelp?.(),onResult:()=>{if(current())query('#lesson-application').classList.add('practice-complete');}});
  }catch(e){if(current())host.innerHTML=`<div class="error">${esc(e.message)}</div>`;}
  if(!current())return;
  if(tab==='guide')openGuide();
  else if(tab==='steps')panels.get('#lesson-tools')?.();
  else if(['apply','application'].includes(tab))panels.get('#lesson-application')?.();
  else if(tab==='homework'&&(legacy||hasGuide))panels.get(legacy?'#legacy-written-extra':'#video-written-extra')?.();
  else if(['practice','homework'].includes(tab))scroll(query('#lesson-practice'));
 }
 function homework(p){progress=p;const ls=data.lessons.filter(l=>l.practice&&Object.values(p.topics?.[l.id]?.homework||{}).some(s=>s.trim()));return ls.length?`<div class="section-title"><h2>Course video homework</h2></div><div class="lesson-list">${ls.map(l=>`<a class="video-lesson-row" href="#watch/${l.id}/homework">${cardArt({id:l.id,kind:'lesson',title:l.title,compact:true})}<div><h2>${esc(l.title)}</h2><p>${esc(l.course)} · saved for tutor review</p></div><span>Open →</span></a>`).join('')}</div>`:'';}
 async function render(page,id,tab,p){progress=p;dispose?.();dispose=null;if(page==='videos'||page==='library'){library(id);$('#breadcrumb').textContent='Courses';return true;}if(page==='watch'){$('#breadcrumb').textContent=byId[id]?.course||'Video lesson';await watch(id,tab);return true;}return false;}
 return {load,home,render,homework,next:p=>{progress=p;return nextLesson();},has:id=>!!byId[id],lesson:id=>byId[id],dispose:()=>{dispose?.();dispose=null;},count:()=>data.lessons.length};
}
