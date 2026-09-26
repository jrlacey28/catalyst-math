import {autosave} from './autosave.js';
export function createPlacementUI({api,esc,getProfile=()=>undefined}) {
 let dispose=null,topics={};
 const labels={positive_evidence:'Positive evidence',mixed:'Mixed — verify',needs_review:'Review needed',not_yet_learned:'Not yet learned / unsure',assisted_or_guessed:'Fresh check needed',unknown:'Not tested'};
 const href=id=>topics[id]?.video?.route||(topics[id]?.existing_lesson_id?'#lesson/'+topics[id].existing_lesson_id+'/video':'#topic/'+id);
 const available=id=>!!(topics[id]?.video||topics[id]?.existing_lesson_id||topics[id]?.lesson);
 function resultHTML(r) {
  const rec=r.recommendation;
  return `<div class="intro"><div><div class="eyebrow">YOUR STARTING MAP</div><h1>A place to begin. Room to grow.</h1><p>${esc(r.note)}</p></div><span class="pill">25 of 25 saved</span></div>
   <section class="placement-recommendation card"><span class="eyebrow">SUGGESTED FIRST STEP · ${esc(rec.title)}</span><h2>${esc(rec.topic_title)}</h2><p>${esc(rec.reason)}</p><a class="button" id="placement-begin-topic" href="${esc(href(rec.topic_id))}">${available(rec.topic_id)?'Start this lesson':'Explore this topic'} →</a>${available(rec.topic_id)?'':'<p>This lesson is still being developed. Open its roadmap entry for prerequisites and companion resources.</p>'}<p class="coverage-note">Your home page now includes this recommendation. Existing lesson progress and course choices are preserved.</p></section>
   <div class="section-title"><h2>Your areas of math</h2></div><div class="placement-area-grid">${r.areas.map(a=>`<section class="card guide-section"><h3>${esc(a.title)}</h3><p>${a.independent_correct} independent correct of ${a.sampled} probes</p><a href="${esc(href(a.topic_id))}">${esc(a.topic_title)} →</a><p class="coverage-note">${esc(a.reason)}</p></section>`).join('')}</div>
   <section class="card guide-section"><h2>What your answers showed</h2><p>One correct response is limited evidence. A missed question alone does not establish a misconception. ${r.reasoning_pending} written explanations await tutor review.</p><div class="placement-skills">${r.skills.filter(s=>s.attempts).map(s=>`<div><a href="${esc(href(s.topic_id))}">${esc(s.title)}</a><span>${labels[s.status]} · ${s.confidence==='corroborated'?'two matching responses':'limited evidence'}</span></div>`).join('')}</div></section>
   <details class="card guide-section"><summary>${r.untested_topics.length} topics remain untested</summary><p>These are unknown, not failed. A short diagnostic cannot certify every topic.</p><ul>${r.untested_topics.map(t=>`<li>${esc(t.title)}</li>`).join('')}</ul></details>
   <details class="card guide-section"><summary>Review your saved responses</summary>${r.responses.map((a,i)=>`<article class="placement-response"><h3>${i+1}. ${esc(a.prompt)}</h3><p>Your response: ${esc(a.action==='answer'?a.answer:a.action==='unfamiliar'?'Not learned yet':'I don’t know yet')}</p><p>${a.correct===null?'No answer assessed':a.correct?'Correct response':'Incorrect response'} · ${a.independent?'Independent':'Assisted or guessed'} · Confidence: ${esc(a.confidence)}</p>${a.reasoning?`<p class="saved-reasoning">${esc(a.reasoning)}</p>`:''}</article>`).join('')}</details>`;
 }
 async function mount() {
  const profile=getProfile(),host=document.querySelector('#main');let live=true,state,timer,pending=Promise.resolve(),busy=false,dirty=false;
  const error=message=>{if(live){host.querySelector('#placement-error').textContent=message;host.querySelector('#placement-save').textContent='Not saved — keep this page open.';}};
  const read=()=>{const f=host.querySelector('form');if(!f)return null;const v=new FormData(f);return {answer:v.get('answer')||'',reasoning:v.get('reasoning')||'',confidence:v.get('confidence')||'not_reported',assisted:v.has('assisted')};};
  const payload=values=>({session_id:state.id,question_id:state.question.id,revision:state.revision,...values});
  function saveDraft(values) {
   if(!values||!state?.question)return pending;
   pending=pending.then(async()=>{state=await api('placement/draft',payload(values),profile);if(live)host.querySelector('#placement-save').textContent='Draft saved on this computer.';}).catch(e=>{if(live&&!(e.status>=400&&e.status<500))dirty=true;error(e.message);});
   // Keep a rejected draft from becoming an unhandled rejection.
   pending.catch(()=>{});return pending;
  }
  const unregister=autosave.register(()=>{clearTimeout(timer);if(dirty&&!busy){dirty=false;return saveDraft(read());}return pending;});
  dispose=()=>{unregister();live=false;clearTimeout(timer);if(dirty){dirty=false;saveDraft(read());}const page=location.hash.slice(1).split('/')[0];if(state?.question&&['watch','lesson','topic','reasoning','lab','bridge','unit-test'].includes(page)){api('placement/exposure',{session_id:state.id,question_id:state.question.id}).catch(()=>{});}};
  function draw() {
   if(!live)return;
   if(state.status==='complete'){host.innerHTML=resultHTML(state.result);return;}
   if(state.status==='not_started') {
    host.innerHTML=`<div class="intro"><div><div class="eyebrow">ADAPTIVE PLACEMENT</div><h1>Find your starting point.</h1><p>25 questions. One at a time. A different route for every learner.</p></div></div><section class="card placement-intro"><div class="placement-number">25<span>questions chosen from ${state.bank_size}</span></div><h2>Start where the learning matters.</h2><p>We begin with algebra. Correct answers lead to harder questions; difficulty leads to simpler prerequisites. Then we sample arithmetic, functions, geometry, trigonometry, calculus, probability and statistics, linear algebra, and mathematical reasoning.</p><p>Use paper for your working. Try without a calculator, hints, or a lesson beside you; report any help you use. There is no timer. “I don’t know yet” and “I haven’t learned this” are useful answers.</p><p>Your answers and drafts save automatically to this learner’s space. You can leave and resume. You’ll receive a suggested starting lesson and a map of areas to check next.</p><button class="button" id="placement-start">Find my starting point →</button><p class="coverage-note">This is a provisional placement screen, not a grade or a claim that you have mastered an entire course.</p><div id="placement-error" role="alert"></div><span id="placement-save" role="status"></span></section>`;
    host.querySelector('#placement-start').onclick=async e=>{e.target.disabled=true;try{state=await api('placement/start',{});draw();}catch(err){error(err.message);e.target.disabled=false;}};return;
   }
   const q=state.question,d=state.draft||{};
   host.innerHTML=`<div class="intro"><div><div class="eyebrow">FIND YOUR STARTING POINT</div><h1>Question ${state.answered+1} of 25</h1><p>${esc(q.area_title)} · Take your time.</p></div><a href="#home" class="backlink">Save & leave</a></div><progress class="placement-progress" aria-label="Questions completed" max="25" value="${state.answered}"></progress>
    <section class="card placement-question"><p class="coverage-note">The next question adapts to your answer. Solutions stay hidden during the test.</p><form novalidate><h2 id="placement-prompt" tabindex="-1">${esc(q.prompt)}</h2>
    ${q.kind==='choice'?`<fieldset class="placement-options" aria-labelledby="placement-prompt"><legend class="placement-sr">Choose your answer</legend>${q.options.map(o=>`<label><input type="radio" name="answer" value="${esc(o)}" ${d.answer===o?'checked':''}><span>${esc(o)}</span></label>`).join('')}</fieldset>`:`<label class="field-label">Your answer<input name="answer" autocomplete="off" spellcheck="false" value="${esc(d.answer||'')}" placeholder="A number, fraction, or expression" aria-describedby="answer-format"><small id="answer-format">Fractions like 3/4, pi, sqrt(2), and ^ for powers are accepted.</small></label>`}
    <label class="field-label">Show your thinking <span>(optional — saved for tutor review)</span><textarea name="reasoning" rows="3" maxlength="6000" placeholder="Write your steps, or explain what you tried.">${esc(d.reasoning||'')}</textarea></label>
    <div class="placement-meta"><label class="field-label">How sure are you?<select name="confidence">${[['not_reported','Prefer not to say'],['confident','Confident'],['unsure','Unsure'],['guess','This is a guess']].map(([v,l])=>`<option value="${v}" ${(d.confidence||'not_reported')===v?'selected':''}>${l}</option>`).join('')}</select></label><label class="check-field"><input name="assisted" type="checkbox" ${d.assisted||q.assisted?'checked':''} ${q.assisted?'disabled':''}> I used help, notes, or a calculator</label></div>
    <div class="placement-actions"><button class="button" type="submit">${state.answered===24?'Finish & see my starting point':'Submit & continue'} →</button><button class="button secondary" type="button" data-action="dont_know">I don’t know yet</button><button class="button secondary" type="button" data-action="unfamiliar">I haven’t learned this</button></div><div id="placement-error" role="alert"></div><p id="placement-save" role="status">${Object.keys(d).length?'Draft saved on this computer.':'Progress saved. You can pause at any time.'}</p></form></section>`;
   const form=host.querySelector('form');
   form.addEventListener('input',()=>{dirty=true;clearTimeout(timer);host.querySelector('#placement-save').textContent='Saving…';timer=setTimeout(()=>{dirty=false;saveDraft(read());},450);});
   async function submit(action) {
    if(busy)return;busy=true;clearTimeout(timer);dirty=false;const values=read();
    form.querySelectorAll('button').forEach(b=>b.disabled=true);
    try{await pending;state=await api('placement/answer',payload({...values,action}));draw();if(live)host.querySelector('#placement-prompt')?.focus();}
    catch(e){error(e.message);form.querySelectorAll('button').forEach(b=>b.disabled=false);}
    finally{busy=false;}
   }
   form.onsubmit=e=>{e.preventDefault();submit('answer');};
   form.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>submit(b.dataset.action));
  }
  const loaded=await Promise.all([api('placement'),api('roadmap')]);state=loaded[0];
  if(live){topics=Object.fromEntries(loaded[1].courses.flatMap(c=>c.topics).map(t=>[t.id,t]));document.querySelector('#breadcrumb').textContent='Find my level';draw();}
 }
 return {mount,dispose:()=>{dispose?.();dispose=null;}};
}
